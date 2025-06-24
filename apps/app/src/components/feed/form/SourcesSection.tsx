import { memo } from "react";
import { Control, UseFieldArrayReturn, UseFormWatch } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../../ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";
import { Input } from "../../ui/input";
import { FormValues } from "./types";

interface SourcesSectionProps {
  control: Control<FormValues>;
  sourceFields: UseFieldArrayReturn<FormValues, "sources">["fields"];
  appendSource: UseFieldArrayReturn<FormValues, "sources">["append"];
  removeSource: UseFieldArrayReturn<FormValues, "sources">["remove"];
  watch: UseFormWatch<FormValues>;
}

export const SourcesSection = memo(function SourcesSection({
  control,
  sourceFields,
  appendSource,
  removeSource,
  watch,
}: SourcesSectionProps) {
  return (
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
        <div key={field.id} className="p-3 border rounded bg-white space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Source {sourceIndex + 1}</h4>
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
            control={control}
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

          {watch(`sources.${sourceIndex}.search`)?.map((_, searchIndex) => (
            <div
              key={searchIndex}
              className="ml-4 p-2 border-l-2 border-gray-200 space-y-2"
            >
              <FormField
                control={control}
                name={`sources.${sourceIndex}.search.${searchIndex}.type`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Search Type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., twitter-search" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`sources.${sourceIndex}.search.${searchIndex}.query`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Search Query</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., #technology" {...field} />
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
  );
});
