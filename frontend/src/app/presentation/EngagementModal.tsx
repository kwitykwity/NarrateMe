"use client";

import { useState } from "react";
import OwlAvatar from "./OwlAvatar";

interface EngagementPrompt {
  type: "reading_prompt" | "sound_cue" | "comprehension_check";
  text: string;
  timing: "before" | "after";
  answer_hint?: string;
}

interface EngagementModalProps {
  prompt: EngagementPrompt;
  onDismiss: () => void;
}

export default function EngagementModal({ prompt, onDismiss }: EngagementModalProps) {
  const [showHint, setShowHint] = useState(false);

  // Choose owl emotion based on prompt type
  const owlEmotion = prompt.type === "sound_cue" ? "excited" : "happy";

  // Choose title based on prompt type
  const title = {
    sound_cue: "Get Ready!",
    reading_prompt: "Think About It!",
    comprehension_check: "Quick Question!",
  }[prompt.type];

  // Choose button text based on prompt type
  const buttonText = {
    sound_cue: "I'm Ready!",
    reading_prompt: "Continue",
    comprehension_check: "Got It!",
  }[prompt.type];

  // Choose accent color based on prompt type
  const accentColor = {
    sound_cue: "bg-accent-coral",
    reading_prompt: "bg-accent-teal",
    comprehension_check: "bg-accent-yellow",
  }[prompt.type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onDismiss}
      />

      {/* Modal Card */}
      <div className="relative bg-surface-elevated rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
        {/* Owl Avatar - override absolute positioning for modal context */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 relative">
            <OwlAvatar
              emotion={owlEmotion}
              className="!static !translate-x-0 !translate-y-0 !left-auto !bottom-auto"
            />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-extrabold text-ink-dark mb-4">{title}</h2>

        {/* Prompt Text */}
        <p className="text-xl text-gray-700 leading-relaxed mb-6">{prompt.text}</p>

        {/* Answer Hint (for comprehension checks) */}
        {prompt.type === "comprehension_check" && prompt.answer_hint && (
          <div className="mb-6">
            {showHint ? (
              <p className="text-sm text-gray-500 bg-gray-100 rounded-lg p-3">
                <span className="font-semibold">Answer:</span> {prompt.answer_hint}
              </p>
            ) : (
              <button
                onClick={() => setShowHint(true)}
                className="text-sm text-gray-400 hover:text-gray-600 underline"
              >
                Show answer (for grown-ups)
              </button>
            )}
          </div>
        )}

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className={`${accentColor} text-white px-8 py-3 rounded-full font-bold text-lg hover:opacity-90 transition-all transform hover:scale-105 shadow-lg`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
