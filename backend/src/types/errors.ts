export class PluginError extends Error {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = "PluginError";
  }
}

export class PluginLoadError extends PluginError {
  constructor(name: string, url: string, cause?: Error) {
    super(`Failed to load plugin ${name} from ${url}`, cause);
    this.name = "PluginLoadError";
  }
}

export class PluginInitError extends PluginError {
  constructor(name: string, cause?: Error) {
    super(`Failed to initialize plugin ${name}`, cause);
    this.name = "PluginInitError";
  }
}

export class PluginExecutionError extends PluginError {
  constructor(name: string, operation: string, cause?: Error) {
    super(`Plugin ${name} failed during ${operation}`, cause);
    this.name = "PluginExecutionError";
  }
}

export type TransformStage = "global" | "distributor" | "batch";

export class TransformError extends Error {
  constructor(
    public readonly plugin: string,
    public readonly stage: TransformStage,
    public readonly index: number,
    message: string,
    public readonly cause?: Error,
  ) {
    super(
      `Transform error in ${stage} transform #${index + 1} (${plugin}): ${message}`,
    );
    this.name = "TransformError";
  }
}

export class ProcessorError extends Error {
  constructor(
    public readonly feedId: string,
    message: string,
    public readonly cause?: Error,
  ) {
    super(`Processing error for feed ${feedId}: ${message}`);
    this.name = "ProcessorError";
  }
}
