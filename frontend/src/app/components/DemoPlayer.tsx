"use client";

import { useState, useEffect, useRef } from "react";

interface WordTiming {
  word: string;
  start: number;
  end: number;
}

interface DemoScene {
  number: number;
  emotion: string;
  image: string;
  audio: string;
  text: string;
  word_timings?: WordTiming[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const FALLBACK_DEMO_SCENES: DemoScene[] = [
  {
    number: 1,
    emotion: "Scared",
    image: "/demo/scene-1.png",
    audio: "/demo/scene-1.mp3",
    text: `"One sunny morning, a small brown puppy named Max wandered away from his home. He sniffed flowers and chased butterflies until he was lost."`,
  },
  {
    number: 2,
    emotion: "Calm",
    image: "/demo/scene-2.png",
    audio: "/demo/scene-2.mp3",
    text: `"A kind girl named Lily found Max and saw his collar."`,
  },
  {
    number: 3,
    emotion: "Calm",
    image: "/demo/scene-3.png",
    audio: "/demo/scene-3.mp3",
    text: `"She walked him all the way back home."`,
  },
  {
    number: 4,
    emotion: "Excited",
    image: "/demo/scene-4.png",
    audio: "/demo/scene-4.mp3",
    text: `"Max was so happy to see his family again!"`,
  },
];

export default function DemoPlayer() {
  const [scenes, setScenes] = useState<DemoScene[]>(FALLBACK_DEMO_SCENES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch dynamic demo story from backend endpoint /api/demo
  useEffect(() => {
    async function fetchDemo() {
      try {
        const res = await fetch(`${API_URL}/api/demo`);
        if (res.ok) {
          const data = await res.json();
          if (data.scenes && Array.isArray(data.scenes) && data.scenes.length > 0) {
            const mapped: DemoScene[] = data.scenes.map((s: any, idx: number) => ({
              number: s.scene_number || idx + 1,
              emotion: s.emotion ? s.emotion.charAt(0).toUpperCase() + s.emotion.slice(1) : "Calm",
              image: s.image_url || `/demo/scene-${idx + 1}.png`,
              audio: s.audio_url || `/demo/scene-${idx + 1}.mp3`,
              text: s.text.startsWith('"') ? s.text : `"${s.text}"`,
              word_timings: s.word_timings,
            }));
            setScenes(mapped);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch demo story from API, using fallback demo dataset.", err);
      }
    }
    fetchDemo();
  }, []);

  const currentScene = scenes[currentIndex] || FALLBACK_DEMO_SCENES[0];

  // Pause audio and reset progress when switching scene
  const handleSceneChange = (newIndex: number) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentIndex(newIndex);
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.error(e));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(duration);
  };

  const seekAudio = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const clickRatio = (e.clientX - rect.left) / rect.width;
    const newTime = clickRatio * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <section className="py-24 px-6 md:px-12 lg:px-20 bg-ink-dark text-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
            See the Magic in Action
          </h2>
          <p className="text-xl text-accent-teal-soft">
            Experience "The Lost Puppy" — {scenes.length} illustrated scenes narrated live with NarrateMe.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center justify-between text-accent-yellow font-bold text-sm tracking-widest mb-3">
            <span>
              SCENE 0{currentScene.number} / 0{scenes.length}
            </span>
            <span className="text-xs text-gray-300 font-normal">
              Click play to listen or use arrows to change scenes
            </span>
          </div>

          <div className="bg-surface-raised rounded-jumbo overflow-hidden shadow-2xl relative border border-white/10">
            {/* Image Display */}
            <div className="relative aspect-video overflow-hidden bg-black/10">
              <img
                src={currentScene.image}
                alt={`Scene ${currentScene.number}`}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
              <div className="absolute top-4 right-4 bg-ink-dark/80 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm shadow-md">
                Mood: {currentScene.emotion}
              </div>
            </div>

            {/* Story Text & Audio Controls */}
            <div className="p-8">
              <p className="text-ink-dark text-lg md:text-xl font-medium leading-relaxed mb-6 min-h-[4rem]">
                {currentScene.text}
              </p>

              {/* Player Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border-fine pt-6 gap-4">
                <div className="flex items-center space-x-4 w-full sm:w-auto flex-1">
                  <button
                    onClick={toggleAudio}
                    className="w-14 h-14 rounded-full bg-accent-teal text-white flex items-center justify-center hover:bg-accent-coral transition-all transform hover:scale-105 shadow-md flex-shrink-0 cursor-pointer"
                  >
                    <i
                      className={`fa-solid ${isPlaying ? "fa-pause text-xl" : "fa-play text-xl ml-1"}`}
                    ></i>
                  </button>
                  <div
                    className="flex-1 cursor-pointer py-2"
                    onClick={seekAudio}
                  >
                    <div className="h-2 w-full bg-border-fine rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-teal transition-all duration-100"
                        style={{ width: `${progressPct}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-gray-500 w-12 text-right">
                    {formatTime(currentTime)}
                  </span>
                </div>

                {/* Scene Navigation Buttons */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() =>
                      handleSceneChange(
                        currentIndex > 0 ? currentIndex - 1 : scenes.length - 1
                      )
                    }
                    className="bg-surface-base border-2 border-border-fine text-ink-dark px-4 py-2 rounded-full font-bold text-sm hover:border-accent-teal transition flex items-center cursor-pointer"
                  >
                    <i className="fa-solid fa-chevron-left mr-1"></i> Prev
                  </button>
                  <button
                    onClick={() =>
                      handleSceneChange(
                        currentIndex < scenes.length - 1 ? currentIndex + 1 : 0
                      )
                    }
                    className="bg-accent-teal text-white px-5 py-2 rounded-full font-bold text-sm hover:bg-accent-coral transition flex items-center cursor-pointer shadow-sm"
                  >
                    Next <i className="fa-solid fa-chevron-right ml-1"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Scene Thumbnail Dots */}
          <div className="flex justify-center space-x-3 mt-6">
            {scenes.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleSceneChange(idx)}
                className={`w-4 h-4 rounded-full transition-all cursor-pointer ${
                  idx === currentIndex
                    ? "bg-accent-teal scale-125 shadow-md"
                    : "bg-white/30 hover:bg-white/60"
                }`}
                title={`Scene ${idx + 1}`}
              ></button>
            ))}
          </div>
        </div>

        {/* Hidden Audio Player */}
        <audio
          ref={audioRef}
          src={currentScene.audio}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleAudioEnded}
        />

        <div className="mt-16 text-center">
          <p className="text-accent-teal-soft text-lg font-medium">
            Free to start. No credit card. Just stories.
          </p>
        </div>
      </div>
    </section>
  );
}
