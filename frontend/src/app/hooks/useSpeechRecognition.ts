"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Web Speech API type definitions (not included in standard TypeScript)
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
  error: string | null;
}

// Silence timeout before auto-stopping (ms)
const SILENCE_TIMEOUT_MS = 10000;

// Get the SpeechRecognition constructor (browser-prefixed)
function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    setIsSupported(!!SpeechRecognitionClass);
  }, []);

  // Clear silence timeout
  const clearSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  // Reset silence timeout (called on each speech event)
  const resetSilenceTimeout = useCallback(() => {
    clearSilenceTimeout();
    silenceTimeoutRef.current = setTimeout(() => {
      // Auto-stop after silence
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    }, SILENCE_TIMEOUT_MS);
  }, [clearSilenceTimeout, isListening]);

  const startListening = useCallback(() => {
    console.log("[useSpeechRecognition] startListening called");
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) {
      console.error("[useSpeechRecognition] Speech recognition not supported");
      setError("Speech recognition not supported");
      return;
    }

    // Clean up any existing instance
    if (recognitionRef.current) {
      console.log("[useSpeechRecognition] Aborting existing recognition instance");
      recognitionRef.current.abort();
    }

    console.log("[useSpeechRecognition] Creating new SpeechRecognition instance");
    const recognition = new SpeechRecognitionClass();
    recognitionRef.current = recognition;

    // Configure
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("[useSpeechRecognition] Recognition started - listening for speech");
      setIsListening(true);
      setError(null);
      resetSilenceTimeout();
    };

    recognition.onresult = (event) => {
      resetSilenceTimeout();

      let finalTranscript = "";
      let interim = "";

      const speechEvent = event as SpeechRecognitionEvent;
      for (let i = speechEvent.resultIndex; i < speechEvent.results.length; i++) {
        const result = speechEvent.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      console.log("[useSpeechRecognition] Result - final:", finalTranscript, "interim:", interim);

      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      const errorEvent = event as SpeechRecognitionErrorEvent;
      console.error("[useSpeechRecognition] Error:", errorEvent.error, errorEvent.message);
      clearSilenceTimeout();
      setIsListening(false);

      // Map error codes to user-friendly messages
      const errorMessages: Record<string, string> = {
        "not-allowed": "Microphone access denied. Please allow microphone access.",
        "audio-capture": "No microphone found. Please connect a microphone.",
        "network": "Network error. Please check your connection.",
        "no-speech": "No speech detected. Please try again.",
        "aborted": "Listening was cancelled.",
      };

      const message = errorMessages[errorEvent.error] || `Error: ${errorEvent.error}`;
      setError(message);
    };

    recognition.onend = () => {
      console.log("[useSpeechRecognition] Recognition ended");
      clearSilenceTimeout();
      setIsListening(false);
      setInterimTranscript("");
    };

    try {
      console.log("[useSpeechRecognition] Calling recognition.start()...");
      recognition.start();
    } catch (err) {
      console.error("[useSpeechRecognition] Failed to start:", err);
      setError("Failed to start speech recognition");
      setIsListening(false);
    }
  }, [clearSilenceTimeout, resetSilenceTimeout]);

  const stopListening = useCallback(() => {
    clearSilenceTimeout();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, [clearSilenceTimeout]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimeout();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [clearSilenceTimeout]);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error,
  };
}
