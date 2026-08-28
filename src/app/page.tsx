"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  LANDMARKS,
  type CalibratedPoint,
  type Point,
} from "@/lib/anthro/landmarks";
import { computeAllMetrics } from "@/lib/anthro/metrics";
import UploadCard from "@/components/anthro/UploadCard";
import CalibrationSidebar from "@/components/anthro/CalibrationSidebar";
import SniperCalibrator from "@/components/anthro/SniperCalibrator";
import ReportView from "@/components/anthro/ReportView";

type Stage = "upload" | "calibrate" | "report";

type FaceLandmarkerLike = {
  detect: (img: HTMLImageElement | HTMLCanvasElement) => {
    faceLandmarks?: Array<Array<{ x: number; y: number; z?: number }>>;
  };
};

const DEMO_URL =
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1200&auto=format&fit=crop";

export default function Home() {
  const [stage, setStage] = useState<Stage>("upload");
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [points, setPoints] = useState<Record<string, CalibratedPoint>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarkerLike | null>(null);
  const [modelError, setModelError] = useState<string>("");
  const [loadingModel, setLoadingModel] = useState(true);
  const [autoDetectMsg, setAutoDetectMsg] = useState("");

  // Keep latest imgSrc + size in a ref so async auto-detect can read them
  const imgStateRef = useRef<{ src: string; w: number; h: number } | null>(null);
  const objUrlRef = useRef<string | null>(null);

  // Load MediaPipe FaceLandmarker once on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingModel(true);
      setModelError("");
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const { FaceLandmarker, FilesetResolver } = vision;
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm",
        );
        const landmarker = await FaceLandmarker.createFromOptions(
          filesetResolver,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "IMAGE",
            numFaces: 1,
            outputFacialTransformationMatrixes: false,
          },
        );
        if (!cancelled) {
          setFaceLandmarker(landmarker as unknown as FaceLandmarkerLike);
          setAutoDetectMsg((m) =>
            m.startsWith("MediaPipe warming") ? "" : m,
          );
        }
      } catch (e) {
        console.error("MediaPipe load failed", e);
        if (!cancelled) setModelError("Could not load MediaPipe — manual calibration only.");
      } finally {
        if (!cancelled) setLoadingModel(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-run auto-detect once model finishes loading (if we already have an image)
  useEffect(() => {
    if (faceLandmarker && imgStateRef.current && stage === "calibrate") {
      const { src, w, h } = imgStateRef.current;
      void runAutoDetect(src, w, h);
    }
  }, [faceLandmarker]);

  // Revoke any prior object URL when the src changes / on unmount
  const swapImgSrc = useCallback((src: string, isObjUrl: boolean) => {
    if (objUrlRef.current && objUrlRef.current !== src) {
      URL.revokeObjectURL(objUrlRef.current);
      objUrlRef.current = null;
    }
    if (isObjUrl) objUrlRef.current = src;
    setImgSrc(src);
  }, []);

  useEffect(() => {
    return () => {
      if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current);
    };
  }, []);

  const runAutoDetect = useCallback(
    async (url: string, w: number, h: number) => {
      // Track latest so the model-ready effect can re-run with the right image
      imgStateRef.current = { src: url, w, h };

      if (!faceLandmarker) {
        setAutoDetectMsg("MediaPipe warming up — place points manually.");
        const init: Record<string, CalibratedPoint> = {};
        LANDMARKS.forEach((ld) => {
          init[ld.id] = { x: w * 0.5, y: h * 0.5, confirmed: false };
        });
        setPoints(init);
        return;
      }
      try {
        const imgEl = new Image();
        imgEl.crossOrigin = "anonymous";
        imgEl.src = url;
        await new Promise<void>((res, rej) => {
          imgEl.onload = () => res();
          imgEl.onerror = () => rej(new Error("Image load failed"));
        });
        const result = faceLandmarker.detect(imgEl);
        const lm = result?.faceLandmarks?.[0];
        // Preserve user-confirmed points: only auto-fill the ones the user
        // hasn't already calibrated manually.
        setPoints((prev) => {
          const next: Record<string, CalibratedPoint> = {};
          LANDMARKS.forEach((def) => {
            const existing = prev[def.id];
            if (existing?.confirmed) {
              next[def.id] = existing;
              return;
            }
            const mp = lm?.[def.mpIndex];
            next[def.id] = mp
              ? { x: mp.x * w, y: mp.y * h, confirmed: false }
              : { x: w / 2, y: h / 2, confirmed: false };
          });
          return next;
        });
        if (lm) {
          setAutoDetectMsg(
            "FaceMesh found 468 points → distilled to 50 anthropometric landmarks.",
          );
        } else {
          setAutoDetectMsg("No face detected. Manual calibration needed.");
        }
      } catch (e) {
        console.error("Auto-detect failed", e);
        setAutoDetectMsg("Auto-detect failed — adjust points manually.");
      }
    },
    [faceLandmarker],
  );

  const handleImageFile = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        swapImgSrc(url, true);
        setImgSize({ w, h });
        setPoints({});
        setCurrentIdx(0);
        setStage("calibrate");
        // run autodetection soon
        setTimeout(() => void runAutoDetect(url, w, h), 90);
      };
      img.onerror = () => {
        setAutoDetectMsg("Could not read image. Try another file.");
        URL.revokeObjectURL(url);
      };
      img.src = url;
    },
    [runAutoDetect, swapImgSrc],
  );

  const handleDemo = useCallback(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const src = canvas.toDataURL("image/jpeg", 0.92);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      swapImgSrc(src, false);
      setImgSize({ w, h });
      setPoints({});
      setCurrentIdx(0);
      setStage("calibrate");
      setTimeout(() => void runAutoDetect(src, w, h), 90);
    };
    img.onerror = () => {
      setAutoDetectMsg(
        "Demo image failed to load (network/CORS). Try uploading your own.",
      );
    };
    img.src = DEMO_URL;
  }, [runAutoDetect, swapImgSrc]);

  const confirmedCount = useMemo(
    () => Object.values(points).filter((p) => p.confirmed).length,
    [points],
  );
  const total = LANDMARKS.length;
  const allConfirmed = confirmedCount >= total && total > 0;

  const pointsForMetrics: Record<string, Point> = useMemo(() => {
    const o: Record<string, Point> = {};
    for (const [k, v] of Object.entries(points)) o[k] = { x: v.x, y: v.y };
    return o;
  }, [points]);

  const metricResults = useMemo(
    () => computeAllMetrics(pointsForMetrics),
    [pointsForMetrics],
  );

  const overallScore = useMemo(() => {
    const vals = metricResults
      .filter((r) => r.value !== null)
      .map((r) => r.score);
    if (!vals.length) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [metricResults]);

  // Jump to next unconfirmed landmark (or wrap)
  const jumpNextUnconfirmed = useCallback(() => {
    setCurrentIdx((cur) => {
      for (let i = 1; i <= total; i++) {
        const idx = (cur + i) % total;
        const id = LANDMARKS[idx]?.id;
        if (id && !points[id]?.confirmed) return idx;
      }
      return cur;
    });
  }, [points, total]);

  // Esc -> back to upload from calibrate/report
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (stage === "report") setStage("calibrate");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [stage]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7] text-zinc-900">
      <header className="w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-9">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-[10px] bg-zinc-900 text-white text-[13px] font-semibold flex items-center justify-center"
                aria-hidden="true"
              >
                AF
              </div>
              <div className="text-[16.5px] tracking-tight font-[600]">
                AnthroFace
              </div>
              <span className="text-[11px] text-zinc-500 mt-[2px] ml-1">
                v2.1
              </span>
            </div>
            <nav
              className="hidden md:flex items-center gap-7 text-[13.5px] text-zinc-500"
              aria-label="Primary"
            >
              <button
                onClick={() => setStage("calibrate")}
                className={`hover:text-zinc-900 ${
                  stage === "calibrate"
                    ? "text-zinc-900 font-medium"
                    : ""
                }`}
              >
                Calibrate
              </button>
              <button
                onClick={() => {
                  if (imgSrc) setStage("report");
                }}
                disabled={!imgSrc}
                className={`hover:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed ${
                  stage === "report" ? "text-zinc-900 font-medium" : ""
                }`}
              >
                Analysis
              </button>
              <button
                onClick={() => setStage("upload")}
                className="hover:text-zinc-900"
              >
                Upload
              </button>
              <a
                href="https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-zinc-900"
              >
                Help
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-5 text-[12.5px]">
            <span className="hidden sm:inline text-zinc-500">
              MediaPipe FaceMesh 468 → 50
            </span>
            <span
              className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-100 text-[11px] text-zinc-600"
              title={
                faceLandmarker
                  ? "Model ready"
                  : loadingModel
                    ? "Loading model…"
                    : "Idle"
              }
            >
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  faceLandmarker
                    ? "bg-emerald-500"
                    : loadingModel
                      ? "bg-amber-500 animate-pulse"
                      : "bg-zinc-400"
                }`}
              />
              {faceLandmarker ? "Ready" : loadingModel ? "Loading" : "Idle"}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 md:px-10 py-8 md:py-12">
        <AnimatePresence mode="wait">
          {stage === "upload" && (
            <motion.section
              key="upload"
              aria-label="Upload"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.32 }}
            >
              <div className="max-w-3xl">
                <div className="text-[13px] text-zinc-500 mb-2">
                  Professional Facial Anthropometry
                </div>
                <h1 className="text-[44px] md:text-[58px] leading-[0.98] tracking-[-0.028em] font-[620] text-zinc-900">
                  Calibrate 50 landmarks.
                  <br />
                  Get a clinical-grade
                  <br />
                  proportion report.
                </h1>
                <p className="mt-5 text-[16.4px] text-zinc-600 leading-relaxed max-w-xl">
                  MediaPipe Face Landmarker auto-detects 468 blendshape points.
                  You refine 50 ISO anthropometric points in the precision Sniper
                  UI, then export a hover-interactive ratio dashboard.
                </p>
              </div>

              <div className="mt-10 bg-white rounded-[24px] shadow-[0_18px_80px_rgba(20,20,28,0.09)] ring-1 ring-zinc-200/90 p-7 md:p-12">
                <UploadCard
                  onFile={handleImageFile}
                  onDemo={handleDemo}
                  loadingModel={loadingModel}
                  modelReady={!!faceLandmarker}
                />
                {modelError && (
                  <div
                    role="alert"
                    className="mt-4 text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2"
                  >
                    {modelError}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-6 text-[12.5px] text-zinc-500 mt-7">
                  <span>✔︎ 100% local — No upload</span>
                  <span>✔︎ 468 → 50 distilled</span>
                  <span>✔︎ Golden ratio &amp; neoclassical canons</span>
                  <span>✔︎ PNG / CSV / JSON export</span>
                </div>
              </div>
              <div className="mt-8 grid md:grid-cols-3 gap-5 text-[13.4px] text-zinc-600">
                {[
                  [
                    "Sniper Calibrator",
                    "Center-locked crosshair, 4× magnifier, sub-pixel nudging.",
                  ],
                  [
                    "Hover-Draw Report",
                    "Metric hover instantly draws vectors on the calibrated photo.",
                  ],
                  [
                    "19 Clinical Ratios",
                    "Vertical thirds, canthal tilt, nasolabial, IPD, EME, lip golden ratio.",
                  ],
                ].map(([t, d]) => (
                  <div
                    key={t}
                    className="bg-white/70 rounded-2xl border border-zinc-200 px-5 py-4"
                  >
                    <div className="font-[600] text-zinc-800">{t}</div>
                    <div className="mt-1 text-zinc-500">{d}</div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {stage === "calibrate" && imgSrc && (
            <motion.section
              key="calibrate"
              aria-label="Calibrate"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start"
            >
              <CalibrationSidebar
                points={points}
                currentIdx={currentIdx}
                setCurrentIdx={setCurrentIdx}
                confirmedCount={confirmedCount}
                total={total}
                onFinish={() => setStage("report")}
                allConfirmed={allConfirmed}
                autoDetectMsg={autoDetectMsg}
                onRetryAutoDetect={() => {
                  if (imgStateRef.current) {
                    void runAutoDetect(
                      imgStateRef.current.src,
                      imgStateRef.current.w,
                      imgStateRef.current.h,
                    );
                  }
                }}
                onJumpPrevUnconfirmed={jumpNextUnconfirmed}
              />
              <SniperCalibrator
                imgSrc={imgSrc}
                imgW={imgSize.w}
                imgH={imgSize.h}
                landmark={LANDMARKS[currentIdx]}
                point={points[LANDMARKS[currentIdx]?.id]}
                onConfirm={(pt) => {
                  const id = LANDMARKS[currentIdx].id;
                  setPoints((prev) => ({
                    ...prev,
                    [id]: { ...pt, confirmed: true },
                  }));
                  if (currentIdx < total - 1) {
                    setCurrentIdx((i) => i + 1);
                  } else {
                    setStage("report");
                  }
                }}
                goPrev={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                goNext={() =>
                  setCurrentIdx((i) => Math.min(total - 1, i + 1))
                }
                progressLabel={`${currentIdx + 1} / ${total}`}
                isConfirmed={
                  points[LANDMARKS[currentIdx]?.id]?.confirmed ?? false
                }
                onSetPoint={(pt) => {
                  const id = LANDMARKS[currentIdx]?.id;
                  if (!id) return;
                  setPoints((prev) => ({
                    ...prev,
                    [id]: {
                      ...pt,
                      confirmed: prev[id]?.confirmed ?? false,
                    },
                  }));
                }}
              />
            </motion.section>
          )}

          {stage === "report" && imgSrc && (
            <motion.section
              key="report"
              aria-label="Report"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <ReportView
                imgSrc={imgSrc}
                imgW={imgSize.w}
                imgH={imgSize.h}
                points={pointsForMetrics}
                metricResults={metricResults}
                overallScore={overallScore}
                onBack={() => setStage("calibrate")}
                onReupload={() => setStage("upload")}
              />
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-auto border-t border-zinc-200/80 bg-white/60">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-6 text-[12.5px] text-zinc-500 flex flex-wrap items-center justify-between gap-2">
          <span>
            AnthroFace • For educational / clinical visualization only • FaceMesh
            468-pt model © Google MediaPipe Apache-2.0
          </span>
          <span className="font-mono">ISO/TR 7250-2</span>
        </div>
      </footer>
    </div>
  );
}
