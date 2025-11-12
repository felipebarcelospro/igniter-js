import type { BaseAddOn } from "./base-addon";

export class AddOnRegistry {
  private addOns = new Map<string, BaseAddOn>();

  static create() {
    return new AddOnRegistry();
  }

  register(addOn: BaseAddOn) {
    this.addOns.set(addOn.value, addOn);
    return this;
  }

  build() {
    return {
      get: (value: string): BaseAddOn | undefined => {
        return this.addOns.get(value);
      },
      getMany: (values: string[]): BaseAddOn[] => {
        return values
          .map((value) => this.addOns.get(value))
          .filter(Boolean) as BaseAddOn[];
      },
      getAll: (): BaseAddOn[] => {
        return Array.from(this.addOns.values());
      },
    };
  }
}

// Legacy type alias for backward compatibility
export type FeatureRegistry = AddOnRegistry;
