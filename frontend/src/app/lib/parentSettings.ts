/**
 * Parent-controlled settings, kept behind the PIN gate.
 *
 * Stored in localStorage rather than sessionStorage so a grown-up sets them
 * once and they survive reloads and new tabs — the story text stays in
 * sessionStorage, since that's per-story rather than a preference.
 *
 * The PIN is a child-lock, not authentication: it exists so a 7-year-old can't
 * flip the safety level themselves, and it is deliberately not a login. Nothing
 * here is sent to the backend and no credentials are collected.
 */

export type ContentLevel = "strict" | "moderate" | "original";

export interface ParentSettings {
  /** Passed to /api/scenes as content_level; drives the safety guardrail. */
  contentLevel: ContentLevel;
  /** Start the hands-free read-along automatically once narration is ready. */
  autoPlay: boolean;
  /** Show the engagement prompts (sound cues, questions) during playback. */
  engagementPrompts: boolean;
  /** 4-digit code for the grown-ups-only gate. */
  pin: string;
}

export const DEFAULT_PIN = "1234";

export const DEFAULT_SETTINGS: ParentSettings = {
  contentLevel: "moderate",
  autoPlay: false,
  engagementPrompts: true,
  pin: DEFAULT_PIN,
};

export const CONTENT_LEVELS: {
  value: ContentLevel;
  label: string;
  description: string;
}[] = [
  { value: "strict", label: "Strict", description: "Block any mature themes" },
  { value: "moderate", label: "Moderate", description: "Soften mature content (recommended)" },
  { value: "original", label: "Original", description: "Keep story as written" },
];

const KEY = "narrateme:parentSettings";

/** Fired on this tab whenever settings are saved. */
export const SETTINGS_CHANGED_EVENT = "narrateme:settings-changed";

/**
 * Read the saved settings, falling back to defaults for anything missing or
 * malformed. Returns defaults during SSR, where localStorage doesn't exist.
 */
export function loadParentSettings(): ParentSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ParentSettings>;
    return {
      contentLevel: isContentLevel(parsed.contentLevel)
        ? parsed.contentLevel
        : DEFAULT_SETTINGS.contentLevel,
      autoPlay:
        typeof parsed.autoPlay === "boolean" ? parsed.autoPlay : DEFAULT_SETTINGS.autoPlay,
      engagementPrompts:
        typeof parsed.engagementPrompts === "boolean"
          ? parsed.engagementPrompts
          : DEFAULT_SETTINGS.engagementPrompts,
      pin: /^\d{4}$/.test(parsed.pin ?? "") ? parsed.pin! : DEFAULT_SETTINGS.pin,
    };
  } catch {
    // Corrupt or unreadable storage shouldn't break the app — a demo machine
    // with a stale value is better served by defaults than a crash.
    return DEFAULT_SETTINGS;
  }
}

export function saveParentSettings(settings: ParentSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Private-browsing quota errors: keep the in-memory value and move on.
  }
  // A tab doesn't receive its own "storage" event, so announce the change
  // ourselves for same-tab listeners (the story form's safety label).
  window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
}

function isContentLevel(value: unknown): value is ContentLevel {
  return value === "strict" || value === "moderate" || value === "original";
}
