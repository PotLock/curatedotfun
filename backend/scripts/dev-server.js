#!/usr/bin/env node
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Path to the dist directory
const distDir = path.join(__dirname, "../dist");
const mainJsPath = path.join(distDir, "main.js");
const envPath = path.join(__dirname, "../.env");

// Load environment variables from .env file
let envVars = {};
if (fs.existsSync(envPath)) {
  console.log(`📄 Loading environment variables from ${envPath}`);
  envVars = dotenv.parse(fs.readFileSync(envPath));
} else {
  console.warn(`⚠️ No .env file found at ${envPath}`);
  // Create a default .env file with DATABASE_URL if it doesn't exist
  if (process.env.DATABASE_URL) {
    console.log(`📝 Creating default .env file with DATABASE_URL`);
    fs.writeFileSync(envPath, `DATABASE_URL=${process.env.DATABASE_URL}\n`);
    envVars = { DATABASE_URL: process.env.DATABASE_URL };
  }
}

let serverProcess = null;
let isRestarting = false;

// Function to start or restart the server
function startServer() {
  // Prevent multiple restarts from happening simultaneously
  if (isRestarting) return;
  isRestarting = true;

  // Kill existing server process if it exists
  if (serverProcess) {
    console.log("🔄 Restarting server...");
    serverProcess.kill("SIGTERM");

    // Give the process some time to shut down gracefully
    setTimeout(() => {
      launchNewServer();
    }, 500);
  } else {
    launchNewServer();
  }
}

function launchNewServer() {
  try {
    // Start the server
    serverProcess = spawn("node", [mainJsPath], {
      stdio: "inherit",
      env: {
        ...process.env,
        ...envVars,
        NODE_ENV: "development",
      },
    });

    serverProcess.on("error", (error) => {
      console.error("Failed to start server:", error);
      isRestarting = false;
    });

    serverProcess.on("exit", (code, signal) => {
      if (signal !== "SIGTERM") {
        console.log(
          `Server process exited with code ${code} and signal ${signal}`,
        );
      }
      isRestarting = false;
    });

    // Reset the restarting flag after a short delay
    setTimeout(() => {
      isRestarting = false;
    }, 1000);
  } catch (error) {
    console.error("Error launching server:", error);
    isRestarting = false;
  }
}

// Track if this is the first build
let initialBuildTime = 0;
let lastRestartTime = 0;

// Initial server start
// Wait a bit to ensure the initial build is complete
setTimeout(() => {
  if (fs.existsSync(mainJsPath)) {
    try {
      // Record the initial build time
      initialBuildTime = fs.statSync(mainJsPath).mtimeMs;
      lastRestartTime = Date.now();
      startServer();

      // Start watching for changes after the initial server start
      setupWatcher();
    } catch (error) {
      console.error("Error during initial server start:", error);
      process.exit(1);
    }
  } else {
    console.error(`❌ Server entry point not found at ${mainJsPath}`);
    console.log('Make sure to run "rspack build --watch" first');
    process.exit(1);
  }
}, 1000);

// Setup file watcher after initial server start
function setupWatcher() {
  let debounceTimer;
  let watcherInitialized = false;

  try {
    // Watch for changes in the dist directory
    const watcher = fs.watch(
      distDir,
      { recursive: true },
      (eventType, filename) => {
        if (!watcherInitialized) {
          watcherInitialized = true;
          return; // Skip initial events
        }

        // Debounce to avoid multiple restarts for the same build
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          try {
            if (filename && filename.endsWith(".js")) {
              const filePath = path.join(distDir, filename);

              // Check if file exists (it might have been deleted)
              if (!fs.existsSync(filePath)) {
                return;
              }

              // Check if this is a new build (not the initial one)
              const currentMtime = fs.statSync(filePath).mtimeMs;
              const now = Date.now();

              // Only restart if:
              // 1. This is a new change (not the initial build)
              // 2. It's been at least 2 seconds since the last restart (prevent rapid restarts)
              if (
                currentMtime > initialBuildTime &&
                now - lastRestartTime > 2000
              ) {
                console.log(`📦 Detected changes in ${filename}`);
                lastRestartTime = now;
                startServer();
              }
            }
          } catch (error) {
            console.error("Error in file watcher:", error);
          }
        }, 500); // 500ms debounce
      },
    );

    watcher.on("error", (error) => {
      console.error("File watcher error:", error);
    });

    console.log("🔍 Watching for file changes in dist directory");
  } catch (error) {
    console.error("Failed to setup file watcher:", error);
  }
}

// Handle process termination
process.on("SIGINT", () => {
  if (serverProcess) {
    console.log("Shutting down server...");
    serverProcess.kill("SIGTERM");
  }
  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
  }
  process.exit(1);
});
