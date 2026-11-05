"use client";

/**
 * Last-resort error screen for failures in the root layout. It replaces the whole document,
 * so it can't rely on the app's stylesheet and uses inline styles in the BillSwipe palette.
 */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#0b1f19",
          color: "#e8f5ef",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: 24,
          textAlign: "center",
        }}
      >
        <main role="alert" style={{ maxWidth: 440 }}>
          <p style={{ fontSize: 14, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6ee7b7", margin: 0 }}>BillSwipe</p>
          <h1 style={{ fontSize: 26, margin: "12px 0 8px" }}>We couldn&apos;t load the app</h1>
          <p style={{ color: "rgba(232,245,239,0.75)", lineHeight: 1.5, margin: 0 }}>
            Something went wrong while starting BillSwipe. Try again. If the problem continues, clear this site&apos;s data in your browser
            settings to reset the demo.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{ background: "#6ee7b7", color: "#062018", border: 0, borderRadius: 999, padding: "10px 20px", fontWeight: 600, cursor: "pointer" }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{ color: "#e8f5ef", border: "1px solid rgba(232,245,239,0.3)", borderRadius: 999, padding: "10px 20px", textDecoration: "none" }}
            >
              Go home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
