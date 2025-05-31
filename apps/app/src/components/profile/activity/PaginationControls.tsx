import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
} from "../../ui/pagination";

export function PaginationControls() {
  return (
    <div className="flex items-center justify-center mt-6">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <button className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-gray-600">
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>
          </PaginationItem>

          <PaginationItem>
            <PaginationLink
              size="icon"
              href="#"
              isActive
              className="bg-primary"
            >
              1
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink size="icon" href="#">
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink size="icon" href="#">
              3
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink size="icon" href="#">
              4
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink size="icon" href="#">
              5
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink size="icon" href="#">
              6
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>

          <PaginationItem>
            <button className="flex items-center gap-1 px-2 py-1">
              <span>Next</span> <ChevronRight className="h-4 w-4" />
            </button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
