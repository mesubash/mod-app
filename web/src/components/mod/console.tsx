import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Screen } from "@/components/mod/ui";

const tabs = [
  { to: "/operator", label: "Post a disruption" },
  { to: "/operator/live", label: "Live view" },
  { to: "/operator/conditions", label: "Reported conditions" },
] as const;

/**
 * Console frame: the wordmark beside the console label, then the three views.
 * Desktop-first, but the tabs wrap and stay 44px tall so a duty officer can
 * post from a phone.
 */
export function Console({ current, children }: { current: string; children: ReactNode }) {
  return (
    <Screen wide>
      <div className="space-y-8">
        <header className="space-y-4 border-b border-border pb-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-base font-semibold">MOD</span>
            <span className="text-base text-muted">Operator console</span>
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-1">
            {tabs.map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                className={`inline-flex min-h-[2.75rem] items-center rounded-md px-2 text-base hover:bg-surface-hover ${
                  current === tab.to ? "bg-surface font-medium" : "text-muted"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </header>

        {children}

        <div className="border-t border-border pt-6">
          <Link
            to="/"
            className="inline-flex min-h-[2.75rem] items-center rounded-md px-1 text-base text-muted underline underline-offset-4 hover:bg-surface-hover hover:text-foreground"
          >
            Back to the traveller app
          </Link>
        </div>
      </div>
    </Screen>
  );
}

/** Dense operator row: a real table on desktop, stacked with inline labels below 640px. */
export function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <td className="py-2 align-top max-sm:flex max-sm:gap-2 max-sm:py-1 sm:px-3 sm:first:pl-0">
      <span aria-hidden="true" className="hidden text-muted max-sm:inline max-sm:min-w-[7.5rem]">
        {label}
      </span>
      <span className="max-sm:flex-1">{children}</span>
    </td>
  );
}
