'use client';

import Script from 'next/script';

export default function Home() {
  return (
    <>
      {/* The single mount point for the vanilla web-desktop.
          Everything else is rendered inside Shadow DOM by web components.
          Fonts are loaded globally in layout.tsx. */}
      <div
        id="de-root"
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
          background: '#000',
        }}
      />

      {/* Lucide icon library (CDN). main.js polls for window.lucide before booting. */}
      <Script
        src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"
        strategy="afterInteractive"
      />

      {/* The desktop entry module — registers all components + commands, then boots. */}
      <Script
        src="/de/main.js"
        type="module"
        strategy="afterInteractive"
      />
    </>
  );
}
