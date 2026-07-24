"use client";

import Image from "next/image";

// ============================================================================
// Owl narrator render agent
// ----------------------------------------------------------------------------
// The owl depends only on the scene's emotion, so we serve pre-baked static
// owls (one PNG per emotion) from /public/owls/ — instant on every scene, with
// no per-session generation, latency, or API cost. The rest of the app just
// mounts <OwlAvatar emotion={scene.emotion} /> inside the (relatively
// positioned) scene image container; this component owns placement and which
// asset to show.
//
// For collaborators refining the owl:
//   * To change how the owl LOOKS / where it sits -> edit the JSX + classes
//     in the return below.
//   * To change the owl ART -> edit OWL_BASE_PROMPT / EMOTION_EXPRESSIONS in
//     backend/app/services/owl_service.py, then re-run scripts/gen_owls.py to
//     re-bake the PNGs in /public/owls/ (backend up on :8000).
// ============================================================================

// Emotions we have a baked owl for — must match the files in /public/owls/ and
// owl_service.EMOTION_EXPRESSIONS. Unknown or missing emotions (e.g. the backup
// story) fall back to this default so a scene always has its narrator.
const OWL_EMOTIONS: readonly string[] = ["happy", "sad", "excited", "scared", "calm"];
const DEFAULT_EMOTION = "calm";

export default function OwlAvatar({
  emotion,
  speaking = false,
  className = "",
}: {
  emotion?: string;
  // True while the current scene's narration is playing; drives the "talking"
  // bob so the owl looks like it's speaking along with the audio.
  speaking?: boolean;
  className?: string;
}) {
  const resolved = emotion && OWL_EMOTIONS.includes(emotion) ? emotion : DEFAULT_EMOTION;

  // Split placement from animation: the OUTER div owns positioning (its
  // -translate offsets sit the owl on the image's bottom edge), while the INNER
  // badge owns the look + the talking bob. Keeping them separate stops the
  // animation's transform from clobbering the positioning translate.
  return (
    <div
      className={
        "absolute bottom-0 left-1/2 z-10 h-24 w-24 -translate-x-1/2 translate-y-1/3 " +
        "sm:h-28 sm:w-28 " +
        className
      }
    >
      <div
        className={
          "relative h-full w-full overflow-hidden rounded-full border-4 border-white " +
          "bg-amber-50 shadow-lg dark:border-zinc-800 dark:bg-zinc-800 " +
          (speaking ? "owl-talking" : "")
        }
      >
        <Image
          src={`/owls/${resolved}.png`}
          alt={`Owl narrator looking ${resolved}`}
          fill
          sizes="112px"
          className="object-cover"
        />
      </div>
    </div>
  );
}
