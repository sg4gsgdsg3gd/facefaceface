"use client";

import { useRef, useState } from "react";

type Props = {
  onFile: (f: File) => void;
  onDemo: () => void;
  loadingModel: boolean;
  modelReady: boolean;
};

export default function UploadCard({
  onFile,
  onDemo,
  loadingModel,
  modelReady,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={`rounded-[18px] border-[1.8px] border-dashed transition-all px-6 py-14 text-center ${
          drag
            ? "border-cyan-400 bg-cyan-50/60"
            : "border-zinc-300 bg-[#fbfbfc]"
        }`}
      >
        <div className="mx-auto w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 mb-4">
          <svg
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 16V4M8 8l4-4 4 4" />
            <rect x="3" y="14" width="18" height="7" rx="2" />
          </svg>
        </div>
        <div className="text-[17.5px] font-[580] text-zinc-800">
          Drop a frontal portrait, or browse
        </div>
        <div className="text-[13.4px] text-zinc-500 mt-1">
          JPG / PNG • 800px+ • neutral expression • good lighting
        </div>
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 rounded-full bg-zinc-900 text-white text-[13.4px] font-medium hover:bg-zinc-800 transition-colors"
          >
            Choose photo
          </button>
          <button
            onClick={onDemo}
            className="px-4 py-2 rounded-full border border-zinc-300 text-zinc-700 text-[13.4px] hover:bg-zinc-50 transition-colors"
          >
            Use demo face
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            // Reset input so the same file can be picked again
            e.target.value = "";
          }}
        />
        <div className="mt-3 text-[11.7px] text-zinc-500 inline-flex items-center gap-1.5">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              modelReady
                ? "bg-emerald-500 animate-pulse"
                : loadingModel
                  ? "bg-amber-500 animate-pulse"
                  : "bg-zinc-400"
            }`}
          />
          {loadingModel
            ? "Loading Face Landmarker…"
            : modelReady
              ? "MediaPipe ready • runs in-browser"
              : "MediaPipe will warm up after upload"}
        </div>
      </div>
    </div>
  );
}
