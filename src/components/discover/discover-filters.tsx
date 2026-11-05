"use client";

import type { CategoryId, CountryCode } from "@/lib/types";
import { CATEGORIES, COUNTRIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label, Switch } from "@/components/ui/primitives";
import { usePreferencesStore } from "@/store/preferences-store";

export interface DiscoverFilterState {
  categories: CategoryId[];
  countries: CountryCode[];
  approvedOnly: boolean;
}

export const EMPTY_FILTERS: DiscoverFilterState = { categories: [], countries: [], approvedOnly: false };

export const activeFilterCount = (f: DiscoverFilterState) => f.categories.length + f.countries.length + (f.approvedOnly ? 1 : 0);

function Chip({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

export function DiscoverFilters({
  value,
  onChange,
  allowUnverified,
}: {
  value: DiscoverFilterState;
  onChange: (v: DiscoverFilterState) => void;
  allowUnverified: boolean;
}) {
  const currencyDisplay = usePreferencesStore((s) => s.currencyDisplay);
  const setCurrencyDisplay = usePreferencesStore((s) => s.setCurrencyDisplay);
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);

  return (
    <div className="grid gap-6">
      <section className="grid gap-3" aria-labelledby="f-cat">
        <h3 id="f-cat" className="text-sm font-semibold">
          Category
        </h3>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              label={`Filter by ${c.label}`}
              active={value.categories.includes(c.id)}
              onClick={() => onChange({ ...value, categories: toggle(value.categories, c.id) })}
            >
              <c.icon className="size-3.5" /> {c.label}
            </Chip>
          ))}
        </div>
      </section>
      <section className="grid gap-3" aria-labelledby="f-country">
        <h3 id="f-country" className="text-sm font-semibold">
          Country
        </h3>
        <div className="flex flex-wrap gap-2">
          {COUNTRIES.map((c) => (
            <Chip
              key={c.code}
              label={`Filter by ${c.name}`}
              active={value.countries.includes(c.code)}
              onClick={() => onChange({ ...value, countries: toggle(value.countries, c.code) })}
            >
              <span aria-hidden>{c.flag}</span> {c.code === "AE" ? "UAE" : c.code === "GB" ? "UK" : c.code === "US" ? "USA" : c.name}
            </Chip>
          ))}
        </div>
      </section>
      <section className="grid gap-4" aria-label="More options">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="approved-only" className="grid gap-1">
            Demo-approved only
            <span className="text-xs font-normal text-muted-foreground">
              {allowUnverified ? "Hide pending and unverified requests" : "Unverified requests are hidden by moderators"}
            </span>
          </Label>
          <Switch
            id="approved-only"
            checked={value.approvedOnly || !allowUnverified}
            disabled={!allowUnverified}
            onCheckedChange={(v) => onChange({ ...value, approvedOnly: v })}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="usd" className="grid gap-1">
            Show USD equivalent
            <span className="text-xs font-normal text-muted-foreground">Fixed demo rates, for orientation only</span>
          </Label>
          <Switch id="usd" checked={currencyDisplay === "usd"} onCheckedChange={(v) => setCurrencyDisplay(v ? "usd" : "original")} />
        </div>
      </section>
      {activeFilterCount(value) > 0 && (
        <Button variant="outline" size="sm" className="justify-self-start" onClick={() => onChange(EMPTY_FILTERS)}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
