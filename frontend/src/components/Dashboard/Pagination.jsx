import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const Pagination = ({ currentPage, totalPages, onPageChange, className }) => {
  // Generate page numbers array with ellipsis handling
  const getPageNumbers = () => {
    const pages = [];
    
    // Always show first and last pages
    // Show ellipsis (...) for large ranges
    if (totalPages <= 7) {
      // Less than 7 pages, show all
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // More than 7 pages, show with ellipsis
      pages.push(1); // Always show first page
      
      if (currentPage <= 3) {
        // Near start: 1 2 3 4 5 ... n
        pages.push(2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near end: 1 ... n-4 n-3 n-2 n-1 n
        pages.push('...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        // Middle: 1 ... c-1 c c+1 ... n
        pages.push('...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    
    return pages;
  };
  
  return (
    <div className={cn("flex justify-center items-center gap-2", className)}>
      {/* Previous button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          "h-9 w-9 rounded-full bg-black border border-gray-800 text-white",
          "hover:bg-zinc-800 hover:border-gray-700",
          "disabled:opacity-50 disabled:pointer-events-none"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {/* Page numbers */}
      {getPageNumbers().map((page, index) => (
        page === '...' ? (
          <span key={`ellipsis-${index}`} className="px-2 text-gray-500">...</span>
        ) : (
          <Button
            key={`page-${page}`}
            variant={currentPage === page ? 'default' : 'outline'}
            className={cn(
              "h-9 w-9 rounded-full font-medium",
              currentPage === page 
                ? "bg-[#8A2BE2] hover:bg-purple-700 text-white border-none" 
                : "bg-black border border-gray-800 text-white hover:bg-zinc-800 hover:border-gray-700"
            )}
            onClick={() => onPageChange(page)}
            size="sm"
          >
            {page}
          </Button>
        )
      ))}
      
      {/* Next button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          "h-9 w-9 rounded-full bg-black border border-gray-800 text-white",
          "hover:bg-zinc-800 hover:border-gray-700",
          "disabled:opacity-50 disabled:pointer-events-none"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default Pagination;