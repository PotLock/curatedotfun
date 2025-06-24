import {
  type FeedConfig,
  SourceConfigSchema,
  TransformConfigSchema,
  DistributorConfigSchema,
  RecapConfigSchema,
} from "@curatedotfun/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

// Create a form schema that matches the structure but flattens some nested fields for easier form handling
const FeedConfigFormSchema = z.object({
  name: z.string().min(1, "Feed name is required"),
  description: z.string().min(1, "Description is required"),
  enabled: z.boolean(),
  pollingIntervalMs: z.number().min(1000).optional(),
  ingestionEnabled: z.boolean().optional(),
  ingestionSchedule: z.string().optional(),
  sources: z.array(SourceConfigSchema).optional(),
  // Outputs - flattened for easier form handling
  streamEnabled: z.boolean().optional(),
  streamTransforms: z.array(TransformConfigSchema).optional(),
  streamDistributors: z.array(DistributorConfigSchema).optional(),
  recaps: z.array(RecapConfigSchema).optional(),
  // Moderation - flattened for easier form handling
  moderationApprovers: z.record(z.array(z.string())).optional(),
  moderationBlacklist: z.record(z.array(z.string())).optional(),
});

type FormValues = z.infer<typeof FeedConfigFormSchema>;

interface EditFeedFormProps {
  currentConfig: FeedConfig | null;
  onConfigChange: (config: FeedConfig) => void;
}

export function EditFeedForm({
  currentConfig,
  onConfigChange,
}: EditFeedFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(FeedConfigFormSchema),
    defaultValues: {
      name: "",
      description: "",
      enabled: true,
      pollingIntervalMs: undefined,
      ingestionEnabled: false,
      ingestionSchedule: "",
      sources: [],
      streamEnabled: false,
      streamTransforms: [],
      streamDistributors: [],
      recaps: [],
      moderationApprovers: {},
      moderationBlacklist: {},
    },
  });

  // Update form values when currentConfig changes
  useEffect(() => {
    if (!currentConfig) return;

    form.reset({
      name: currentConfig.name || "",
      description: currentConfig.description || "",
      enabled: currentConfig.enabled ?? true,
      pollingIntervalMs: currentConfig.pollingIntervalMs || undefined,
      ingestionEnabled: currentConfig.ingestion?.enabled ?? false,
      ingestionSchedule: currentConfig.ingestion?.schedule || "",
      sources: currentConfig.sources || [],
      streamEnabled: currentConfig.outputs?.stream?.enabled ?? false,
      streamTransforms: (currentConfig.outputs?.stream?.transform || []).map(
        (t) => ({
          ...t,
          config: t.config || {},
        }),
      ),
      streamDistributors: (currentConfig.outputs?.stream?.distribute || []).map(
        (d) => ({
          ...d,
          config: d.config || {},
        }),
      ),
      recaps: currentConfig.outputs?.recap || [],
      moderationApprovers: currentConfig.moderation?.approvers || {},
      moderationBlacklist: currentConfig.moderation?.blacklist || {},
    });
  }, [currentConfig, form]);

  const {
    fields: sourceFields,
    append: appendSource,
    remove: removeSource,
  } = useFieldArray({
    control: form.control,
    name: "sources",
  });

  const {
    fields: transformFields,
    append: appendTransform,
    remove: removeTransform,
  } = useFieldArray({
    control: form.control,
    name: "streamTransforms",
  });

  const {
    fields: distributorFields,
    append: appendDistributor,
    remove: removeDistributor,
  } = useFieldArray({
    control: form.control,
    name: "streamDistributors",
  });

  const {
    fields: recapFields,
    append: appendRecap,
    remove: removeRecap,
  } = useFieldArray({
    control: form.control,
    name: "recaps",
  });

  // Watch for form changes and auto-update
  const watchedValues = form.watch();

  // Track if form has been initialized to avoid triggering updates during initial load
  const [isFormInitialized, setIsFormInitialized] = useState(false);

  // Mark form as initialized after first config load
  useEffect(() => {
    if (currentConfig && !isFormInitialized) {
      setIsFormInitialized(true);
    }
  }, [currentConfig, isFormInitialized]);

  // Update config whenever form values change (but only after form is initialized)
  useEffect(() => {
    if (!currentConfig || !isFormInitialized) return;

    // Start with the original config and only update fields that have been explicitly set in the form
    const updatedConfig: FeedConfig = {
      ...currentConfig, // Preserve all existing data first
    };

    // Only update fields that have been explicitly changed in the form
    if (
      watchedValues.name !== undefined &&
      watchedValues.name !== currentConfig.name
    ) {
      updatedConfig.name = watchedValues.name;
    }

    if (
      watchedValues.description !== undefined &&
      watchedValues.description !== currentConfig.description
    ) {
      updatedConfig.description = watchedValues.description;
    }

    if (
      watchedValues.enabled !== undefined &&
      watchedValues.enabled !== currentConfig.enabled
    ) {
      updatedConfig.enabled = watchedValues.enabled;
    }

    if (
      watchedValues.pollingIntervalMs !== undefined &&
      watchedValues.pollingIntervalMs !== currentConfig.pollingIntervalMs
    ) {
      updatedConfig.pollingIntervalMs = watchedValues.pollingIntervalMs;
    }

    // Only update sources if they exist in the form
    if (
      watchedValues.sources !== undefined &&
      JSON.stringify(watchedValues.sources) !==
        JSON.stringify(currentConfig.sources)
    ) {
      updatedConfig.sources = watchedValues.sources;
    }

    // Only update ingestion if form values are different from current
    if (
      watchedValues.ingestionEnabled !== undefined ||
      watchedValues.ingestionSchedule !== undefined
    ) {
      const currentIngestionEnabled = currentConfig.ingestion?.enabled ?? false;
      const currentIngestionSchedule = currentConfig.ingestion?.schedule ?? "";

      if (
        watchedValues.ingestionEnabled !== currentIngestionEnabled ||
        watchedValues.ingestionSchedule !== currentIngestionSchedule
      ) {
        updatedConfig.ingestion = {
          enabled: watchedValues.ingestionEnabled ?? currentIngestionEnabled,
          schedule: watchedValues.ingestionSchedule ?? currentIngestionSchedule,
        };
      }
    }

    // Handle outputs - only update if stream settings or transforms/distributors have changed
    if (
      watchedValues.streamEnabled !== undefined ||
      watchedValues.streamTransforms !== undefined ||
      watchedValues.streamDistributors !== undefined ||
      watchedValues.recaps !== undefined
    ) {
      const currentStreamEnabled =
        currentConfig.outputs?.stream?.enabled ?? false;
      const currentTransforms = currentConfig.outputs?.stream?.transform ?? [];
      const currentDistributors =
        currentConfig.outputs?.stream?.distribute ?? [];
      const currentRecaps = currentConfig.outputs?.recap ?? [];

      // Check if stream output settings have changed
      const streamChanged =
        watchedValues.streamEnabled !== currentStreamEnabled ||
        JSON.stringify(watchedValues.streamTransforms) !==
          JSON.stringify(currentTransforms) ||
        JSON.stringify(watchedValues.streamDistributors) !==
          JSON.stringify(currentDistributors);

      const recapsChanged =
        JSON.stringify(watchedValues.recaps) !== JSON.stringify(currentRecaps);

      if (streamChanged || recapsChanged) {
        updatedConfig.outputs = {
          ...currentConfig.outputs,
        };

        if (streamChanged) {
          updatedConfig.outputs.stream = {
            ...currentConfig.outputs?.stream,
            enabled: watchedValues.streamEnabled ?? currentStreamEnabled,
            transform: watchedValues.streamTransforms ?? currentTransforms,
            distribute: watchedValues.streamDistributors ?? currentDistributors,
          };
        }

        if (recapsChanged) {
          updatedConfig.outputs.recap = watchedValues.recaps ?? currentRecaps;
        }
      }
    }

    // Handle moderation - only update if values have changed
    if (
      watchedValues.moderationApprovers !== undefined ||
      watchedValues.moderationBlacklist !== undefined
    ) {
      const currentApprovers = currentConfig.moderation?.approvers ?? {};
      const currentBlacklist = currentConfig.moderation?.blacklist ?? {};

      if (
        JSON.stringify(watchedValues.moderationApprovers) !==
          JSON.stringify(currentApprovers) ||
        JSON.stringify(watchedValues.moderationBlacklist) !==
          JSON.stringify(currentBlacklist)
      ) {
        updatedConfig.moderation = {
          ...currentConfig.moderation,
          approvers: watchedValues.moderationApprovers ?? currentApprovers,
          blacklist: watchedValues.moderationBlacklist ?? currentBlacklist,
        };
      }
    }

    // Only update if the config has actually changed
    if (JSON.stringify(updatedConfig) !== JSON.stringify(currentConfig)) {
      onConfigChange(updatedConfig);
    }
  }, [watchedValues, currentConfig, onConfigChange, isFormInitialized]);

  return (
    <div className="space-y-6">
      <Form {...form}>
        <div className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Feed Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter feed name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>{" "}
                <FormControl>
                  <Textarea
                    placeholder="Describe what this feed curates"
                    className="min-h-[100px] flex h-auto w-full rounded border border-neutral-400 bg-white px-2.5 py-2 text-base shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:cursor-not-allowed disabled:opacity-50 md:text-base dark:border-neutral-800 dark:placeholder:text-neutral-400 dark:focus-visible:ring-neutral-300"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Enable Feed</FormLabel>
                  <FormDescription>
                    When enabled, this feed will actively curate and distribute
                    content
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pollingIntervalMs"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Polling Interval (milliseconds)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="60000"
                    {...field}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                  />
                </FormControl>
                <FormDescription>
                  How often to check for new content (minimum: 1000ms)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Content Sources</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendSource({
                    plugin: "",
                    config: {},
                    search: [
                      { searchId: `search-${Date.now()}`, type: "", query: "" },
                    ],
                  })
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Source
              </Button>
            </div>

            {sourceFields.map((field, sourceIndex) => (
              <div
                key={field.id}
                className="p-3 border rounded bg-white space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    Source {sourceIndex + 1}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSource(sourceIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name={`sources.${sourceIndex}.plugin`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plugin Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., twitter-scraper" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form
                  .watch(`sources.${sourceIndex}.search`)
                  ?.map((_, searchIndex) => (
                    <div
                      key={searchIndex}
                      className="ml-4 p-2 border-l-2 border-gray-200 space-y-2"
                    >
                      <FormField
                        control={form.control}
                        name={`sources.${sourceIndex}.search.${searchIndex}.type`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Search Type</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., twitter-search"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`sources.${sourceIndex}.search.${searchIndex}.query`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Search Query</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., #technology"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
              </div>
            ))}
          </div>

          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <h3 className="font-medium">Output Settings</h3>

            <FormField
              control={form.control}
              name="streamEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Enable Stream Output</FormLabel>
                    <FormDescription>
                      Stream content in real-time as it's curated
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("streamEnabled") && (
              <div className="ml-4 space-y-4 p-4 border-l-2 border-blue-200 bg-blue-50">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Stream Transforms</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendTransform({
                          plugin: "",
                          config: {},
                        })
                      }
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Transform
                    </Button>
                  </div>

                  {transformFields.map((field, transformIndex) => (
                    <div
                      key={field.id}
                      className="p-3 border rounded bg-white space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-medium">
                          Transform {transformIndex + 1}
                        </h5>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTransform(transformIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <FormField
                        control={form.control}
                        name={`streamTransforms.${transformIndex}.plugin`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transform Plugin</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="@curatedotfun/ai-transform"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`streamTransforms.${transformIndex}.config`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transform Config (JSON)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder='{"key": "value"}'
                                className="min-h-[100px] flex h-auto w-full rounded border border-neutral-400 bg-white px-2.5 py-2 text-base shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:cursor-not-allowed disabled:opacity-50 md:text-base dark:border-neutral-800 dark:placeholder:text-neutral-400 dark:focus-visible:ring-neutral-300"
                                value={
                                  field.value
                                    ? JSON.stringify(field.value, null, 2)
                                    : "{}"
                                }
                                onChange={(e) => {
                                  try {
                                    const parsed = JSON.parse(
                                      e.target.value || "{}",
                                    );
                                    field.onChange(parsed);
                                  } catch {
                                    // For invalid JSON, set as empty object to avoid breaking
                                    field.onChange({});
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Stream Distributors</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendDistributor({
                          plugin: "",
                          config: {},
                        })
                      }
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Distributor
                    </Button>
                  </div>

                  {distributorFields.map((field, distributorIndex) => (
                    <div
                      key={field.id}
                      className="p-3 border rounded bg-white space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-medium">
                          Distributor {distributorIndex + 1}
                        </h5>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDistributor(distributorIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <FormField
                        control={form.control}
                        name={`streamDistributors.${distributorIndex}.plugin`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Distributor Plugin</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="@curatedotfun/twitter-distributor"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`streamDistributors.${distributorIndex}.config`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Distributor Config (JSON)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder='{"key": "value"}'
                                className="min-h-[100px] flex h-auto w-full rounded border border-neutral-400 bg-white px-2.5 py-2 text-base shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:cursor-not-allowed disabled:opacity-50 md:text-base dark:border-neutral-800 dark:placeholder:text-neutral-400 dark:focus-visible:ring-neutral-300"
                                value={
                                  field.value
                                    ? JSON.stringify(field.value, null, 2)
                                    : "{}"
                                }
                                onChange={(e) => {
                                  try {
                                    const parsed = JSON.parse(
                                      e.target.value || "{}",
                                    );
                                    field.onChange(parsed);
                                  } catch {
                                    // For invalid JSON, set as empty object to avoid breaking
                                    field.onChange({});
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Recap Configurations</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendRecap({
                      id: `recap-${Date.now()}`,
                      name: "",
                      enabled: false,
                      schedule: "",
                      timezone: "UTC",
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Recap
                </Button>
              </div>

              {recapFields.map((field, recapIndex) => (
                <div
                  key={field.id}
                  className="p-3 border rounded bg-white space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium">
                      Recap {recapIndex + 1}
                    </h5>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRecap(recapIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name={`recaps.${recapIndex}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recap Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Weekly Summary" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`recaps.${recapIndex}.schedule`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Schedule (Cron)</FormLabel>
                          <FormControl>
                            <Input placeholder="0 0 * * 0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`recaps.${recapIndex}.enabled`}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Enable this recap</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <h3 className="font-medium">Moderation Settings</h3>
            <FormDescription>
              Configure content moderation rules and approvers
            </FormDescription>

            <div className="space-y-4">
              <div>
                <FormLabel>
                  Twitter Approvers (comma-separated usernames)
                </FormLabel>
                <Input
                  placeholder="user1, user2, user3"
                  value={
                    form.watch("moderationApprovers")?.twitter?.join(", ") || ""
                  }
                  onChange={(e) => {
                    const approvers = {
                      ...form.getValues("moderationApprovers"),
                    };
                    approvers.twitter = e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    form.setValue("moderationApprovers", approvers);
                  }}
                />
              </div>

              <div>
                <FormLabel>
                  Twitter Blacklist (comma-separated usernames)
                </FormLabel>
                <Input
                  placeholder="spammer1, bot2, unwanted3"
                  value={
                    form.watch("moderationBlacklist")?.twitter?.join(", ") || ""
                  }
                  onChange={(e) => {
                    const blacklist = {
                      ...form.getValues("moderationBlacklist"),
                    };
                    blacklist.twitter = e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    form.setValue("moderationBlacklist", blacklist);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <h3 className="font-medium">Ingestion Settings</h3>

            <FormField
              control={form.control}
              name="ingestionEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Enable Scheduled Ingestion</FormLabel>
                    <FormDescription>
                      Automatically ingest content based on a schedule
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ingestionSchedule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ingestion Schedule (Cron Expression)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0 */30 * * * *"
                      {...field}
                      disabled={!form.watch("ingestionEnabled")}
                    />
                  </FormControl>
                  <FormDescription>
                    Cron expression for scheduling (e.g., "0 */30 * * * *" for
                    every 30 minutes)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </Form>
    </div>
  );
}
