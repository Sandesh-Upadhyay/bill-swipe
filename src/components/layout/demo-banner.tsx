"use client";

import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { useAdminStore } from "@/store/admin-store";
import { useHydrated } from "@/store/hydration-store";
import { t } from "@/lib/i18n/messages";

/** Persistent prototype disclosure shown at the top of every page. */
export function DemoBanner() {
  const hydrated = useHydrated();
  const show = useAdminStore((s) => s.settings.showDemoBanner);
  if (hydrated && !show) return null;
  return (
    <div className="relative z-50 bg-forest text-mint">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-xs sm:text-[13px]">
        <FlaskConical className="size-3.5 shrink-0" aria-hidden />
        <p>
          <strong className="font-semibold">{t("demo.bannerTitle")}</strong>{" "}
          <span className="text-mint/80">{t("demo.bannerBody")}</span>{" "}
          <Link href="/faq" className="underline underline-offset-2 hover:text-white">
            Learn more
          </Link>
        </p>
      </div>
    </div>
  );
}
