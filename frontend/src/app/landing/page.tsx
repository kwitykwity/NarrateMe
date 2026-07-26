"use client";

import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Hero from "../components/Hero";
import HowItWorks from "../components/HowItWorks";
import ForWhom from "../components/ForWhom";
import StatsSection from "../components/StatsSection";
import Footer from "../components/Footer";

export default function LandingPage() {
  const router = useRouter();

  const goToCreateStory = () => {
    router.push("/");
  };

  const scrollToDemo = () => {
    const el = document.getElementById("how-it-works");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-base text-ink-dark antialiased">
      {/* Fixed Navigation Bar */}
      <Header onStartStory={goToCreateStory} />

      {/* Main Landing Page Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <Hero
          onCreateStoryClick={goToCreateStory}
          onSeeDemoClick={scrollToDemo}
        />

        {/* How It Works Section */}
        <HowItWorks />

        {/* For Teachers / Parents Section */}
        <ForWhom onStartStoryClick={goToCreateStory} />

        {/* Platform Metrics & Stats Section */}
        <StatsSection />

        {/* Final Call to Action Banner */}
        <section className="py-24 px-6 md:px-12 lg:px-20 bg-gradient-to-br from-accent-yellow to-accent-coral text-white text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
              Ready to Bring Stories to Life?
            </h2>
            <p className="text-xl mb-10 opacity-90 leading-relaxed">
              Join thousands of teachers and parents creating magical reading moments every day.
            </p>
            <button
              onClick={goToCreateStory}
              className="bg-accent-teal text-white px-12 py-4 rounded-full font-bold text-lg hover:bg-ink-dark transition-all transform hover:scale-105 shadow-xl cursor-pointer"
            >
              Start Creating — It&apos;s Free
            </button>
            <p className="mt-6 text-sm opacity-80">
              No signup required for your first story.
            </p>
          </div>
        </section>
      </main>

      {/* Footer with Newsletter Endpoint Integration */}
      <Footer />
    </div>
  );
}
