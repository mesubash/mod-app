export const savedTrip = {
  from: "Jadibuti",
  to: "Maitighar",
  departure: "08:15",
  day: "Wednesday, 16 September",
  usualDuration: "about 26 minutes",
};

export const disruption = {
  headline: "Tinkune–Koteshwor closed until about 10:30 — VIP movement",
  posted: "08:22",
  kind: "Closure",
};

export const assignment = {
  route: "Via Old Baneshwor",
  cost: "about 6 minutes longer than usual",
  reason: "Others are being sent via Sinamangal, so no single road takes the whole diversion.",
  arrival: "09:04, about 12 minutes from here",
};

export type Alternative = {
  route: string;
  cost: string;
  load: "Assigned to you" | "Loaded most heavily" | "Lightly loaded";
  note: string;
};

export const alternatives: Alternative[] = [
  {
    route: "Via Old Baneshwor",
    cost: "about 6 minutes longer than usual",
    load: "Assigned to you",
    note: "Two signals, steady flow reported at 08:20.",
  },
  {
    route: "Via Sinamangal",
    cost: "about 4 minutes longer than usual",
    load: "Loaded most heavily",
    note: "Taking the largest share of the diversion this morning.",
  },
  {
    route: "Via Thapathali",
    cost: "about 11 minutes longer than usual",
    load: "Lightly loaded",
    note: "Longer, but slow-moving near the bridge since 08:05.",
  },
];

export const reAdvice = {
  what: "Flooding at Thapathali.",
  advice: "Via Maitighar, about 8 minutes faster than staying on.",
  seenAt: "08:41",
};

export const tripProgress = {
  onRoute: "Old Baneshwor, past the Shanti Nagar turn",
  nextCheck: "Advice could change at the Maitighar approach",
  arrival: "09:04, about 12 minutes",
  startedAt: "08:26",
};

export const reportKinds = ["Heavy jam", "Flooding", "Closed road", "Accident"] as const;

export const segments = [
  "Tinkune–Koteshwor",
  "Koteshwor–Jadibuti",
  "Maitighar–Thapathali",
  "Thapathali–Kupondole",
  "Old Baneshwor–Shanti Nagar",
  "Sinamangal–Airport gate",
];

export const disruptionKinds = ["Closure", "Accident", "Weather", "Event"];

export const activeDisruption = {
  segment: "Tinkune–Koteshwor",
  kind: "Closure",
  headline: "Tinkune–Koteshwor closed until about 10:30 — VIP movement",
  posted: "08:22",
  expected: "Until about 10:30",
  notified: 329,
};

// Travellers with a saved trip through each segment at this hour. Shown to the
// operator only — the traveller app never claims a count.
export const segmentMatches: Record<string, number> = {
  "Tinkune–Koteshwor": 329,
  "Koteshwor–Jadibuti": 214,
  "Maitighar–Thapathali": 186,
  "Thapathali–Kupondole": 97,
  "Old Baneshwor–Shanti Nagar": 143,
  "Sinamangal–Airport gate": 62,
};

export const durations = [
  "About 30 minutes",
  "About 1 hour",
  "About 2 hours",
  "Until about 10:30",
  "Not known yet",
];

export const assignmentSplit = [
  { route: "Via Old Baneshwor", assigned: 118, compliance: "71% reported" },
  { route: "Via Sinamangal", assigned: 164, compliance: "66% reported" },
  { route: "Via Thapathali", assigned: 47, compliance: "58% reported" },
];

export type ReportedCondition = {
  what: string;
  where: string;
  reports: number;
  when: string;
  flow: number;
  flowNote: string;
};

export const reportedConditions: ReportedCondition[] = [
  {
    what: "Flooding",
    where: "Thapathali, river side",
    reports: 9,
    when: "2 minutes ago",
    flow: 640,
    flowNote: "moving",
  },
  {
    what: "Heavy jam",
    where: "Koteshwor junction, west arm",
    reports: 14,
    when: "4 minutes ago",
    flow: 90,
    flowNote: "near standstill",
  },
  {
    what: "Accident",
    where: "Sinamangal, near the airport gate",
    reports: 3,
    when: "11 minutes ago",
    flow: 410,
    flowNote: "moving",
  },
  {
    what: "Closed road",
    where: "Tinkune–Koteshwor",
    reports: 21,
    when: "18 minutes ago",
    flow: 0,
    flowNote: "closed",
  },
  {
    what: "Heavy jam",
    where: "Old Baneshwor, Shanti Nagar turn",
    reports: 5,
    when: "22 minutes ago",
    flow: 520,
    flowNote: "slow",
  },
];
