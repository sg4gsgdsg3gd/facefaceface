"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LandmarkDef, Point, CalibratedPoint } from "@/lib/anthro/landmarks";

type Props = {
  imgSrc: string;
  imgW: number;
  imgH: number;
  landmark: LandmarkDef | undefined;
  point: CalibratedPoint | undefined;
  onConfirm: (pt: Point) => void;
  goPrev: () => void;
  goNext: () => void;
  progressLabel: string;
  isConfirmed: boolean;
  onSetPoint: (pt: Point) => void;
};

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 6.5;

export default function SniperCalibrator({
  imgSrc,
  imgW,
  imgH,
  landmark,
  point,
  onConfirm,
  goPrev,
  goNext,
  progressLabel,
  isConfirmed,
  onSetPoint,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(2.35);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);

  // When the active landmark changes, snap the pan so the point sits under
  // the crosshair.  Implemented with the "store previous prop" pattern
  // recommended by React docs to avoid setState-in-effect cascading renders.
  // Refs: https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevLandmarkId, setPrevLandmarkId] = useState<string | undefined>(
    landmark?.id,
  );
  if (landmark?.id !== prevLandmarkId) {
    setPrevLandmarkId(landmark?.id);
    if (point) {
      setPan({
        x: -(point.x - imgW / 2) * zoom,
        y: -(point.y - imgH / 2) * zoom,
      });
    }
  }

  const setZoomKeepCenter = (nz: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nz));
    setZoom((z) => {
      const ratio = clamped / z;
      setPan((p) => ({ x: p.x * ratio, y: p.y * ratio }));
      return clamped;
    });
  };

  const crossWorld = useMemo(
    () => ({
      x: imgW / 2 + -pan.x / zoom,
      y: imgH / 2 + -pan.y / zoom,
    }),
    [pan, zoom, imgW, imgH],
  );

  // Update the live point as the user pans (for the parent state)
  useEffect(() => {
    if (!point) return;
    onSetPoint(crossWorld);
  }, [crossWorld.x, crossWorld.y]);

  // Attach a NON-passive wheel listener so preventDefault actually works
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY;
      const factor = delta > 0 ? 1.12 : 0.89;
      setZoom((z) => {
        const nz = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor));
        const ratio = nz / z;
        setPan((p) => ({ x: p.x * ratio, y: p.y * ratio }));
        return nz;
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDragging(true);
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  };
  const onPointerUp = () => setDragging(false);

  // Keyboard nudging & Enter-to-confirm
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      // Don't hijack typing in form fields
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;

      const step = e.shiftKey ? 0.45 : 1.65;
      let dx = 0,
        dy = 0;
      if (e.key === "ArrowLeft") {
        dx = -step;
        e.preventDefault();
      }
      if (e.key === "ArrowRight") {
        dx = step;
        e.preventDefault();
      }
      if (e.key === "ArrowUp") {
        dy = -step;
        e.preventDefault();
      }
      if (e.key === "ArrowDown") {
        dy = step;
        e.preventDefault();
      }
      if (dx !== 0 || dy !== 0) {
        // Move the image opposite so the point under the crosshair follows
        // the arrow direction.
        setPan((p) => ({ x: p.x - dx * zoom, y: p.y - dy * zoom }));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm({ x: crossWorld.x, y: crossWorld.y });
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [zoom, onConfirm, crossWorld]);

  // Magnifier canvas
  const magRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const canvas = magRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded || !img.complete) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = 168;
    canvas.width = size;
    canvas.height = size;
    ctx.imageSmoothingEnabled = false;
    const srcSize = 72 / zoom; // world size visible
    const sx = Math.max(0, Math.min(imgW - srcSize, crossWorld.x - srcSize / 2));
    const sy = Math.max(0, Math.min(imgH - srcSize, crossWorld.y - srcSize / 2));
    ctx.clearRect(0, 0, size, size);
    try {
      ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size);
    } catch {
      // Image may be cross-origin tained; ignore.
    }
    // crosshair
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size / 2, 8);
    ctx.lineTo(size / 2, size - 8);
    ctx.moveTo(8, size / 2);
    ctx.lineTo(size - 8, size / 2);
    ctx.stroke();
    ctx.strokeStyle = "#06c1e4";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 3.2, 0, Math.PI * 2);
    ctx.stroke();
  }, [crossWorld, imgW, imgH, zoom, imgSrc, imgLoaded]);

  if (!landmark) return null;

  return (
    <div className="bg-white rounded-[24px] shadow-[0_14px_60px_rgba(15,15,20,0.10)] ring-1 ring-zinc-200 overflow-hidden">
      <div className="px-5 sm:px-7 pt-5 pb-4 border-b border-zinc-100 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11.7px] text-zinc-500">
            Align to crosshair • {progressLabel}
          </div>
          <div className="text-[24px] font-[650] tracking-tight">
            {landmark.name}
          </div>
          <div className="text-[13.3px] text-zinc-500">{landmark.hint}</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={goPrev}
            aria-label="Previous landmark"
            className="px-3 py-1.5 rounded-full border border-zinc-300 text-[12.8px] text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Prev
          </button>
          <button
            onClick={goNext}
            aria-label="Next landmark"
            className="px-3 py-1.5 rounded-full border border-zinc-300 text-[12.8px] text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Next
          </button>
          <button
            onClick={() => onConfirm({ x: crossWorld.x, y: crossWorld.y })}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium text-white transition-colors ${
              isConfirmed
                ? "bg-emerald-600 hover:bg-emerald-600/90"
                : "bg-zinc-900 hover:bg-zinc-800"
            }`}
          >
            {isConfirmed ? "Confirmed ✓" : "Confirm / Next"}
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={viewportRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="relative w-full h-[600px] md:h-[660px] bg-[#eef0f3] overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
        >
          <img
            ref={imgRef}
            src={imgSrc}
            alt="Calibration target"
            draggable={false}
            onLoad={() => setImgLoaded(true)}
            className="absolute left-1/2 top-1/2 max-w-none pointer-events-none"
            style={{
              width: imgW,
              height: imgH,
              transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
              transformOrigin: "center center",
            }}
          />

          {/* Crosshair center */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-[66px] h-[66px] rounded-full border border-zinc-900/16" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[32px] h-[32px] rounded-full border border-zinc-900/24" />
            <div className="absolute left-1/2 top-1/2 w-[150px] h-px bg-zinc-900/55 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute left-1/2 top-1/2 w-px h-[150px] bg-zinc-900/55 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full bg-[#06c1e4] ring-4 ring-[#06c1e4]/20" />
          </div>

          {/* Magnifier */}
          <div className="absolute right-4 top-4 bg-white/95 backdrop-blur rounded-[18px] shadow-xl ring-1 ring-zinc-200 p-[11px]">
            <div className="text-[10.7px] text-zinc-500 mb-1.5 font-mono">
              4× MAGNIFIER • {zoom.toFixed(2)}×
            </div>
            <canvas
              ref={magRef}
              className="rounded-[11px] bg-zinc-200 block w-[168px] h-[168px]"
            />
            <div className="mt-1.5 text-[10.8px] text-zinc-500 font-mono">
              x:{crossWorld.x.toFixed(1)} y:{crossWorld.y.toFixed(1)}
            </div>
          </div>

          {/* Zoom controls */}
          <div className="absolute right-4 bottom-4 flex flex-col gap-1">
            <button
              onClick={() => setZoomKeepCenter(zoom * 1.2)}
              aria-label="Zoom in"
              className="w-9 h-9 rounded-full bg-white/95 shadow ring-1 ring-zinc-200 text-zinc-700 hover:bg-white text-[16px]"
            >
              +
            </button>
            <button
              onClick={() => setZoomKeepCenter(zoom * 0.85)}
              aria-label="Zoom out"
              className="w-9 h-9 rounded-full bg-white/95 shadow ring-1 ring-zinc-200 text-zinc-700 hover:bg-white text-[16px]"
            >
              −
            </button>
            <button
              onClick={() => setZoomKeepCenter(2.35)}
              aria-label="Reset zoom"
              className="w-9 h-9 rounded-full bg-white/95 shadow ring-1 ring-zinc-200 text-zinc-700 hover:bg-white text-[10px]"
            >
              1×
            </button>
          </div>

          {/* bottom helper */}
          <div className="absolute left-4 bottom-4 text-[11.6px] text-zinc-600 bg-white/90 rounded-full px-3 py-1.5 shadow ring-1 ring-zinc-200">
            Drag to pan • Scroll to zoom • Arrows nudge • Enter confirm
          </div>
        </div>
      </div>
    </div>
  );
}
