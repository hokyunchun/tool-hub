import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tool Hub — 매일 하나씩 쌓는 미니 서비스 모음",
  description: "1주 1 MVP 사이클로 만들어가는 생산성/유틸리티 도구 모음",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 antialiased">
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
            <a href="/" className="font-semibold text-lg tracking-tight">
              Tool Hub
            </a>
            <span className="text-sm text-neutral-500">매일 하나씩 만들고 검증합니다</span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        <footer className="mx-auto max-w-5xl px-6 py-10 text-sm text-neutral-500 border-t border-neutral-200 dark:border-neutral-800 mt-16">
          © {new Date().getFullYear()} Tool Hub. 1주 1 MVP 사이클로 운영중.
        </footer>
      </body>
    </html>
  );
}
