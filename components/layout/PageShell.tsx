"use client";

import { ReactNode } from "react";
import Link from "next/link";
import ConnectButton from "@/components/ui/ConnectButton";
import BuiltOnBotChain from "@/components/botchain/BuiltOnBotChain";
import { footerLinks } from "@/lib/botchain/chain";

interface PageShellProps {
  children: ReactNode;
  heading?: string;
  subheading?: string;
}

export default function PageShell({ children, heading, subheading }: PageShellProps) {
  const { site, explorer, contract } = footerLinks();

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2 group">
              <span className="text-2xl select-none">🌡️</span>
              <span className="font-display text-2xl tracking-wide text-[var(--accent)] group-hover:opacity-90 transition">
                Cheer
              </span>
            </Link>
            <nav className="hidden sm:flex items-center space-x-4 text-sm font-semibold">
              <Link href="/" className="hover:text-[var(--accent)] text-[var(--text-primary)] transition">
                Streaks
              </Link>
              <Link href="/start" className="hover:text-[var(--accent)] text-[var(--text-primary)] transition">
                Start Streak
              </Link>
              <Link href="/me" className="hover:text-[var(--accent)] text-[var(--text-primary)] transition">
                My Pledges & Streaks
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-3">
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        {(heading || subheading) && (
          <div className="mb-6">
            {heading && <h1 className="font-display text-3xl text-[var(--text-primary)]">{heading}</h1>}
            {subheading && <p className="text-sm text-[var(--text-muted)] mt-1">{subheading}</p>}
          </div>
        )}
        {children}
      </main>

      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-6 mt-12 text-xs text-[var(--text-muted)]">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {contract && (
              <a
                href={contract}
                target="_blank"
                rel="noreferrer"
                className="hover:underline hover:text-[var(--accent)]"
              >
                Contract
              </a>
            )}
            <a
              href={site}
              target="_blank"
              rel="noreferrer"
              className="hover:underline hover:text-[var(--accent)]"
            >
              BOT Chain
            </a>
            <a
              href={explorer}
              target="_blank"
              rel="noreferrer"
              className="hover:underline hover:text-[var(--accent)]"
            >
              Explorer
            </a>
          </div>
          <BuiltOnBotChain />
        </div>
      </footer>
    </div>
  );
}
