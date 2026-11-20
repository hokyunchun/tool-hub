"use client";

import { useEffect, useState } from "react";
import { AGENCIES, AMOUNT_PRESETS, APPS_SCRIPT_URL, CSV_URL } from "@/lib/worklog-config";

type Row = { date: string; agency: string; amount: number };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function thisMonthPrefix() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// 발행된 CSV를 간단히 파싱 (날짜,사무소,금액 형태라 콤마 분리로 충분)
function parseCsv(text: string): Row[] {
  const lines = text.trim().split("\n").slice(1); // 헤더 제외
  return lines
    .map((line) => {
      const [date, agency, amountStr] = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
      const amount = Number(amountStr);
      if (!date || !agency || isNaN(amount)) return null;
      return { date, agency, amount };
    })
    .filter((r): r is Row => r !== null);
}

export default function WorkLog() {
  const [agency, setAgency] = useState<string>(AGENCIES[0] ?? "");
  const [customAgency, setCustomAgency] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const configured = Boolean(APPS_SCRIPT_URL) && Boolean(CSV_URL);

  async function loadDashboard() {
    if (!CSV_URL) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(CSV_URL, { cache: "no-store" });
      const text = await res.text();
      setRows(parseCsv(text));
    } catch {
      // 조용히 무시 - 대시보드만 실패, 입력은 계속 가능
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleSubmit() {
    const finalAgency = useCustom ? customAgency.trim() : agency;
    const finalAmount = customAmount ? Number(customAmount) : amount;

    if (!finalAgency || !finalAmount) {
      setMessage("사무소와 금액을 모두 선택/입력해주세요.");
      return;
    }
    if (!APPS_SCRIPT_URL) {
      setMessage("아직 구글시트 연동 URL이 설정되지 않았어요 (lib/worklog-config.ts 확인).");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    const payload = { date, agency: finalAgency, amount: finalAmount };

    try {
      // text/plain으로 보내야 브라우저가 사전확인(preflight) 요청을 안 보내서
      // Apps Script와의 CORS 문제를 피할 수 있음
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      // 구글시트 → 발행된 CSV 반영까지 시간차가 있을 수 있어 우선 화면에 바로 반영
      setRows((prev) => [...prev, payload]);
      setMessage("저장했어요.");
      setCustomAmount("");
      setAmount(null);
    } catch {
      setMessage("저장 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  const monthRows = rows.filter((r) => r.date.startsWith(thisMonthPrefix()));
  const monthTotal = monthRows.reduce((sum, r) => sum + r.amount, 0);
  const byAgency = monthRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.agency] = (acc[r.agency] ?? 0) + r.amount;
    return acc;
  }, {});
  const maxAgencyAmount = Math.max(1, ...Object.values(byAgency));

  return (
    <div>
      {!configured && (
        <div className="mb-6 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-sm p-3">
          아직 구글시트 연동이 설정 안 됐어요. <code>lib/worklog-config.ts</code>에
          APPS_SCRIPT_URL / CSV_URL 값을 채워주세요.
        </div>
      )}

      {/* 입력 영역 */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 mb-8">
        <div className="text-sm font-medium mb-3">일한 곳</div>
        <div className="flex flex-wrap gap-2 mb-4">
          {AGENCIES.map((a) => (
            <button
              key={a}
              onClick={() => {
                setAgency(a);
                setUseCustom(false);
              }}
              className={`rounded-full px-4 py-2 text-sm border transition-colors ${
                !useCustom && agency === a
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-transparent"
                  : "border-neutral-300 dark:border-neutral-700"
              }`}
            >
              {a}
            </button>
          ))}
          <button
            onClick={() => setUseCustom(true)}
            className={`rounded-full px-4 py-2 text-sm border transition-colors ${
              useCustom
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-transparent"
                : "border-neutral-300 dark:border-neutral-700"
            }`}
          >
            + 직접입력
          </button>
        </div>
        {useCustom && (
          <input
            value={customAgency}
            onChange={(e) => setCustomAgency(e.target.value)}
            placeholder="근무 장소"
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent p-2 text-sm mb-4"
          />
        )}

        <div className="text-sm font-medium mb-3">받은 금액</div>
        <div className="flex flex-wrap gap-2 mb-3">
          {AMOUNT_PRESETS.map((a) => (
            <button
              key={a}
              onClick={() => {
                setAmount(a);
                setCustomAmount("");
              }}
              className={`rounded-full px-4 py-2 text-sm border transition-colors ${
                amount === a && !customAmount
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-transparent"
                  : "border-neutral-300 dark:border-neutral-700"
              }`}
            >
              {a.toLocaleString()}원
            </button>
          ))}
        </div>
        <input
          value={customAmount}
          onChange={(e) => {
            setCustomAmount(e.target.value);
            setAmount(null);
          }}
          placeholder="직접 입력 (원)"
          type="number"
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent p-2 text-sm mb-4"
        />

        <div className="text-sm font-medium mb-2">일한 날짜</div>
        <input
          value={date}
          onChange={(e) => setDate(e.target.value)}
          type="date"
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent p-2 text-sm mb-4"
        />

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {submitting ? "저장 중..." : "기록하기"}
        </button>
        {message && <p className="text-sm text-neutral-500 mt-2">{message}</p>}
      </div>

      {/* 대시보드 */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <div className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-3">
          이번달 현황
        </div>
        {loading ? (
          <p className="text-sm text-neutral-400">불러오는 중...</p>
        ) : (
          <>
            <div className="text-3xl font-bold mb-4">{monthTotal.toLocaleString()}원</div>
            <div className="space-y-2">
              {Object.entries(byAgency).map(([a, amt]) => (
                <div key={a}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{a}</span>
                    <span className="text-neutral-500">{amt.toLocaleString()}원</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-900">
                    <div
                      className="h-2 rounded-full bg-neutral-900 dark:bg-neutral-100"
                      style={{ width: `${(amt / maxAgencyAmount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {monthRows.length === 0 && (
                <p className="text-sm text-neutral-400">이번달 기록이 아직 없어요.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
