import { Meta, PrimaryButton } from "@/components/mod/ui";

/**
 * The road ahead changed: two equal-weight choices, no default. Used both by
 * a running trip (a real alternative, computed from where the traveller
 * actually is) and by the standalone /re-advice screen (a fixed mock, for
 * reviewing the interaction on its own).
 */
export function ReAdvicePrompt({
  what,
  advice,
  note = "Your current route still gets you there. This is the only change we will offer for the next few minutes.",
  onSwitch,
  onStay,
}: {
  what: string;
  advice: string;
  note?: string;
  onSwitch: () => void;
  onStay: () => void;
}) {
  return (
    <section className="space-y-4 rounded-[6px] bg-surface p-4">
      <p className="text-base text-alert">{what}</p>
      <p className="text-lg font-semibold break-words">{advice}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <PrimaryButton onClick={onSwitch}>Switch</PrimaryButton>
        <PrimaryButton onClick={onStay}>Stay on this route</PrimaryButton>
      </div>
      <Meta>{note}</Meta>
    </section>
  );
}
