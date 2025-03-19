
import { ErrorLog, SuccessLog, TestResults } from './types';

// Configuration
export const DETAILED_LOGGING = true;

/**
 * Logs an info message during the test
 */
export const logInfo = (message: string, details?: any) => {
  if (DETAILED_LOGGING) {
    console.log(`ℹ️ INFO: ${message}`, details || '');
  }
};

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

/**
 * Logs a warning during the test
 */
export const logWarning = (message: string, details?: any) => {
  if (DETAILED_LOGGING) {
    console.warn(`⚠️ WARNING: ${message}`, details || '');
  }
};
