import { useAppConfig } from "./api";

const DEFAULT_BOT_ID = "test_curation";

export function useBotId() {
  const { data: config } = useAppConfig();
  return config?.global?.botId || DEFAULT_BOT_ID;
}
