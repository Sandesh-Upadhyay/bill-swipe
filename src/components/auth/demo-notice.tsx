import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

export function DemoAuthNotice({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200",
        className,
      )}
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0" />
      <p>
        {children ?? (
          <>
            <strong>Demo authentication.</strong> No real account is created and your password is never stored or checked. Your
            demo session is saved only in this browser.
          </>
        )}
      </p>
    </div>
  );
}
