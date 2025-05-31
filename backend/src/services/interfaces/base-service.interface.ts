import { Logger } from "pino";

export interface IBaseService {
  readonly logger: Logger;
}
