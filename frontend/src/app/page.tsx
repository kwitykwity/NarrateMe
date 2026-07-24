"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { PageDoodles, Star4 } from "./components/PageDoodles";
import { MAX_CHARS, T } from "./lib/design";

const SAMPLE_STORIES = [
  {
    title: "The Lost Puppy",
    text: "One sunny morning, a small brown puppy named Max wandered away from his home. He sniffed flowers and chased butterflies until he was lost. A kind girl named Lily found Max and saw his collar. She walked him all the way back home. Max was so happy to see his family again!",
  },
  {
    title: "The Magic Garden",
    text: "Emma discovered a tiny door in her backyard fence. She opened it and found a magical garden with talking flowers. The roses told jokes and the sunflowers sang songs. Emma visited every day after school. The garden became her special secret place.",
  },
];

const MIN_CHARS = 50;

export default function Home() {
  const [story, setStory] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const isValid = story.trim().length >= MIN_CHARS;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isValid) {
      ref.current?.focus();
      return;
    }
    sessionStorage.setItem("narrateme:story", story);
    router.push("/presentation");
  };

  return (
    <div
      className="relative flex min-h-full flex-col items-center justify-center px-4 py-12"
      style={{ background: T.bg, fontFamily: "var(--font-nunito), sans-serif" }}
    >
      <PageDoodles />

      <motion.main
        className="relative z-10 flex w-full max-w-xl flex-col gap-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="mb-1 flex items-center justify-center gap-2.5">
          <motion.div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: T.rose, boxShadow: `0 5px 0 ${T.roseDark}` }}
            animate={{ rotate: [-3, 3, -3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Star4 size={26} color="white" />
          </motion.div>
          <span
            className="text-4xl font-bold"
            style={{
              fontFamily: "var(--font-baloo), cursive",
              color: T.ink,
            }}
          >
            NarrateMe
          </span>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="flex w-full flex-col overflow-hidden"
          style={{
            background: T.white,
            borderRadius: "2rem",
            boxShadow: `0 6px 0 ${T.roseDark}28, 0 12px 40px rgba(255,143,171,0.14)`,
            border: `2px solid ${T.rose}30`,
          }}
        >
          {/* Header */}
          <div
            className="flex flex-col items-center gap-3 px-7 pb-6 pt-8"
            style={{
              background: `linear-gradient(160deg, ${T.lavSoft} 0%, ${T.roseSoft} 100%)`,
            }}
          >
            <h1
              className="text-center text-3xl font-bold leading-tight sm:text-4xl"
              style={{
                fontFamily: "var(--font-baloo), cursive",
                color: T.ink,
              }}
            >
              Watch your story
              <br />
              <span style={{ color: T.rose }}>come to life!</span>
            </h1>
            <p
              className="max-w-80 text-center text-base font-medium"
              style={{ color: T.muted }}
            >
              Type your story below and we&apos;ll add pictures and a voice your
              child will love!
            </p>
          </div>

          {/* Wavy divider */}
          <svg
            viewBox="0 0 600 28"
            preserveAspectRatio="none"
            className="block w-full"
            style={{ height: 28, marginTop: -1 }}
            aria-hidden="true"
          >
            <path
              d="M0,0 C100,28 200,0 300,16 C400,28 500,8 600,20 L600,0 Z"
              fill={T.lavSoft}
            />
          </svg>

          <div className="flex flex-col gap-4 px-7 pb-7">
            <div
              className="relative"
              style={{
                border: `2px solid ${focused ? T.sky : T.border}`,
                borderRadius: "1.25rem",
                background: T.white,
                transition: "border-color 0.2s, box-shadow 0.2s",
                boxShadow: focused ? `0 0 0 4px ${T.sky}28` : "none",
              }}
            >
              <label htmlFor="story" className="sr-only">
                Paste or type your story
              </label>
              <textarea
                id="story"
                ref={ref}
                value={story}
                onChange={(e) => setStory(e.target.value.slice(0, MAX_CHARS))}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Type or paste your story here…"
                rows={9}
                maxLength={MAX_CHARS}
                className="w-full resize-none focus:outline-none"
                style={{
                  background: "transparent",
                  fontFamily: "var(--font-nunito), sans-serif",
                  fontSize: "1.1rem",
                  color: T.ink,
                  padding: "16px 18px",
                  lineHeight: 1.7,
                }}
                aria-label="Story text"
              />
              <span
                className="absolute bottom-2.5 right-3.5 text-xs font-semibold"
                style={{ color: T.muted }}
              >
                {story.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                {story.length > 0 && story.length < MIN_CHARS && (
                  <span className="ml-1" style={{ color: T.roseDark }}>
                    (min {MIN_CHARS})
                  </span>
                )}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-sm font-medium"
                style={{ color: T.muted }}
              >
                Try a sample:
              </span>
              {SAMPLE_STORIES.map((sample) => (
                <button
                  key={sample.title}
                  type="button"
                  onClick={() => setStory(sample.text)}
                  className="rounded-full px-3 py-1.5 text-sm font-semibold transition-transform hover:scale-[1.03]"
                  style={{
                    background: T.lavSoft,
                    color: T.ink,
                    border: `1.5px solid ${T.lav}55`,
                  }}
                >
                  {sample.title}
                </button>
              ))}
            </div>

            <motion.button
              type="submit"
              disabled={!isValid}
              className="w-full px-8 py-4 text-xl font-bold"
              style={{
                fontFamily: "var(--font-baloo), cursive",
                borderRadius: "999px",
                background: isValid ? T.rose : "#D0C8E8",
                boxShadow: isValid
                  ? `0 5px 0 ${T.roseDark}, 0 8px 24px ${T.rose}44`
                  : "none",
                cursor: isValid ? "pointer" : "not-allowed",
                border: "none",
                color: isValid ? T.white : "#A0A8D0",
              }}
              whileHover={isValid ? { scale: 1.025, y: -2 } : {}}
              whileTap={
                isValid
                  ? {
                      scale: 0.97,
                      y: 3,
                      boxShadow: `0 2px 0 ${T.roseDark}`,
                    }
                  : {}
              }
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
            >
              Make my story into a book! ✨
            </motion.button>

            <p
              className="text-center text-sm font-medium"
              style={{ color: T.muted }}
            >
              It only takes about one minute!
            </p>
          </div>
        </form>

        <p
          className="text-center text-xs font-medium"
          style={{ color: T.muted }}
        >
          Designed for ages 6–9 · No account needed
        </p>
      </motion.main>
    </div>
  );
}
