"use client";

import { useEffect, useState } from "react";
import { stages } from "@/lib/stages";

type Entry = {
  stageId: string;
  text: string;
  savedAt: string; // ISO
};

const STORAGE_KEY = "founder-pipeline-entries";

function loadEntries(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Entry[]) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: Entry[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export default function FounderPipeline() {
  const [selected, setSelected] = useState<string>(stages[0].id);
  const [draft, setDraft] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEntries(loadEntries());
    setLoaded(true);
  }, []);

  const stage = stages.find((s) => s.id === selected)!;
  const latestForStage = entries
    .filter((e) => e.stageId === selected)
    .sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1))[0];

  function handleSave() {
    if (!draft.trim()) return;
    const next: Entry[] = [
      ...entries,
      { stageId: selected, text: draft.trim(), savedAt: new Date().toISOString() },
    ];
    setEntries(next);
    saveEntries(next);
    setDraft("");
  }

  function handleReset() {
    if (!confirm("모든 기록을 삭제할까요? 되돌릴 수 없습니다.")) return;
    setEntries([]);
    saveEntries([]);
  }

  return (
    <div>
      {/* 7단계 선택 버튼 */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {stages.map((s) => {
          const done = entries.some((e) => e.stageId === s.id);
          const active = s.id === selected;
          return (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                active
                  ? "border-neutral-900 dark:border-neutral-100"
                  : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600"
              }`}
            >
              <div className="text-xs text-neutral-500 mb-1">
                {s.step}. {s.cadence}
              </div>
              <div className="text-sm font-medium flex items-center gap-1">
                {s.title}
                {done && <span className="text-emerald-600 dark:text-emerald-400">✓</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* 선택된 단계 질문 + 입력 */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 mb-8">
        <div className="text-sm text-neutral-500 mb-2">
          {stage.step}단계 · {stage.title}
        </div>
        <p className="font-medium mb-4">{stage.question}</p>

        {latestForStage && (
          <div className="mb-4 rounded-lg bg-neutral-100 dark:bg-neutral-900 p-3 text-sm">
            <div className="text-xs text-neutral-500 mb-1">
              최근 기록 ({new Date(latestForStage.savedAt).toLocaleString("ko-KR")})
            </div>
            {latestForStage.text}
          </div>
        )}

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="여기에 답을 적으세요..."
          rows={4}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent p-3 text-sm mb-3"
        />
        <button
          onClick={handleSave}
          className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium"
        >
          저장하기
        </button>
      </div>

      {/* 전체 기록 히스토리 */}
      {loaded && entries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wide">
              전체 기록
            </h2>
            <button
              onClick={handleReset}
              className="text-xs text-neutral-400 hover:text-red-500"
            >
              전체 초기화
            </button>
          </div>
          <div className="space-y-2">
            {[...entries]
              .sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1))
              .map((e, i) => {
                const s = stages.find((x) => x.id === e.stageId)!;
                return (
                  <div
                    key={i}
                    className="text-sm border-l-2 border-neutral-200 dark:border-neutral-800 pl-3 py-1"
                  >
                    <span className="text-neutral-400">
                      {new Date(e.savedAt).toLocaleDateString("ko-KR")} · {s.title}
                    </span>
                    <div>{e.text}</div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
