import {
  FrontendPlugin,
  CreateFrontendPlugin,
  UpdateFrontendPlugin,
  PluginTypeEnum,
} from "@curatedotfun/types";
import { useApiQuery, useApiMutation } from "../../hooks/api-client";
import { useQueryClient } from "@tanstack/react-query";

// --- Get all plugins ---
export function useAllPlugins(
  filters: {
    type?: PluginTypeEnum;
    name?: string;
  } = {},
) {
  const params = new URLSearchParams();
  if (filters.type) params.append("type", filters.type);
  if (filters.name) params.append("name", filters.name);
  const path = `/plugins?${params.toString()}`;

  return useApiQuery<FrontendPlugin[]>(
    ["plugins", filters],
    path,
  );
}

// --- Get a single plugin by ID ---
export function usePlugin(pluginId: string) {
  return useApiQuery<FrontendPlugin>(
    ["plugin", pluginId],
    `/plugins/${pluginId}`,
    { enabled: !!pluginId },
  );
}

// --- Create a new plugin ---
export function useCreatePlugin() {
  const queryClient = useQueryClient();
  return useApiMutation<FrontendPlugin, Error, CreateFrontendPlugin>(
    {
      method: 'POST',
      path: '/plugins',
      message: 'createPlugin',
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["plugins"] });
      },
    }
  );
}

// --- Update a plugin ---
export function useUpdatePlugin(pluginId: string) {
  const queryClient = useQueryClient();
  return useApiMutation<FrontendPlugin, Error, UpdateFrontendPlugin>(
    {
      method: 'PATCH',
      path: `/plugins/${pluginId}`, // pluginId is part of the path
      message: 'updatePlugin',
    },
    {
      onSuccess: (data) => { // data is FrontendPlugin
        queryClient.invalidateQueries({ queryKey: ["plugins"] });
        queryClient.setQueryData(["plugin", pluginId], data);
      },
    }
  );
}

// --- Delete a plugin ---
// This hook is called with the specific pluginId to delete.
// The mutate function then takes no arguments (or arguments for the request body, which is not typical for DELETE).
export function useDeletePlugin(pluginId: string) {
  const queryClient = useQueryClient();
  return useApiMutation<
    { message: string; plugin: FrontendPlugin }, // Expected response type
    Error,
    void // TVariables is void as pluginId is in the path
  >(
    {
      method: 'DELETE',
      path: `/plugins/${pluginId}`, // pluginId from the hook's argument
      message: 'deletePlugin',
    },
    {
      onSuccess: () => {
        // pluginId for invalidation comes from the hook's scope
        queryClient.invalidateQueries({ queryKey: ["plugins"] });
        queryClient.removeQueries({ queryKey: ["plugin", pluginId] });
      },
    }
  );
}
