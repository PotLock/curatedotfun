import { IBaseService } from "./base-service.interface";

export interface IBackgroundTaskService extends IBaseService {
  start(): Promise<void>;
  stop(): Promise<void>;
}
