"use client";

import { useEffect, useState } from "react";

interface StatsData {
  stories_created: number;
  subscribers: number;
  teacher_rating: number;
  seconds_to_first_story: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function StatsSection() {
  const [stats, setStats] = useState<StatsData>({
    stories_created: 0,
    subscribers: 0,
    teacher_rating: 4.9,
    seconds_to_first_story: 60,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`${API_URL}/api/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // Fallback to default state on error
      }
    }
    fetchStats();
  }, []);

  return (
    <section className="py-20 px-6 md:px-12 lg:px-20 bg-surface-base border-t border-border-fine/40">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-center">
        <div>
          <div className="text-6xl font-extrabold text-accent-teal mb-2">
            {stats.stories_created}+
          </div>
          <div className="text-sm font-semibold uppercase tracking-widest text-gray-500">
            Stories Created
          </div>
        </div>
        <div>
          <div className="text-6xl font-extrabold text-accent-coral mb-2">
            {stats.teacher_rating}
          </div>
          <div className="text-sm font-semibold uppercase tracking-widest text-gray-500">
            Teacher Rating
          </div>
        </div>
        <div>
          <div className="text-6xl font-extrabold text-accent-yellow mb-2">
            {stats.subscribers}+
          </div>
          <div className="text-sm font-semibold uppercase tracking-widest text-gray-500">
            Subscribers
          </div>
        </div>
        <div>
          <div className="text-6xl font-extrabold text-accent-yellow mb-2">
            {stats.seconds_to_first_story}
          </div>
          <div className="text-sm font-semibold uppercase tracking-widest text-gray-500">
            Seconds to First Story
          </div>
        </div>
      </div>
    </section>
  );
}
