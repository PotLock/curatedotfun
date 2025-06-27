import { memo } from "react";
import { Control, UseFormWatch } from "react-hook-form";
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
import { FormValues } from "./types";

interface IngestionSectionProps {
  control: Control<FormValues>;
  watch: UseFormWatch<FormValues>;
}

export const IngestionSection = memo(function IngestionSection({
  control,
  watch,
}: IngestionSectionProps) {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <h3 className="font-medium">Ingestion Settings</h3>

      <FormField
        control={control}
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
        control={control}
        name="ingestionSchedule"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Ingestion Schedule (Cron Expression)</FormLabel>
            <FormControl>
              <Input
                placeholder="0 */30 * * * *"
                {...field}
                disabled={!watch("ingestionEnabled")}
              />
            </FormControl>
            <FormDescription>
              Cron expression for scheduling (e.g., "0 */30 * * * *" for every
              30 minutes)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
});
