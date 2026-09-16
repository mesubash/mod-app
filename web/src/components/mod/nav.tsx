import { Link, useRouterState } from "@tanstack/react-router";
import { CircleAlert, Info, MapPin, Route } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Today", icon: MapPin },
  { to: "/trip", label: "Trip", icon: Route },
  { to: "/report", label: "Report", icon: CircleAlert },
  { to: "/how-it-works", label: "More", icon: Info },
] as const;

export function TabBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  // The operator console is a different product with its own navigation.
  if (path.startsWith("/operator")) return null;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="mx-auto flex max-w-[45rem]">
        {ITEMS.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? path === "/" : path.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${
                  active ? "text-foreground" : "text-muted"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideRail() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path.startsWith("/operator")) return null;

  return (
    <nav
      aria-label="Main"
      className="hidden sm:fixed sm:inset-y-0 sm:left-0 sm:z-20 sm:flex sm:w-20 sm:flex-col sm:gap-1 sm:border-r sm:border-border sm:bg-background sm:p-2"
    >
      <span className="mb-6 pt-3 text-center text-lg font-semibold tracking-tight">MOD</span>
      {ITEMS.map(({ to, label, icon: Icon }) => {
        const active = to === "/" ? path === "/" : path.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-[6px] px-1 text-xs ${
              active ? "bg-surface font-medium text-foreground" : "text-muted hover:bg-surface"
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
