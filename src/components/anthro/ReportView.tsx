"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Point } from "@/lib/anthro/landmarks";
import type { MetricResult } from "@/lib/anthro/metrics";
import { exportCSV, exportJSON, exportPNG } from "@/lib/anthro/exporters";
import { useToast } from "@/hooks/use-toast";

type Props = {
  imgSrc: string;
  imgW: number;
  imgH: number;
  points: Record<string, Point>;
  metricResults: MetricResult[];
  overallScore: number;
  onBack: () => void;
  onReupload: () => void;
};

/** Qualitative band + color for a 0..10 harmony score. */
function scoreBand(score: number): { label: string; color: string } {
  if (score >= 8) return { label: "Excellent", color: "#0ea968" };
  if (score >= 6) return { label: "Good", color: "#06a9c9" };
  if (score >= 4) return { label: "Fair", color: "#e0a411" };
  return { label: "Review", color: "#ef5350" };
}

/** Direction of a value relative to its ideal band. */
function metricStatus(
  r: MetricResult,
): { label: string; tone: "in" | "low" | "high" | "na" } {
  if (r.value == null) return { label: "n/a", tone: "na" };
  const { ideal, tolerance } = r.metric;
  const dev = r.value - ideal;
  if (Math.abs(dev) <= tolerance) return { label: "In range", tone: "in" };
  return dev < 0
    ? { label: "Below ideal", tone: "low" }
    : { label: "Above ideal", tone: "high" };
}

const STATUS_CLASSES: Record<string, string> = {
  in: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  low: "bg-sky-50 text-sky-700 ring-sky-200",
  high: "bg-amber-50 text-amber-700 ring-amber-200",
  na: "bg-zinc-100 text-zinc-500 ring-zinc-200",
};

export default function ReportView({
  imgSrc,
  imgW,
  imgH,
  points,
  metricResults,
  overallScore,
  onBack,
  onReupload,
}: Props) {
  const { toast } = useToast();
  // Hover previews a metric; clicking/tapping pins it (works on touch too).
  const [hoverMetric, setHoverMetric] = useState<string | null>(null);
  const [pinnedMetric, setPinnedMetric] = useState<string | null>(null);
  const activeMetric = hoverMetric ?? pinnedMetric;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgElRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Fit image for display — derived, not stored in state.
  const fit = useMemo(() => {
    const maxW = 560;
    const maxH = 720;
    const safeW = imgW || 1;
    const safeH = imgH || 1;
    const scaleW = Math.min(1, maxW / safeW);
    const scaleH = Math.min(1, maxH / safeH);
    const scale = Math.min(scaleW, scaleH);
    return { w: safeW * scale, h: safeH * scale, scale };
  }, [imgW, imgH]);

  // Detect already-loaded (cached) images that never fire onLoad.
  useEffect(() => {
    const img = imgElRef.current;
    if (img && img.complete && img.naturalWidth > 0) setImgLoaded(true);
  }, [imgSrc]);

  // Draw overlay (faint points + active metric vectors)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = fit.w;
    canvas.height = fit.h;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // All points faint
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    Object.values(points).forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x * fit.scale, p.y * fit.scale, 2.15, 0, Math.PI * 2);
      ctx.fill();
    });

    if (activeMetric) {
      const mr = metricResults.find((r) => r.metric.id === activeMetric);
      if (mr) {
        ctx.save();
        ctx.scale(fit.scale, fit.scale);
        mr.metric.draw(ctx, points, imgW, imgH);
        ctx.restore();
      }
    }
  }, [activeMetric, points, fit, imgW, imgH, metricResults]);

  const grouped = useMemo(() => {
    const g: Record<string, MetricResult[]> = {};
    metricResults.forEach((r) => {
      const cat = r.metric.category;
      if (!g[cat]) g[cat] = [];
      g[cat].push(r);
    });
    return g;
  }, [metricResults]);

  // Summary stats for the overview strip.
  const summary = useMemo(() => {
    const valid = metricResults.filter((r) => r.value != null);
    const inRange = valid.filter(
      (r) => Math.abs((r.value as number) - r.metric.ideal) <= r.metric.tolerance,
    ).length;
    const sorted = [...valid].sort((a, b) => b.score - a.score);
    return {
      total: metricResults.length,
      measured: valid.length,
      inRange,
      strongest: sorted[0] ?? null,
      weakest: sorted[sorted.length - 1] ?? null,
    };
  }, [metricResults]);

  const handleExportPNG = useCallback(() => {
    const img = imgElRef.current;
    if (!img || !img.complete || img.naturalWidth === 0) {
      toast({
        title: "Image not ready",
        description: "Wait for the portrait to finish loading, then retry.",
      });
      return;
    }
    try {
      exportPNG(img, imgW, imgH, (ctx, scale) => {
        // Draw all metric vectors faint...
        ctx.save();
        ctx.scale(scale, scale);
        ctx.globalAlpha = 0.35;
        metricResults.forEach((r) => {
          if (r.value != null) r.metric.draw(ctx, points, imgW, imgH);
        });
        ctx.restore();
        // ...then the active one at full strength.
        if (activeMetric) {
          const mr = metricResults.find((r) => r.metric.id === activeMetric);
          if (mr) {
            ctx.save();
            ctx.scale(scale, scale);
            mr.metric.draw(ctx, points, imgW, imgH);
            ctx.restore();
          }
        }
      });
    } catch (err) {
      toast({
        title: "PNG export failed",
        description:
          err instanceof Error && err.name === "SecurityError"
            ? "The source image is cross-origin and can't be exported. Upload it directly instead."
            : "Something went wrong while rendering the snapshot.",
      });
    }
  }, [activeMetric, imgW, imgH, metricResults, points, toast]);

  const handleExportCSV = useCallback(() => {
    exportCSV(metricResults);
    toast({ title: "CSV exported", description: "Metric table downloaded." });
  }, [metricResults, toast]);

  const handleExportJSON = useCallback(() => {
    exportJSON(points, metricResults, overallScore, {
      imageWidth: imgW,
      imageHeight: imgH,
    });
    toast({ title: "JSON exported", description: "Full report downloaded." });
  }, [points, metricResults, overallScore, imgW, imgH, toast]);

  const pointCount = Object.keys(points).length;
  const band = scoreBand(overallScore);

  const togglePin = (id: string) =>
    setPinnedMetric((cur) => (cur === id ? null : id));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-[12.5px] text-zinc-500">Analysis Report</div>
          <h2 className="text-[34px] tracking-tight font-[660]">
            Facial Proportions
          </h2>
        </div>
        <div className="flex items-center gap-3 text-[12.8px] flex-wrap">
          <button
            onClick={onBack}
            className="px-3.5 py-1.5 rounded-full border border-zinc-300 text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            ← Back to calibrate
          </button>
          <button
            onClick={onReupload}
            className="px-3.5 py-1.5 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
          >
            New photo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[560px_1fr] gap-8 items-start">
        {/* Left Image */}
        <div className="bg-white rounded-[26px] shadow-[0_18px_70px_rgba(23,23,27,0.09)] ring-1 ring-zinc-200 p-5 xl:sticky xl:top-6">
          <div
            className="relative mx-auto"
            style={{ width: fit.w, height: fit.h }}
          >
            <img
              ref={imgElRef}
              src={imgSrc}
              width={fit.w}
              height={fit.h}
              alt="Analyzed portrait with overlay"
              onLoad={() => setImgLoaded(true)}
              onError={() =>
                toast({
                  title: "Preview unavailable",
                  description: "The portrait image could not be displayed.",
                })
              }
              className="rounded-[16px] block object-contain select-none"
              draggable={false}
              crossOrigin="anonymous"
            />
            <canvas
              ref={canvasRef}
              className="absolute left-0 top-0 rounded-[16px] pointer-events-none"
            />
          </div>
          <div className="flex items-center justify-between text-[11.9px] text-zinc-500 mt-3 px-1">
            <span>
              {activeMetric
                ? "Overlay active — tap a metric again to clear"
                : "Hover or tap a metric → overlay draws"}
            </span>
            <span className="font-mono">
              {pointCount} pts • {imgW}×{imgH}
            </span>
          </div>
        </div>

        {/* Right Dashboard */}
        <div className="bg-[#fcfcfd] rounded-[26px] ring-1 ring-zinc-200 shadow-[0_12px_60px_rgba(23,23,27,0.07)]">
          <div className="px-6 pt-5 pb-4 border-b border-zinc-200/90 flex items-center justify-between flex-wrap gap-2">
            <div className="text-[20.5px] font-[650] tracking-tight">
              All Ratios
            </div>
            <div className="flex items-center gap-2 text-[12.4px] text-zinc-500">
              <span>Harmony Score</span>
              <span
                className="font-[650] px-2 py-0.5 rounded-full text-white text-[12px]"
                style={{ backgroundColor: band.color }}
              >
                {overallScore.toFixed(1)}/10 · {band.label}
              </span>
            </div>
          </div>

          {/* Overview strip */}
          <div className="px-6 py-4 border-b border-zinc-200/90 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-[14px] bg-white ring-1 ring-zinc-200 px-3 py-2.5">
              <div className="text-[11px] uppercase tracking-wider text-zinc-400">
                Measured
              </div>
              <div className="text-[18px] font-[650] text-zinc-800">
                {summary.measured}
                <span className="text-[12px] text-zinc-400 font-normal">
                  {" "}
                  / {summary.total}
                </span>
              </div>
            </div>
            <div className="rounded-[14px] bg-white ring-1 ring-zinc-200 px-3 py-2.5">
              <div className="text-[11px] uppercase tracking-wider text-zinc-400">
                In range
              </div>
              <div className="text-[18px] font-[650] text-emerald-600">
                {summary.inRange}
                <span className="text-[12px] text-zinc-400 font-normal">
                  {" "}
                  / {summary.measured}
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={!summary.strongest}
              onMouseEnter={() =>
                summary.strongest && setHoverMetric(summary.strongest.metric.id)
              }
              onMouseLeave={() => setHoverMetric(null)}
              onClick={() =>
                summary.strongest && togglePin(summary.strongest.metric.id)
              }
              className="text-left rounded-[14px] bg-white ring-1 ring-zinc-200 px-3 py-2.5 hover:ring-emerald-300 transition disabled:opacity-50"
            >
              <div className="text-[11px] uppercase tracking-wider text-zinc-400">
                Strongest
              </div>
              <div className="text-[13.5px] font-[600] text-zinc-800 truncate">
                {summary.strongest ? summary.strongest.metric.name : "—"}
              </div>
            </button>
            <button
              type="button"
              disabled={!summary.weakest}
              onMouseEnter={() =>
                summary.weakest && setHoverMetric(summary.weakest.metric.id)
              }
              onMouseLeave={() => setHoverMetric(null)}
              onClick={() =>
                summary.weakest && togglePin(summary.weakest.metric.id)
              }
              className="text-left rounded-[14px] bg-white ring-1 ring-zinc-200 px-3 py-2.5 hover:ring-amber-300 transition disabled:opacity-50"
            >
              <div className="text-[11px] uppercase tracking-wider text-zinc-400">
                Needs review
              </div>
              <div className="text-[13.5px] font-[600] text-zinc-800 truncate">
                {summary.weakest ? summary.weakest.metric.name : "—"}
              </div>
            </button>
          </div>

          <div className="px-4 pb-5 pt-3 max-h-[760px] overflow-auto">
            {Object.entries(grouped).map(([cat, rows]) => (
              <div key={cat} className="mb-5">
                <div className="px-2 text-[11.3px] uppercase tracking-wider text-zinc-400 mb-2">
                  {cat}
                </div>
                <div className="space-y-[10px]">
                  {rows.map((r) => {
                    const m = r.metric;
                    const v = r.value;
                    const s = r.score;
                    const pct =
                      v == null
                        ? 50
                        : Math.max(
                            0,
                            Math.min(
                              100,
                              50 + ((v - m.ideal) / m.tolerance) * 50,
                            ),
                          );
                    const active = activeMetric === m.id;
                    const pinned = pinnedMetric === m.id;
                    const status = metricStatus(r);
                    return (
                      <div
                        key={m.id}
                        role="button"
                        tabIndex={0}
                        aria-pressed={pinned}
                        onMouseEnter={() => setHoverMetric(m.id)}
                        onMouseLeave={() => setHoverMetric(null)}
                        onFocus={() => setHoverMetric(m.id)}
                        onBlur={() => setHoverMetric(null)}
                        onClick={() => togglePin(m.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            togglePin(m.id);
                          }
                        }}
                        className={`rounded-[16px] border px-4 py-3 transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#06a9c9] ${
                          active
                            ? "bg-white border-zinc-300 shadow-sm"
                            : "border-zinc-200/95 hover:bg-white"
                        } ${pinned ? "ring-2 ring-[#06a9c9]/60" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[13.8px]">
                          <div className="font-[550] text-zinc-800 flex items-center gap-2">
                            {m.name}
                            {pinned && (
                              <span className="text-[10px] text-[#06a9c9]">
                                📌 pinned
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10.5px] px-2 py-0.5 rounded-full ring-1 ${STATUS_CLASSES[status.tone]}`}
                            >
                              {status.label}
                            </span>
                            <span className="text-[11.7px] text-[#069dbb] font-mono">
                              {s.toFixed(2)}/10
                            </span>
                          </div>
                        </div>
                        <div className="text-[11.8px] text-zinc-500 mt-0.5">
                          {m.description}
                        </div>
                        <div className="mt-3 relative">
                          <div
                            className="h-[10px] rounded-full"
                            style={{
                              background:
                                "linear-gradient(90deg, #ff5252 0%, #ffca3a 22%, #3be8ff 50%, #ffca3a 78%, #ff5252 100%)",
                            }}
                          />
                          {/* ideal center tick */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[16px] w-[2px] bg-white/70" />
                          <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                            style={{ left: `${pct}%` }}
                          >
                            <div
                              className={`w-[18px] h-[18px] rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,.18)] ring-[2.5px] ${
                                v == null ? "ring-zinc-200" : "ring-zinc-300"
                              }`}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between mt-1.5 text-[11.5px] text-zinc-500 font-mono">
                          <span>
                            {v == null
                              ? "—"
                              : v.toFixed(m.unit === "°" ? 1 : 3)}
                            {m.unit}
                          </span>
                          <span>
                            ideal {m.ideal}
                            {m.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-4 border-t border-zinc-200 text-[12px] text-zinc-500 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExportPNG}
                disabled={!imgLoaded}
                className="px-2.5 py-1.5 rounded-full border border-zinc-300 hover:bg-zinc-100 text-zinc-700 text-[11.5px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ⬇ PNG
              </button>
              <button
                onClick={handleExportCSV}
                className="px-2.5 py-1.5 rounded-full border border-zinc-300 hover:bg-zinc-100 text-zinc-700 text-[11.5px]"
              >
                ⬇ CSV
              </button>
              <button
                onClick={handleExportJSON}
                className="px-2.5 py-1.5 rounded-full border border-zinc-300 hover:bg-zinc-100 text-zinc-700 text-[11.5px]"
              >
                ⬇ JSON
              </button>
            </div>
            <span className="font-mono">AnthroFace ISO/TR 7250-2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
