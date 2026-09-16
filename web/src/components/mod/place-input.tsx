import { useEffect, useId, useRef, useState } from "react";

import { searchPlaces, type Point } from "@/lib/api";
import { PLACES } from "@/lib/places";

export type Place = { name: string; point: Point };

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Type-ahead over the fixed corridor list, upgrading to real place search
 * once a Baato key is configured. /places/search itself already degrades to
 * configured:false with no key set, so this needs no separate on/off switch
 * -- it just starts returning real results the moment one is added.
 */
export function PlaceInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Place;
  onChange: (place: Place) => void;
}) {
  const [query, setQuery] = useState(value.name);
  const [options, setOptions] = useState<Place[]>(PLACES);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // The selection can also change from outside (the home screen's swap
  // button), so the displayed text has to follow it rather than only being
  // set on pick.
  useEffect(() => {
    setQuery(value.name);
  }, [value.name]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setOptions(PLACES);
      return;
    }
    const fixed = PLACES.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

    let cancelled = false;
    const timer = setTimeout(() => {
      searchPlaces(q)
        .then((r) => {
          if (cancelled) return;
          if (!r.configured || r.results.length === 0) {
            setOptions(fixed);
            return;
          }
          setOptions(r.results.map((p) => ({ name: p.name, point: { lon: p.lon, lat: p.lat } })));
        })
        .catch(() => !cancelled && setOptions(fixed));
    }, SEARCH_DEBOUNCE_MS);

    setOptions(fixed);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function pick(place: Place) {
    onChange(place);
    setQuery(place.name);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const picked = options[highlighted];
      if (picked) pick(picked);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(value.name);
    }
  }

  return (
    <div className="relative">
      <label className="block">
        <span className="text-sm text-muted">{label}</span>
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && options[highlighted] ? `${listId}-${highlighted}` : undefined
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlighted(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Let a click on an option register before the list disappears.
            setTimeout(() => {
              setOpen(false);
              setQuery(value.name);
            }, 150);
          }}
          onKeyDown={onKeyDown}
          className="mt-1 block min-h-11 w-full rounded-[6px] border border-border bg-background px-3 text-base"
        />
      </label>

      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-[6px] border border-border bg-background shadow-sm"
        >
          {options.map((p, i) => (
            <li
              key={`${p.name}-${p.point.lon}-${p.point.lat}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === highlighted}
              onMouseDown={() => pick(p)}
              onMouseEnter={() => setHighlighted(i)}
              className={`min-h-11 cursor-pointer px-3 py-2 text-base ${
                i === highlighted ? "bg-surface" : ""
              }`}
            >
              {p.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
