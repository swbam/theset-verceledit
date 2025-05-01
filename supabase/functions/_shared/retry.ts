/**
 * Utility function to retry failed API calls with exponential backoff.
 * Suitable for use in Edge Functions.
 */
export async function retryableFetch<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, onRetry } = options;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt > retries) {
        console.error("Request failed after multiple retries:", error);
        throw error;
      }

      console.log(`Retrying failed request... ${retries - attempt + 1} attempts left`);
      
      if (onRetry && error instanceof Error) {
        onRetry(error, attempt);
      }

      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw new Error("Unexpected end of retryableFetch");
}

// Note: In-memory cache (`withCache`) is not suitable for stateless Edge Functions
// and has been omitted from this shared utility file. Caching should be handled
// at a different layer if needed (e.g., Supabase database, external cache service).