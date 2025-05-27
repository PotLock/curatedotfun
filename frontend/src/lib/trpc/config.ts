import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "./index";

export function useAppConfig() {
  const trpc = useTRPC();
  return useQuery(trpc.config.getFullConfig.queryOptions());
}
