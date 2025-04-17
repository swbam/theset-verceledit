interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Utility function to retry failed operations with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    minTimeout = 1000,
    maxTimeout = 5000,
    onRetry = () => {}
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === retries - 1) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        Math.round(
          Math.random() * // Add jitter
          Math.min(maxTimeout, minTimeout * Math.pow(2, attempt))
        ),
        maxTimeout
      );

      onRetry(lastError, attempt + 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!; // TypeScript control flow analysis doesn't know this is unreachable
}
