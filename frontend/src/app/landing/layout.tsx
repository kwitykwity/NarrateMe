import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NarrateMe | AI-Powered Educational Stories",
  description:
    "Turn any story into a narrated, illustrated presentation for children in under 60 seconds.",
};

// Scoped layout for the salvaged marketing landing page. It loads Font Awesome
// (used by the landing components' icons) without touching the root layout.
export default function LandingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
      {children}
    </>
  );
}
