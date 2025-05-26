import type { AppRouter } from '@curatedotfun/api-contract';
import { createTRPCContext as actualCreateTRPCContext } from '@trpc/tanstack-react-query';

export const {
  TRPCProvider,
  useTRPC,
  useTRPCClient,
} = actualCreateTRPCContext<AppRouter>();
