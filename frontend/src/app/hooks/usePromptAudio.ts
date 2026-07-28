"use client";

import { useState, useRef, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// "George" - British mature voice for the wise owl mentor
// Clearly distinct from narrator's "Sarah" voice (soft female)
const OWL_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

interface UsePromptAudioReturn {
  isLoading: boolean;
  isSpeaking: boolean;
  error: string | null;
  playPrompt: (text: string) => Promise<void>;
  stopSpeaking: () => void;
}

// Cache for generated audio URLs to avoid regenerating
const audioCache = new Map<string, string>();

export function usePromptAudio(): UsePromptAudioReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  }, []);

  const playPrompt = useCallback(async (text: string): Promise<void> => {
    setError(null);

    // Check cache first (include voice_id in key to avoid mixing voices)
    const cacheKey = `${OWL_VOICE_ID}:${text}`;
    let audioUrl = audioCache.get(cacheKey);

    console.log("[usePromptAudio] Playing prompt with OWL voice:", OWL_VOICE_ID);
    console.log("[usePromptAudio] Cache key:", cacheKey);
    console.log("[usePromptAudio] Cache hit:", !!audioUrl);

    if (!audioUrl) {
      setIsLoading(true);
      try {
        console.log("[usePromptAudio] Fetching audio from API with voice_id:", OWL_VOICE_ID);
        const response = await fetch(`${API_URL}/api/audio`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice_id: OWL_VOICE_ID }),
        });

        if (!response.ok) {
          throw new Error(`Failed to generate audio: ${response.status}`);
        }

        const data = await response.json();
        audioUrl = data.audio_url;

        // Cache for future use
        if (audioUrl) {
          audioCache.set(cacheKey, audioUrl);
        }
      } catch (err) {
        setIsLoading(false);
        setError(err instanceof Error ? err.message : "Failed to generate audio");
        throw err;
      }
      setIsLoading(false);
    }

    if (!audioUrl) {
      setError("No audio URL received");
      throw new Error("No audio URL received");
    }

    // Play the audio
    console.log("[usePromptAudio] Creating audio element with URL length:", audioUrl?.length);
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        console.log("[usePromptAudio] Audio started playing");
        setIsSpeaking(true);
      };

      audio.onended = () => {
        console.log("[usePromptAudio] Audio playback ended - resolving promise");
        setIsSpeaking(false);
        resolve();
      };

      audio.onerror = (e) => {
        console.error("[usePromptAudio] Audio error:", e);
        setIsSpeaking(false);
        setError("Failed to play audio");
        reject(new Error("Failed to play audio"));
      };

      console.log("[usePromptAudio] Calling audio.play()...");
      audio.play().catch((err) => {
        console.error("[usePromptAudio] audio.play() failed:", err);
        setIsSpeaking(false);
        setError("Failed to play audio");
        reject(err);
      });
    });
  }, []);

  return {
    isLoading,
    isSpeaking,
    error,
    playPrompt,
    stopSpeaking,
  };
}
