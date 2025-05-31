import pino from "pino";
import pretty from "pino-pretty";
import ora, { Ora } from "ora";
import stringWidth from "string-width";

// Helper function to serialize error objects properly
const errorSerializer = (err: any) => {
  if (!err) return err;

  // If it's not an object, just return it
  if (typeof err !== "object") return err;

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

// Create a custom pretty transport
const prettyTransport = pretty({
  colorize: true,
  translateTime: "HH:MM:ss",
  ignore: "pid,hostname",
  messageFormat: "{msg}",
});

// Configure pino logger
export const logger = pino(
  {
    level: "info",
    serializers: {
      err: errorSerializer,
      error: errorSerializer,
    },
  },
  prettyTransport,
);

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

// Create a section header
export const createSection = (title: string): void => {
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
  if (spinners[key]) {
    spinners[key].text = text;
  }
};

export const succeedSpinner = (key: string, text?: string): void => {
  if (spinners[key]) {
    spinners[key].succeed(text);
    delete spinners[key];
  }
};

export const failSpinner = (key: string, text?: string): void => {
  if (spinners[key]) {
    spinners[key].fail(text);
    delete spinners[key];
  }
};

export const clearSpinner = (key: string): void => {
  if (spinners[key]) {
    spinners[key].stop();
    delete spinners[key];
  }
};

// Cleanup function to clear all spinners
export const cleanup = (): void => {
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
