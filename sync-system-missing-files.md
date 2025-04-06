# Missing Implementation Files

## SyncQueue (src/lib/sync/queue.ts)

This is the only missing implementation from the core sync system. Here's a recommended implementation:

```typescript
import { supabase } from '@/integrations/supabase/client';
import { EntityType, SyncTask, PriorityLevel, SyncOperation } from './types';
import { SyncManager } from './manager';

/**
 * Queue system for handling sync tasks with priority
 */
export class SyncQueue {
  private tasks: SyncTask[] = [];
  private processing: boolean = false;
  private manager: SyncManager;
  
  // Maximum concurrent tasks and attempts
  private readonly MAX_CONCURRENT = 3;
  private readonly MAX_ATTEMPTS = 3;
  private activeCount: number = 0;
  
  constructor(manager: SyncManager) {
    this.manager = manager;
    this.loadQueueFromDatabase();
    
    // Set up periodic processing
    setInterval(() => this.processQueue(), 5000);
  }
  
  /**
   * Add a task to the queue
   */
  async add(task: SyncTask): Promise<boolean> {
    // Set default values
    task.attempts = task.attempts || 0;
    
    // Check if task already exists in queue
    const existingTaskIndex = this.tasks.findIndex(t => 
      t.type === task.type && t.id === task.id && t.operation === task.operation
    );
    
    if (existingTaskIndex >= 0) {
      // If existing task has lower priority, upgrade it
      if (this.priorityValue(this.tasks[existingTaskIndex].priority) < this.priorityValue(task.priority)) {
        this.tasks[existingTaskIndex].priority = task.priority;
        await this.persistQueueToDatabase();
      }
      return false;
    }
    
    // Add to queue
    this.tasks.push(task);
    
    // Sort queue by priority
    this.sortQueue();
    
    // Persist queue to database
    await this.persistQueueToDatabase();
    
    return true;
  }
  
  /**
   * Process the next batch of tasks in the queue
   */
  async processQueue(): Promise<void> {
    if (this.processing || this.tasks.length === 0 || this.activeCount >= this.MAX_CONCURRENT) {
      return;
    }
    
    this.processing = true;
    
    try {
      // Sort queue by priority
      this.sortQueue();
      
      // Process tasks up to MAX_CONCURRENT
      const availableSlots = this.MAX_CONCURRENT - this.activeCount;
      const tasksToProcess = this.tasks.slice(0, availableSlots);
      
      for (const task of tasksToProcess) {
        this.activeCount++;
        
        // Remove from queue
        this.tasks = this.tasks.filter(t => 
          !(t.type === task.type && t.id === task.id && t.operation === task.operation)
        );
        
        // Process task asynchronously
        this.processTask(task).finally(() => {
          this.activeCount--;
        });
      }
      
      // Persist updated queue
      await this.persistQueueToDatabase();
    } finally {
      this.processing = false;
    }
  }
  
  /**
   * Process a single task
   */
  private async processTask(task: SyncTask): Promise<void> {
    console.log(`Processing task: ${task.operation} ${task.type} ${task.id}`);
    
    try {
      let success = false;
      
      // Execute task based on operation
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
          }
          break;
      }
      
      if (!success) {
        // Increment attempts and re-queue if under max attempts
        task.attempts = (task.attempts || 0) + 1;
        
        if (task.attempts < this.MAX_ATTEMPTS) {
          // Downgrade priority and re-queue
          this.downgradeTaskPriority(task);
          await this.add(task);
        } else {
          console.error(`Task failed after ${task.attempts} attempts: ${task.operation} ${task.type} ${task.id}`);
        }
      }
    } catch (error) {
      console.error(`Error processing task ${task.operation} ${task.type} ${task.id}:`, error);
      
      // Increment attempts and re-queue if under max attempts
      task.attempts = (task.attempts || 0) + 1;
      
      if (task.attempts < this.MAX_ATTEMPTS) {
        // Downgrade priority and re-queue
        this.downgradeTaskPriority(task);
        await this.add(task);
      }
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
   * Sort queue by priority
   */
  private sortQueue(): void {
    this.tasks.sort((a, b) => {
      // First sort by priority
      const priorityDiff = this.priorityValue(b.priority) - this.priorityValue(a.priority);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by attempts (fewer attempts first)
      return (a.attempts || 0) - (b.attempts || 0);
    });
  }
  
  /**
   * Load queue from database
   */
  private async loadQueueFromDatabase(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('sync_queue')
        .select('*');
        
      if (error) {
        console.error('Error loading sync queue from database:', error);
        return;
      }
      
      if (data && data.length > 0) {
        this.tasks = data.map(item => ({
          type: item.entity_type as EntityType,
          id: item.entity_id,
          priority: item.priority as PriorityLevel,
          operation: item.operation as SyncOperation,
          attempts: item.attempts || 0,
          payload: item.payload
        }));
        
        // Sort queue by priority
        this.sortQueue();
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
    }
  }
  
  /**
   * Persist queue to database
   */
  private async persistQueueToDatabase(): Promise<void> {
    try {
      // First clear the queue
      await supabase
        .from('sync_queue')
        .delete()
        .neq('id', 0); // Delete all rows
      
      // Skip if queue is empty
      if (this.tasks.length === 0) return;
      
      // Insert current tasks
      const dbTasks = this.tasks.map(task => ({
        entity_type: task.type,
        entity_id: task.id,
        priority: task.priority,
        operation: task.operation,
        attempts: task.attempts || 0,
        payload: task.payload || null
      }));
      
      const { error } = await supabase
        .from('sync_queue')
        .insert(dbTasks);
        
      if (error) {
        console.error('Error persisting sync queue to database:', error);
      }
    } catch (error) {
      console.error('Error persisting sync queue:', error);
    }
  }
  
  /**
   * Get queue status
   */
  getStatus() {
    return {
      pending: this.tasks.length,
      active: this.activeCount,
      byPriority: {
        high: this.tasks.filter(t => t.priority === 'high').length,
        medium: this.tasks.filter(t => t.priority === 'medium').length,
        low: this.tasks.filter(t => t.priority === 'low').length
      },
      byType: {
        artist: this.tasks.filter(t => t.type === 'artist').length,
        venue: this.tasks.filter(t => t.type === 'venue').length,
        show: this.tasks.filter(t => t.type === 'show').length,
        setlist: this.tasks.filter(t => t.type === 'setlist').length,
        song: this.tasks.filter(t => t.type === 'song').length
      }
    };
  }
  
  /**
   * Clear the queue
   */
  async clear(): Promise<void> {
    this.tasks = [];
    await this.persistQueueToDatabase();
  }
} 