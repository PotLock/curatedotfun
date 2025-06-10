import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCreatePlugin } from "../../../lib/api/plugin";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { CreateFrontendPlugin, PluginTypeEnum } from "@curatedotfun/types";
import { toast } from "sonner";

const createPluginFormSchema = z.object({
  name: z.string().min(1, "Plugin name is required"),
  repoUrl: z
    .string()
    .url("Must be a valid repository URL (e.g., GitHub, GitLab)"),
  entryPoint: z
    .string()
    .url(
      "Entry point must be a valid URL (e.g., http://localhost:3001/remoteEntry.js)",
    ),
  type: z.enum(["transformer", "distributor", "source", "rule", "outcome"], {
    required_error: "Plugin type is required",
  }),
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

type CreatePluginFormData = z.infer<typeof createPluginFormSchema>;

export const Route = createFileRoute("/_layout/create/plugin")({
  component: CreatePluginPage,
});

function CreatePluginPage() {
  const navigate = useNavigate();
  const createPluginMutation = useCreatePlugin();

  const form = useForm<CreatePluginFormData>({
    resolver: zodResolver(createPluginFormSchema),
    defaultValues: {
      name: "",
      repoUrl: "",
      entryPoint: "",
      type: undefined,
      schemaDefinition: "",
    },
  });

  const onSubmit = async (formData: CreatePluginFormData) => {
    const payload: CreateFrontendPlugin = {
      name: formData.name,
      type: formData.type as PluginTypeEnum,
      entryPoint: formData.entryPoint,
      repoUrl: formData.repoUrl,
      schemaDefinition: formData.schemaDefinition,
    };

    try {
      const newPlugin = await createPluginMutation.mutateAsync(payload);
      toast.success(`Plugin "${newPlugin.name}" created successfully!`);
      navigate({ to: "/plugin/$pluginId", params: { pluginId: newPlugin.id } });
    } catch (err) {
      toast.error(`Failed to create plugin: ${(err as Error).message}`);
    }
  };

  const pluginTypes: PluginTypeEnum[] = [
    "transformer",
    "distributor",
    "source",
    "rule",
    "outcome",
  ];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Create New Plugin</h1>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 max-w-2xl"
      >
        <div>
          <Label htmlFor="name">Plugin Name</Label>
          <Input
            id="name"
            {...form.register("name")}
            className="mt-1"
            placeholder="e.g., My Awesome Transformer"
          />
          {form.formState.errors.name && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="repoUrl">Repository URL</Label>
          <Input
            id="repoUrl"
            {...form.register("repoUrl")}
            className="mt-1"
            placeholder="e.g., https://github.com/user/my-plugin-repo"
          />
          {form.formState.errors.repoUrl && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.repoUrl.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="type">Plugin Type</Label>
          <Controller
            name="type"
            control={form.control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select plugin type" />
                </SelectTrigger>
                <SelectContent>
                  {pluginTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.type && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.type.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="entryPoint">Entry Point URL</Label>
          <Input
            id="entryPoint"
            {...form.register("entryPoint")}
            className="mt-1"
            placeholder="http://localhost:3001/remoteEntry.js"
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
            rows={8}
            placeholder='{ "type": "object", "properties": { "apiKey": { "type": "string" } } }'
          />
          {form.formState.errors.schemaDefinition && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.schemaDefinition.message}
            </p>
          )}
        </div>

        <div className="pt-4">
          <Button type="submit" disabled={createPluginMutation.isPending}>
            {createPluginMutation.isPending ? "Creating..." : "Create Plugin"}
          </Button>
        </div>
      </form>
    </div>
  );
}
