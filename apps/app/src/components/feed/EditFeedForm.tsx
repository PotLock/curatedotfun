import { type FeedConfig } from "@curatedotfun/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { debounce, isEqual } from "lodash-es";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Form } from "../ui/form";
import {
  BasicFieldsSection,
  // IngestionSection,
  FeedConfigFormSchema,
  ModerationSection,
  SourcesSection,
  StreamSettingsSection,
  type FormValues,
} from "./form";

interface EditFeedFormProps {
  currentConfig: FeedConfig | null;
  onConfigChange: (config: FeedConfig) => void;
}

export interface EditFeedFormRef {
  updateFromConfig: () => void;
}

export const EditFeedForm = forwardRef<EditFeedFormRef, EditFeedFormProps>(
  function EditFeedForm({ currentConfig, onConfigChange }, ref) {
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

    // Track when form should update from config changes
    const isUpdatingFromForm = useRef(false);

    // Function to update form from config
    const updateFormFromConfig = useCallback(
      (config: FeedConfig) => {
        if (isUpdatingFromForm.current) return;

        form.reset({
          name: config.name || "",
          description: config.description || "",
          enabled: config.enabled ?? true,
          pollingIntervalMs: config.pollingIntervalMs || undefined,
          ingestionEnabled: config.ingestion?.enabled ?? false,
          ingestionSchedule: config.ingestion?.schedule || "",
          sources: config.sources || [],
          streamEnabled: config.outputs?.stream?.enabled ?? false,
          streamTransforms: (config.outputs?.stream?.transform || []).map(
            (t) => ({
              ...t,
              config: t.config || {},
            }),
          ),
          streamDistributors: (config.outputs?.stream?.distribute || []).map(
            (d) => ({
              ...d,
              config: d.config || {},
            }),
          ),
          recaps: config.outputs?.recap || [],
          moderationApprovers: config.moderation?.approvers || {},
          moderationBlacklist: config.moderation?.blacklist || {},
        });
      },
      [form],
    );

    // Update form whenever currentConfig changes
    useEffect(() => {
      if (!currentConfig) return;
      updateFormFromConfig(currentConfig);
    }, [currentConfig, updateFormFromConfig]);

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

    // const {
    //   fields: recapFields,
    //   append: appendRecap,
    //   remove: removeRecap,
    // } = useFieldArray({
    //   control: form.control,
    //   name: "recaps",
    // });

    // Watch for form changes and auto-update with debouncing
    const watchedValues = form.watch();

    // Track if form has been initialized to avoid triggering updates during initial load
    const [isFormInitialized, setIsFormInitialized] = useState(false);

    // Mark form as initialized after first config load
    useEffect(() => {
      if (currentConfig && !isFormInitialized) {
        setIsFormInitialized(true);
      }
    }, [currentConfig, isFormInitialized]);

    // Debounced config update function
    const debouncedUpdateConfig = useRef(
      debounce((values: FormValues, config: FeedConfig) => {
        // Start with the original config and only update fields that have been explicitly set in the form
        const updatedConfig: FeedConfig = {
          ...config, // Preserve all existing data first
        };

        // Only update fields that have been explicitly changed in the form
        if (values.name !== undefined && values.name !== config.name) {
          updatedConfig.name = values.name;
        }

        if (
          values.description !== undefined &&
          values.description !== config.description
        ) {
          updatedConfig.description = values.description;
        }

        if (values.enabled !== undefined && values.enabled !== config.enabled) {
          updatedConfig.enabled = values.enabled;
        }

        if (
          values.pollingIntervalMs !== undefined &&
          values.pollingIntervalMs !== config.pollingIntervalMs
        ) {
          updatedConfig.pollingIntervalMs = values.pollingIntervalMs;
        }

        // Only update sources if they exist in the form
        if (
          values.sources !== undefined &&
          !isEqual(values.sources, config.sources)
        ) {
          updatedConfig.sources = values.sources;
        }

        // Only update ingestion if form values are different from current
        if (
          values.ingestionEnabled !== undefined ||
          values.ingestionSchedule !== undefined
        ) {
          const currentIngestionEnabled = config.ingestion?.enabled ?? false;
          const currentIngestionSchedule = config.ingestion?.schedule ?? "";

          if (
            values.ingestionEnabled !== currentIngestionEnabled ||
            values.ingestionSchedule !== currentIngestionSchedule
          ) {
            updatedConfig.ingestion = {
              enabled: values.ingestionEnabled ?? currentIngestionEnabled,
              schedule: values.ingestionSchedule ?? currentIngestionSchedule,
            };
          }
        }

        // Handle outputs - only update if stream settings or transforms/distributors have changed
        if (
          values.streamEnabled !== undefined ||
          values.streamTransforms !== undefined ||
          values.streamDistributors !== undefined ||
          values.recaps !== undefined
        ) {
          const currentStreamEnabled = config.outputs?.stream?.enabled ?? false;
          const currentTransforms = config.outputs?.stream?.transform ?? [];
          const currentDistributors = config.outputs?.stream?.distribute ?? [];
          const currentRecaps = config.outputs?.recap ?? [];

          // Check if stream output settings have changed
          const streamChanged =
            values.streamEnabled !== currentStreamEnabled ||
            JSON.stringify(values.streamTransforms) !==
              JSON.stringify(currentTransforms) ||
            JSON.stringify(values.streamDistributors) !==
              JSON.stringify(currentDistributors);

          const recapsChanged =
            JSON.stringify(values.recaps) !== JSON.stringify(currentRecaps);

          if (streamChanged || recapsChanged) {
            updatedConfig.outputs = {
              ...config.outputs,
            };

            if (streamChanged) {
              updatedConfig.outputs.stream = {
                ...config.outputs?.stream,
                enabled: values.streamEnabled ?? currentStreamEnabled,
                transform: values.streamTransforms ?? currentTransforms,
                distribute: values.streamDistributors ?? currentDistributors,
              };
            }

            if (recapsChanged) {
              updatedConfig.outputs.recap = values.recaps ?? currentRecaps;
            }
          }
        }

        // Handle moderation - only update if values have changed
        if (
          values.moderationApprovers !== undefined ||
          values.moderationBlacklist !== undefined
        ) {
          const currentApprovers = config.moderation?.approvers ?? {};
          const currentBlacklist = config.moderation?.blacklist ?? {};

          if (
            JSON.stringify(values.moderationApprovers) !==
              JSON.stringify(currentApprovers) ||
            JSON.stringify(values.moderationBlacklist) !==
              JSON.stringify(currentBlacklist)
          ) {
            updatedConfig.moderation = {
              ...config.moderation,
              approvers: values.moderationApprovers ?? currentApprovers,
              blacklist: values.moderationBlacklist ?? currentBlacklist,
            };
          }
        }

        // Only update if the config has actually changed
        if (JSON.stringify(updatedConfig) !== JSON.stringify(config)) {
          isUpdatingFromForm.current = true;
          onConfigChange(updatedConfig);
          // Reset the flag in the next tick to ensure state updates have propagated
          Promise.resolve().then(() => {
            isUpdatingFromForm.current = false;
          });
        }
      }, 300),
    ).current;

    // Update config whenever form values change (but only after form is initialized)
    useEffect(() => {
      if (!currentConfig || !isFormInitialized) return;
      debouncedUpdateConfig(watchedValues, currentConfig);
    }, [watchedValues, currentConfig, isFormInitialized]);

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        debouncedUpdateConfig.cancel();
      };
    }, []);

    // Expose updateFromConfig method to parent component
    useImperativeHandle(ref, () => ({
      updateFromConfig: () => {
        if (currentConfig) {
          // Force immediate update when switching from JSON to form view
          updateFormFromConfig(currentConfig);
        }
      },
    }));

    return (
      <div className="space-y-6">
        <Form {...form}>
          <div className="space-y-6">
            <BasicFieldsSection control={form.control} />

            <SourcesSection
              control={form.control}
              sourceFields={sourceFields}
              appendSource={appendSource}
              removeSource={removeSource}
            />

            <StreamSettingsSection
              control={form.control}
              transformFields={transformFields}
              appendTransform={appendTransform}
              removeTransform={removeTransform}
              distributorFields={distributorFields}
              appendDistributor={appendDistributor}
              removeDistributor={removeDistributor}
              watch={form.watch}
            />
            {/* 
            <RecapsSection
              control={form.control}
              recapFields={recapFields}
              appendRecap={appendRecap}
              removeRecap={removeRecap}
            /> */}

            <ModerationSection control={form.control} />

            {/* <IngestionSection control={form.control} watch={form.watch} /> */}
          </div>
        </Form>
      </div>
    );
  },
);
