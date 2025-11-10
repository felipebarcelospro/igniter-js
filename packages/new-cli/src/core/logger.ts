import * as p from '@clack/prompts';
import * as color from 'picocolors';

class Logger {
  private component: string;

  constructor(component: string) {
    this.component = component;
  }

  private formatMessage(level: string, message: string, data?: object) {
    const timestamp = new Date().toISOString();
    const componentInfo = this.component ? `[${this.component}] ` : '';
    const dataString = data ? ` ${JSON.stringify(data)}` : '';
    return `${color.dim(timestamp)} ${level} ${componentInfo}${message}${dataString}`;
  }

  info(message: string, data?: object) {
    p.log.info(this.formatMessage(color.blue('INFO'), message, data));
  }

  warn(message: string, data?: object) {
    p.log.warn(this.formatMessage(color.yellow('WARN'), message, data));
  }

  error(message: string, data?: object) {
    p.log.error(this.formatMessage(color.red('ERROR'), message, data));
  }

  success(message: string, data?: object) {
    p.log.success(this.formatMessage(color.green('SUCCESS'), message, data));
  }
}

export function createLogger(component: string) {
  return new Logger(component);
}
