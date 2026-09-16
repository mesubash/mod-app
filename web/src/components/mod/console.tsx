import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

const TABS = [
  { to: "/operator", label: "Post a disruption" },
  { to: "/operator/live", label: "Live view" },
  { to: "/operator/conditions", label: "Reported conditions" },
] as const;

/**
 * Shared frame for the three operator screens: the wordmark once, all three
 * tabs with the current one shown, a link back to the traveller app.
 *
 * Deliberately not wrapped in the traveller app's Screen component. Screen's
 * padding exists to clear the traveller tab bar and side rail, and nav.tsx
 * already hides both of those on every /operator/* route -- applying that
 * padding here just leaves dead space that has nothing to clear.
 */
export function Console({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <main className="mx-auto w-full max-w-[75rem] px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-4">
        <h1 className="text-xl font-semibold tracking-tight">
          MOD <span className="font-deva text-muted">मोड</span>{" "}
          <span className="font-normal text-muted">operator console</span>
        </h1>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-base">
          {TABS.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              aria-current={path === tab.to ? "page" : undefined}
              className={
                path === tab.to
                  ? "font-medium underline underline-offset-4"
                  : "text-muted underline underline-offset-4"
              }
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      {children}

      <div className="mt-10 border-t border-border pt-6">
        <Link to="/" className="text-base text-muted underline underline-offset-4">
          Back to the traveller app
        </Link>
      </div>
    </main>
  );
}
