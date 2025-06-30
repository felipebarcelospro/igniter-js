import chalk from 'chalk';

// Browser detection - check for Node.js specific objects
const isBrowser = typeof process === 'undefined' || typeof process.versions === 'undefined' || typeof process.versions.node === 'undefined';

// Dynamic import for yocto-spinner (only on server)
let yoctoSpinner: any = null;
if (!isBrowser) {
  try {
    yoctoSpinner = require('yocto-spinner');
  } catch (error) {
    // Fallback if yocto-spinner is not available
    console.warn('yocto-spinner not available, using static spinner');
  }
}

export class SpinnerManager {
  private readonly colorize: boolean;
  private readonly disableSpinner: boolean;
  private readonly indentLevel: number;
  private activeSpinners: Map<string, any> = new Map();

  constructor(options: { colorize: boolean; disableSpinner: boolean; indentLevel: number }) {
    this.colorize = options.colorize;
    this.disableSpinner = options.disableSpinner;
    this.indentLevel = options.indentLevel;
  }

  /**
   * Create a spinner with Igniter.js styling
   * If disableSpinner is true or running in browser, uses static ANSI icons instead
   */
  createSpinner(text: string, id?: string): {
    start: () => any,
    success: (successText?: string) => void,
    error: (errorText?: string) => void,
    warn: (warnText?: string) => void,
    stop: (finalText?: string) => void,
    update: (newText: string) => void
  } {
    const spinnerId = id || Math.random().toString(36).substr(2, 9);

    // If spinners are disabled, in browser, or yocto-spinner not available, use static icons
    if (this.disableSpinner || isBrowser || !yoctoSpinner) {
      return this.createStaticSpinner(text, spinnerId);
    }

    return {
      start: () => {
        // Clear any existing spinner with the same ID
        const existingSpinner = this.activeSpinners.get(spinnerId);
        if (existingSpinner) {
          existingSpinner.stop();
          this.activeSpinners.delete(spinnerId);
        }

        const spinner = yoctoSpinner.default || yoctoSpinner;
        const spinnerInstance = spinner({
          text: this.colorize ? chalk.white(text) : text,
          color: 'cyan',
          spinner: {
            frames: ['◒', '◐', '◓', '◑'], // Igniter.js spinner frames
            interval: 120
          }
        });

        this.activeSpinners.set(spinnerId, spinnerInstance);
        return spinnerInstance.start();
      },

      success: (successText?: string) => {
        const spinner = this.activeSpinners.get(spinnerId);
        if (spinner) {
          const finalText = successText || text;
          spinner.success(this.colorize ? chalk.green(finalText) : finalText);
          this.activeSpinners.delete(spinnerId);
          // Ensure clean line after spinner completion
          process.stdout.write('');
        }
      },

      error: (errorText?: string) => {
        const spinner = this.activeSpinners.get(spinnerId);
        if (spinner) {
          const finalText = errorText || text;
          spinner.error(this.colorize ? chalk.red(finalText) : finalText);
          this.activeSpinners.delete(spinnerId);
          // Ensure clean line after spinner completion
          process.stdout.write('');
        }
      },

      warn: (warnText?: string) => {
        const spinner = this.activeSpinners.get(spinnerId);
        if (spinner) {
          const finalText = warnText || text;
          spinner.warning(this.colorize ? chalk.yellow(finalText) : finalText);
          this.activeSpinners.delete(spinnerId);
          // Ensure clean line after spinner completion
          process.stdout.write('');
        }
      },

      stop: (finalText?: string) => {
        const spinner = this.activeSpinners.get(spinnerId);
        if (spinner) {
          if (finalText) {
            spinner.stop(finalText);
          } else {
            spinner.stop();
          }
          this.activeSpinners.delete(spinnerId);
          // Ensure clean line after spinner stop
          process.stdout.write('');
        }
      },

      update: (newText: string) => {
        const spinner = this.activeSpinners.get(spinnerId);
        if (spinner) {
          spinner.text = this.colorize ? chalk.white(newText) : newText;
        }
      }
    };
  }

  /**
   * Create a static spinner (no animation, just ANSI icons)
   * Perfect for multi-process environments to avoid terminal pollution
   */
  private createStaticSpinner(text: string, spinnerId: string): {
    start: () => any,
    success: (successText?: string) => void,
    error: (errorText?: string) => void,
    warn: (warnText?: string) => void,
    stop: (finalText?: string) => void,
    update: (newText: string) => void
  } {
    let currentText = text;
    let isActive = false;

    const connector = this.indentLevel > 0 ? '│ ' : '';

    return {
      start: () => {
        isActive = true;
        const line = this.colorize
          ? `${connector}${chalk.cyan('◐')} ${chalk.white(currentText)}`
          : `${connector}◐ ${currentText}`;
        console.log(line);
        return { stop: () => { } }; // Mock spinner interface
      },

      success: (successText?: string) => {
        if (isActive) {
          const finalText = successText || currentText;
          const line = this.colorize
            ? `${connector}${chalk.green('◆')} ${chalk.green(finalText)}`
            : `${connector}◆ ${finalText}`;
          console.log(line);
          isActive = false;
        }
      },

      error: (errorText?: string) => {
        if (isActive) {
          const finalText = errorText || currentText;
          const line = this.colorize
            ? `${connector}${chalk.red('◇')} ${chalk.red(finalText)}`
            : `${connector}◇ ${finalText}`;
          console.log(line);
          isActive = false;
        }
      },

      warn: (warnText?: string) => {
        if (isActive) {
          const finalText = warnText || currentText;
          const line = this.colorize
            ? `${connector}${chalk.yellow('◇')} ${chalk.yellow(finalText)}`
            : `${connector}◇ ${finalText}`;
          console.log(line);
          isActive = false;
        }
      },

      stop: (finalText?: string) => {
        if (isActive) {
          if (finalText) {
            const line = this.colorize
              ? `${connector}${chalk.gray('○')} ${chalk.gray(finalText)}`
              : `${connector}○ ${finalText}`;
            console.log(line);
          }
          isActive = false;
        }
      },

      update: (newText: string) => {
        currentText = newText;
        if (isActive) {
          const line = this.colorize
            ? `${connector}${chalk.cyan('◐')} ${chalk.white(newText)}`
            : `${connector}◐ ${newText}`;
          console.log(line);
        }
      }
    };
  }

  clearSpinners(): void {
    for (const [id, spinner] of this.activeSpinners) {
      spinner.stop();
    }
    this.activeSpinners.clear();
  }

  pauseSpinners(): void {
    for (const [id, spinner] of this.activeSpinners) {
      if (spinner && typeof spinner.stop === 'function') {
        spinner.stop();
      }
    }
    // Clear the line to ensure clean output
    process.stdout.write('\r\x1b[K');
  }

  resumeSpinners(): void {
    // Note: Due to yocto-spinner's design, we can't truly "resume" a stopped spinner
    // This method is kept for API compatibility but won't restart spinners
    // Users should handle spinner lifecycle manually for better control
  }
}

/**
 * Create a detached spinner (not tied to logger instance)
 * Browser-safe implementation
 */
export function createDetachedSpinner(text: string, options?: { color?: string }): {
  start: () => any,
  success: (successText?: string) => void,
  error: (errorText?: string) => void,
  warn: (warnText?: string) => void,
  stop: (finalText?: string) => void,
  update: (newText: string) => void
} {
  let spinner: any = null;

  // Browser-safe fallback
  if (isBrowser || !yoctoSpinner) {
    return {
      start: () => {
        console.log(chalk.cyan('◐') + ' ' + chalk.white(text));
        return {};
      },
      success: (successText?: string) => {
        console.log(chalk.green('◆') + ' ' + chalk.green(successText || text));
      },
      error: (errorText?: string) => {
        console.log(chalk.red('◇') + ' ' + chalk.red(errorText || text));
      },
      warn: (warnText?: string) => {
        console.log(chalk.yellow('◇') + ' ' + chalk.yellow(warnText || text));
      },
      stop: (finalText?: string) => {
        if (finalText) {
          console.log(chalk.gray('○') + ' ' + chalk.gray(finalText));
        }
      },
      update: (newText: string) => {
        console.log(chalk.cyan('◐') + ' ' + chalk.white(newText));
      }
    };
  }

  return {
    start: () => {
      // Clear any existing spinner first
      if (spinner) {
        spinner.stop();
        spinner = null;
      }

      const spinnerFn = yoctoSpinner.default || yoctoSpinner;
      spinner = spinnerFn({
        text: chalk.white(text),
        color: options?.color || 'cyan',
        spinner: {
          frames: ['◒', '◐', '◓', '◑'], // Igniter.js spinner frames
          interval: 120
        },
      });
      return spinner.start();
    },

    success: (successText?: string) => {
      if (spinner) {
        const finalText = successText || text;
        spinner.success(chalk.green(finalText));
        process.stdout.write(''); // Ensure clean line after completion
        spinner = null;
      }
    },

    error: (errorText?: string) => {
      if (spinner) {
        const finalText = errorText || text;
        spinner.error(chalk.red(finalText));
        process.stdout.write(''); // Ensure clean line after completion
        spinner = null;
      }
    },

    warn: (warnText?: string) => {
      if (spinner) {
        const finalText = warnText || text;
        spinner.warning(chalk.yellow(finalText));
        process.stdout.write(''); // Ensure clean line after completion
        spinner = null;
      }
    },

    stop: (finalText?: string) => {
      if (spinner) {
        if (finalText) {
          spinner.stop(finalText);
        } else {
          spinner.stop();
        }
        process.stdout.write('\r\x1b[K'); // Clear the line and ensure clean output
        spinner = null;
      }
    },

    update: (newText: string) => {
      if (spinner) {
        spinner.text = chalk.white(newText);
      }
    }
  };
}