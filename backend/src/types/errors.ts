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
