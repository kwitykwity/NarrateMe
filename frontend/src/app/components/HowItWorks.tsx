"use client";

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 md:px-12 lg:px-20 bg-surface-raised">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-ink-dark">
            How It Works
          </h2>
          <p className="text-xl text-gray-600">
            Three simple steps to create an unforgettable story experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting Lines */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-border-fine -z-10 -translate-y-1/2"></div>
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-accent-teal/20 -z-10 -translate-y-1/2"></div>

          {/* Step 1 */}
          <div className="group relative bg-surface-elevated p-8 rounded-jumbo shadow-sm hover:shadow-xl transition-all border border-border-fine/50">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-accent-teal text-white rounded-full flex items-center justify-center font-bold text-xl z-10 shadow-md">
              1
            </div>
            <div className="overflow-hidden rounded-xl mb-6 aspect-[4/5]">
              <img
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_324640a5ab_d878472f19c122a1.png"
                alt="child happily typing a short story into a tablet app"
              />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-ink-dark">Paste Your Story</h3>
            <p className="text-gray-600 leading-relaxed">
              Type or paste any short story (up to 500 words). The AI understands it instantly.
            </p>
          </div>

          {/* Step 2 */}
          <div className="group relative bg-surface-elevated p-8 rounded-jumbo shadow-sm hover:shadow-xl transition-all border border-border-fine/50">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-accent-coral text-white rounded-full flex items-center justify-center font-bold text-xl z-10 shadow-md">
              2
            </div>
            <div className="overflow-hidden rounded-xl mb-6 aspect-[4/5]">
              <img
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_099858dea4_f00baf0d144ed73c.png"
                alt="illustrated storybook pages coming to life with glowing magical effects"
              />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-ink-dark">AI Brings It to Life</h3>
            <p className="text-gray-600 leading-relaxed">
              NarrateMe generates beautiful illustrations and a warm narration voice automatically.
            </p>
          </div>

          {/* Step 3 */}
          <div className="group relative bg-surface-elevated p-8 rounded-jumbo shadow-sm hover:shadow-xl transition-all border border-border-fine/50">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-accent-yellow text-ink-dark rounded-full flex items-center justify-center font-bold text-xl z-10 shadow-md">
              3
            </div>
            <div className="overflow-hidden rounded-xl mb-6 aspect-[4/5]">
              <img
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_886587a13b_b2c34faf3aae8024.png"
                alt="happy young student listening to an audiobook on headphones"
              />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-ink-dark">Press Play!</h3>
            <p className="text-gray-600 leading-relaxed">
              Share the interactive story with your class or family. Watch their faces light up.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
