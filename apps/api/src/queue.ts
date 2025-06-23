import { createQueue, QUEUE_NAMES } from "@curatedotfun/shared-queue";
import "dotenv/config";

export const defaultQueue = createQueue(QUEUE_NAMES.DEFAULT);

console.log("🟢 API BullMQ Producer connected to queue.");

export function getDefaultQueue() {
  return defaultQueue;
}
