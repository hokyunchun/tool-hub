"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Tool } from "@/lib/tools";

const categoryLabels: Record<string, string> = {
  생산성: "Productivity",
  재무: "Finance",
  학습: "Learning",
};

function CategoryIcon({ category }: { category: string }) {
  const common = "h-4 w-4";
  if (category === "생산성") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.2 2" /></svg>;
  if (category === "재무") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M3.5 9h17M7 14h3" /></svg>;
  if (category === "학습") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" /><path d="M4 5.5v13A2.5 2.5 0 0 1 6.5 16H20" /></svg>;
  return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.2 2" /></svg>;
}

export default function WorkspaceNavigation({ categories, tools }: { categories: string[]; tools: Tool[] }) {
  const pathname = usePathname();
  const activeCategory = tools.find((tool) => pathname === `/tools/${tool.slug}`)?.category;
  const [expanded, setExpanded] = useState<string[]>(activeCategory ? [activeCategory] : []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("tool-hub-workspace-open") || "[]");
      if (Array.isArray(saved)) setExpanded((current) => [...new Set([...saved.filter((item) => categories.includes(item)), ...current])]);
    } catch { /* ignore invalid saved navigation state */ }
  }, [categories]);

  useEffect(() => {
    if (activeCategory) setExpanded((current) => current.includes(activeCategory) ? current : [...current, activeCategory]);
  }, [activeCategory]);

  function toggle(category: string) {
    setExpanded((current) => {
      const next = current.includes(category) ? current.filter((item) => item !== category) : [...current, category];
      try { localStorage.setItem("tool-hub-workspace-open", JSON.stringify(next)); } catch { /* storage may be unavailable */ }
      return next;
    });
  }

  return (
    <nav aria-label="Tool categories" className="space-y-1">
      {categories.map((category) => {
        const categoryTools = tools.filter((tool) => tool.category === category);
        const isOpen = expanded.includes(category);
        return (
          <div key={category} className="rounded-md">
            <button type="button" aria-expanded={isOpen} onClick={() => toggle(category)} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-neutral-100">
              <CategoryIcon category={category} />
              <span className="flex-1">{categoryLabels[category] ?? category}</span>
              <svg className={`h-3.5 w-3.5 text-neutral-600 transition-transform ${isOpen ? "rotate-90" : ""}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
            </button>
            {isOpen && <div className="ml-[26px] space-y-0.5 border-l border-white/[0.08] py-1 pl-3">
              {categoryTools.map((tool) => {
                const active = pathname === `/tools/${tool.slug}`;
                return <Link key={tool.slug} href={`/tools/${tool.slug}`} aria-current={active ? "page" : undefined} className={`block rounded-md px-2.5 py-2 text-xs transition-colors hover:bg-white/[0.06] hover:text-neutral-100 ${active ? "bg-white/[0.07] text-neutral-100" : "text-neutral-500"}`}>{tool.name}</Link>;
              })}
            </div>}
          </div>
        );
      })}
    </nav>
  );
}
