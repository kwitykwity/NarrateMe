"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useSyncExternalStore } from "react";

const API_URL = "http://localhost:8000";

// Used with useSyncExternalStore to detect client-side hydration without
// triggering a setState-in-effect (sessionStorage is client-only).
const emptySubscribe = () => () => {};

interface Scene {
  scene_number: number;
  text: string;
  image_prompt: string;
  image_url?: string;
  image_error?: boolean;
}

// Max image requests in flight at once. High concurrency inflates the image
// API's per-request latency (and can trip the backend timeout), so we cap it.
const IMAGE_CONCURRENCY = 3;

// Total attempts per scene image before giving up. Failures are usually
// transient (upstream timeouts under load), so a retry often recovers them.
const IMAGE_MAX_ATTEMPTS = 2;

interface ScenesData {
  character_description: string;
  scenes: Scene[];
}

function PresentationContent() {
  // false during SSR and the first hydration render, true once on the client.
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const story = hydrated ? sessionStorage.getItem("narrateme:story") : null;

  const [status, setStatus] = useState<"loading" | "generating" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [scenesData, setScenesData] = useState<ScenesData | null>(null);
  const [currentScene, setCurrentScene] = useState(0);

  useEffect(() => {
    if (!story) return;

    const controller = new AbortController();
    let cancelled = false;

    async function generatePresentation() {
      try {
        // Step 1: Split story into scenes
        setStatus("loading");
        const scenesRes = await fetch(`${API_URL}/api/scenes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ story }),
          signal: controller.signal,
        });

        if (!scenesRes.ok) {
          throw new Error("Failed to split story into scenes");
        }

        const data: ScenesData = await scenesRes.json();
        if (cancelled) return;
        setScenesData(data);
        setStatus("generating");

        // Functional updates so concurrent per-scene writes don't clobber
        // each other.
        const markImage = (i: number, image_url: string) =>
          setScenesData((prev) => {
            if (!prev) return prev;
            const scenes = [...prev.scenes];
            scenes[i] = { ...scenes[i], image_url, image_error: false };
            return { ...prev, scenes };
          });
        const markError = (i: number) =>
          setScenesData((prev) => {
            if (!prev) return prev;
            const scenes = [...prev.scenes];
            scenes[i] = { ...scenes[i], image_error: true };
            return { ...prev, scenes };
          });

        // Step 2: Generate images with a bounded worker pool. Workers pull the
        // next scene index off a shared cursor, keeping at most
        // IMAGE_CONCURRENCY requests in flight. Cards fill in as each resolves.
        let nextIndex = 0;

        async function worker() {
          while (!cancelled) {
            const i = nextIndex++;
            if (i >= data.scenes.length) return;
            const scene = data.scenes[i];

            // Retry a failed image before giving up. While retrying the scene
            // keeps showing its loading spinner; only the final failure flags
            // the error state.
            for (let attempt = 1; attempt <= IMAGE_MAX_ATTEMPTS; attempt++) {
              if (cancelled) return;
              try {
                const imageRes = await fetch(`${API_URL}/api/images`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ prompt: scene.image_prompt }),
                  signal: controller.signal,
                });
                if (cancelled) return;
                if (!imageRes.ok) {
                  throw new Error(`${imageRes.status} ${imageRes.statusText}`);
                }
                const imageData = await imageRes.json();
                if (cancelled) return;
                markImage(i, imageData.image_url);
                break;
              } catch (err) {
                if (cancelled) return;
                // Intentional cancellation: stop silently.
                if (err instanceof DOMException && err.name === "AbortError") return;
                const lastAttempt = attempt === IMAGE_MAX_ATTEMPTS;
                console.error(
                  `Image generation for scene ${scene.scene_number} failed on ` +
                    `attempt ${attempt}/${IMAGE_MAX_ATTEMPTS}` +
                    `${lastAttempt ? " (giving up)" : ", retrying"}:`,
                  err
                );
                if (lastAttempt) markError(i);
              }
            }
          }
        }

        await Promise.all(
          Array.from({ length: Math.min(IMAGE_CONCURRENCY, data.scenes.length) }, worker)
        );

        if (cancelled) return;
        setStatus("done");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStatus("error");
      }
    }

    generatePresentation();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [story]);

  if (hydrated && !story) {
    return (
      <div className="text-center">
        <p className="text-zinc-600 dark:text-zinc-400 mb-4">No story provided</p>
        <Link href="/" className="text-blue-600 hover:underline dark:text-blue-400">
          Go back and enter a story
        </Link>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <Link href="/" className="text-blue-600 hover:underline dark:text-blue-400">
          Try again
        </Link>
      </div>
    );
  }

  if (status === "loading" || !scenesData) {
    return (
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-center gap-3 p-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Splitting story into scenes...</p>
        </div>
      </div>
    );
  }

  const scene = scenesData.scenes[currentScene];
  const totalScenes = scenesData.scenes.length;
  const imagesLoaded = scenesData.scenes.filter((s) => s.image_url).length;

  return (
    <div className="w-full max-w-4xl">
      {status === "generating" && (
        <div className="mb-6 flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span>Generating images ({imagesLoaded}/{totalScenes})...</span>
        </div>
      )}

      {/* Scene Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-lg">
        {/* Image */}
        <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          {scene.image_url ? (
            <Image
              src={scene.image_url}
              alt={`Scene ${scene.scene_number}`}
              fill
              className="object-cover"
              unoptimized
            />
          ) : scene.image_error ? (
            <div className="flex flex-col items-center gap-2 px-6 text-center text-amber-600 dark:text-amber-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-8 w-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m0 3.75h.008M10.34 3.94l-8.14 14.1A1.5 1.5 0 003.5 20.25h17a1.5 1.5 0 001.3-2.21l-8.14-14.1a1.5 1.5 0 00-2.6 0z"
                />
              </svg>
              <span className="text-sm">
                Image couldn&apos;t be generated for this scene.
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-400">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="text-sm">Generating image...</span>
            </div>
          )}
        </div>

        {/* Text */}
        <div className="p-6">
          <p className="text-lg text-zinc-800 dark:text-zinc-200 leading-relaxed">
            {scene.text}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setCurrentScene((c) => c - 1)}
          disabled={currentScene === 0}
          className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        <span className="text-zinc-500 dark:text-zinc-400">
          {currentScene + 1} / {totalScenes}
        </span>

        <button
          onClick={() => setCurrentScene((c) => c + 1)}
          disabled={currentScene === totalScenes - 1}
          className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>

      {/* Start over */}
      <div className="mt-8 text-center">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Start over with a new story
        </Link>
      </div>
    </div>
  );
}

export default function PresentationPage() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 dark:bg-black px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
          NarrateMe
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">Your illustrated story</p>
      </div>

      <PresentationContent />
    </div>
  );
}
