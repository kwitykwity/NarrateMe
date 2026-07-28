"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  CONTENT_LEVELS,
  ContentLevel,
  DEFAULT_SETTINGS,
  ParentSettings as Settings,
  loadParentSettings,
  saveParentSettings,
} from "../lib/parentSettings";

// Detects hydration without a setState-in-effect; localStorage is client-only.
const emptySubscribe = () => () => {};

/**
 * "Grown-ups only" gate plus the settings it protects.
 *
 * The PIN is a child-lock, not authentication — it keeps a young reader from
 * flipping their own safety level, which is exactly what could happen while the
 * content control sat next to the story box. No accounts, no passwords, nothing
 * leaves the browser.
 */
export default function ParentSettingsPanel() {
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pinEntry, setPinEntry] = useState("");
  const [pinError, setPinError] = useState(false);
  // Saved values once the user edits them; before that, read straight from
  // storage on the client (defaults during SSR).
  const [edited, setEdited] = useState<Settings | null>(null);
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const settings: Settings = edited ?? (hydrated ? loadParentSettings() : DEFAULT_SETTINGS);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    // Re-lock on close so the panel isn't left open for the next person.
    setUnlocked(false);
    setPinEntry("");
    setPinError(false);
  };

  useEffect(() => {
    if (open && !unlocked) pinInputRef.current?.focus();
  }, [open, unlocked]);

  // Close on Escape, the behaviour a dialog is expected to have.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const submitPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinEntry === settings.pin) {
      setUnlocked(true);
      setPinError(false);
      setPinEntry("");
    } else {
      setPinError(true);
      setPinEntry("");
      pinInputRef.current?.focus();
    }
  };

  const update = (patch: Partial<Settings>) => {
    // Build on what's persisted rather than on the render closure. Every update
    // writes synchronously, so storage is always the freshest state -- reading
    // `settings` here would let two changes in the same tick clobber each other
    // (picking a level and flipping a toggle before React re-renders).
    const next = { ...loadParentSettings(), ...patch };
    setEdited(next);
    saveParentSettings(next);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border-2 border-border-fine px-4 py-2 text-sm font-bold text-ink-dark transition-colors hover:border-accent-teal"
        aria-haspopup="dialog"
      >
        <i className="fa-solid fa-shield-halved text-accent-teal" aria-hidden="true"></i>
        <span className="hidden sm:inline">Parent settings</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Parent settings"
          onClick={close}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-surface-base p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {!unlocked ? (
              <form onSubmit={submitPin}>
                <h2 className="mb-1 text-2xl font-extrabold text-ink-dark">
                  <i className="fa-solid fa-lock text-accent-teal mr-2" aria-hidden="true"></i>
                  Grown-ups only
                </h2>
                <p className="mb-5 text-sm text-gray-500">
                  Enter the 4-digit PIN to change safety and playback settings.
                </p>

                <label htmlFor="parent-pin" className="sr-only">
                  Parent PIN
                </label>
                <input
                  id="parent-pin"
                  ref={pinInputRef}
                  // Not a password field: this is a child-lock, and masking it
                  // would imply a credential we neither store nor transmit.
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={pinEntry}
                  onChange={(e) => {
                    setPinEntry(e.target.value.replace(/\D/g, ""));
                    setPinError(false);
                  }}
                  placeholder="••••"
                  className="w-full rounded-xl border-2 border-border-fine bg-surface-raised px-5 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-accent-teal"
                />

                {pinError && (
                  <p className="mt-3 text-sm font-semibold text-red-600" role="alert">
                    That PIN didn&apos;t match. Try again.
                  </p>
                )}

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-xl px-4 py-2 text-sm font-bold text-gray-500 hover:text-ink-dark"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pinEntry.length !== 4}
                    className="rounded-xl bg-accent-teal px-5 py-2 text-sm font-bold text-white disabled:opacity-40"
                  >
                    Unlock
                  </button>
                </div>
              </form>
            ) : (
              <div>
                  <div className="mb-5 flex items-start justify-between">
                    <h2 className="text-2xl font-extrabold text-ink-dark">Parent settings</h2>
                    <button
                      type="button"
                      onClick={close}
                      aria-label="Close"
                      className="text-gray-400 hover:text-ink-dark"
                    >
                      <i className="fa-solid fa-xmark text-xl" aria-hidden="true"></i>
                    </button>
                  </div>

                  <section className="mb-6">
                    <h3 className="mb-2 text-base font-bold text-ink-dark">Content level</h3>
                    <div className="flex flex-col gap-2">
                      {CONTENT_LEVELS.map((level) => (
                        <button
                          key={level.value}
                          type="button"
                          onClick={() => update({ contentLevel: level.value as ContentLevel })}
                          className={`rounded-xl border-2 px-4 py-3 text-left transition-all ${
                            settings.contentLevel === level.value
                              ? "border-accent-teal bg-accent-teal-soft"
                              : "border-border-fine bg-surface-raised hover:border-accent-teal/50"
                          }`}
                        >
                          <div className="font-bold text-ink-dark">{level.label}</div>
                          <div className="text-xs text-gray-500">{level.description}</div>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="mb-6">
                    <h3 className="mb-2 text-base font-bold text-ink-dark">Playback</h3>

                    <Toggle
                      label="Play automatically"
                      description="Start the read-along as soon as narration is ready."
                      checked={settings.autoPlay}
                      onChange={(v) => update({ autoPlay: v })}
                    />
                    <Toggle
                      label="Engagement prompts"
                      description="Sound cues and questions that invite the child to join in."
                      checked={settings.engagementPrompts}
                      onChange={(v) => update({ engagementPrompts: v })}
                    />
                  </section>

                  <section>
                    <h3 className="mb-2 text-base font-bold text-ink-dark">Change PIN</h3>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={4}
                      defaultValue={settings.pin}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "");
                        if (v.length === 4) update({ pin: v });
                      }}
                      className="w-32 rounded-xl border-2 border-border-fine bg-surface-raised px-4 py-2 text-center tracking-[0.3em] outline-none focus:border-accent-teal"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Saved once you enter 4 digits. Settings are stored on this device only.
                    </p>
                  </section>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="mb-2 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-border-fine bg-surface-raised px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-[color:var(--accent-teal,#0d9488)]"
      />
      <span>
        <span className="block font-bold text-ink-dark">{label}</span>
        <span className="block text-xs text-gray-500">{description}</span>
      </span>
    </label>
  );
}
