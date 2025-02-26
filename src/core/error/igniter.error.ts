import chalk from 'chalk';

/**
 * Custom error class for Igniter Framework
 * Provides structured error handling with styled logging and detailed information
 */
export class IgniterError extends Error {
  public readonly code: string;
  public readonly details?: unknown;
  public readonly metadata?: Record<string, unknown>;
  public readonly causer?: string;
  public readonly stackTrace?: string;

  constructor({
    message,
    code,
    log = false,
    causer,
    details,
    metadata
  }: {
    message: string;
    code: string;
    log?: boolean;
    causer?: string;
    details?: unknown;
    metadata?: Record<string, unknown>;
  }) {
    super(message);

    this.name = 'IgniterError';
    this.code = code;
    this.details = details;
    this.metadata = metadata;
    this.stackTrace = this.stack;

    // Business Rule: Log error with styled console output
    if(log) this.logError();
  }

  /**
   * Formats and logs the error with styled console output similar to NestJS
   */
  private async logError(): Promise<void> {
    // Business Rule: Create a visually distinct error boundary
    const separator = chalk.red('━'.repeat(50));
    console.log('\n' + separator);

    // Business Rule: Display main error information in a structured format
    console.log(
      chalk.red.bold('⚠ IGNITER ERROR\n')
    );

    // Business Rule: Show error code and message in separate lines for better readability
    console.log(
      chalk.red('Code:    ') + chalk.yellow(`${this.code}`),
      '\n' + chalk.red('Message: ') + chalk.yellow(`${this.message}`)
    );

    // Business Rule: Log additional information in a structured format if available
    if (this.details) {
      console.log('\n' + chalk.red('Details: '));
      console.log(chalk.gray(JSON.stringify(this.details, null, 2)));
    }

    if (this.metadata) {
      console.log('\n' + chalk.red('Metadata: '));
      console.log(chalk.gray(JSON.stringify(this.metadata, null, 2)));
    }

    if (this.stackTrace) {
      console.log('\n' + chalk.red('Stack Trace: '));
      console.log(chalk.gray(this.stackTrace));
    }

    console.log(separator + '\n');
  }

  /**
   * Creates a serializable version of the error
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      metadata: this.metadata,
      stackTrace: this.stackTrace
    };
  }
}