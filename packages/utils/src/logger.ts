import pino, {
  DestinationStream,
  LogDescriptor,
  LoggerOptions,
  stdTimeFunctions,
} from "pino";
import pretty from "pino-pretty";
import ora, { Ora } from "ora";
import stringWidth from "string-width";

const env = process.env.NODE_ENV;

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
  const isProduction = env === "production" || env === "staging";
  let defaultLogLevel: string;
  if (isProduction) {
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

  if (isProduction) {
    pinoOptions.timestamp = stdTimeFunctions.isoTime;
    pinoOptions.formatters = {
      level: (label) => ({ level: label }),
    };
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
    return pino(pinoOptions);
  } else {
    const transport = pretty({
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
    return pino(pinoOptions, transport);
  }
};

// Spinner states
const spinners: { [key: string]: Ora } = {};

// Box drawing characters for sections
const boxChars = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
};

// Fixed width for all boxes
const BOX_WIDTH = 45;

const isProduction = env === "production" || env === "staging";

// Create a section header
export const createSection = (title: string): void => {
  if (isProduction) return;
  // Create the borders with fixed width
  const topBorder =
    boxChars.topLeft +
    boxChars.horizontal.repeat(BOX_WIDTH) +
    boxChars.topRight;
  const bottomBorder =
    boxChars.bottomLeft +
    boxChars.horizontal.repeat(BOX_WIDTH) +
    boxChars.bottomRight;

  // Create a line with the title centered
  const titleLine = formatBoxLine(title, BOX_WIDTH, boxChars.vertical);

  console.log("\n" + topBorder);
  console.log(titleLine);
  console.log(bottomBorder);
};

// Create a highlighted box for important messages
export const createHighlightBox = (message: string): void => {
  if (isProduction) return;
  const lines = message.split("\n");

  // Create the borders with fixed width
  const topBorder = "┏" + "━".repeat(BOX_WIDTH) + "┓";
  const bottomBorder = "┗" + "━".repeat(BOX_WIDTH) + "┛";

  console.log("\n" + topBorder);

  // Process each line
  for (const line of lines) {
    console.log(formatBoxLine(line, BOX_WIDTH, "┃"));
  }

  console.log(bottomBorder + "\n");
};

// Helper function to format a line with exact width
function formatBoxLine(
  text: string,
  width: number,
  borderChar: string,
): string {
  // Get the visual width of the text (handles emojis, CJK characters, etc.)
  const visualWidth = stringWidth(text);

  // If text is too long, truncate it
  if (visualWidth > width) {
    // Find a substring that fits within the width
    let truncatedText = "";
    let truncatedWidth = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charWidth = stringWidth(char);
      if (truncatedWidth + charWidth + 3 <= width) {
        // +3 for "..."
        truncatedText += char;
        truncatedWidth += charWidth;
      } else {
        break;
      }
    }
    return borderChar + " " + truncatedText + "... " + borderChar;
  }

  // Calculate padding for centering
  const totalPadding = width - visualWidth;
  const leftPadding = Math.floor(totalPadding / 2);
  const rightPadding = totalPadding - leftPadding;

  // Create the centered line with exact width
  return (
    borderChar +
    " ".repeat(leftPadding) +
    text +
    " ".repeat(rightPadding) +
    borderChar
  );
}

// Spinner functions
export const startSpinner = (key: string, text: string): void => {
  if (isProduction) return;
  if (spinners[key]) {
    spinners[key].text = text;
    return;
  }
  spinners[key] = ora({
    text: `${text}`,
    color: "cyan",
    spinner: "dots",
  }).start();
};

export const updateSpinner = (key: string, text: string): void => {
  if (isProduction) return;
  if (spinners[key]) {
    spinners[key].text = text;
  }
};

export const succeedSpinner = (key: string, text?: string): void => {
  if (isProduction) return;
  if (spinners[key]) {
    spinners[key].succeed(text);
    delete spinners[key];
  }
};

export const failSpinner = (key: string, text?: string): void => {
  if (isProduction) return;
  if (spinners[key]) {
    spinners[key].fail(text);
    delete spinners[key];
  }
};

export const clearSpinner = (key: string): void => {
  if (isProduction) return;
  if (spinners[key]) {
    spinners[key].stop();
    delete spinners[key];
  }
};

// Cleanup function to clear all spinners
export const cleanup = (): void => {
  if (isProduction) return;
  Object.keys(spinners).forEach((key) => {
    clearSpinner(key);
  });
};

// Register cleanup on process exit
process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});
