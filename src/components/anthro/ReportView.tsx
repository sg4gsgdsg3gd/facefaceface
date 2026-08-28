"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Point } from "@/lib/anthro/landmarks";
import type { MetricResult } from "@/lib/anthro/metrics";
import { exportCSV, exportJSON, exportPNG } from "@/lib/anthro/exporters";

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
  const [hoverMetric, setHoverMetric] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgElRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Fit image for display — derived, not stored in state.
  const fit = useMemo(() => {
    const maxW = 560;
    const maxH = 720;
    const scaleW = Math.min(1, maxW / imgW);
    const scaleH = Math.min(1, maxH / imgH);
    const scale = Math.min(scaleW, scaleH);
    return { w: imgW * scale, h: imgH * scale, scale };
  }, [imgW, imgH]);

  // Draw overlay (faint points + hovered metric vectors)
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

    if (hoverMetric) {
      const mr = metricResults.find((r) => r.metric.id === hoverMetric);
      if (mr) {
        ctx.save();
        ctx.scale(fit.scale, fit.scale);
        mr.metric.draw(ctx, points, imgW, imgH);
        ctx.restore();
      }
    }
  }, [hoverMetric, points, fit, imgW, imgH, metricResults]);

  const grouped = useMemo(() => {
    const g: Record<string, MetricResult[]> = {};
    metricResults.forEach((r) => {
      const cat = r.metric.category;
      if (!g[cat]) g[cat] = [];
      g[cat].push(r);
    });
    return g;
  }, [metricResults]);

  const handleExportPNG = () => {
    const img = imgElRef.current;
    if (!img || !img.complete) return;
    exportPNG(img, imgW, imgH, (ctx, scale) => {
      // Draw all metric vectors faint, hovered one bold
      ctx.save();
      ctx.scale(scale, scale);
      ctx.globalAlpha = 0.35;
      metricResults.forEach((r) => {
        if (r.value != null) r.metric.draw(ctx, points, imgW, imgH);
      });
      ctx.restore();
      // Highlighted
      if (hoverMetric) {
        const mr = metricResults.find((r) => r.metric.id === hoverMetric);
        if (mr) {
          ctx.save();
          ctx.scale(scale, scale);
          mr.metric.draw(ctx, points, imgW, imgH);
          ctx.restore();
        }
      }
    });
  };

  const totalConfirmed = Object.values(points).length;

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
        <div className="bg-white rounded-[26px] shadow-[0_18px_70px_rgba(23,23,27,0.09)] ring-1 ring-zinc-200 p-5">
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
            <span>Hover a metric on the right → overlay draws</span>
            <span className="font-mono">
              {totalConfirmed} pts • {imgW}×{imgH}
            </span>
          </div>
        </div>

        {/* Right Dashboard */}
        <div className="bg-[#fcfcfd] rounded-[26px] ring-1 ring-zinc-200 shadow-[0_12px_60px_rgba(23,23,27,0.07)]">
          <div className="px-6 pt-5 pb-4 border-b border-zinc-200/90 flex items-center justify-between flex-wrap gap-2">
            <div className="text-[20.5px] font-[650] tracking-tight">
              All Ratios
            </div>
            <div className="text-[12.4px] text-zinc-500">
              Harmony Score{" "}
              <span className="text-[#06a9c9] font-[650]">
                {overallScore.toFixed(1)}/10
              </span>
            </div>
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
                    const active = hoverMetric === m.id;
                    return (
                      <div
                        key={m.id}
                        onMouseEnter={() => setHoverMetric(m.id)}
                        onMouseLeave={() => setHoverMetric(null)}
                        className={`rounded-[16px] border px-4 py-3 transition cursor-default ${
                          active
                            ? "bg-white border-zinc-300 shadow-sm"
                            : "border-zinc-200/95 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[13.8px]">
                          <div className="font-[550] text-zinc-800">
                            {m.name}
                          </div>
                          <div className="text-[11.7px] text-[#069dbb] font-mono">
                            Score: {s.toFixed(2)}/10
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
                          <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                            style={{ left: `${pct}%` }}
                          >
                            <div className="w-[18px] h-[18px] rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,.18)] ring-[2.5px] ring-zinc-200" />
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
                className="px-2.5 py-1.5 rounded-full border border-zinc-300 hover:bg-zinc-100 text-zinc-700 text-[11.5px] disabled:opacity-40"
              >
                ⬇ PNG
              </button>
              <button
                onClick={() => exportCSV(metricResults)}
                className="px-2.5 py-1.5 rounded-full border border-zinc-300 hover:bg-zinc-100 text-zinc-700 text-[11.5px]"
              >
                ⬇ CSV
              </button>
              <button
                onClick={() =>
                  exportJSON(
                    points,
                    metricResults,
                    overallScore,
                    { imageWidth: imgW, imageHeight: imgH },
                  )
                }
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
