"use client";

interface ForWhomProps {
  onStartStoryClick?: () => void;
}

export default function ForWhom({ onStartStoryClick }: ForWhomProps) {
  return (
    <section id="for-whom" className="py-24 px-6 md:px-12 lg:px-20 bg-surface-base">
      <div className="max-w-7xl mx-auto space-y-24">
        {/* For Teachers */}
        <div id="for-teachers" className="flex flex-col md:flex-row items-center gap-12 bg-accent-teal-soft p-10 rounded-jumbo border border-accent-teal/10 shadow-sm scroll-mt-24">
          <div className="w-full md:w-1/2">
            <img
              className="rounded-jumbo shadow-xl w-full aspect-[4/5] object-cover border border-white/50"
              src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_7f7d250da2_57977f4c703f14df.png"
              alt="teacher smiling while reading an illustrated story on a screen to engaged elementary students"
            />
          </div>
          <div className="w-full md:w-1/2">
            <h3 className="text-3xl md:text-4xl font-extrabold mb-4 text-ink-dark">
              For Teachers
            </h3>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Create engaging reading materials in seconds. Boost literacy skills with personalized stories that match your curriculum.
            </p>
            <button
              onClick={onStartStoryClick}
              className="inline-flex items-center font-bold text-accent-teal hover:text-accent-coral transition-colors cursor-pointer text-lg"
            >
              Start Creating Now <i className="fa-solid fa-arrow-right ml-2"></i>
            </button>
          </div>
        </div>

        {/* For Parents */}
        <div id="for-parents" className="flex flex-col md:flex-row-reverse items-center gap-12 bg-[#FFF4E0] p-10 rounded-jumbo border border-accent-yellow/20 shadow-sm scroll-mt-24">
          <div className="w-full md:w-1/2">
            <img
              className="rounded-jumbo shadow-xl w-full aspect-[4/5] object-cover border border-white/50"
              src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_fd3d5b7f1a_969aa1b2b0f33c68.png"
              alt="parent and child snuggled together reading a colorful illustrated storybook at bedtime"
            />
          </div>
          <div className="w-full md:w-1/2">
            <h3 className="text-3xl md:text-4xl font-extrabold mb-4 text-ink-dark">
              For Parents
            </h3>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Make bedtime magical. Turn your child's favorite ideas into narrated, illustrated adventures they'll love to revisit.
            </p>
            <button
              onClick={onStartStoryClick}
              className="inline-flex items-center font-bold text-accent-coral hover:text-accent-teal transition-colors cursor-pointer text-lg"
            >
              Try Bedtime Magic <i className="fa-solid fa-arrow-right ml-2"></i>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
