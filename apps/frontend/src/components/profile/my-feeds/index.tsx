import { Search } from "lucide-react";
import { Input } from "../../ui/input";
import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Button } from "../../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { Card } from "./card";

const feeds = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "latest",
    label: "Latest",
  },
  {
    value: "popular",
    label: "Popular",
  },
  {
    value: "technology",
    label: "Technology",
  },
  {
    value: "design",
    label: "Design",
  },
  {
    value: "lifestyle",
    label: "Lifestyle",
  },
];

const CardContent = {
  title: "Near Week",
  description:
    "Near Week is a weekly newsletter that covers the latest developments in the blockchain space. It's a great way to stay up to date with the latest news and events in the crypto world.",
  tags: ["near", "blockchain", "crypto"],
  createdAt: new Date(),
  curators: 5,
  contents: 100,
  image: "/images/near-week.png",
  isCompleted: false,
};

export function MyFeeds() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("all");
  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full">
      <div className="flex flex-col md:flex-row md:gap-0 gap-4 items-stretch justify-between w-full">
        <form className="relative w-full md:w-fit">
          <Input
            placeholder="Search"
            className="ps-9 sm:min-w-[300px] w-full"
          />
          <Search
            className="absolute left-2 top-1/2 -translate-y-1/2 text-black/50 size-5"
            strokeWidth={1.5}
          />
        </form>
        <div className="ms-auto md:ms-0 flex items-stretch gap-3">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-[150px] justify-between h-auto"
              >
                {value
                  ? `${feeds.find((feed) => feed.value === value)?.label} Feeds`
                  : "Select feed..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[150px] p-0">
              <Command>
                <CommandInput placeholder="Search feeds" />
                <CommandList>
                  <CommandEmpty>No feed found.</CommandEmpty>
                  <CommandGroup>
                    {feeds.map((feed) => (
                      <CommandItem
                        key={feed.value}
                        value={feed.value}
                        onSelect={(currentValue) => {
                          setValue(currentValue === value ? "" : currentValue);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === feed.value ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {feed.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button variant="filled" className="h-auto">
            Create New Feed
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
        <Card {...{ ...CardContent, isCompleted: true }} />
        <Card {...CardContent} />
        <Card {...CardContent} />
      </div>
    </div>
  );
}
