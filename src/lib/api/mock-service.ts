
import { toast } from "sonner";

/**
 * Creates a mock WebSocket connection for real-time voting
 * This is used in the demo environment where we don't have a real WebSocket server
 */
export function createMockWebSocketConnection(showId: string) {
  console.log("Creating mock WebSocket connection for show", showId);
  
  // Return a fake WebSocket interface
  return {
    connect: () => {
      console.log(`Mock WebSocket connected for show ${showId}`);
      return Promise.resolve();
    },
    subscribe: (callback: (data: any) => void) => {
      console.log(`Mock WebSocket subscribed for show ${showId}`);
      // We don't actually send any real-time updates in the mock
      return () => {
        console.log(`Mock WebSocket unsubscribed for show ${showId}`);
      };
    },
    sendVote: (songId: string, userId: string) => {
      console.log(`Mock WebSocket sending vote for song ${songId} by user ${userId}`);
      // We don't actually do anything with this in the mock
      return Promise.resolve();
    },
    close: () => {
      console.log(`Closing mock WebSocket connection for show ${showId}`);
    }
  };
}

/**
 * Helper function to format an artist name for use in URLs and IDs
 */
export function formatArtistNameForUrl(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
}

/**
 * Format a date for display
 */
export function formatDate(dateString?: string, includeTime = false): string {
  if (!dateString) return "TBA";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "TBA";
    
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    };
    
    if (includeTime) {
      options.hour = 'numeric';
      options.minute = '2-digit';
    }
    
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch (error) {
    console.error("Date formatting error:", error);
    return "TBA";
  }
}
