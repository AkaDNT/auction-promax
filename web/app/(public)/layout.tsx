import type { ReactNode } from "react";

import { AuctionsNavbar } from "@/features/auction/components/auctions-navbar";

type PublicLayoutProps = {
  children: ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="theme-page relative isolate min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,var(--glow),transparent_38%)]" />

      <div className="relative text-theme-body">
        <AuctionsNavbar />

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
