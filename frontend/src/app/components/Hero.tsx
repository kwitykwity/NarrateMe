"use client";

interface HeroProps {
  onCreateStoryClick: () => void;
  onSeeDemoClick: () => void;
}

export default function Hero({ onCreateStoryClick, onSeeDemoClick }: HeroProps) {
  return (
    <section className="relative pt-32 pb-16 px-6 md:px-12 lg:px-20 flex flex-col md:flex-row items-center justify-between overflow-hidden bg-surface-base">
      {/* Background Blobs */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full blur-3xl bg-accent-teal-soft"></div>
        <div className="absolute top-1/4 right-0 w-64 h-64 rounded-full blur-2xl bg-accent-yellow/20"></div>
      </div>

      {/* Left Content */}
      <div className="z-10 max-w-xl">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 text-ink-dark">
          Turn Any Story Into a<br />
          Magical <span className="word-punchout">Reading</span> Adventure
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
          Paste or type a story, and watch AI bring it to life with illustrations and narration — in under 60 seconds. Perfect for Grades 1–3.
        </p>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={onCreateStoryClick}
            className="bg-accent-teal text-white px-8 py-3.5 rounded-full font-bold hover:bg-accent-coral transition-all transform hover:scale-105 shadow-md cursor-pointer"
          >
            Create Your Story
          </button>
          <button
            onClick={onSeeDemoClick}
            className="border-2 border-accent-teal text-accent-teal px-8 py-3.5 rounded-full font-bold hover:bg-accent-teal hover:text-white transition-all shadow-sm cursor-pointer"
          >
            See a Demo
          </button>
        </div>
        <div className="mt-12 flex flex-wrap items-center gap-6 text-sm font-medium text-gray-500">
          <span className="flex items-center">
            <i className="fa-solid fa-check-circle text-accent-teal mr-2"></i>Built for Grades 1–3
          </span>
          <span className="flex items-center">
            <i className="fa-solid fa-bolt text-accent-yellow mr-2"></i>Ready in 60 Seconds
          </span>
          <span className="flex items-center">
            <i className="fa-solid fa-paintbrush text-accent-coral mr-2"></i>AI Illustrations
          </span>
          <span className="flex items-center">
            <i className="fa-solid fa-headphones text-accent-teal mr-2"></i>Narrated Audio
          </span>
        </div>
      </div>

      {/* Right Visual */}
      <div className="z-10 mt-12 md:mt-0 relative w-full max-w-lg md:max-w-xl lg:max-w-2xl">
        <img
          className="rounded-jumbo shadow-2xl w-full aspect-video object-cover transform hover:scale-105 transition-transform duration-500 border border-border-fine"
          src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_1520eaef1b_19d3cf362b0e3958.png"
          alt="child sitting on a giant open book surrounded by floating illustrated story characters like a dragon"
        />
      </div>
    </section>
  );
}
