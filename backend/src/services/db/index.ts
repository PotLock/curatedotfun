export { dbConnection, initializeDatabase } from "./connection";

export {
  executeOperation,
  executeTransaction,
  withDatabaseErrorHandling,
} from "./transaction";

export * from "./repositories";

// For testing and dependency injection
import { dbConnection } from "./connection";
export const getDatabase = () => dbConnection;
