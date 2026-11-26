import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bike, Bus, Car, Truck } from "lucide-react";
import { useState } from "react";

import { PlaceInput } from "@/components/mod/place-input";
import { Meta, PrimaryButton, Screen, TextButton } from "@/components/mod/ui";
import type { Vehicle } from "@/lib/api";
import { DEFAULT_DESTINATION, PLACES, VEHICLES } from "@/lib/places";
import { finishOnboarding } from "@/lib/recent-trips";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Save your usual trip — MOD" },
      {
        name: "description",
        content: "Tell MOD the trip you make most days, so it opens on your route.",
      },
    ],
  }),
  component: Onboarding,
});

const ICON = { motorcycle: Bike, car: Car, bus: Bus, truck: Truck };

// There is no account and no phone number: the usual trip lives on this
// device only. docs/product.md asks whether a traveller can use the product
// without an account, and for a route advisor the answer can simply be yes.
function Onboarding() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(PLACES[2]!);
  const [to, setTo] = useState(DEFAULT_DESTINATION);
  const [vehicle, setVehicle] = useState<Vehicle>("motorcycle");
  const same = from.name === to.name;

  function done(save: boolean) {
    finishOnboarding(save ? { from: from.name, to: to.name, vehicle } : null);
    navigate({ to: "/" });
  }

  return (
    <Screen>
      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (!same) done(true);
        }}
      >
        <header className="space-y-3">
          <p className="text-2xl font-semibold tracking-tight">
            MOD <span className="deva font-semibold">मोड</span>
          </p>
          <h1 className="text-xl font-semibold">Save the trip you make most days</h1>
          <Meta>
            MOD opens on this route and tells you when something on it is shut. It stays on this
            phone; there is no account.
          </Meta>
        </header>

        <div className="space-y-4">
          <PlaceInput label="From" value={from} onChange={setFrom} />
          <PlaceInput label="To" value={to} onChange={setTo} />
          {same && (
            <p className="text-base" role="alert">
              Pick two different places.
            </p>
          )}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm text-muted">You travel by</legend>
          <div className="vehicle-options">
            {VEHICLES.map(({ id, label }) => {
              const Icon = ICON[id];
              const on = vehicle === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setVehicle(id)}
                  aria-pressed={on}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-[6px] px-3 ${
                    on
                      ? "bg-foreground text-inverse"
                      : "bg-surface text-foreground hover:bg-surface-hover"
                  }`}
                >
                  <Icon size={18} aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
          <Meta>Scooters can take roads a car cannot, so the routes differ.</Meta>
        </fieldset>

        <div className="space-y-2">
          <PrimaryButton type="submit" disabled={same}>
            Save my trip
          </PrimaryButton>
          <div>
            <TextButton onClick={() => done(false)}>Skip for now</TextButton>
          </div>
        </div>
      </form>
    </Screen>
  );
}
