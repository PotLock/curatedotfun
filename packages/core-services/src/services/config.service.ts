export const isProduction = process.env.NODE_ENV === "production";
export const isTest = process.env.NODE_ENV === "test";
export const isStaging = process.env.RAILWAY_ENVIRONMENT_NAME === "staging";

console.log(
  "Using environment: ",
  process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV,
);

export const featureFlags = {
  enableDistribution: Boolean(process.env.ENABLE_DISTRIBUTION) || false,
};

export class ConfigService {
  public constructor() {}

  public getFeatureFlag(flagName: keyof typeof featureFlags): boolean {
    return featureFlags[flagName];
  }
}
