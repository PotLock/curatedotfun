import { Search } from "lucide-react";
import { Input } from "../../ui/input";

interface SearchFormProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function SearchForm({ searchTerm, onSearchChange }: SearchFormProps) {
  return (
    <form className="relative w-full md:w-fit">
      <Input
        placeholder="Search feeds..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="ps-9 sm:min-w-[300px] w-full"
      />
      <Search
        className="absolute left-2 top-1/2 -translate-y-1/2 text-black/50 size-5"
        strokeWidth={1.5}
      />
    </form>
  );
}