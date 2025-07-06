import { memo } from "react";
import { Control, UseFieldArrayReturn, useFieldArray } from "react-hook-form";
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

// Separate component for search entries to properly use hooks
interface SearchEntriesProps {
  control: Control<FormValues>;
  sourceIndex: number;
}

const SearchEntries = memo(function SearchEntries({
  control,
  sourceIndex,
}: SearchEntriesProps) {
  const searchFieldArray = useFieldArray({
    control,
    name: `sources.${sourceIndex}.search`,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium">Search Queries</h5>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            searchFieldArray.append({
              searchId: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: "",
              query: "",
            })
          }
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Search
        </Button>
      </div>

      {searchFieldArray.fields.map((field, searchIndex) => (
        <div
          key={field.id}
          className="ml-4 p-2 border-l-2 border-gray-200 space-y-2"
        >
          <div className="flex items-center justify-between">
            <h6 className="text-xs font-medium text-gray-600">
              Search {searchIndex + 1}
            </h6>
            {searchFieldArray.fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => searchFieldArray.remove(searchIndex)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>

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
  );
});

interface SourcesSectionProps {
  control: Control<FormValues>;
  sourceFields: UseFieldArrayReturn<FormValues, "sources">["fields"];
  appendSource: UseFieldArrayReturn<FormValues, "sources">["append"];
  removeSource: UseFieldArrayReturn<FormValues, "sources">["remove"];
}

export const SourcesSection = memo(function SourcesSection({
  control,
  sourceFields,
  appendSource,
  removeSource,
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
                {
                  searchId: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  type: "",
                  query: "",
                },
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

          <SearchEntries control={control} sourceIndex={sourceIndex} />
        </div>
      ))}
    </div>
  );
});
