import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface FilterBadge {
  type: string;
  value: string;
  label: string;
}

interface FilterBadgesProps {
  activeFilters: FilterBadge[];
  onRemoveFilter: (filterType: string) => void;
  onClearAll: () => void;
}

export function FilterBadges({
  activeFilters,
  onRemoveFilter,
  onClearAll,
}: FilterBadgesProps) {
  if (activeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {activeFilters.map((filter) => (
        <Badge
          key={filter.type}
          variant="secondary"
          className="inline-flex items-center gap-1 px-3 py-1"
        >
          <span>{filter.label}</span>
          <button
            onClick={() => onRemoveFilter(filter.type)}
            className="hover:bg-muted rounded-full p-0.5 ml-1"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {activeFilters.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-auto px-3 py-1 text-xs"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}