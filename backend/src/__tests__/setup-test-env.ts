// Load environment variables from .env.test
import * as dotenv from "dotenv";
dotenv.config({ path: process.cwd() + "/.env.test" });

// Import and setup the DatabaseService mock
import {
  mockDbService,
  resetMockDbService,
  restoreOriginalGetInstance,
} from "./mocks/db-service.mock";

// Export the DatabaseService mock for tests to use
export const mockDb = mockDbService;
export const resetMockDb = resetMockDbService;

// Cleanup function to restore original getInstance after tests
export const cleanupDatabaseMock = () => {
  restoreOriginalGetInstance();
};

// Run cleanup on process exit
process.on("exit", cleanupDatabaseMock);
