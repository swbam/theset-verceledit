import { createServiceRoleClient } from '@/integrations/supabase/utils'; // Use the service role client utility
import { EntityType, SyncTask, PriorityLevel, SyncOperation } from './types';
import { SyncManager } from './manager';

/**
 * Queue system for handling sync tasks with priority and database persistence.
 */
export class SyncQueue {
  private tasks: SyncTask[] = [];
  private processing: boolean = false;
  private manager: SyncManager;
  private supabaseAdmin; // Property for the Supabase client

  // Maximum concurrent tasks and attempts
  private readonly MAX_CONCURRENT = 3;
  private readonly MAX_ATTEMPTS = 3;
  private activeCount: number = 0;

  constructor(manager: SyncManager) {
    this.manager = manager;
    this.supabaseAdmin = createServiceRoleClient(); // Instantiate the service role client
    this.loadQueueFromDatabase(); // Load existing tasks on startup

    // Set up periodic processing
    // Consider if setInterval is appropriate in a serverless environment
    // or if processing should be triggered differently (e.g., by API calls or cron).
    setInterval(() => this.processQueue(), 5000); // Process every 5 seconds
  }

  /**
   * Add a task to the queue
   */
  async add(task: SyncTask): Promise<boolean> {
    // Set default values
    task.attempts = task.attempts || 0;

    // Check if task already exists in the in-memory queue first for efficiency
    const existingTaskIndex = this.tasks.findIndex(t =>
      t.type === task.type && t.id === task.id && t.operation === task.operation
    );

    if (existingTaskIndex >= 0) {
      // If existing task has lower priority, upgrade it in memory
      if (this.priorityValue(this.tasks[existingTaskIndex].priority) < this.priorityValue(task.priority)) {
        console.log(`Upgrading priority for existing task: ${task.operation} ${task.type} ${task.id}`);
        this.tasks[existingTaskIndex].priority = task.priority;
        // Persist the change immediately
        await this.persistQueueToDatabase();
      } else {
         console.log(`Task already queued, not adding duplicate: ${task.operation} ${task.type} ${task.id}`);
      }
      return false; // Indicate task was not newly added
    }

    // Add to in-memory queue
    this.tasks.push(task);

    // Sort queue by priority
    this.sortQueue();

    // Persist queue to database
    await this.persistQueueToDatabase();
    console.log(`Added task to queue: ${task.operation} ${task.type} ${task.id}`);

    // Trigger processing immediately if possible
    this.processQueue();

    return true; // Indicate task was added
  }

  /**
   * Process the next batch of tasks in the queue
   */
  async processQueue(): Promise<void> {
    if (this.processing || this.tasks.length === 0 || this.activeCount >= this.MAX_CONCURRENT) {
      // console.log(`Queue processing skipped: processing=${this.processing}, tasks=${this.tasks.length}, active=${this.activeCount}`);
      return;
    }

    this.processing = true;
    // console.log(`Starting queue processing cycle. Pending: ${this.tasks.length}, Active: ${this.activeCount}`);

    try {
      // Sort queue by priority just before processing
      this.sortQueue();

      // Process tasks up to MAX_CONCURRENT
      const availableSlots = this.MAX_CONCURRENT - this.activeCount;
      const tasksToProcess = this.tasks.slice(0, availableSlots);

      if (tasksToProcess.length > 0) {
        // Remove tasks to be processed from the main list *before* processing starts
        this.tasks.splice(0, tasksToProcess.length);
        // Persist the queue state *after* removing tasks
        await this.persistQueueToDatabase();

        // console.log(`Processing ${tasksToProcess.length} tasks.`);

        const processingPromises = tasksToProcess.map(task => {
          this.activeCount++;
          // Process task asynchronously
          return this.processTask(task).finally(() => {
            this.activeCount--;
            // console.log(`Finished task. Active count: ${this.activeCount}`);
            // Trigger another cycle immediately if slots opened up
             if (this.activeCount < this.MAX_CONCURRENT && this.tasks.length > 0) {
               this.processQueue();
             }
          });
        });

        await Promise.all(processingPromises); // Wait for the current batch to finish (or handle errors)
      } else {
         // console.log("No tasks to process in this cycle.");
      }

    } catch(error) {
       console.error("Error during queue processing loop:", error);
    } finally {
      this.processing = false;
      // console.log("Finished queue processing cycle.");
      // Check if more tasks arrived while processing
      if (this.tasks.length > 0 && this.activeCount < this.MAX_CONCURRENT) {
         // console.log("More tasks found, triggering another processing cycle.");
         // Use setTimeout to avoid potential infinite loops in case of rapid additions/failures
         setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  /**
   * Process a single task
   */
  private async processTask(task: SyncTask): Promise<void> {
    console.log(`Processing task: ${task.operation} ${task.type} ${task.id}`);

    try {
      let success = false;

      // Execute task based on operation using the SyncManager instance
      switch (task.operation) {
        case 'create':
          success = await this.manager.createSingle(task.type, task.id);
          break;

        case 'refresh':
          success = await this.manager.refreshSingle(task.type, task.id);
          break;

        case 'expand_relations':
          success = await this.manager.expandRelations(task.type, task.id);
          break;

        case 'cascade_sync':
          if (task.type === 'artist') {
            success = await this.manager.artistCascadeSync(task.id);
          } else if (task.type === 'venue') {
            success = await this.manager.venueCascadeSync(task.id);
          } else {
             console.warn(`Cascade sync not supported for type: ${task.type}`);
             success = true; // Mark as success to avoid retries for unsupported types
          }
          break;
        default:
           console.warn(`Unknown sync operation: ${task.operation}`);
           success = true; // Mark as success to avoid retries for unknown operations
      }

      if (!success) {
        console.warn(`Task failed: ${task.operation} ${task.type} ${task.id}`);
        await this.handleTaskFailure(task);
      } else {
         console.log(`Task completed successfully: ${task.operation} ${task.type} ${task.id}`);
      }
    } catch (error) {
      console.error(`Error processing task ${task.operation} ${task.type} ${task.id}:`, error);
      await this.handleTaskFailure(task);
    }
  }

  /**
   * Handle task failure, increment attempts, and re-queue if applicable
   */
   private async handleTaskFailure(task: SyncTask): Promise<void> {
       task.attempts = (task.attempts || 0) + 1;

       if (task.attempts < this.MAX_ATTEMPTS) {
         // Downgrade priority and re-queue
         this.downgradeTaskPriority(task);
         console.log(`Re-queuing task with priority ${task.priority}, attempt ${task.attempts}: ${task.operation} ${task.type} ${task.id}`);
         // Re-add to the in-memory queue and persist
         this.tasks.push(task);
         this.sortQueue();
         await this.persistQueueToDatabase();
       } else {
         console.error(`Task failed permanently after ${task.attempts} attempts: ${task.operation} ${task.type} ${task.id}`);
         // Optionally: Move to a dead-letter queue or log permanently
       }
   }


  /**
   * Downgrade task priority
   */
  private downgradeTaskPriority(task: SyncTask): void {
    if (task.priority === 'high') {
      task.priority = 'medium';
    } else if (task.priority === 'medium') {
      task.priority = 'low';
    }
    // Low priority stays low
  }

  /**
   * Get priority value for sorting
   */
  private priorityValue(priority: PriorityLevel): number {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  /**
   * Sort queue by priority (descending) and then attempts (ascending)
   */
  private sortQueue(): void {
    this.tasks.sort((a, b) => {
      const priorityDiff = this.priorityValue(b.priority) - this.priorityValue(a.priority);
      if (priorityDiff !== 0) return priorityDiff;
      return (a.attempts || 0) - (b.attempts || 0);
    });
  }

  /**
   * Load queue from database on startup
   */
  private async loadQueueFromDatabase(): Promise<void> {
    console.log("Loading sync queue from database...");
    try {
      const { data, error } = await this.supabaseAdmin
        .from('sync_queue')
        .select('*');

      if (error) {
        console.error('Error loading sync queue from database:', error);
        return;
      }

      if (data && data.length > 0) {
        this.tasks = data.map(item => ({
          type: item.entity_type as EntityType,
          id: item.entity_id, // Ensure this is the correct ID (external or internal depending on context)
          priority: item.priority as PriorityLevel,
          operation: item.operation as SyncOperation,
          attempts: item.attempts || 0,
          payload: item.payload // Make sure payload structure matches SyncTask if used
        }));
        this.sortQueue(); // Sort after loading
        console.log(`Loaded ${this.tasks.length} tasks from database queue.`);
      } else {
         console.log("Database sync queue is empty.");
      }
    } catch (error) {
      console.error('Exception during sync queue load:', error);
    }
     // Start processing immediately after loading
     this.processQueue();
  }

  /**
   * Persist the entire current in-memory queue state to the database
   */
  private async persistQueueToDatabase(): Promise<void> {
     // console.log(`Persisting ${this.tasks.length} tasks to database...`);
    try {
      // Use a transaction for atomicity
      // Note: Supabase JS client doesn't directly support multi-statement transactions easily.
      // This is a best-effort atomic replacement. A stored procedure could be more robust.

      // 1. Delete all existing tasks in the DB queue
      const { error: deleteError } = await this.supabaseAdmin
        .from('sync_queue')
        .delete()
        .neq('id', -1); // Condition to delete all rows, adjust if needed

      if (deleteError) {
        console.error('Error clearing sync queue in database before persisting:', deleteError);
        // Decide how to handle this - potentially skip insert or retry?
        return;
      }

      // 2. Insert current in-memory tasks if any exist
      if (this.tasks.length > 0) {
        const dbTasks = this.tasks.map(task => ({
          entity_type: task.type,
          entity_id: task.id, // Ensure this ID is correct
          priority: task.priority,
          operation: task.operation,
          attempts: task.attempts || 0,
          payload: task.payload || null // Handle potential payload
        }));

        const { error: insertError } = await this.supabaseAdmin
          .from('sync_queue')
          .insert(dbTasks);

        if (insertError) {
          console.error('Error inserting tasks into sync queue database:', insertError);
          // Consider potential rollback or error state
        } else {
           // console.log("Successfully persisted queue to database.");
        }
      } else {
         // console.log("In-memory queue is empty, database queue cleared.");
      }
    } catch (error) {
      console.error('Exception during sync queue persistence:', error);
    }
  }

  /**
   * Get queue status information
   */
  getStatus() {
    // Calculate stats based on the current in-memory queue
    const pending = this.tasks.length;
    const high = this.tasks.filter(t => t.priority === 'high').length;
    const medium = this.tasks.filter(t => t.priority === 'medium').length;
    const low = this.tasks.filter(t => t.priority === 'low').length;

    const byType = this.tasks.reduce((acc, task) => {
       acc[task.type] = (acc[task.type] || 0) + 1;
       return acc;
    }, {} as Record<EntityType, number>);


    return {
      pending: pending,
      active: this.activeCount,
      maxConcurrent: this.MAX_CONCURRENT,
      byPriority: { high, medium, low },
      byType: byType
    };
  }

  /**
   * Clear the in-memory queue and the database queue
   */
  async clear(): Promise<void> {
    console.log("Clearing sync queue...");
    this.tasks = []; // Clear in-memory
    await this.persistQueueToDatabase(); // Clear database by persisting empty array
    console.log("Sync queue cleared.");
  }
}
