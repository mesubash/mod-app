import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function Screen({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  // pb-24 clears the phone tab bar; sm:pl-20 clears the desktop rail.
  return (
    <main
      className={`mx-auto w-full px-4 pt-6 pb-24 sm:pt-10 sm:pb-12 sm:pl-20 sm:pr-6 ${
        wide ? "max-w-[75rem]" : "max-w-[45rem]"
      }`}
    >
      {children}
    </main>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{children}</h1>;
}

export function Meta({ children }: { children: ReactNode }) {
  return <p className="text-base text-muted">{children}</p>;
}

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="min-h-[2.75rem] w-full rounded-md bg-foreground px-5 py-3 text-base font-medium text-inverse hover:bg-foreground/90 disabled:opacity-40 sm:w-auto sm:min-w-[12rem]"
    >
      {children}
    </button>
  );
}

export function TextButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[2.75rem] rounded-md px-1 text-base font-medium underline underline-offset-4 hover:bg-surface-hover"
    >
      {children}
    </button>
  );
}

export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-[2.75rem] items-center rounded-md px-1 text-base font-medium underline underline-offset-4 hover:bg-surface-hover"
    >
      {children}
    </Link>
  );
}

export function Group({ children }: { children: ReactNode }) {
  return <div className="rounded-md bg-surface p-4 sm:p-5">{children}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return <p className="text-base text-muted">{children}</p>;
}

export function Divider() {
  return <hr className="border-t border-border" />;
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-[2.75rem] items-center rounded-md pr-2 text-base text-muted underline underline-offset-4 hover:bg-surface-hover hover:text-foreground"
    >
      {children}
    </Link>
  );
}
