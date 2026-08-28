// Export utilities for the AnthroFace report.
// Produces a PNG snapshot of the canvas+image, and CSV/JSON dumps of metrics.

import type { MetricResult } from "./metrics";
import type { Point, CalibratedPoint, LandmarkDef } from "./landmarks";
import { LANDMARKS } from "./landmarks";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportJSON(
  points: Record<string, Point>,
  results: MetricResult[],
  overallScore: number,
  meta: { imageWidth: number; imageHeight: number },
) {
  const payload = {
    generatedAt: new Date().toISOString(),
    tool: "AnthroFace v2.1",
    image: meta,
    overallScore: Number(overallScore.toFixed(2)),
    landmarkCount: Object.keys(points).length,
    landmarks: LANDMARKS.map((l: LandmarkDef) => ({
      id: l.id,
      name: l.name,
      group: l.group,
      hint: l.hint,
      point: points[l.id] ?? null,
    })),
    metrics: results.map((r) => ({
      id: r.metric.id,
      name: r.metric.name,
      category: r.metric.category,
      description: r.metric.description,
      unit: r.metric.unit,
      ideal: r.metric.ideal,
      tolerance: r.metric.tolerance,
      value: r.value,
      score: r.score,
    })),
  };
  triggerDownload(
    new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    }),
    `anthroface-report-${Date.now()}.json`,
  );
}

export function exportCSV(results: MetricResult[]) {
  const header = [
    "id",
    "name",
    "category",
    "unit",
    "ideal",
    "tolerance",
    "value",
    "score",
    "description",
  ];
  const rows = results.map((r) =>
    [
      r.metric.id,
      `"${r.metric.name.replace(/"/g, '""')}"`,
      r.metric.category,
      r.metric.unit || "ratio",
      r.metric.ideal,
      r.metric.tolerance,
      r.value == null ? "" : r.value.toFixed(4),
      r.score.toFixed(2),
      `"${r.metric.description.replace(/"/g, '""')}"`,
    ].join(","),
  );
  const csv = [header.join(","), ...rows].join("\n");
  triggerDownload(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `anthroface-metrics-${Date.now()}.csv`,
  );
}

/**
 * Render the photo + overlay into a PNG snapshot.  Accepts the source image
 * element plus a function that draws the full overlay (all metric vectors
 * at once, or a single highlighted one) onto a 2D canvas context.
 */
export function exportPNG(
  img: HTMLImageElement,
  imgW: number,
  imgH: number,
  drawOverlay: (ctx: CanvasRenderingContext2D, scale: number) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.width = imgW;
  canvas.height = imgH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(img, 0, 0, imgW, imgH);
  // Draw overlay at native resolution (scale = 1).
  drawOverlay(ctx, 1);

  // Bottom-right watermark
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(imgW - 220, imgH - 32, 220, 32);
  ctx.fillStyle = "#fff";
  ctx.font = "13px ui-sans-serif, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("AnthroFace v2.1 • ISO/TR 7250-2", imgW - 210, imgH - 16);

  canvas.toBlob((blob) => {
    if (blob) triggerDownload(blob, `anthroface-snapshot-${Date.now()}.png`);
  }, "image/png");
}

/** Build the data URL for the calibrated-points landmark table. */
export function exportPointsCSV(points: Record<string, CalibratedPoint>) {
  const header = ["id", "name", "group", "x", "y", "confirmed"];
  const rows = LANDMARKS.map((l) => {
    const p = points[l.id];
    return [
      l.id,
      `"${l.name.replace(/"/g, '""')}"`,
      l.group,
      p ? p.x.toFixed(2) : "",
      p ? p.y.toFixed(2) : "",
      p ? (p.confirmed ? "yes" : "no") : "no",
    ].join(",");
  });
  const csv = [header.join(","), ...rows].join("\n");
  triggerDownload(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `anthroface-landmarks-${Date.now()}.csv`,
  );
}
