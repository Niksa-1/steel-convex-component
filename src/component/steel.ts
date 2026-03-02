// Placeholder for steel client factory wiring.
export interface SteelSessionArgs {
  apiKey: string;
}

export const createSteelClient = (args: SteelSessionArgs) => {
  return { apiKey: args.apiKey } as const;
};
