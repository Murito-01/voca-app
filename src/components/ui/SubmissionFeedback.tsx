"use client";

import Link from "next/link";
import type { SubmitResponseResult } from "@/components/ui/SubmitResponseButton";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  valid:       { label: "Valid",       color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200", icon: "✅" },
  low_quality: { label: "Low Quality", color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",   icon: "⚠️" },
  rejected:    { label: "Rejected",    color: "text-red-700",     bg: "bg-red-50",      border: "border-red-200",     icon: "❌" },
  pending:     { label: "Pending",     color: "text-gray-600",    bg: "bg-gray-50",     border: "border-gray-200",    icon: "⏳" },
};

function ScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const offset = circumference - (clampedScore / 100) * circumference;
  const color =
    clampedScore >= 70 ? "#10b981" : clampedScore >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r={radius}
          fill="none" stroke="#e5e7eb" strokeWidth="10"
        />
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
        />
      </svg>
      <span
        className="absolute text-2xl font-extrabold"
        style={{ color }}
      >
        {clampedScore}
      </span>
    </div>
  );
}

export default function SubmissionFeedback({
  result,
  surveyTitle,
}: {
  result: SubmitResponseResult;
  surveyTitle?: string;
}) {
  const status = STATUS_CONFIG[result.status] ?? STATUS_CONFIG.pending;
  const bd = result.score_breakdown ?? {};

  const rewardFormatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(result.reward_final ?? 0);

  const hasBreakdown = Object.keys(bd).length > 0;

  return (
    <div className="feedback-enter">
      {/* Top banner */}
      <div className={`rounded-2xl border-2 ${status.border} ${status.bg} p-6 mb-5 text-center`}>
        <div className="text-4xl mb-2">{status.icon}</div>
        <h2 className={`text-2xl font-extrabold mb-1 ${status.color}`}>
          Response {status.label}
        </h2>
        <p className="text-sm text-gray-500">
          {surveyTitle ? `"${surveyTitle}" — ` : ""}
          {result.status === "valid"
            ? "Great job! Your response passed quality checks."
            : result.status === "low_quality"
            ? "Your response was accepted at reduced reward."
            : result.status === "rejected"
            ? "Your response did not meet quality requirements."
            : "Your response is being processed."}
        </p>
      </div>

      {/* Score + Reward row */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Score ring */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Score</p>
          <ScoreRing score={result.score} />
          <p className="text-xs text-gray-400 mt-2">out of 100</p>
        </div>

        {/* Reward */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Reward Earned</p>
          <p className={`text-2xl font-extrabold ${(result.reward_final ?? 0) > 0 ? "text-emerald-600" : "text-gray-400"}`}>
            {rewardFormatted}
          </p>
          {(result.reward_final ?? 0) === 0 && (
            <p className="text-xs text-gray-400 mt-1">No reward for this response</p>
          )}
        </div>
      </div>

      {/* Score Breakdown */}
      {hasBreakdown && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <span>🧮</span> Score Breakdown
          </h3>

          <div className="space-y-2 text-sm font-mono text-gray-600 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">+ Base Score</span>
              <span className="font-bold">{bd.base ?? 100}</span>
            </div>

            {(bd.time_penalty ?? 0) !== 0 && (
              <div className="flex justify-between items-center text-red-600">
                <span>- Time Penalty</span>
                <span className="font-bold">{Math.abs(bd.time_penalty)}</span>
              </div>
            )}
            {(bd.essay_penalty ?? 0) !== 0 && (
              <div className="flex justify-between items-center text-red-600">
                <span>- Essay Penalty</span>
                <span className="font-bold">{Math.abs(bd.essay_penalty)}</span>
              </div>
            )}
            {(bd.reputation_penalty ?? 0) !== 0 && (
              <div className="flex justify-between items-center text-red-600">
                <span>- Reputation Penalty</span>
                <span className="font-bold">{Math.abs(bd.reputation_penalty)}</span>
              </div>
            )}
            {(bd.reputation_bonus ?? 0) !== 0 && (
              <div className="flex justify-between items-center text-emerald-600">
                <span>+ Reputation Bonus</span>
                <span className="font-bold">{bd.reputation_bonus}</span>
              </div>
            )}

            <div className="border-t border-gray-200 pt-2 flex justify-between items-center font-bold text-gray-900 text-base">
              <span>Final Score</span>
              <span>{bd.final_score ?? result.score}</span>
            </div>
          </div>

          {/* Duration + Attention Check */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            {bd.duration !== undefined && (
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">⏱ Duration</p>
                <p className="text-sm text-gray-800 font-medium">
                  {bd.duration}s
                  <span className="text-gray-400 font-normal"> / min {bd.min_duration}s</span>
                </p>
                {bd.duration >= bd.min_duration ? (
                  <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Normal ✅</span>
                ) : (
                  <span className="inline-block mt-1 text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Too Fast ❌</span>
                )}
              </div>
            )}
            {bd.attention_check !== undefined && (
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">🧠 Attention</p>
                <p className="text-sm font-medium">
                  {bd.attention_check === "passed" ? (
                    <span className="text-emerald-700">Passed ✅</span>
                  ) : bd.attention_check === "failed" ? (
                    <span className="text-red-700">Failed ❌</span>
                  ) : (
                    <span className="text-gray-500 capitalize">{bd.attention_check}</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View full details */}
      {result.id && (
        <Link
          href={`/my-responses/${result.id}`}
          className="block w-full text-center bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
        >
          View Full Details →
        </Link>
      )}
      <Link
        href="/my-responses"
        className="block w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-3 transition-colors"
      >
        ← Back to My Responses
      </Link>
    </div>
  );
}
