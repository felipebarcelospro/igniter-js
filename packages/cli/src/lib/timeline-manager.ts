import type { IgniterLogger } from '@igniter-js/core';

/**
 * Simple timeline manager that leverages existing logger functionality
 * to create a visual step-by-step process with ANSI icons
 */
export class TimelineManager {
  private logger: IgniterLogger;
  private currentStep: number = 0;
  private totalSteps: number = 0;
  private startTime: number = Date.now();

  constructor(logger: IgniterLogger) {
    this.logger = logger;
  }

  /**
   * Start a new timeline process
   */
  start(title: string, totalSteps: number): void {
    this.totalSteps = totalSteps;
    this.currentStep = 0;
    this.startTime = Date.now();
    
    // Use existing logger group method for the main title
    this.logger.group(title);
  }

  /**
   * Start a new step in the timeline
   */
  step(description: string): void {
    this.currentStep++;
    const progress = `[${this.currentStep}/${this.totalSteps}]`;
    
    // Use existing logger info method with custom context
    this.logger.info(`${progress} ▶ ${description}`, { _type: 'step' });
  }

  /**
   * Mark current step as successful with optional details
   */
  stepSuccess(message: string, details?: Record<string, any>): void {
    // Use existing logger success method
    this.logger.success(message, details);
  }

  /**
   * Add sub-step information
   */
  substep(message: string, details?: Record<string, any>): void {
    // Use existing logger info method for substeps
    this.logger.info(`└─ ${message}`, details);
  }

  /**
   * Mark step as failed
   */
  stepError(message: string, error?: Error): void {
    this.logger.error(message, undefined, error);
  }

  /**
   * Complete the timeline process
   */
  complete(message?: string): void {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const finalMessage = message || 'Process completed';
    
    // Use existing logger success method for completion
    this.logger.success(`${finalMessage} (${duration}s)`);
    
    // End the group
    this.logger.groupEnd();
  }

  /**
   * Fail the timeline process
   */
  fail(message: string, error?: Error): void {
    this.logger.error(message, undefined, error);
    this.logger.groupEnd();
  }
}

/**
 * Factory function to create a TimelineManager
 */
export function createTimelineManager(logger: IgniterLogger): TimelineManager {
  return new TimelineManager(logger);
}