"use client";

import { useState, useRef, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

    // Check cache first
    let audioUrl = audioCache.get(text);

    if (!audioUrl) {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/audio`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          throw new Error(`Failed to generate audio: ${response.status}`);
        }

        const data = await response.json();
        audioUrl = data.audio_url;

        // Cache for future use
        if (audioUrl) {
          audioCache.set(text, audioUrl);
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
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsSpeaking(true);
      };

      audio.onended = () => {
        setIsSpeaking(false);
        resolve();
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setError("Failed to play audio");
        reject(new Error("Failed to play audio"));
      };

      audio.play().catch((err) => {
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
