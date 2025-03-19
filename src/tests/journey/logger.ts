
import { ErrorLog, SuccessLog } from './types';

// Configuration
export const DETAILED_LOGGING = true;

/**
 * Logs an error during the test
 */
export const logError = (
  results: { errors: ErrorLog[] },
  step: string, 
  source: "API" | "Database" | "Client", 
  message: string, 
  details?: any
) => {
  const error: ErrorLog = {
    step,
    source,
    message,
    timestamp: new Date(),
    details
  };
  
  results.errors.push(error);
  
  if (DETAILED_LOGGING) {
    console.error(`❌ ERROR at ${step} (${source}): ${message}`, details || '');
  }
  
  return error;
};

/**
 * Logs a success during the test
 */
export const logSuccess = (
  results: { successes: SuccessLog[] },
  step: string, 
  message: string, 
  details?: any
) => {
  const success: SuccessLog = {
    step,
    message,
    timestamp: new Date(),
    details
  };
  
  results.successes.push(success);
  
  if (DETAILED_LOGGING) {
    console.log(`✅ SUCCESS at ${step}: ${message}`, details || '');
  }
  
  return success;
};
