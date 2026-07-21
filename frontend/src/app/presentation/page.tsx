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
  audio_url?: string;
  audio_error?: boolean;
}

// Max requests in flight at once, per resource. High concurrency inflates the
// image API's per-request latency (and can trip the backend timeout), so we cap
// it. Narration is fast, but we cap it too to keep upstream load predictable.
const IMAGE_CONCURRENCY = 3;
const AUDIO_CONCURRENCY = 3;

// Total attempts per scene resource before giving up. Failures are usually
// transient (upstream timeouts under load), so a retry often recovers them.
const IMAGE_MAX_ATTEMPTS = 2;
const AUDIO_MAX_ATTEMPTS = 2;

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

        // Functional updates so concurrent per-scene writes (image + narration)
        // don't clobber each other.
        const patchScene = (i: number, patch: Partial<Scene>) =>
          setScenesData((prev) => {
            if (!prev) return prev;
            const scenes = [...prev.scenes];
            scenes[i] = { ...scenes[i], ...patch };
            return { ...prev, scenes };
          });

        // Fetch one resource (image or narration) for a scene, retrying on
        // failure. While retrying the scene keeps showing its loading state;
        // only the final failure applies the error patch.
        async function fetchWithRetry(
          endpoint: string,
          body: object,
          maxAttempts: number,
          label: string,
          sceneNumber: number,
          onSuccess: (json: Record<string, string>) => void,
          onFinalError: () => void
        ) {
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            if (cancelled) return;
            try {
              const res = await fetch(`${API_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                signal: controller.signal,
              });
              if (cancelled) return;
              if (!res.ok) {
                throw new Error(`${res.status} ${res.statusText}`);
              }
              const json = await res.json();
              if (cancelled) return;
              onSuccess(json);
              return;
            } catch (err) {
              if (cancelled) return;
              // Intentional cancellation: stop silently.
              if (err instanceof DOMException && err.name === "AbortError") return;
              const lastAttempt = attempt === maxAttempts;
              console.error(
                `${label} for scene ${sceneNumber} failed on attempt ` +
                  `${attempt}/${maxAttempts}` +
                  `${lastAttempt ? " (giving up)" : ", retrying"}:`,
                err
              );
              if (lastAttempt) onFinalError();
            }
          }
        }

        // Run a bounded worker pool over the scenes: workers pull the next
        // scene index off a shared cursor, keeping at most `concurrency`
        // requests in flight. Cards fill in as each resolves.
        const runPool = (
          concurrency: number,
          task: (scene: Scene, i: number) => Promise<void>
        ) => {
          let nextIndex = 0;
          async function worker() {
            while (!cancelled) {
              const i = nextIndex++;
              if (i >= data.scenes.length) return;
              await task(data.scenes[i], i);
            }
          }
          return Promise.all(
            Array.from({ length: Math.min(concurrency, data.scenes.length) }, worker)
          );
        };

        // Step 2: Generate images and narration concurrently, each with its own
        // bounded pool so slow images don't hold up the (fast) narration.
        await Promise.all([
          runPool(IMAGE_CONCURRENCY, (scene, i) =>
            fetchWithRetry(
              "/api/images",
              { prompt: scene.image_prompt },
              IMAGE_MAX_ATTEMPTS,
              "Image generation",
              scene.scene_number,
              (json) => patchScene(i, { image_url: json.image_url, image_error: false }),
              () => patchScene(i, { image_error: true })
            )
          ),
          runPool(AUDIO_CONCURRENCY, (scene, i) =>
            fetchWithRetry(
              "/api/audio",
              { text: scene.text },
              AUDIO_MAX_ATTEMPTS,
              "Narration generation",
              scene.scene_number,
              (json) => patchScene(i, { audio_url: json.audio_url, audio_error: false }),
              () => patchScene(i, { audio_error: true })
            )
          ),
        ]);

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
  const audioLoaded = scenesData.scenes.filter((s) => s.audio_url).length;

  return (
    <div className="w-full max-w-4xl">
      {status === "generating" && (
        <div className="mb-6 flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span>
            Generating images ({imagesLoaded}/{totalScenes}) and narration (
            {audioLoaded}/{totalScenes})...
          </span>
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

          {/* Narration */}
          <div className="mt-4">
            {scene.audio_url ? (
              <audio
                key={scene.scene_number}
                controls
                src={scene.audio_url}
                className="w-full"
              >
                Your browser does not support audio playback.
              </audio>
            ) : scene.audio_error ? (
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-5 w-5 shrink-0"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m0 3.75h.008M10.34 3.94l-8.14 14.1A1.5 1.5 0 003.5 20.25h17a1.5 1.5 0 001.3-2.21l-8.14-14.1a1.5 1.5 0 00-2.6 0z"
                  />
                </svg>
                <span>Narration couldn&apos;t be generated for this scene.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span>Generating narration...</span>
              </div>
            )}
          </div>
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
