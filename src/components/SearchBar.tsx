'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from './Input';

interface SearchBarProps {
  placeholder?: string;
}

/**
 * Debounced search that writes the query into the URL.
 *
 * The previous version pushed a route from an effect that listed `searchParams` in its own
 * dependency array, with no check that anything had actually changed. That is self-feeding: the
 * effect runs on mount, pushes (even with an empty box, and even when the URL already said what
 * it was about to say), the push hands back a new `searchParams` object, the changed dependency
 * re-runs the effect, and 500ms later it pushes again — for as long as the page is open. Every
 * list page paid for that with a router navigation twice a second, which is what made switching
 * pages and pressing buttons feel laggy.
 *
 * Two things keep it settled now: the effect depends on the debounced query and the value
 * currently in the URL (both plain strings, so an unchanged render is not a change), and it
 * returns early unless they actually differ.
 */
export function SearchBar({ placeholder = 'Search...' }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get('search') ?? '';
  const [query, setQuery] = useState(urlQuery);

  // Back/forward, or a link that clears the filter, changes the URL without touching this input.
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    if (query === urlQuery) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (query) {
        params.set('search', query);
      } else {
        params.delete('search');
      }
      // A new query invalidates the current offset — page 4 of the old result set is meaningless.
      params.delete('page');

      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    }, 400);

    return () => clearTimeout(timer);
  }, [query, urlQuery, pathname, router]);

  return (
    <div className="relative flex-1 max-w-md">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted">
        <Search className="h-4 w-4" />
      </div>
      <Input
        type="text"
        className="pl-10"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </div>
  );
}
