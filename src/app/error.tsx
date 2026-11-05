"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetAllDemoData } from "@/store";

/** Route-level error screen. Keeps the site chrome and offers retry, home, and a demo-data reset. */
export default function RouteError({ error, retry }: { error: unknown; retry: () => void }) {
  React.useEffect(() => {
    console.error("[BillSwipe] Page error:", error);
  }, [error]);

  const digest = error && typeof error === "object" && "digest" in error ? String((error as { digest?: string }).digest) : null;

  return (
    <main id="main" className="mx-auto grid min-h-[60dvh] max-w-lg place-items-center px-4 py-20 text-center">
      <div className="grid justify-items-center gap-4" role="alert">
        <span className="grid size-14 place-items-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="size-6 text-destructive" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong on this page</h1>
        <p className="text-sm text-muted-foreground">
          The rest of BillSwipe still works. Try again, or head back home. If it keeps happening, resetting the demo data stored in this browser
          usually fixes it.
        </p>
        {digest && <p className="font-mono text-xs text-muted-foreground">Reference: {digest}</p>}
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button onClick={() => retry()}>
            <RotateCcw /> Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <Home /> Home
            </Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              resetAllDemoData();
              window.location.assign("/");
            }}
          >
            <Trash2 /> Reset demo data
          </Button>
        </div>
      </div>
    </main>
  );
}
