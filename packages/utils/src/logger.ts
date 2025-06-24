import pino, { LoggerOptions, DestinationStream } from "pino";
import pretty from "pino-pretty";

const isProduction = process.env.NODE_ENV === "production";

// Helper function to serialize error objects properly
const errorSerializer = (err: any) => {
  if (!err) return err;

  // If it's not an object, just return it
  if (typeof err !== "object") return err;

  // Handle ZodError specifically for more compact logging
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
      issues: err.issues, // Keep original issues for full context if needed
    };
  }

  // Create a base serialized error
  const serialized: Record<string, any> = {
    message: err.message || "Unknown error",
    name: err.name,
    stack: err.stack,
  };

  // Add all enumerable properties
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

  // Handle nested error objects
  if (err.original) {
    serialized.original = errorSerializer(err.original);
  }

  // Handle PostgreSQL specific properties
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
  const prettyTransport = pretty({
    colorize: true,
    translateTime: "HH:MM:ss",
    ignore: "pid,hostname,service,component",
    messageFormat: (log, messageKey) => {
      const serviceName = log.service;
      const componentName = log.component;
      const msg = log[messageKey];
      if (componentName) {
        return `[${serviceName}] (${componentName}) ${msg}`;
      }
      return `[${serviceName}] ${msg}`;
    },
  });

  const options: LoggerOptions = {
    level: level ?? (isProduction ? "warn" : "info"),
    serializers: {
      err: errorSerializer,
      error: errorSerializer,
    },
    base: {
      service,
    },
    ...(isProduction && {
      redact: ["*.password", "*.token", "*.key", "*.secret"],
    }),
  };

  const transport: DestinationStream = isProduction
    ? pino.destination(1)
    : prettyTransport;

  return pino(options, transport);
};
