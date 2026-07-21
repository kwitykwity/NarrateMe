"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function Home() {
  const [story, setStory] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (story.trim().length < 50) return;
    sessionStorage.setItem("narrateme:story", story);
    router.push("/presentation");
  };

  const loadSample = (text: string) => {
    setStory(text);
  };

  const isValid = story.trim().length >= 50;

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 dark:bg-black px-4 py-12">
      <main className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-3">
            NarrateMe
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Turn a written story into a narrated, illustrated presentation
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="story"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
              Paste or type your story
            </label>
            <textarea
              id="story"
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="Once upon a time..."
              rows={10}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {story.length} characters{" "}
              {story.length > 0 && story.length < 50 && (
                <span className="text-amber-600">(minimum 50 required)</span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-zinc-500 dark:text-zinc-400 self-center">
              Try a sample:
            </span>
            {SAMPLE_STORIES.map((sample) => (
              <button
                key={sample.title}
                type="button"
                onClick={() => loadSample(sample.text)}
                className="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {sample.title}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!isValid}
            className="w-full py-3 px-6 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500 transition-colors"
          >
            Create Presentation
          </button>
        </form>
      </main>
    </div>
  );
}
