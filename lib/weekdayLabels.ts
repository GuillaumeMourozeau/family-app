import i18n from "@/lib/i18n";

// Plain per-language arrays, picked directly off i18n.language — deliberately
// NOT routed through t(key, { returnObjects: true }), which turned out to be
// unreliable in production Hermes builds (crashed on-device with "undefined
// is not a function" even though the translated strings themselves worked
// fine). Mirrors the same direct-i18n.language pattern already used by
// formatDate/formatTime in dateUtils.ts.

const SHORT_MON_FIRST = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  fr: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
};

const VERY_SHORT_SUN_FIRST = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  fr: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
};

const INITIAL_SUN_FIRST = {
  en: ["S", "M", "T", "W", "T", "F", "S"],
  fr: ["D", "L", "M", "M", "J", "V", "S"],
};

const INITIAL_MON_FIRST = {
  en: ["M", "T", "W", "T", "F", "S", "S"],
  fr: ["L", "M", "M", "J", "V", "S", "D"],
};

function pick(labels: { en: string[]; fr: string[] }): string[] {
  return i18n.language === "fr" ? labels.fr : labels.en;
}

export function weekdaysShortMonFirst(): string[] {
  return pick(SHORT_MON_FIRST);
}

export function weekdaysVeryShortSunFirst(): string[] {
  return pick(VERY_SHORT_SUN_FIRST);
}

export function weekdaysInitialSunFirst(): string[] {
  return pick(INITIAL_SUN_FIRST);
}

export function weekdaysInitialMonFirst(): string[] {
  return pick(INITIAL_MON_FIRST);
}
