"use client";

import { useEffect, useState } from "react";

interface LandingPageStatusProps {
  storyCount: number;
  subscriberCount: number;
}

export default function LandingPageStatus({ storyCount, subscriberCount }: LandingPageStatusProps) {
  const [liveStoryCount, setLiveStoryCount] = useState(storyCount);
  const [liveSubscriberCount, setLiveSubscriberCount] = useState(subscriberCount);
  const [aiStatus, setAiStatus] = useState<"checking" | "ready" | "limited">("checking");

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, healthRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/stats`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/health`),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setLiveStoryCount(data.stories_created ?? 0);
          setLiveSubscriberCount(data.subscribers ?? 0);
        }

        if (healthRes.ok) {
          const health = await healthRes.json();
          const services = health.ai_services ?? {};
          const configured = Object.values(services).filter((service: any) => service?.configured).length;
          setAiStatus(configured === 3 ? "ready" : "limited");
        }
      } catch {
        setAiStatus("limited");
      }
    };

    load();
  }, []);

  return (
    <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm text-gray-600">
      <span className="rounded-full border border-border-fine bg-white/80 px-4 py-2">
        {liveStoryCount}+ stories created
      </span>
      <span className="rounded-full border border-border-fine bg-white/80 px-4 py-2">
        {liveSubscriberCount}+ subscribers
      </span>
      <span
        className={`rounded-full border px-4 py-2 ${
          aiStatus === "ready"
            ? "border-accent-teal bg-accent-teal-soft text-accent-teal"
            : "border-amber-300 bg-amber-50 text-amber-700"
        }`}
      >
        {aiStatus === "ready"
          ? "Live generation ready"
          : aiStatus === "checking"
            ? "Checking live generation…"
            : "Live generation limited"}
      </span>
    </div>
  );
}
