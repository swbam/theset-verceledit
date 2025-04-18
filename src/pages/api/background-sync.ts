import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/integrations/supabase/utils';
import { SyncManager } from '@/lib/syncManager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient({ req, res });
    
    // Check if user is authenticated and is an admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if user is an admin
    const { data: adminCheck } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', session.user.id)
      .single();
      
    if (!adminCheck) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { operation, limit = 5 } = req.body;

    switch (operation) {
      case 'process':
        // Process pending tasks
        const processedCount = await SyncManager.processBackgroundTasks(limit);
        return res.status(200).json({ 
          success: true, 
          message: `Processed ${processedCount} tasks`, 
          processedCount 
        });

      case 'status':
        // Get status of sync tasks
        const { data: tasks, error } = await supabase
          .from('sync_tasks')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        return res.status(200).json({ 
          success: true, 
          tasks 
        });

      default:
        return res.status(400).json({ error: 'Invalid operation' });
    }
  } catch (error) {
    console.error('Error in background-sync API:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    });
  }
}
