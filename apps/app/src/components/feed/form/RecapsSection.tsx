import { memo } from "react";
import { Control, UseFieldArrayReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Checkbox } from "../../ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";
import { Input } from "../../ui/input";
import { FormValues } from "./types";

interface RecapsSectionProps {
  control: Control<FormValues>;
  recapFields: UseFieldArrayReturn<FormValues, "recaps">["fields"];
  appendRecap: UseFieldArrayReturn<FormValues, "recaps">["append"];
  removeRecap: UseFieldArrayReturn<FormValues, "recaps">["remove"];
}

export const RecapsSection = memo(function RecapsSection({
  control,
  recapFields,
  appendRecap,
  removeRecap,
}: RecapsSectionProps) {
  return (
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
        <div key={field.id} className="p-3 border rounded bg-white space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-medium">Recap {recapIndex + 1}</h5>
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
              control={control}
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
              control={control}
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
            control={control}
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
  );
});
