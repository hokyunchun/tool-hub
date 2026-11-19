import type { Metadata } from "next";
import Link from "next/link";
import { getCategories } from "@/lib/tools";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tool Hub — 매일 하나씩 쌓는 미니 서비스 모음",
  description: "1주 1 MVP 사이클로 만들어가는 생산성/유틸리티 도구 모음",
};

const categoryLabels: Record<string, string> = {
  생산성: "Productivity",
  재무: "Finance",
  학습: "Learning",
};

function CategoryIcon({ category }: { category: string }) {
  const common = "h-4 w-4";
  if (category === "생산성") {
    return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.2 2" /></svg>;
  }
  if (category === "재무") {
    return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M3.5 9h17M7 14h3" /></svg>;
  }
  if (category === "학습") {
    return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" /><path d="M4 5.5v13A2.5 2.5 0 0 1 6.5 16H20" /></svg>;
  }
  return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.2 2" /></svg>;
}

function HomeIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m3.5 10 8.5-7 8.5 7v10.5h-6v-7h-5v7h-6z" /></svg>;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const categories = getCategories();

  return (
    <html lang="ko" className="dark">
      <body className="min-h-screen bg-[#101110] text-neutral-100 antialiased">
        <div className="min-h-screen md:grid md:grid-cols-[248px_minmax(0,1fr)]">
          <aside className="border-b border-white/[0.08] bg-[#141514] px-4 py-4 md:fixed md:inset-y-0 md:left-0 md:flex md:w-[248px] md:flex-col md:border-b-0 md:border-r md:px-3 md:py-5">
            <Link href="/" className="mb-5 flex items-center gap-3 px-2 py-1">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-sm font-semibold text-white">T</span>
              <span className="font-semibold tracking-tight">Tool Hub</span>
            </Link>

            <nav aria-label="Main navigation" className="space-y-1">
              <Link href="/" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-neutral-100">
                <HomeIcon /> Overview
              </Link>
            </nav>

            <div className="mt-8 px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">Workspace</div>
            <nav aria-label="Tool categories" className="space-y-1">
              {categories.map((category) => (
                <Link key={category} href={`/#${categoryLabels[category]?.toLowerCase() ?? "other"}`} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-neutral-100">
                  <CategoryIcon category={category} />
                  {categoryLabels[category] ?? category}
                </Link>
              ))}
            </nav>

          </aside>

          <div className="min-w-0 md:col-start-2 md:pl-0">
            <header className="hidden h-[61px] items-center justify-between border-b border-white/[0.08] px-8 md:flex">
              <div className="text-sm text-neutral-500">Workspace <span className="mx-2 text-neutral-700">/</span> <span className="text-neutral-300">Tool Hub</span></div>
              <div className="text-xs text-neutral-500">매일 하나씩 만들고 검증합니다</div>
            </header>
            <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 md:py-10">{children}</main>
            <footer className="mx-auto mt-8 max-w-6xl border-t border-white/[0.08] px-5 py-7 text-xs text-neutral-500 sm:px-8">
              © {new Date().getFullYear()} Tool Hub · 1주 1 MVP 사이클로 운영 중
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
