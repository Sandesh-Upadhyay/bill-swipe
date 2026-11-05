"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, SearchX, SlidersHorizontal } from "lucide-react";
import type { CategoryId, CountryCode } from "@/lib/types";
import { CATEGORIES, COUNTRIES } from "@/lib/constants";
import { cn, percent } from "@/lib/utils";
import { Input, NativeSelect } from "@/components/ui/basic";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/primitives";
import { EmptyState } from "@/components/layout/page-parts";
import { RequestCard, RequestCardSkeleton } from "@/components/requests/request-card";
import { isDiscoverable, useRequestsStore } from "@/store/requests-store";
import { useHydrated } from "@/store/hydration-store";
import { useAuthStore } from "@/store/auth-store";
import { useBlockedIds } from "@/store/saved-store";
import { usePreferencesStore } from "@/store/preferences-store";
import { useSuspendedUserIds } from "@/store/admin-store";

type Sort = "newest" | "funded" | "due";

export function ExploreBrowser() {
  const hydrated = useHydrated();
  const requests = useRequestsStore((s) => s.requests);
  const session = useAuthStore((s) => s.session);
  const blocked = useBlockedIds(session?.userId);
  const suspended = useSuspendedUserIds();
  const currencyDisplay = usePreferencesStore((s) => s.currencyDisplay);
  const setCurrencyDisplay = usePreferencesStore((s) => s.setCurrencyDisplay);

  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<CategoryId | "all">("all");
  const [country, setCountry] = React.useState<CountryCode | "all">("all");
  const [sort, setSort] = React.useState<Sort>("newest");
  const [includeCompleted, setIncludeCompleted] = React.useState(true);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = requests.filter((r) => {
      if (!(isDiscoverable(r) || (includeCompleted && r.status === "completed"))) return false;
      if (blocked.includes(r.userId) || suspended.has(r.userId)) return false;
      if (category !== "all" && r.category !== category) return false;
      if (country !== "all" && r.country !== country) return false;
      if (q && ![r.title, r.summary, r.name, r.city].some((f) => f.toLowerCase().includes(q))) return false;
      return true;
    });
    return list.sort((a, b) => {
      if (sort === "funded") return percent(b.amountRaised, b.amount) - percent(a.amountRaised, a.amount);
      if (sort === "due") return a.dueDate.localeCompare(b.dueDate);
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [requests, blocked, suspended, category, country, query, sort, includeCompleted]);

  const filtersActive = query || category !== "all" || country !== "all" || !includeCompleted;
  const resetFilters = () => {
    setQuery("");
    setCategory("all");
    setCountry("all");
    setIncludeCompleted(true);
  };

  return (
    <div className="grid gap-8">
      <div className="grid gap-4 rounded-3xl border bg-card p-4 shadow-soft sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Label htmlFor="explore-search" className="sr-only">
              Search requests
            </Label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="explore-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, story or city…"
              className="pl-10"
            />
          </div>
          <div>
            <Label htmlFor="explore-country" className="sr-only">
              Country
            </Label>
            <NativeSelect id="explore-country" value={country} onChange={(e) => setCountry(e.target.value as CountryCode | "all")}>
              <option value="all">All countries</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="explore-sort" className="sr-only">
              Sort by
            </Label>
            <NativeSelect id="explore-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="newest">Newest first</option>
              <option value="funded">Most funded</option>
              <option value="due">Due soonest</option>
            </NativeSelect>
          </div>
          <div className="flex items-center rounded-xl border p-1" role="group" aria-label="Currency display">
            {(
              [
                ["original", "Local"],
                ["usd", "+ USD"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                aria-pressed={currencyDisplay === v}
                onClick={() => setCurrencyDisplay(v)}
                className={cn(
                  "h-9 flex-1 rounded-lg px-3 text-sm font-medium transition",
                  currencyDisplay === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" role="group" aria-label="Filter by category">
          <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          {[{ id: "all" as const, label: "All categories" }, ...CATEGORIES].map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition",
                category === c.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              {c.label}
            </button>
          ))}
          <label className="ml-auto flex shrink-0 items-center gap-2 pl-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={includeCompleted}
              onChange={(e) => setIncludeCompleted(e.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            Show goal reached
          </label>
        </div>
        {currencyDisplay === "usd" && (
          <p className="text-xs text-muted-foreground">USD equivalents use fixed, fictional demo rates — for orientation only.</p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground" aria-live="polite">
        <span>{hydrated ? `${filtered.length} fictional request${filtered.length === 1 ? "" : "s"}` : "Loading requests…"}</span>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Reset filters
          </Button>
        )}
      </div>

      {!hydrated ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <RequestCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No requests match these filters"
          description="Try a different category or country, or clear your search."
          action={<Button onClick={resetFilters}>Reset filters</Button>}
        />
      ) : (
        <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((r) => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25 }}
              >
                <RequestCard request={r} showStatus={r.status !== "active"} className="h-full" />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
