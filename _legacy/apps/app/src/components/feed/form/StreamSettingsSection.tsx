import { memo, useState, useEffect } from "react";
import {
  Control,
  UseFieldArrayReturn,
  UseFormWatch,
  useController,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Checkbox } from "../../ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { FormValues } from "./types";

interface StreamSettingsSectionProps {
  control: Control<FormValues>;
  transformFields: UseFieldArrayReturn<
    FormValues,
    "streamTransforms"
  >["fields"];
  appendTransform: UseFieldArrayReturn<
    FormValues,
    "streamTransforms"
  >["append"];
  removeTransform: UseFieldArrayReturn<
    FormValues,
    "streamTransforms"
  >["remove"];
  distributorFields: UseFieldArrayReturn<
    FormValues,
    "streamDistributors"
  >["fields"];
  appendDistributor: UseFieldArrayReturn<
    FormValues,
    "streamDistributors"
  >["append"];
  removeDistributor: UseFieldArrayReturn<
    FormValues,
    "streamDistributors"
  >["remove"];
  watch: UseFormWatch<FormValues>;
}

function TransformConfigField({
  control,
  transformIndex,
}: {
  control: Control<FormValues>;
  transformIndex: number;
}) {
  const {
    field,
    fieldState: { error },
  } = useController({
    name: `streamTransforms.${transformIndex}.config`,
    control,
  });

  const [localValue, setLocalValue] = useState(
    field.value ? JSON.stringify(field.value, null, 2) : "{}",
  );

  // Sync local value when field value changes from external sources (like form reset)
  useEffect(() => {
    const formValue = field.value ? JSON.stringify(field.value, null, 2) : "{}";
    setLocalValue(formValue);
  }, [field.value]);

  return (
    <FormItem>
      <FormLabel>Transform Config (JSON)</FormLabel>
      <FormControl>
        <Textarea
          placeholder='{"key": "value"}'
          value={localValue}
          onChange={(e) => {
            setLocalValue(e.target.value);
          }}
          onBlur={() => {
            try {
              const parsed = JSON.parse(localValue || "{}");
              field.onChange(parsed);
            } catch {
              // If JSON is invalid, keep the current value and don't update
              // This prevents losing data while typing
              const formValue = field.value
                ? JSON.stringify(field.value, null, 2)
                : "{}";
              setLocalValue(formValue);
            }
          }}
        />
      </FormControl>
      {error && <FormMessage>{error.message}</FormMessage>}
    </FormItem>
  );
}

function DistributorConfigField({
  control,
  distributorIndex,
}: {
  control: Control<FormValues>;
  distributorIndex: number;
}) {
  const {
    field,
    fieldState: { error },
  } = useController({
    name: `streamDistributors.${distributorIndex}.config`,
    control,
  });

  const [localValue, setLocalValue] = useState(
    field.value ? JSON.stringify(field.value, null, 2) : "{}",
  );

  // Sync local value when field value changes from external sources (like form reset)
  useEffect(() => {
    const formValue = field.value ? JSON.stringify(field.value, null, 2) : "{}";
    setLocalValue(formValue);
  }, [field.value]);

  return (
    <FormItem>
      <FormLabel>Distributor Config (JSON)</FormLabel>
      <FormControl>
        <Textarea
          placeholder='{"key": "value"}'
          value={localValue}
          onChange={(e) => {
            setLocalValue(e.target.value);
          }}
          onBlur={() => {
            try {
              const parsed = JSON.parse(localValue || "{}");
              field.onChange(parsed);
            } catch {
              // If JSON is invalid, keep the current value and don't update
              // This prevents losing data while typing
              const formValue = field.value
                ? JSON.stringify(field.value, null, 2)
                : "{}";
              setLocalValue(formValue);
            }
          }}
        />
      </FormControl>
      {error && <FormMessage>{error.message}</FormMessage>}
    </FormItem>
  );
}

export const StreamSettingsSection = memo(function StreamSettingsSection({
  control,
  transformFields,
  appendTransform,
  removeTransform,
  distributorFields,
  appendDistributor,
  removeDistributor,
  watch,
}: StreamSettingsSectionProps) {
  const streamEnabled = watch("streamEnabled");

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <h3 className="font-medium">Output Settings</h3>

      <FormField
        control={control}
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

      {streamEnabled && (
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
                  control={control}
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

                <TransformConfigField
                  control={control}
                  transformIndex={transformIndex}
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
                  control={control}
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

                <DistributorConfigField
                  control={control}
                  distributorIndex={distributorIndex}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
