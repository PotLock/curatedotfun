import { memo } from "react";
import { Control } from "react-hook-form";
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

interface BasicFieldsSectionProps {
  control: Control<FormValues>;
}

export const BasicFieldsSection = memo(function BasicFieldsSection({
  control,
}: BasicFieldsSectionProps) {
  return (
    <div className="space-y-6">
      <FormField
        control={control}
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
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
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
        control={control}
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
        control={control}
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
    </div>
  );
});
