import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterControlsProps {
  showFilters: boolean;
  sortBy: "recent" | "oldest";
  platformFilter: string;
  categoryFilter: string;
  availableCategories: string[];
  onSortChange: (value: "recent" | "oldest") => void;
  onPlatformChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
}

export function FilterControls({
  showFilters,
  sortBy,
  platformFilter,
  categoryFilter,
  availableCategories,
  onSortChange,
  onPlatformChange,
  onCategoryChange,
  onApplyFilters,
  onResetFilters,
}: FilterControlsProps) {
  if (!showFilters) return null;

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex md:flex-row flex-col w-full justify-between items-center gap-6">
          <div className="w-full">
            <p className="text-sm font-medium mb-1">Sort By</p>
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="bg-input text-foreground">
                <SelectValue placeholder="Most Recent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full">
            <p className="text-sm font-medium mb-1">Platform</p>
            <Select value={platformFilter} onValueChange={onPlatformChange}>
              <SelectTrigger className="bg-input text-foreground">
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="twitter">Twitter</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="github">GitHub</SelectItem>
                <SelectItem value="reddit">Reddit</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full">
            <p className="text-sm font-medium mb-1">Category</p>
            <Select value={categoryFilter} onValueChange={onCategoryChange}>
              <SelectTrigger className="bg-input text-foreground">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {availableCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end mt-4 gap-2">
          <Button variant="outline" onClick={onResetFilters}>
            Reset
          </Button>
          <Button onClick={onApplyFilters}>Apply Filters</Button>
        </div>
      </CardContent>
    </Card>
  );
}
