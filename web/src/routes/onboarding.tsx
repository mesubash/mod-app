import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Screen, PageTitle, Meta, PrimaryButton, TextLink } from "@/components/mod/ui";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up MOD — phone, code, usual trip" },
      {
        name: "description",
        content:
          "Three steps: confirm your phone number, enter the code, and save the trip you make most mornings.",
      },
      { property: "og:title", content: "Set up MOD — phone, code, usual trip" },
      {
        property: "og:description",
        content:
          "Three steps: confirm your phone number, enter the code, and save the trip you make most mornings.",
      },
    ],
  }),
  component: Onboarding,
});

const field =
  "min-h-[2.75rem] w-full rounded-md bg-surface px-3 py-3 text-base text-foreground placeholder:text-muted";

function Onboarding() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [from, setFrom] = useState("Jadibuti");
  const [to, setTo] = useState("Maitighar");
  const [departure, setDeparture] = useState("08:15");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <Screen>
        <div className="space-y-6">
          <PageTitle>Your usual trip is saved</PageTitle>
          <Meta>
            {from} to {to}, leaving about {departure}. We will tell you when the road ahead is
            disrupted.
          </Meta>
          <TextLink to="/">Go to your route</TextLink>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="space-y-10">
        <header className="space-y-3">
          <p className="text-2xl font-semibold tracking-tight">
            MOD <span className="deva font-semibold">मोड</span>
          </p>
          <Meta>Step {step} of 3</Meta>
        </header>

        {step === 1 && (
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (phone.replace(/\D/g, "").length < 10) {
                setError("Enter a 10-digit Nepali mobile number, for example 9801234567.");
                return;
              }
              setError(null);
              setStep(2);
            }}
          >
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-lg font-semibold">
                Your phone number
              </label>
              <Meta>We send one code to confirm it. No other messages.</Meta>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9801234567"
                className={field}
              />
              {error ? <p role="alert">{error}</p> : null}
            </div>
            <PrimaryButton type="submit">Send code</PrimaryButton>
          </form>
        )}

        {step === 2 && (
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.replace(/\D/g, "").length !== 6) {
                setError("That code is not 6 digits. Check the message and try again.");
                return;
              }
              setError(null);
              setStep(3);
            }}
          >
            <div className="space-y-2">
              <label htmlFor="code" className="block text-lg font-semibold">
                Enter the 6-digit code
              </label>
              <Meta>Sent to {phone || "your number"} a moment ago.</Meta>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className={field}
              />
              {error ? <p role="alert">{error}</p> : null}
            </div>
            <PrimaryButton type="submit">Confirm</PrimaryButton>
            <div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="min-h-[2.75rem] rounded-md px-1 text-base underline underline-offset-4 hover:bg-surface-hover"
              >
                Change number
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (!from.trim() || !to.trim()) {
                setError("Both places are needed so we can watch the roads between them.");
                return;
              }
              setError(null);
              setDone(true);
            }}
          >
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Your usual trip</h2>
              <Meta>The trip you make most mornings. You can change it later.</Meta>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="from" className="block text-base">
                  From
                </label>
                <input
                  id="from"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className={field}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="to" className="block text-base">
                  To
                </label>
                <input
                  id="to"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className={field}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="departure" className="block text-base">
                  Typical departure time
                </label>
                <input
                  id="departure"
                  type="time"
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  className={field}
                />
              </div>
              {error ? <p role="alert">{error}</p> : null}
            </div>
            <PrimaryButton type="submit">Save trip</PrimaryButton>
          </form>
        )}
      </div>
    </Screen>
  );
}
