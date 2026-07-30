import Link from "next/link";
import { tools, getCategories } from "@/lib/tools";

export default function HomePage() {
  const categories = getCategories();

  return (
    <div>
      <section className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          매주 하나씩, 검증하며 쌓아가는 도구 모음
        </h1>
        <p className="text-neutral-500">
          완성도보다 빠른 사용자 피드백을 우선합니다. 각 도구는 실제로 겪은 문제에서 출발합니다.
        </p>
      </section>

      {categories.map((category) => (
        <section key={category} className="mb-10">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-4">
            {category}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools
              .filter((t) => t.category === category)
              .map((tool) => (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="group rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
                >
                  <div className="text-2xl mb-2">{tool.emoji}</div>
                  <div className="font-semibold mb-1 group-hover:underline">
                    {tool.name}
                  </div>
                  <p className="text-sm text-neutral-500">{tool.description}</p>
                  {tool.status === "wip" && (
                    <span className="inline-block mt-3 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      제작중
                    </span>
                  )}
                </Link>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
