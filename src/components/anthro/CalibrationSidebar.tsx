"use client";

import { useMemo } from "react";
import {
  LANDMARKS,
  groupLandmarks,
  type CalibratedPoint,
  type LandmarkDef,
} from "@/lib/anthro/landmarks";

type Props = {
  points: Record<string, CalibratedPoint>;
  currentIdx: number;
  setCurrentIdx: (i: number) => void;
  confirmedCount: number;
  total: number;
  onFinish: () => void;
  allConfirmed: boolean;
  autoDetectMsg: string;
  onRetryAutoDetect: () => void;
  onJumpPrevUnconfirmed: () => void;
};

export default function CalibrationSidebar({
  points,
  currentIdx,
  setCurrentIdx,
  confirmedCount,
  total,
  onFinish,
  allConfirmed,
  autoDetectMsg,
  onRetryAutoDetect,
  onJumpPrevUnconfirmed,
}: Props) {
  const groups = useMemo(() => {
    // Pre-compute global index per landmark
    const lookup = new Map<string, number>();
    LANDMARKS.forEach((l, i) => lookup.set(l.id, i));
    return groupLandmarks().map(
      ([group, items]) =>
        [
          group,
          items.map((l) => ({ ...l, _i: lookup.get(l.id)! })),
        ] as [LandmarkDef["group"], Array<LandmarkDef & { _i: number }>],
    );
  }, []);

  return (
    <div className="lg:sticky lg:top-[82px]">
      <div className="bg-white rounded-[22px] shadow-[0_12px_50px_rgba(23,23,27,0.08)] ring-1 ring-zinc-200">
        <div className="px-5 pt-5 pb-4 border-b border-zinc-100">
          <div className="text-[12.2px] text-zinc-500">Calibration</div>
          <div className="text-[20px] font-[650] tracking-tight mt-1">
            Refine landmarks
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[11.6px] text-zinc-500 mb-1">
              <span>
                {confirmedCount} / {total} confirmed
              </span>
              <span>{total > 0 ? Math.round((confirmedCount / total) * 100) : 0}%</span>
            </div>
            <div className="h-[7px] bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-900 rounded-full transition-all duration-300"
                style={{
                  width: `${total > 0 ? (confirmedCount / total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          {autoDetectMsg && (
            <div className="mt-3 text-[11.8px] text-zinc-600 bg-zinc-50 rounded-xl px-3 py-2 border border-zinc-100 flex items-start justify-between gap-2">
              <span>{autoDetectMsg}</span>
              <button
                onClick={onRetryAutoDetect}
                className="text-[11px] text-cyan-700 hover:text-cyan-900 underline shrink-0"
              >
                Re-run
              </button>
            </div>
          )}
        </div>

        <div className="px-3 py-3 max-h-[560px] overflow-auto">
          {groups.map(([group, items]) => (
            <div key={group} className="mb-3">
              <div className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                {group}
              </div>
              <div className="space-y-1">
                {items.map((l) => {
                  const p = points[l.id];
                  const active = l._i === currentIdx;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setCurrentIdx(l._i)}
                      aria-current={active ? "true" : undefined}
                      className={`w-full text-left px-3 py-[9px] rounded-xl text-[13.4px] transition flex items-center justify-between ${
                        active
                          ? "bg-zinc-900 text-white"
                          : "hover:bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      <span className="truncate">
                        {l._i + 1}. {l.name}
                      </span>
                      <span
                        className={`text-[11px] ${
                          active ? "text-zinc-300" : "text-zinc-400"
                        }`}
                        aria-hidden="true"
                      >
                        {p?.confirmed ? "✓" : "○"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-zinc-100 flex items-center justify-between gap-2">
          <button
            onClick={onJumpPrevUnconfirmed}
            className="text-[11.8px] text-zinc-500 hover:text-zinc-900 underline"
            title="Jump to first unconfirmed landmark"
          >
            Next unconfirmed
          </button>
          <button
            onClick={onFinish}
            disabled={!allConfirmed && confirmedCount < 14}
            className="px-3.5 py-2 rounded-full text-[13px] font-medium bg-zinc-900 text-white disabled:opacity-35 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors"
          >
            {allConfirmed ? "View Report →" : "Skip to report"}
          </button>
        </div>
        <div className="px-5 pb-4 -mt-1 text-[11.4px] text-zinc-400">
          Nudge: arrow keys • Zoom: scroll • Confirm: Enter
        </div>
      </div>
    </div>
  );
}
