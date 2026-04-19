import type React from "react";

// Minimal layout: transparent body so the iframe blends with the host page's
// background if needed. No nav, no chrome.
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen w-screen overflow-hidden">{children}</div>;
}
