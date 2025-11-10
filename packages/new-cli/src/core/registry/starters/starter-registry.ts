import { BaseStarter } from './base-starter';

export class StarterRegistry {
  private starters = new Map<string, BaseStarter>();
  
  static create() {
    return new StarterRegistry();
  }

  register(starter: BaseStarter) {
    this.starters.set(starter.id, starter);
    return this;
  }

  build() {
    return {
      get: (value: string): BaseStarter | undefined => {
        return this.starters.get(value);
      },
      getMany: (values: string[]): BaseStarter[] => {
        return values.map(value => this.starters.get(value)).filter(Boolean) as BaseStarter[];
      },
      getAll: (): BaseStarter[] => {
        return Array.from(this.starters.values());
      }
    }
  }
}
