import {
  FrontendPlugin,
  CreateFrontendPlugin,
  UpdateFrontendPlugin,
  PluginTypeEnum,
} from "@curatedotfun/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { useWeb3Auth } from "../../hooks/use-web3-auth"; // Auth currently disabled

// --- Get all plugins ---
export function useAllPlugins(
  filters: {
    type?: PluginTypeEnum;
    name?: string;
  } = {},
) {
  return useQuery<FrontendPlugin[]>({
    queryKey: ["plugins", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.type) params.append("type", filters.type);
      if (filters.name) params.append("name", filters.name);

      const response = await fetch(`/api/plugins?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch plugins");
      }
      return response.json();
    },
  });
}

// --- Get a single plugin by ID ---
export function usePlugin(pluginId: string) {
  return useQuery<FrontendPlugin>({
    queryKey: ["plugin", pluginId],
    queryFn: async () => {
      const response = await fetch(`/api/plugins/${pluginId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch plugin");
      }
      return response.json();
    },
    enabled: !!pluginId,
  });
}

// --- Create a new plugin ---
async function createPluginApi(pluginData: CreateFrontendPlugin) {
  const response = await fetch(`/api/plugins`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pluginData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to create plugin (HTTP ${response.status})`,
    );
  }
  return response.json();
}

export function useCreatePlugin() {
  const queryClient = useQueryClient();

  return useMutation<FrontendPlugin, Error, CreateFrontendPlugin>({
    mutationFn: createPluginApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugins"] });
    },
  });
}

// --- Update a plugin ---
async function updatePluginApi(
  pluginId: string,
  updateData: UpdateFrontendPlugin,
) {
  const response = await fetch(`/api/plugins/${pluginId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updateData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to update plugin (HTTP ${response.status})`,
    );
  }
  return response.json();
}

export function useUpdatePlugin(pluginId: string) {
  const queryClient = useQueryClient();

  return useMutation<FrontendPlugin, Error, UpdateFrontendPlugin>({
    mutationFn: async (updateData: UpdateFrontendPlugin) => {
      return updatePluginApi(pluginId, updateData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["plugins"] });
      queryClient.setQueryData(["plugin", pluginId], data);
    },
  });
}

// --- Delete a plugin ---
async function deletePluginApi(pluginId: string) {
  const response = await fetch(`/api/plugins/${pluginId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to delete plugin (HTTP ${response.status})`,
    );
  }
  return response.json();
}

export function useDeletePlugin() {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; plugin: FrontendPlugin },
    Error,
    string
  >({
    mutationFn: deletePluginApi,
    onSuccess: (_, pluginId) => {
      queryClient.invalidateQueries({ queryKey: ["plugins"] });
      queryClient.removeQueries({ queryKey: ["plugin", pluginId] });
    },
  });
}
