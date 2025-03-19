
/**
 * Type definitions for the user journey test
 */

// Error tracking
export interface ErrorLog {
  step: string;
  source: "API" | "Database" | "Client";
  message: string;
  timestamp: Date;
  details?: any;
}

// Success tracking
export interface SuccessLog {
  step: string;
  message: string;
  timestamp: Date;
  details?: any;
}

// Test results
export interface TestResults {
  startTime: Date;
  endTime: Date | null;
  errors: ErrorLog[];
  successes: SuccessLog[];
  completed: boolean;
}
