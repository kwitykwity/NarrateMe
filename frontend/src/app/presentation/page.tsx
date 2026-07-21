"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState, useEffect } from "react";

const API_URL = "http://localhost:8000";

interface Scene {
  scene_number: number;
  text: string;
  image_prompt: string;
  image_url?: string;
}

interface ScenesData {
  character_description: string;
  scenes: Scene[];
}

function PresentationContent() {
  const searchParams = useSearchParams();
  const story = searchParams.get("story");

  const [status, setStatus] = useState<"loading" | "generating" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [scenesData, setScenesData] = useState<ScenesData | null>(null);
  const [currentScene, setCurrentScene] = useState(0);

  useEffect(() => {
    if (!story) return;

    async function generatePresentation() {
      try {
        // Step 1: Split story into scenes
        setStatus("loading");
        const scenesRes = await fetch(`${API_URL}/api/scenes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ story }),
        });

        if (!scenesRes.ok) {
          throw new Error("Failed to split story into scenes");
        }

        const data: ScenesData = await scenesRes.json();
        setScenesData(data);
        setStatus("generating");

        // Step 2: Generate images for each scene
        const updatedScenes = [...data.scenes];

        for (let i = 0; i < updatedScenes.length; i++) {
          const scene = updatedScenes[i];
          try {
            const imageRes = await fetch(`${API_URL}/api/images`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: scene.image_prompt }),
            });

            if (imageRes.ok) {
              const imageData = await imageRes.json();
              updatedScenes[i] = { ...scene, image_url: imageData.image_url };
              setScenesData({ ...data, scenes: [...updatedScenes] });
            }
          } catch {
            // Continue with other images if one fails
          }
        }

        setStatus("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStatus("error");
      }
    }

    generatePresentation();
  }, [story]);

  if (!story) {
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
        <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          {scene.image_url ? (
            <img
              src={scene.image_url}
              alt={`Scene ${scene.scene_number}`}
              className="w-full h-full object-cover"
            />
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

      <Suspense
        fallback={
          <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
          </div>
        }
      >
        <PresentationContent />
      </Suspense>
    </div>
  );
}
