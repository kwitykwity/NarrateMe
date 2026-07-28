"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import ParentSettingsDialog from "./ParentSettings";

/**
 * Account menu behind the owl avatar in the header.
 *
 * DEMO SHELL — there are no accounts yet. The identity below is a placeholder so
 * the presentation can show where accounts will live, and the entries marked
 * `soon` are deliberately inert. Nothing here signs in, stores a credential, or
 * talks to a backend.
 *
 * "Parent settings" is the one live entry: it opens the real PIN-gated dialog,
 * which previously had its own button in the header.
 */

// Stand-in for the signed-in grown-up. Replace with real account data when
// accounts land — the account is the parent's, never the child's.
const MOCK_ACCOUNT = {
  name: "Sarah's Family",
  email: "grown-up@example.com",
  avatar: "/owls/happy.png",
};

interface MenuEntry {
  label: string;
  description: string;
  icon: string;
  /** Not built yet — rendered with a "Soon" badge and no action. */
  soon?: boolean;
  onSelect?: () => void;
}

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on Escape and on a click outside, the two behaviours a menu is
  // expected to have. Skipped entirely while closed so we don't hold listeners.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const entries: MenuEntry[] = [
    {
      label: "My stories",
      description: "Stories you've made before",
      icon: "fa-book-bookmark",
      soon: true,
    },
    {
      label: "Children",
      description: "Set up a profile for each child",
      icon: "fa-children",
      soon: true,
    },
    {
      label: "Parent settings",
      description: "Safety level, playback, and PIN",
      icon: "fa-shield-halved",
      onSelect: () => {
        setOpen(false);
        setSettingsOpen(true);
      },
    },
    {
      label: "Help",
      description: "Guides for grown-ups",
      icon: "fa-circle-question",
      soon: true,
    },
  ];

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        // The label lives here rather than in a <span>, so the button keeps an
        // accessible name at every breakpoint even when the text is hidden.
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border-2 border-border-fine py-1 pl-1 pr-3 transition-colors hover:border-accent-teal"
      >
        <span className="relative block h-8 w-8 overflow-hidden rounded-full border-2 border-accent-teal bg-accent-teal-soft">
          <Image
            src={MOCK_ACCOUNT.avatar}
            alt=""
            fill
            sizes="32px"
            className="object-cover"
          />
        </span>
        <span className="hidden text-sm font-bold text-ink-dark sm:inline">
          {MOCK_ACCOUNT.name}
        </span>
        <i
          className={`fa-solid fa-chevron-down text-xs text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        ></i>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-[90] mt-2 w-72 overflow-hidden rounded-2xl border-2 border-border-fine bg-surface-base shadow-2xl"
        >
          <div className="flex items-center gap-3 border-b border-border-fine px-4 py-3">
            <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-accent-teal bg-accent-teal-soft">
              <Image
                src={MOCK_ACCOUNT.avatar}
                alt=""
                fill
                sizes="40px"
                className="object-cover"
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-bold text-ink-dark">
                {MOCK_ACCOUNT.name}
              </span>
              <span className="block truncate text-xs text-gray-500">
                {MOCK_ACCOUNT.email}
              </span>
            </span>
          </div>

          <ul className="py-1">
            {entries.map((entry) => (
              <li key={entry.label}>
                <button
                  type="button"
                  role="menuitem"
                  disabled={entry.soon}
                  onClick={entry.onSelect}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent-teal-soft disabled:cursor-not-allowed disabled:bg-transparent disabled:opacity-55"
                >
                  <i
                    className={`fa-solid ${entry.icon} w-5 text-center text-accent-teal`}
                    aria-hidden="true"
                  ></i>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-ink-dark">
                      {entry.label}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {entry.description}
                    </span>
                  </span>
                  {entry.soon && (
                    <span className="shrink-0 rounded-full bg-border-fine px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                      Soon
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-border-fine px-4 py-2.5">
            <button
              type="button"
              role="menuitem"
              disabled
              className="flex w-full items-center gap-3 text-left text-sm font-bold text-gray-500 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <i
                className="fa-solid fa-right-from-bracket w-5 text-center"
                aria-hidden="true"
              ></i>
              Sign out
            </button>
          </div>
        </div>
      )}

      <ParentSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
