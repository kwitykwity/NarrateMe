"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "Thank you for subscribing!");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.detail || "Subscription failed. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again later.");
    }
  };

  return (
    <footer className="bg-ink-dark text-white py-16 px-6 md:px-12 lg:px-20 border-t border-white/10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2">
          <a href="#" className="flex items-center space-x-2 text-2xl font-extrabold tracking-tight mb-6">
            <span className="text-accent-teal">
              <i className="fa-solid fa-book-open-reader mr-1"></i>
              <i className="fa-solid fa-sparkles text-xs ml-1 align-super"></i>
            </span>
            <span>
              Narrate<span className="text-accent-yellow">Me</span>
            </span>
          </a>
          <p className="text-gray-400 max-w-sm leading-relaxed">
            Empowering young readers through AI-generated stories that inspire imagination and joy.
          </p>
        </div>
        <div>
          <h4 className="font-bold mb-6 text-white text-lg">Company</h4>
          <ul className="space-y-4 text-gray-400">
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Terms of Service
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Contact Us
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-6 text-white text-lg">Connect</h4>
          <div className="flex space-x-4 mb-6">
            <a
              href="#"
              aria-label="Twitter"
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent-teal transition-colors"
            >
              <i className="fa-brands fa-twitter"></i>
            </a>
            <a
              href="#"
              aria-label="Instagram"
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent-teal transition-colors"
            >
              <i className="fa-brands fa-instagram"></i>
            </a>
            <a
              href="#"
              aria-label="Facebook"
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent-teal transition-colors"
            >
              <i className="fa-brands fa-facebook-f"></i>
            </a>
          </div>

          <form onSubmit={handleSubscribe} className="space-y-2">
            <div className="flex">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status !== "idle") setStatus("idle");
                }}
                placeholder="Your email"
                disabled={status === "loading"}
                className="bg-white/10 border-none rounded-l-full px-4 py-2.5 w-full text-white placeholder-gray-400 focus:ring-1 focus:ring-accent-teal outline-none text-sm disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="bg-accent-teal px-5 py-2.5 rounded-r-full hover:bg-accent-coral transition-colors flex items-center justify-center disabled:opacity-50 cursor-pointer"
              >
                {status === "loading" ? (
                  <i className="fa-solid fa-spinner animate-spin"></i>
                ) : (
                  <i className="fa-solid fa-paper-plane"></i>
                )}
              </button>
            </div>
            {message && (
              <p
                className={`text-xs ${
                  status === "success" ? "text-accent-teal" : "text-accent-coral"
                }`}
              >
                {message}
              </p>
            )}
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
        <p>&copy; 2026 NarrateMe. All rights reserved.</p>
        <p className="mt-2 md:mt-0">Stories that spark imagination.</p>
      </div>
    </footer>
  );
}
