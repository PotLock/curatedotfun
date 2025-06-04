export const isProduction = process.env.NODE_ENV === "production";
export const isTest = process.env.NODE_ENV === "test";
export const isStaging = process.env.RAILWAY_ENVIRONMENT_NAME === "staging";

console.log(
  "Using environment: ",
  process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV,
);
export class ConfigService {
  public constructor() {}
}
