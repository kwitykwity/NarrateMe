"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useState, useEffect, useRef, useSyncExternalStore } from "react";

const API_URL = "http://localhost:8000";

// Used with useSyncExternalStore to detect client-side hydration without
// triggering a setState-in-effect (sessionStorage is client-only).
const emptySubscribe = () => () => {};

// One word's playback window (seconds), from ElevenLabs' character alignment,
// used to highlight the word as the narration reaches it.
interface WordTiming {
  word: string;
  start: number;
  end: number;
}

interface Scene {
  scene_number: number;
  text: string;
  // Present for live-generated scenes (from /api/scenes); absent for the
  // pre-baked backup story, whose images are already rendered.
  image_prompt?: string;
  image_url?: string;
  image_error?: boolean;
  audio_url?: string;
  audio_error?: boolean;
  word_timings?: WordTiming[];
}

// Max requests in flight at once, per resource. High concurrency inflates the
// image API's per-request latency (and can trip the backend timeout), so we cap
// it. Narration is capped at 2 to match the ElevenLabs free-tier concurrent
// request limit (3+ in parallel returns 429 concurrent_limit_exceeded).
const IMAGE_CONCURRENCY = 2;
const AUDIO_CONCURRENCY = 2;

// Total attempts per scene resource before giving up. Failures are usually
// transient (upstream timeouts under load), so a retry often recovers them.
const IMAGE_MAX_ATTEMPTS = 2;
const AUDIO_MAX_ATTEMPTS = 2;

// Per-attempt client-side ceiling (ms). A request that hasn't resolved by then
// is aborted and counted as a failed attempt (then retried). Set above the
// backend's own timeouts so its structured 504/429 responses are preferred,
// leaving this as a backstop for a truly hung request. Images are the slow one.
const IMAGE_TIMEOUT_MS = 130_000;
const AUDIO_TIMEOUT_MS = 65_000;

interface ScenesData {
  character_description: string;
  scenes: Scene[];
}

// Shape of the pre-baked backup manifest at /public/demo-story.json. Its scenes
// already carry rendered image/audio URLs (static /demo/* paths), so no live
// generation is needed once it's loaded.
interface BackupStory {
  title: string;
  scenes: {
    scene_number: number;
    text: string;
    image_url: string;
    audio_url: string;
    word_timings?: WordTiming[];
  }[];
}

// Load the pre-generated backup story and adapt it to the ScenesData shape the
// player already renders. Used as a fallback when live generation can't produce
// anything (e.g. the scene-split call fails during a demo).
async function loadBackupStory(signal?: AbortSignal): Promise<ScenesData> {
  const res = await fetch("/demo-story.json", signal ? { signal } : undefined);
  if (!res.ok) {
    throw new Error("Failed to load backup story");
  }
  const data: BackupStory = await res.json();
  return {
    character_description: "",
    scenes: data.scenes.map((s) => ({
      scene_number: s.scene_number,
      text: s.text,
      image_url: s.image_url,
      audio_url: s.audio_url,
      word_timings: s.word_timings,
    })),
  };
}

function PresentationContent() {
  // false during SSR and the first hydration render, true once on the client.
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const story = hydrated ? sessionStorage.getItem("narrateme:story") : null;

  const [status, setStatus] = useState<"loading" | "generating" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [scenesData, setScenesData] = useState<ScenesData | null>(null);
  // True once we've fallen back to the pre-baked backup story instead of live
  // generation, so the UI can flag it.
  const [isBackup, setIsBackup] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  // When true, each scene's narration plays automatically and advances to the
  // next scene when the audio ends (hands-free read-along).
  const [autoAdvance, setAutoAdvance] = useState(false);
  // Index of the word currently being narrated in the active scene (-1 = none),
  // driven by the audio element's timeupdate events.
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
          timeoutMs: number,
          label: string,
          sceneNumber: number,
          onSuccess: (json: Record<string, unknown>) => void,
          onFinalError: () => void
        ) {
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            if (cancelled) return;
            try {
              const res = await fetch(`${API_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                // Abort if the caller cancels (unmount) or the per-attempt
                // timeout elapses. A timeout throws a TimeoutError (not
                // AbortError), so it falls through to the retry path below
                // instead of the silent-cancellation guard.
                signal: AbortSignal.any([
                  controller.signal,
                  AbortSignal.timeout(timeoutMs),
                ]),
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
              IMAGE_TIMEOUT_MS,
              "Image generation",
              scene.scene_number,
              (json) => patchScene(i, { image_url: json.image_url as string, image_error: false }),
              () => patchScene(i, { image_error: true })
            )
          ),
          runPool(AUDIO_CONCURRENCY, (scene, i) =>
            fetchWithRetry(
              "/api/audio",
              { text: scene.text },
              AUDIO_MAX_ATTEMPTS,
              AUDIO_TIMEOUT_MS,
              "Narration generation",
              scene.scene_number,
              (json) =>
                patchScene(i, {
                  audio_url: json.audio_url as string,
                  word_timings: json.word_timings as WordTiming[],
                  audio_error: false,
                }),
              () => patchScene(i, { audio_error: true })
            )
          ),
        ]);

        if (cancelled) return;
        setStatus("done");
      } catch (err) {
        if (cancelled) return;
        // Intentional cancellation (StrictMode remount / unmount): stay silent.
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Live generation failed before we could show anything (e.g. the
        // scene-split call errored). Fall back to the pre-baked backup story so
        // a demo still has a complete presentation to play.
        try {
          const backup = await loadBackupStory(controller.signal);
          if (cancelled) return;
          setScenesData(backup);
          setIsBackup(true);
          setStatus("done");
        } catch {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "Something went wrong");
          setStatus("error");
        }
      }
    }

    generatePresentation();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [story]);

  // Drive the read-along: when auto-advance is on and the current scene's
  // narration is ready, play it. Changing scene (or a newly-arrived audio URL)
  // re-triggers this so the next clip starts automatically.
  const currentAudioUrl = scenesData?.scenes[currentScene]?.audio_url;
  useEffect(() => {
    if (!autoAdvance) return;
    const el = audioRef.current;
    if (el && currentAudioUrl) {
      // Autoplay can be rejected without a prior user gesture; ignore it.
      el.play().catch(() => {});
    }
  }, [autoAdvance, currentScene, currentAudioUrl]);

  // Move to another scene, clearing the word highlight; the new scene's audio
  // element remounts at time 0 and its timeupdate events drive it again.
  const goToScene = (updater: (c: number) => number) => {
    setCurrentScene(updater);
    setCurrentWordIndex(-1);
  };

  // Manual escape hatch: load the backup story on demand (e.g. from the error
  // screen if the automatic fallback's own fetch failed and was retried).
  const showBackup = async () => {
    setStatus("loading");
    try {
      const backup = await loadBackupStory();
      setScenesData(backup);
      setIsBackup(true);
      setCurrentScene(0);
      setCurrentWordIndex(-1);
      setStatus("done");
    } catch {
      setError("Couldn't load the backup story");
      setStatus("error");
    }
  };

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
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={showBackup}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Show the backup story
          </button>
          <Link href="/" className="text-blue-600 hover:underline dark:text-blue-400">
            Try again
          </Link>
        </div>
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

  // Read-along toggle. Starting/stopping is a user gesture, which satisfies
  // the browser autoplay policy for the subsequent auto-advanced clips.
  const toggleReadAlong = () => {
    if (autoAdvance) {
      setAutoAdvance(false);
      audioRef.current?.pause();
    } else {
      setAutoAdvance(true);
      audioRef.current?.play().catch(() => {});
    }
  };

  // When a scene's narration finishes, clear the highlight; during read-along
  // also advance to the next scene (its audio auto-plays via the effect), or
  // stop on the last scene.
  const handleAudioEnded = () => {
    setCurrentWordIndex(-1);
    if (!autoAdvance) return;
    if (currentScene < totalScenes - 1) {
      setCurrentScene((c) => c + 1);
    } else {
      setAutoAdvance(false);
    }
  };

  // Follow narration playback: highlight the latest word whose start time has
  // been reached, so the highlight holds through short inter-word gaps until the
  // next word begins. Driven by the audio element's timeupdate events, so it
  // works for both read-along and manual play.
  const handleTimeUpdate = () => {
    const el = audioRef.current;
    const timings = scene.word_timings;
    if (!el || !timings || timings.length === 0) return;
    const t = el.currentTime;
    let idx = -1;
    for (let i = 0; i < timings.length; i++) {
      if (timings[i].start <= t) idx = i;
      else break;
    }
    setCurrentWordIndex(idx);
  };

  return (
    <div className="w-full max-w-4xl">
      {isBackup && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400">
          Live generation was unavailable — showing a pre-loaded backup story.
        </div>
      )}

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
            {scene.word_timings && scene.word_timings.length > 0
              ? scene.word_timings.map((w, i) => (
                  <Fragment key={i}>
                    <span
                      className={
                        i === currentWordIndex
                          ? "rounded bg-amber-200 dark:bg-amber-400/30 transition-colors"
                          : "transition-colors"
                      }
                    >
                      {w.word}
                    </span>
                    {i < scene.word_timings!.length - 1 ? " " : ""}
                  </Fragment>
                ))
              : scene.text}
          </p>

          {/* Narration */}
          <div className="mt-4">
            {scene.audio_url ? (
              <audio
                key={scene.scene_number}
                ref={audioRef}
                controls
                preload="auto"
                src={scene.audio_url}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleAudioEnded}
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

      {/* Read-along control */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={toggleReadAlong}
          disabled={audioLoaded === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {autoAdvance ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
          <span>{autoAdvance ? "Pause" : "Play story"}</span>
        </button>
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => goToScene((c) => c - 1)}
          disabled={currentScene === 0}
          className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        <span className="text-zinc-500 dark:text-zinc-400">
          {currentScene + 1} / {totalScenes}
        </span>

        <button
          onClick={() => goToScene((c) => c + 1)}
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
