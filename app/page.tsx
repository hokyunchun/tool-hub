import Link from "next/link";
import { tools, getCategories } from "@/lib/tools";

const categoryLabels: Record<string, string> = {
  생산성: "Productivity",
  재무: "Finance",
  학습: "Learning",
};

const categorySlugs: Record<string, string> = {
  생산성: "productivity",
  재무: "finance",
  학습: "learning",
};

function ToolIcon({ slug }: { slug: string }) {
  const props = {
    className: "h-5 w-5",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  if (slug === "founder-pipeline") {
    return <svg {...props}><circle cx="6" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 6h5a5 5 0 0 1 5 5v5" /></svg>;
  }
  if (slug === "worklog") {
    return <svg {...props}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 9h16M9 9v11M13 13h4M13 16h4" /></svg>;
  }
  if (slug === "fire-study-planner") {
    return <svg {...props}><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z" /><path d="M5 5v14M9 7h7M9 11h7" /></svg>;
  }
  return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}

export default function HomePage() {
  const categories = getCategories();

  return (
    <div>
      <section className="mb-12 border-b border-white/[0.08] pb-8">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">A small collection of useful tools</p>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl">
          매주 하나씩, 검증하며 쌓아가는 도구 모음
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-neutral-400 sm:text-base">
          실제로 겪은 문제에서 출발해 만들고, 사용하며 개선하는 작은 도구들입니다.
        </p>
      </section>

      <div className="space-y-11">
        {categories.map((category) => (
          <section key={category} id={categorySlugs[category] ?? "other"} className="scroll-mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
                {categoryLabels[category] ?? category}
              </h2>
              <span className="text-xs text-neutral-600">
                {tools.filter((tool) => tool.category === category).length} tools
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {tools
                .filter((tool) => tool.category === category)
                .map((tool) => (
                  <Link
                    key={tool.slug}
                    href={`/tools/${tool.slug}`}
                    className="group rounded-lg border border-white/[0.09] bg-[#151615] p-5 transition-colors hover:border-white/20 hover:bg-[#191a19] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
                  >
                    <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-md border border-white/[0.09] bg-white/[0.035] text-neutral-300 transition-colors group-hover:text-white">
                      <ToolIcon slug={tool.slug} />
                    </div>
                    <div className="mb-1 font-medium text-neutral-100">{tool.name}</div>
                    <p className="text-sm leading-5 text-neutral-500">{tool.description}</p>
                    {tool.status === "wip" && (
                      <span className="mt-4 inline-flex rounded border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wide text-neutral-400">
                        In progress
                      </span>
                    )}
                  </Link>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
