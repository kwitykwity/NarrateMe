"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function PresentationContent() {
  const searchParams = useSearchParams();
  const story = searchParams.get("story");

  if (!story) {
    return (
      <div className="text-center">
        <p className="text-zinc-600 dark:text-zinc-400 mb-4">
          No story provided
        </p>
        <Link
          href="/"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          Go back and enter a story
        </Link>
      </div>
    );
  }

  const decodedStory = decodeURIComponent(story);

  return (
    <div className="w-full max-w-3xl">
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
          Your Story
        </h2>
        <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
          {decodedStory}
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 p-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <p className="text-zinc-600 dark:text-zinc-400">
          Generating presentation...
        </p>
      </div>

      <div className="mt-6 text-center">
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
        <p className="text-zinc-600 dark:text-zinc-400">
          Creating your presentation
        </p>
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
