import type { NextApiRequest, NextApiResponse } from 'next';
import { callTicketmasterApi } from '@/lib/api/ticketmaster-config'; // Assuming this utility exists and handles API key

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { eventId } = req.query;

  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ error: 'Ticketmaster Event ID is required' });
  }

  try {
    // Use the existing utility function which should handle the API key securely
    const eventData = await callTicketmasterApi(`events/${eventId}.json`);

    if (!eventData) {
      // callTicketmasterApi might return null or throw an error on failure
      // Adjust based on its actual behavior
      return res.status(404).json({ error: 'Event not found on Ticketmaster' });
    }

    return res.status(200).json(eventData);

  } catch (error) {
    console.error(`Error fetching Ticketmaster event data for ID ${eventId}:`, error);
    // Check if the error object has specific properties from callTicketmasterApi
    const statusCode = (error as any)?.statusCode || 500;
    const message = (error as any)?.message || 'Internal server error';
    const details = (error as any)?.details || (error instanceof Error ? error.message : 'An unknown error occurred');

    return res.status(statusCode).json({ error: message, details });
  }
}