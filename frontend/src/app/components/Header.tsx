"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-surface-base/80 backdrop-blur-md border-b border-border-fine">
      <div className="flex items-center space-x-8">
        <Link href="#" className="flex items-center space-x-2 text-2xl font-extrabold tracking-tight">
          <span className="text-accent-teal">
            <i className="fa-solid fa-book-open-reader mr-1"></i>
            <i className="fa-solid fa-sparkles text-xs ml-1 align-super"></i>
          </span>
          <span>
            Narrate<span className="text-accent-yellow">Me</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold">
          <a href="#how-it-works" className="relative nav-link-underline">
            How It Works
          </a>
          <a href="#for-teachers" className="relative nav-link-underline">
            For Teachers
          </a>
          <a href="#for-parents" className="relative nav-link-underline">
            For Parents
          </a>
          <div className="w-1.5 h-1.5 rounded-full bg-accent-yellow animate-pulseDot"></div>
        </nav>
      </div>
    </header>
  );
}
