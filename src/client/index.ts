export interface SteelComponentOptions {
  STEEL_API_KEY?: string;
}

export interface SteelComponentContext {
  readonly component: unknown;
  readonly options?: SteelComponentOptions;
}

export class SteelComponent {
  constructor(
    public readonly component: unknown,
    public readonly options: SteelComponentOptions = {},
  ) {}

  // Placeholder for future app-facing wrapper methods.
}
