import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import { SideRail, TabBar } from "@/components/mod/nav";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <main className="mx-auto w-full max-w-[45rem] px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Page not found</h1>
      <p className="mt-2 text-base text-muted">
        That address does not exist. Nothing is wrong with your trip.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex min-h-11 items-center rounded-[6px] bg-foreground px-4 text-base font-medium text-inverse"
      >
        Back to home
      </Link>
    </main>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <main className="mx-auto w-full max-w-[45rem] px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">This did not load</h1>
      <p className="mt-2 text-base text-muted">
        The route service did not answer. Your saved trip is unaffected.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="inline-flex min-h-11 items-center rounded-[6px] bg-foreground px-4 text-base font-medium text-inverse"
        >
          Try again
        </button>
        <a href="/" className="text-base underline underline-offset-4">
          Back to home
        </a>
      </div>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MOD — a different way around the jam" },
      {
        name: "description",
        content:
          "MOD tells Kathmandu commuters when the road ahead is disrupted and which alternative to take.",
      },
      { property: "og:title", content: "MOD — a different way around the jam" },
      {
        property: "og:description",
        content:
          "MOD tells Kathmandu commuters when the road ahead is disrupted and which alternative to take.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Sans+Devanagari:wght@400;500;600&display=swap",
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <SideRail />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <TabBar />
    </QueryClientProvider>
  );
}
