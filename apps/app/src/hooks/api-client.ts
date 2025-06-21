import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseMutationOptions,
  type UseInfiniteQueryOptions,
  type QueryKey,
  type QueryFunctionContext,
} from "@tanstack/react-query";
import { useAuth } from "../contexts/auth-context";
import { apiClient, ApiError } from "../lib/api-client";

/**
 * Handles GET requests.
 */
export function useApiQuery<
  TQueryFnData = unknown,
  TError = ApiError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryKey: TQueryKey,
  path: string, // The API path for the GET request
  options?: Omit<
    UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
    "queryKey" | "queryFn"
  >,
) {
  const queryFunction = () => apiClient.makeRequest<TQueryFnData>("GET", path);

  const finalQueryOptions: UseQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryKey
  > = {
    queryKey,
    queryFn: queryFunction,
    ...(options || {}),
  };

  return useQuery<TQueryFnData, TError, TData, TQueryKey>(finalQueryOptions);
}

/**
 * Handles POST, PUT, DELETE, PATCH requests.
 */
export function useApiMutation<
  TData = unknown, // Type of data returned by the mutation function
  TError = ApiError, // Type of error thrown by the mutation function
  TVariables = void, // Type of variables passed to the mutate function (this is our requestData)
  TContext = unknown, // Type of context passed to onMutate, onError, onSettled
>(
  mutationConfig: {
    method: "POST" | "PUT" | "DELETE" | "PATCH";
    path: string; // The API path. For dynamic paths (e.g., /items/:id), construct the full path before calling this hook.
    message?: string; // Descriptive message for signing (e.g., "createItem")
  },
  options?: Omit<
    UseMutationOptions<TData, TError, TVariables, TContext>,
    "mutationFn"
  >,
) {
  const { currentAccountId, isSignedIn } = useAuth();

  const mutationFunction = async (variables: TVariables) => {
    // 'variables' is the data passed to mutate(), used as requestData
    // Pre-flight check for authentication on non-GET requests
    if (!isSignedIn || !currentAccountId) {
      throw new ApiError("User not authenticated or account ID missing.", 401);
    }

    return apiClient.makeRequest<TData, TVariables>(
      mutationConfig.method,
      mutationConfig.path,
      variables, // Pass 'variables' from mutate() as requestData
    );
  };

  const finalMutationOptions: UseMutationOptions<
    TData,
    TError,
    TVariables,
    TContext
  > = {
    mutationFn: mutationFunction,
    ...(options || {}), // Spread user-provided options, ensuring mutationFn is primary
  };

  return useMutation<TData, TError, TVariables, TContext>(finalMutationOptions);
}

/**
 * Handles GET requests that support infinite scrolling.
 */
export function useApiInfiniteQuery<
  TQueryFnData = unknown, // Type of data returned by the query function per page
  TError = ApiError,
  TData = TQueryFnData, // Type of the combined data across all pages
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = number, // Type of the page parameter
>(
  queryKey: TQueryKey,
  // Path function that receives pageParam and returns the API path
  // e.g., (pageParam) => `/items?page=${pageParam}`
  pathFn: (pageParam: TPageParam) => string,
  options: Omit<
    UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>,
    "queryKey" | "queryFn" | "initialPageParam" // initialPageParam is now required in options
  > & { initialPageParam: TPageParam }, // Ensure initialPageParam is provided
) {
  const queryFunction = (
    context: QueryFunctionContext<TQueryKey, TPageParam>,
  ) => {
    const path = pathFn(context.pageParam as TPageParam);
    return apiClient.makeRequest<TQueryFnData>("GET", path);
  };

  const finalQueryOptions: UseInfiniteQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryKey,
    TPageParam
  > = {
    queryKey,
    queryFn: queryFunction,
    ...options,
  };

  return useInfiniteQuery<TQueryFnData, TError, TData, TQueryKey, TPageParam>(
    finalQueryOptions,
  );
}
