'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  total: number;
  page: number;
  pages: number;
  paramName?: string;
}

export function Pagination({ total, page, pages, paramName = 'page' }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  if (pages <= 1) return null;

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pages) return;
    router.push(createPageURL(newPage), { scroll: false });
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisible = 5;
    
    if (pages <= maxVisible) {
      for (let i = 1; i <= pages; i++) pageNumbers.push(i);
    } else {
      pageNumbers.push(1);
      
      if (page > 3) {
        pageNumbers.push('...');
      }
      
      let start = Math.max(2, page - 1);
      let end = Math.min(pages - 1, page + 1);
      
      if (page <= 3) end = 4;
      if (page >= pages - 2) start = pages - 3;
      
      for (let i = start; i <= end; i++) pageNumbers.push(i);
      
      if (page < pages - 2) {
        pageNumbers.push('...');
      }
      
      pageNumbers.push(pages);
    }
    return pageNumbers;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-hairline)] sm:px-6 mt-4">
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Showing <span className="font-medium">page {page}</span> of{' '}
            <span className="font-medium">{pages}</span> ({total} total results)
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex items-center gap-x-2" aria-label="Pagination">
            <button
              className="inline-flex h-8 items-center justify-center rounded-full px-2 py-2 bg-black text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="inline-flex -space-x-px rounded-md shadow-sm">
            
            {getPageNumbers().map((num, idx) => {
              if (num === '...') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] ring-1 ring-inset ring-[var(--color-hairline)] focus:outline-offset-0"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </span>
                );
              }
              
              const isCurrent = num === page;
              return (
                <button
                  key={`page-${num}`}
                  onClick={() => handlePageChange(num as number)}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-[var(--color-hairline)] focus:z-20 focus:outline-offset-0 ${
                    isCurrent
                      ? 'z-10 bg-black text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black'
                      : 'text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)]'
                  }`}
                >
                  {num}
                </button>
              );
            })}

            </div>

            <button
              className="inline-flex h-8 items-center justify-center rounded-full px-2 py-2 bg-black text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= pages}
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
