import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/integrations/supabase/utils';
import { SyncManager } from '@/lib/syncManager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient({ req, res });
    
    // Get the request body
    const { 
      entityType, 
      entityId, 
      priority = 'normal',
      sync = [],
      test = false,
      fullPipeline = false
    } = req.body;

    // Validate required fields unless it's a test
    if (!test && (!entityType || !entityId)) {
      return res.status(400).json({ 
        error: 'Missing required fields: entityType and entityId' 
      });
    }

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // For test requests, we need to check if the user is an admin
    if (test) {
      const { data: adminCheck } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', session.user.id)
        .single();
        
      if (!adminCheck) {
        return res.status(403).json({ error: 'Forbidden: Admin access required for test operations' });
      }
      
      if (fullPipeline) {
        // Run a full pipeline test
        const taskId = await SyncManager.queueBackgroundSync('artist', '1f9e8a14-7bca-4f1e-b2d3-431fe1e31595', {
          priority: 'high',
          dependencies: [],
          entityName: 'Coldplay (Test)',
          data: { test: true, fullPipeline: true }
        });
        
        return res.status(200).json({ 
          success: true, 
          message: 'Full pipeline test started', 
          taskId 
        });
      }
      
      // Return success for simple test
      return res.status(200).json({ 
        success: true, 
        message: 'Test successful' 
      });
    }

    // Queue the sync task
    const taskId = await SyncManager.queueBackgroundSync(entityType, entityId, {
      priority: priority === 'high' ? 'high' : 'normal',
      dependencies: [],
      data: { sync }
    });

    // Process background tasks immediately
    SyncManager.processBackgroundTasks(5).catch(error => {
      console.error('Error processing background tasks:', error);
    });

    return res.status(200).json({ 
      success: true, 
      message: `Sync task for ${entityType} queued successfully`, 
      taskId 
    });
  } catch (error) {
    console.error('Error in sync API:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    });
  }
}
