export interface IBackgroundTaskService {
  start(): Promise<void>;
  stop(): Promise<void>;
}
