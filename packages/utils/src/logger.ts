import pino, {
  DestinationStream,
  LoggerOptions,
  stdTimeFunctions,
  LogDescriptor,
} from "pino";
import pretty from "pino-pretty";

const env = process.env.NODE_ENV;
const useJsonLogging = env === "production" || env === "staging";

const errorSerializer = (err: any) => {
  if (!err) return err;
  if (typeof err !== "object") return err;
  if (err.issues && Array.isArray(err.issues)) {
    const zodIssues = err.issues
      .map((issue: any) => {
        const path = issue.path.join(".");
        return `${path} (${issue.code}): ${issue.message}`;
      })
      .join("; ");
    return {
      message: `ZodError: ${zodIssues}`,
      name: err.name,
      stack: err.stack,
      issues: err.issues,
    };
  }
  const serialized: Record<string, any> = {
    message: err.message || "Unknown error",
    name: err.name,
    stack: err.stack,
  };
  for (const key in err) {
    if (
      Object.prototype.hasOwnProperty.call(err, key) &&
      key !== "message" &&
      key !== "name" &&
      key !== "stack"
    ) {
      serialized[key] = err[key];
    }
  }
  if (err.original) {
    serialized.original = errorSerializer(err.original);
  }
  const pgProps = [
    "code",
    "detail",
    "hint",
    "position",
    "internalPosition",
    "internalQuery",
    "where",
    "schema",
    "table",
    "column",
    "dataType",
    "constraint",
    "severity",
  ];
  for (const prop of pgProps) {
    if (prop in err) {
      serialized[prop] = err[prop];
    }
  }
  return serialized;
};

interface CreateLoggerOptions {
  service: string;
  level?: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
}

export const createLogger = ({
  service,
  level,
}: CreateLoggerOptions): pino.Logger => {
  let defaultLogLevel: string;
  if (env === "production") {
    defaultLogLevel = "warn";
  } else if (env === "staging") {
    defaultLogLevel = "info";
  } else {
    defaultLogLevel = "info";
  }

  const pinoOptions: LoggerOptions = {
    level: level ?? defaultLogLevel,
    serializers: {
      err: errorSerializer,
      error: errorSerializer,
    },
    base: {
      pid: undefined, // Railway adds its own identifiers
      hostname: undefined, // Railway adds its own identifiers
      service,
    },
  };

  let transport: DestinationStream;

  if (useJsonLogging) {
    pinoOptions.timestamp = stdTimeFunctions.isoTime;
    pinoOptions.formatters = {
      level: (label) => ({ level: label }),
    };
    if (env === "production") {
      pinoOptions.redact = {
        paths: [
          "*.password",
          "*.token",
          "*.key",
          "*.secret",
          "req.headers.authorization",
          "Authorization",
        ],
        censor: "[REDACTED]",
      };
    }
    return pino(pinoOptions);
  } else {
    // For local development, use pino-pretty
    transport = pretty({
      colorize: true,
      translateTime: "HH:MM:ss",
      ignore: "pid,hostname,service,component", // pid,hostname,service are in base, component is per-log
      messageFormat: (log: LogDescriptor, messageKey: string) => {
        const currentService = log.service as string;
        const currentComponent = log.component as string | undefined;
        const message = (log[messageKey] || log.msg || "") as string;

        if (currentComponent) {
          return `[${currentService}] (${currentComponent}) ${message}`;
        }
        return `[${currentService}] ${message}`;
      },
    });
  }

  return pino(pinoOptions, transport);
};
