import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from './logger';

type FileWatcherEvents = {
  change: (filePath: string) => void;
  error: (error: Error) => void;
};

export class FileWatcher {
  private logger = createLogger('FileWatcher');
  private watcher: fs.FSWatcher | null = null;

  constructor(
    private filePath: string,
    private events: FileWatcherEvents
  ) {
    this.filePath = path.resolve(filePath);
  }

  public start() {
    if (this.watcher) {
      this.logger.warn('Watcher is already running.');
      return;
    }

    this.logger.info(`Starting watcher for: ${this.filePath}`);

    try {
      this.watcher = fs.watch(this.filePath, (eventType) => {
        if (eventType === 'change') {
          this.logger.info(`File changed: ${this.filePath}`);
          this.events.change(this.filePath);
        }
      });

      this.watcher.on('error', (error) => {
        this.logger.error('Watcher error:', error);
        this.events.error(error);
        this.stop();
      });

    } catch (error) {
      this.logger.error(`Failed to start watcher for: ${this.filePath}`, error as object);
      this.events.error(error as Error);
    }
  }

  public stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.logger.info(`Watcher stopped for: ${this.filePath}`);
    }
  }
}
