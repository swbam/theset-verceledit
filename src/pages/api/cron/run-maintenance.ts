import { NextApiRequest, NextApiResponse } from 'next';
import { triggerMaintenanceJobs } from '@/lib/api/db/cron-jobs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get API key from request headers or body
    const apiKey = req.headers['x-api-key'] as string || req.body?.apiKey;

    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API key' });
    }

    // Run the maintenance jobs
    const results = await triggerMaintenanceJobs(apiKey);

    if ('error' in results) {
      return res.status(401).json(results);
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error('Error in maintenance job API route:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

// Configure to increase the API timeout for long-running jobs
export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
    externalResolver: true,
  },
}; 