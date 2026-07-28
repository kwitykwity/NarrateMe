"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CONTENT_LEVELS,
  ContentLevel,
  DEFAULT_SETTINGS,
  loadParentSettings,
} from "../lib/parentSettings";

interface StoryGeneratorProps {
  sectionRef?: React.RefObject<HTMLDivElement | null>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SAMPLE_STORIES = [
  {
    title: "The Lost Puppy",
    text: "One sunny morning, a small brown puppy named Max wandered away from his home. He sniffed flowers and chased butterflies until he was lost. A kind girl named Lily found Max and saw his collar. She walked him all the way back home. Max was so happy to see his family again!",
  },
  {
    title: "The Magic Garden",
    text: "Emma discovered a tiny door in her backyard fence. She opened it and found a magical garden with talking flowers. The roses told jokes and the sunflowers sang songs. Emma visited every day after school. The garden became her special secret place.",
  },
  {
    title: "The Astronaut Bear",
    text: "Barnaby was a little bear who dreamed of exploring space. He built a rocket out of cardboard boxes and silver tape in his bedroom. With a shiny colander on his head, Barnaby blasted off to the moon and made friends with glowing space bunnies.",
  },
];

export default function StoryGenerator({ sectionRef }: StoryGeneratorProps) {
  const [story, setStory] = useState("");
  // The content level is a parent setting now, read here rather than chosen.
  // localStorage is client-only, so it loads after mount; the default matches
  // the stored default so the first paint isn't wrong.
  const [contentLevel, setContentLevel] = useState<ContentLevel>(
    DEFAULT_SETTINGS.contentLevel
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  // Pick up the parent's saved level, and re-read it when they close the
  // settings panel (storage events cover other tabs; the custom event covers
  // this one, since a tab doesn't hear its own storage writes).
  useEffect(() => {
    const sync = () => setContentLevel(loadParentSettings().contentLevel);
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("narrateme:settings-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("narrateme:settings-changed", sync);
    };
  }, []);

  const activeLevel =
    CONTENT_LEVELS.find((l) => l.value === contentLevel) ?? CONTENT_LEVELS[1];

  const charCount = story.trim().length;
  const isValid = charCount >= 50;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isValid) {
      setErrorMessage("Please enter at least 50 characters for your story.");
      return;
    }

    setIsLoading(true);

    // Save the story, then navigate. router.push keeps this a client-side
    // transition; window.location.href tore down and re-downloaded the whole
    // app on every story. The safety level comes from the parent settings the
    // player reads directly, so it isn't passed along here.
    sessionStorage.setItem("narrateme:story", story.trim());
    router.push("/presentation");
  };

  const loadSample = (text: string) => {
    setStory(text);
    setErrorMessage(null);
  };

  return (
    <section
      id="create-story"
      ref={sectionRef}
      className="py-16 px-6 md:px-12 lg:px-20 bg-surface-raised border-y border-border-fine"
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 bg-accent-teal-soft text-accent-teal px-4 py-1.5 rounded-full text-sm font-bold mb-3">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            <span>Interactive Generator</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-ink-dark mb-3">
            Create Your Story Presentation
          </h2>
          <p className="text-gray-600 text-lg">
            Paste your story below or choose a sample to see the AI magic instantly.
          </p>
        </div>

        <div className="bg-surface-elevated rounded-jumbo p-6 md:p-10 shadow-xl border border-border-fine">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label
                  htmlFor="story-input"
                  className="block text-base font-bold text-ink-dark"
                >
                  Your Story Text
                </label>
                <span className="text-xs font-semibold text-gray-500">
                  {charCount} characters{" "}
                  {charCount > 0 && !isValid && (
                    <span className="text-accent-coral ml-1">
                      (minimum 50 required)
                    </span>
                  )}
                </span>
              </div>
              <textarea
                id="story-input"
                value={story}
                onChange={(e) => {
                  setStory(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Once upon a time, in a magical forest filled with tall pine trees..."
                rows={7}
                disabled={isLoading}
                className="w-full rounded-2xl border-2 border-border-fine bg-surface-base px-5 py-4 text-ink-dark placeholder-gray-400 focus:border-accent-teal focus:ring-4 focus:ring-accent-teal-soft outline-none transition-all resize-none text-lg leading-relaxed disabled:opacity-50"
              />
            </div>

            {/* Current safety level, read-only: changing it lives behind the
                parent PIN, so a young reader can't lift their own limits. */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <i className="fa-solid fa-shield-halved text-accent-teal" aria-hidden="true"></i>
              <span>
                Safety level:{" "}
                <span className="font-bold text-ink-dark">{activeLevel.label}</span> —{" "}
                {activeLevel.description.toLowerCase()}
              </span>
              <i className="fa-solid fa-lock text-xs text-gray-400" aria-hidden="true" title="Set by a grown-up in Parent settings"></i>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center space-x-3 text-sm font-medium">
                <i className="fa-solid fa-circle-exclamation text-red-500 text-lg"></i>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Sample Story Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-sm font-bold text-gray-600 mr-1 flex items-center">
                <i className="fa-solid fa-lightbulb text-accent-yellow mr-1.5"></i>
                Try a sample:
              </span>
              {SAMPLE_STORIES.map((sample) => (
                <button
                  key={sample.title}
                  type="button"
                  onClick={() => loadSample(sample.text)}
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-bold rounded-full bg-surface-base border border-border-fine text-ink-dark hover:border-accent-teal hover:text-accent-teal transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {sample.title}
                </button>
              ))}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isValid || isLoading}
              className="w-full py-4 px-8 rounded-full bg-accent-teal text-white text-lg font-bold hover:bg-accent-coral disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all transform active:scale-98 shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin text-xl"></i>
                  <span>Building Presentation...</span>
                </>
              ) : (
                <>
                  <span>Create Presentation &rarr;</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
