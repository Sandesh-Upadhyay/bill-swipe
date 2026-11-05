import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { DEMO_DISCLAIMER, TAGLINE } from "@/lib/constants";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/discover", label: "Discover" },
      { href: "/explore", label: "Explore requests" },
      { href: "/submit", label: "Submit a bill" },
      { href: "/how-it-works", label: "How it works" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/mission", label: "Our mission" },
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Demo",
    links: [
      { href: "/login", label: "Demo login" },
      { href: "/signup", label: "Create demo account" },
      { href: "/admin", label: "Admin panel" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_2fr] lg:px-8">
        <div className="grid content-start gap-4">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">{TAGLINE} A transparent way to help people with genuine, essential bills.</p>
          <p className="max-w-sm rounded-2xl border border-dashed p-4 text-xs leading-relaxed text-muted-foreground">{DEMO_DISCLAIMER}</p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <p className="text-sm font-semibold">{c.title}</p>
              <ul className="mt-4 grid gap-2.5">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted-foreground transition hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} BillSwipe Prototype. Fictional demonstration only.</p>
          <p>Made for investors, partners & early users.</p>
        </div>
      </div>
    </footer>
  );
}
