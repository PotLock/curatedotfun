import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  usePlugin,
  useUpdatePlugin,
  useDeletePlugin,
} from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Input } from "../../../components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { UpdateFrontendPlugin } from "@curatedotfun/types";
import { toast } from "sonner";

const pluginFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  repoUrl: z.string().url("Must be a valid repository URL"),
  entryPoint: z.string().url("Entry point must be a valid URL"),
  schemaDefinition: z
    .string()
    .optional()
    .transform((val, ctx) => {
      if (!val || val.trim() === "") return undefined;
      try {
        return JSON.parse(val);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid JSON for Schema Definition",
        });
        return z.NEVER;
      }
    })
    .nullable(),
});

type PluginFormData = z.infer<typeof pluginFormSchema>;

export const Route = createFileRoute("/_layout/plugin/$pluginId")({
  component: PluginPage,
  loader: ({ params }) => ({ pluginId: params.pluginId }),
});

function PluginPage() {
  const { pluginId } = Route.useLoaderData();
  const navigate = useNavigate();
  const { data: plugin, isLoading, error } = usePlugin(pluginId);
  const updatePluginMutation = useUpdatePlugin(pluginId);
  const deletePluginMutation = useDeletePlugin(pluginId);

  const form = useForm<PluginFormData>({
    resolver: zodResolver(pluginFormSchema),
    defaultValues: {},
    values: plugin
      ? {
          name: plugin.name,
          repoUrl: plugin.repoUrl,
          entryPoint: plugin.entryPoint,
          schemaDefinition: plugin.schemaDefinition
            ? JSON.stringify(plugin.schemaDefinition, null, 2)
            : "",
        }
      : undefined,
  });

  const onSubmit = async (formData: PluginFormData) => {
    if (!plugin) return;

    const updatePayload: UpdateFrontendPlugin = {
      entryPoint: formData.entryPoint,
      schemaDefinition: formData.schemaDefinition,
    };

    try {
      await updatePluginMutation.mutateAsync(updatePayload);
      toast.success("Plugin updated successfully!");
    } catch (err) {
      toast.error(`Failed to update plugin: ${(err as Error).message}`);
    }
  };

  const handleDelete = async () => {
    if (
      !plugin ||
      !window.confirm("Are you sure you want to delete this plugin?")
    )
      return;
    try {
      await deletePluginMutation.mutateAsync();
      toast.success("Plugin deleted successfully!");
      navigate({ to: "/plugin" });
    } catch (err) {
      toast.error(`Failed to delete plugin: ${(err as Error).message}`);
    }
  };

  if (isLoading) return <div>Loading plugin details...</div>;
  if (error) return <div>Error loading plugin: {error.message}</div>;
  if (!plugin) return <div>Plugin not found.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Edit Plugin: {plugin.name} ({plugin.type})
      </h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Label htmlFor="name">Name (Read-only)</Label>
          <Input
            id="name"
            {...form.register("name")}
            readOnly
            className="mt-1 bg-gray-100"
          />
        </div>

        <div>
          <Label htmlFor="repoUrl">Repository URL (Read-only)</Label>
          <Input
            id="repoUrl"
            {...form.register("repoUrl")}
            readOnly
            className="mt-1 bg-gray-100"
          />
        </div>

        <div>
          <Label htmlFor="entryPoint">Entry Point URL</Label>
          <Input
            id="entryPoint"
            {...form.register("entryPoint")}
            className="mt-1"
          />
          {form.formState.errors.entryPoint && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.entryPoint.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="schemaDefinition">
            Schema Definition (JSON - Optional)
          </Label>
          <Textarea
            id="schemaDefinition"
            {...form.register("schemaDefinition")}
            className="mt-1 font-mono"
            rows={10}
            placeholder='{ "type": "object", "properties": { ... } }'
          />
          {form.formState.errors.schemaDefinition &&
            typeof form.formState.errors.schemaDefinition.message === "string" && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.schemaDefinition.message}
            </p>
          )}
        </div>

        <div className="flex justify-between items-center pt-4">
          <Button
            type="submit"
            disabled={updatePluginMutation.isPending || !form.formState.isDirty}
          >
            {updatePluginMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deletePluginMutation.isPending}
          >
            {deletePluginMutation.isPending ? "Deleting..." : "Delete Plugin"}
          </Button>
        </div>
      </form>
    </div>
  );
}
