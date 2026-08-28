import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Types
type Point = { x: number; y: number };
type LandmarkDef = {
  id: string;
  name: string;
  group: "Cranial" | "Orbital" | "Nasal" | "Oral" | "Mandibular" | "Zygomatic";
  mpIndex: number;
  hint: string;
};

type CalibratedPoint = Point & { confirmed: boolean };

// 50-point anthropometric set, mapped to MediaPipe FaceLandmarker indices
const LANDMARKS: LandmarkDef[] = [
  // Cranial / Upper Face
  { id: "tr", name: "Trichion", group: "Cranial", mpIndex: 10, hint: "Hairline center" },
  { id: "g", name: "Glabella", group: "Cranial", mpIndex: 9, hint: "Between eyebrows" },
  { id: "n", name: "Nasion", group: "Nasal", mpIndex: 168, hint: "Nasal root" },
  { id: "eb_ml", name: "L. Brow Medial", group: "Cranial", mpIndex: 107, hint: "Left brow head" },
  { id: "eb_mr", name: "R. Brow Medial", group: "Cranial", mpIndex: 336, hint: "Right brow head" },
  { id: "eb_pl", name: "L. Brow Peak", group: "Cranial", mpIndex: 52, hint: "Left brow arch" },
  { id: "eb_pr", name: "R. Brow Peak", group: "Cranial", mpIndex: 282, hint: "Right brow arch" },
  { id: "eb_ll", name: "L. Brow Tail", group: "Cranial", mpIndex: 70, hint: "Left brow tail" },
  { id: "eb_lr", name: "R. Brow Tail", group: "Cranial", mpIndex: 300, hint: "Right brow tail" },

  // Orbital
  { id: "ex_l", name: "Exocanthion L", group: "Orbital", mpIndex: 33, hint: "Left eye outer corner" },
  { id: "ex_r", name: "Exocanthion R", group: "Orbital", mpIndex: 263, hint: "Right eye outer corner" },
  { id: "en_l", name: "Endocanthion L", group: "Orbital", mpIndex: 133, hint: "Left eye inner corner" },
  { id: "en_r", name: "Endocanthion R", group: "Orbital", mpIndex: 362, hint: "Right eye inner corner" },
  { id: "pu_l", name: "Pupil L", group: "Orbital", mpIndex: 468, hint: "Left pupil center" },
  { id: "pu_r", name: "Pupil R", group: "Orbital", mpIndex: 473, hint: "Right pupil center" },
  { id: "ps_l", name: "Palpebrale Sup. L", group: "Orbital", mpIndex: 159, hint: "Left upper lid" },
  { id: "ps_r", name: "Palpebrale Sup. R", group: "Orbital", mpIndex: 386, hint: "Right upper lid" },
  { id: "pi_l", name: "Palpebrale Inf. L", group: "Orbital", mpIndex: 145, hint: "Left lower lid" },
  { id: "pi_r", name: "Palpebrale Inf. R", group: "Orbital", mpIndex: 374, hint: "Right lower lid" },

  // Nasal
  { id: "prn", name: "Pronasale", group: "Nasal", mpIndex: 4, hint: "Nose tip" },
  { id: "sn", name: "Subnasale", group: "Nasal", mpIndex: 2, hint: "Columella base" },
  { id: "c", name: "Columella", group: "Nasal", mpIndex: 1, hint: "Nasal spine" },
  { id: "al_l", name: "Alare L", group: "Nasal", mpIndex: 129, hint: "Left nostril wing" },
  { id: "al_r", name: "Alare R", group: "Nasal", mpIndex: 358, hint: "Right nostril wing" },
  { id: "ac_l", name: "Alar Crease L", group: "Nasal", mpIndex: 98, hint: "Left alar crease" },
  { id: "ac_r", name: "Alar Crease R", group: "Nasal", mpIndex: 327, hint: "Right alar crease" },
  { id: "nt_l", name: "Nostril L", group: "Nasal", mpIndex: 49, hint: "Left nostril point" },
  { id: "nt_r", name: "Nostril R", group: "Nasal", mpIndex: 279, hint: "Right nostril point" },

  // Oral / Perioral
  { id: "ch_l", name: "Cheilion L", group: "Oral", mpIndex: 61, hint: "Left mouth corner" },
  { id: "ch_r", name: "Cheilion R", group: "Oral", mpIndex: 291, hint: "Right mouth corner" },
  { id: "ls", name: "Labiale Superius", group: "Oral", mpIndex: 0, hint: "Upper lip border" },
  { id: "li", name: "Labiale Inferius", group: "Oral", mpIndex: 17, hint: "Lower lip border" },
  { id: "sto", name: "Stomion", group: "Oral", mpIndex: 13, hint: "Upper lip center" },
  { id: "sto_l", name: "Stomion Lower", group: "Oral", mpIndex: 14, hint: "Lower lip center" },
  { id: "cph_l", name: "Crista Philtri L", group: "Oral", mpIndex: 81, hint: "Left philtrum ridge" },
  { id: "cph_r", name: "Crista Philtri R", group: "Oral", mpIndex: 311, hint: "Right philtrum ridge" },
  { id: "cphi", name: "Philtrum Top", group: "Oral", mpIndex: 0, hint: "Philtrum peak" },
  { id: "lsm", name: "Upper Lip Mid", group: "Oral", mpIndex: 13, hint: "Vermilion top" },

  // Zygomatic / Midface
  { id: "zy_l", name: "Zygion L", group: "Zygomatic", mpIndex: 234, hint: "Left cheekbone" },
  { id: "zy_r", name: "Zygion R", group: "Zygomatic", mpIndex: 454, hint: "Right cheekbone" },
  { id: "ck_l", name: "Cheek L", group: "Zygomatic", mpIndex: 116, hint: "Left malar" },
  { id: "ck_r", name: "Cheek R", group: "Zygomatic", mpIndex: 345, hint: "Right malar" },

  // Mandibular
  { id: "pg", name: "Pogonion", group: "Mandibular", mpIndex: 18, hint: "Chin prominence" },
  { id: "me", name: "Menton", group: "Mandibular", mpIndex: 152, hint: "Chin bottom" },
  { id: "gn_l", name: "Gonion L", group: "Mandibular", mpIndex: 172, hint: "Left jaw angle" },
  { id: "gn_r", name: "Gonion R", group: "Mandibular", mpIndex: 397, hint: "Right jaw angle" },
  { id: "go_l", name: "Jaw L", group: "Mandibular", mpIndex: 136, hint: "Left mandible body" },
  { id: "go_r", name: "Jaw R", group: "Mandibular", mpIndex: 365, hint: "Right mandible body" },
  { id: "sl", name: "Sublabiale", group: "Mandibular", mpIndex: 17, hint: "Chin-lip sulcus" },
  { id: "csl", name: "Chin Sulcus", group: "Mandibular", mpIndex: 175, hint: "Mentolabial sulcus" },
];

type Metric = {
  id: string;
  name: string;
  category: string;
  ideal: number;
  tolerance: number;
  unit: string;
  description: string;
  compute: (p: Record<string, Point>) => number | null;
  draw: (ctx: CanvasRenderingContext2D, p: Record<string, Point>, w: number, h: number) => void;
  nicer?: (v: number) => string;
};

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

const METRICS: Metric[] = [
  {
    id: "upper_third",
    name: "Upper Third",
    category: "Vertical Thirds",
    ideal: 33.33,
    tolerance: 7.5,
    unit: "%",
    description: "Trichion → Glabella / total facial height",
    compute: (p) => {
      if (!p.tr || !p.g || !p.sn || !p.me) return null;
      const upper = dist(p.tr, p.g);
      const total = dist(p.tr, p.me);
      return (upper / total) * 100;
    },
    draw: (ctx, p) => {
      if (!p.tr || !p.g) return;
      ctx.strokeStyle = "#ff5569";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.tr.x - 44, p.tr.y);
      ctx.lineTo(p.tr.x + 44, p.tr.y);
      ctx.moveTo(p.g.x - 44, p.g.y);
      ctx.lineTo(p.g.x + 44, p.g.y);
      ctx.stroke();
      ctx.strokeStyle = "#06c1e4";
      ctx.beginPath();
      ctx.moveTo(p.tr.x, p.tr.y);
      ctx.lineTo(p.g.x, p.g.y);
      ctx.stroke();
    },
  },
  {
    id: "middle_third",
    name: "Middle Third",
    category: "Vertical Thirds",
    ideal: 33.33,
    tolerance: 6.8,
    unit: "%",
    description: "Glabella → Subnasale",
    compute: (p) => {
      if (!p.g || !p.sn || !p.tr || !p.me) return null;
      const midF = dist(p.g, p.sn);
      const total = dist(p.tr, p.me);
      return (midF / total) * 100;
    },
    draw: (ctx, p) => {
      if (!p.g || !p.sn) return;
      ctx.strokeStyle = "#ff9a3c";
      ctx.lineWidth = 2;
      for (const pt of [p.g, p.sn]) {
        ctx.beginPath();
        ctx.moveTo(pt.x - 44, pt.y);
        ctx.lineTo(pt.x + 44, pt.y);
        ctx.stroke();
      }
      ctx.strokeStyle = "#06c1e4";
      ctx.beginPath();
      ctx.moveTo(p.g.x, p.g.y);
      ctx.lineTo(p.sn.x, p.sn.y);
      ctx.stroke();
    },
  },
  {
    id: "lower_third",
    name: "Lower Third",
    category: "Vertical Thirds",
    ideal: 33.33,
    tolerance: 7.0,
    unit: "%",
    description: "Subnasale → Menton",
    compute: (p) => {
      if (!p.sn || !p.me || !p.tr) return null;
      const lower = dist(p.sn, p.me);
      const total = dist(p.tr, p.me);
      return (lower / total) * 100;
    },
    draw: (ctx, p) => {
      if (!p.sn || !p.me) return;
      ctx.strokeStyle = "#ff4d80";
      ctx.lineWidth = 2;
      for (const pt of [p.sn, p.me]) {
        ctx.beginPath();
        ctx.moveTo(pt.x - 50, pt.y);
        ctx.lineTo(pt.x + 50, pt.y);
        ctx.stroke();
      }
      // double arrow
      ctx.strokeStyle = "#06c1e4";
      ctx.beginPath();
      ctx.moveTo(p.sn.x, p.sn.y);
      ctx.lineTo(p.me.x, p.me.y);
      ctx.stroke();
      [[p.sn, -8], [p.me, 8]].forEach(([pt, dir]: any) => {
        ctx.beginPath();
        ctx.moveTo(pt.x - 7, pt.y + dir);
        ctx.lineTo(pt.x, pt.y);
        ctx.lineTo(pt.x + 7, pt.y + dir);
        ctx.stroke();
      });
    },
  },
  {
    id: "facial_index",
    name: "Facial Index",
    category: "Proportions",
    ideal: 88.5,
    tolerance: 16,
    unit: "",
    description: "Face height / Bizygomatic width ×100",
    compute: (p) => {
      if(!p.tr || !p.me || !p.zy_l || !p.zy_r) return null;
      const h = dist(p.tr, p.me);
      const w = dist(p.zy_l, p.zy_r);
      return (h / w) * 100;
    },
    draw: (ctx, p) => {
      if (!p.zy_l || !p.zy_r || !p.tr || !p.me) return;
      ctx.strokeStyle = "rgba(6,193,228,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.zy_l.x, p.zy_l.y);
      ctx.lineTo(p.zy_r.x, p.zy_r.y);
      ctx.stroke();
      const cx = (p.zy_l.x + p.zy_r.x) / 2;
      ctx.beginPath();
      ctx.moveTo(cx, p.tr.y);
      ctx.lineTo(cx, p.me.y);
      ctx.stroke();
    },
  },
  {
    id: "eye_separation",
    name: "Eye Separation Ratio",
    category: "Orbital",
    ideal: 1.0,
    tolerance: 0.23,
    unit: "",
    description: "Intercanthal distance / Palpebral fissure width",
    compute: (p) => {
      if (!p.en_l || !p.en_r || !p.ex_l || !p.en_l) return null;
      const inter = dist(p.en_l, p.en_r);
      const eyeW = dist(p.ex_l, p.en_l);
      return inter / eyeW;
    },
    draw: (ctx, p) => {
      if (!p.ex_l || !p.en_l || !p.en_r || !p.ex_r) return;
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = "#06c1e4";
      ctx.beginPath();
      ctx.moveTo(p.ex_l.x, p.ex_l.y);
      ctx.lineTo(p.en_l.x, p.en_l.y);
      ctx.moveTo(p.en_r.x, p.en_r.y);
      ctx.lineTo(p.ex_r.x, p.ex_r.y);
      ctx.stroke();
      ctx.strokeStyle = "#ff9a60";
      ctx.beginPath();
      ctx.moveTo(p.en_l.x, p.en_l.y);
      ctx.lineTo(p.en_r.x, p.en_r.y);
      ctx.stroke();
    },
  },
  {
    id: "interpupillary_ratio",
    name: "IPD / Bizygomatic",
    category: "Orbital",
    ideal: 0.464,
    tolerance: 0.065,
    unit: "",
    description: "Interpupillary distance relative to face width",
    compute: (p) => {
      if (!p.pu_l || !p.pu_r || !p.zy_l || !p.zy_r) return null;
      return dist(p.pu_l, p.pu_r) / dist(p.zy_l, p.zy_r);
    },
    draw: (ctx, p) => {
      if (!p.pu_l || !p.pu_r) return;
      ctx.fillStyle = "#06c1e4";
      [p.pu_l, p.pu_r].forEach(pt => {
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2); ctx.fill();
      });
      ctx.strokeStyle = "#06c1e4";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(p.pu_l.x, p.pu_l.y);
      ctx.lineTo(p.pu_r.x, p.pu_r.y);
      ctx.stroke();
    },
  },
  {
    id: "canthal_tilt",
    name: "Canthal Tilt",
    category: "Orbital",
    ideal: 5.8,
    tolerance: 5.8,
    unit: "°",
    description: "Lateral canthus vs medial canthus inclination",
    compute: (p) => {
      if (!p.en_l || !p.ex_l || !p.en_r || !p.ex_r) return null;
      const angleL = Math.atan2(p.ex_l.y - p.en_l.y, p.ex_l.x - p.en_l.x) * 180 / Math.PI;
      const angleR = Math.atan2(p.en_r.y - p.ex_r.y, p.ex_r.x - p.en_r.x) * 180 / Math.PI;
      return -(angleL + angleR) / 2;
    },
    draw: (ctx, p) => {
      if (!p.en_l || !p.ex_l || !p.en_r || !p.ex_r) return;
      ctx.strokeStyle = "#06c1e4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.en_l.x, p.en_l.y); ctx.lineTo(p.ex_l.x, p.ex_l.y);
      ctx.moveTo(p.en_r.x, p.en_r.y); ctx.lineTo(p.ex_r.x, p.ex_r.y);
      ctx.stroke();
    },
  },
  {
    id: "nasal_index",
    name: "Nasal Index",
    category: "Nasal",
    ideal: 0.69,
    tolerance: 0.20,
    unit: "",
    description: "Alare width / Nose height (Nasion–Subnasale)",
    compute: (p) => {
      if (!p.al_l || !p.al_r || !p.n || !p.sn) return null;
      return dist(p.al_l, p.al_r) / dist(p.n, p.sn);
    },
    draw: (ctx, p) => {
      if (!p.al_l || !p.al_r || !p.n || !p.sn) return;
      ctx.strokeStyle = "#06c1e4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.al_l.x, p.al_l.y); ctx.lineTo(p.al_r.x, p.al_r.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.n.x, p.n.y); ctx.lineTo(p.sn.x, p.sn.y);
      ctx.stroke();
    },
  },
  {
    id: "mouth_width_ic",
    name: "Mouth / Intercanthal",
    category: "Oral",
    ideal: 1.618,
    tolerance: 0.42,
    unit: "",
    description: "Cheilion width / Intercanthal distance",
    compute: (p) => {
      if (!p.ch_l || !p.ch_r || !p.en_l || !p.en_r) return null;
      return dist(p.ch_l, p.ch_r) / dist(p.en_l, p.en_r);
    },
    draw: (ctx, p) => {
      if (!p.ch_l || !p.ch_r) return;
      ctx.strokeStyle = "#06c1e4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.ch_l.x, p.ch_l.y);
      ctx.lineTo(p.ch_r.x, p.ch_r.y);
      ctx.stroke();
      [p.ch_l, p.ch_r].forEach(pt => {
        ctx.fillStyle = "#06c1e4";
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 3, 0, Math.PI*2); ctx.fill();
      });
    },
  },
  {
    id: "philtrum_chin",
    name: "Philtrum : Chin",
    category: "Oral",
    ideal: 1.0,
    tolerance: 0.48,
    unit: "",
    description: "Subnasale–Stomion / Stomion–Menton (normalized to 1:2 ideal)",
    compute: (p) => {
      if (!p.sn || !p.sto || !p.me) return null;
      const upper = dist(p.sn, p.sto);
      const lower = dist(p.sto, p.me);
      const ratio = lower / upper;
      return ratio / 2.0;
    },
    draw: (ctx, p) => {
      if (!p.sn || !p.sto || !p.me) return;
      ctx.strokeStyle = "#f59e33";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(p.sn.x, p.sn.y);
      ctx.lineTo(p.sto.x, p.sto.y);
      ctx.stroke();
      ctx.strokeStyle = "#06c1e4";
      ctx.beginPath();
      ctx.moveTo(p.sto.x, p.sto.y);
      ctx.lineTo(p.me.x, p.me.y);
      ctx.stroke();
    },
  },
  {
    id: "jaw_zygo",
    name: "Jaw / Zygoma",
    category: "Mandibular",
    ideal: 0.78,
    tolerance: 0.13,
    unit: "",
    description: "Bigonial width / Bizygomatic width",
    compute: (p) => {
      if (!p.gn_l || !p.gn_r || !p.zy_l || !p.zy_r) return null;
      return dist(p.gn_l, p.gn_r) / dist(p.zy_l, p.zy_r);
    },
    draw: (ctx, p) => {
      if (!p.gn_l || !p.gn_r || !p.zy_l || !p.zy_r) return;
      ctx.strokeStyle = "rgba(6,193,228,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.zy_l.x, p.zy_l.y); ctx.lineTo(p.zy_r.x, p.zy_r.y); ctx.stroke();
      ctx.strokeStyle = "#f49c45";
      ctx.beginPath(); ctx.moveTo(p.gn_l.x, p.gn_l.y); ctx.lineTo(p.gn_r.x, p.gn_r.y); ctx.stroke();
    },
  },
  {
    id: "midface_ratio",
    name: "Midface Ratio",
    category: "Proportions",
    ideal: 1.0,
    tolerance: 0.28,
    unit: "",
    description: "IPD / Eye-Pupil to Lip vertical",
    compute: (p) => {
      if (!p.pu_l || !p.pu_r || !p.sto) return null;
      const ipd = dist(p.pu_l, p.pu_r);
      const eyeMid = mid(p.pu_l, p.pu_r);
      const v = Math.abs(p.sto.y - eyeMid.y);
      return ipd / v;
    },
    draw: (ctx, p) => {
      if (!p.pu_l || !p.pu_r || !p.sto) return;
      const eyeMid = mid(p.pu_l, p.pu_r);
      ctx.strokeStyle = "#06c1e4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.pu_l.x, p.pu_l.y); ctx.lineTo(p.pu_r.x, p.pu_r.y);
      ctx.moveTo(eyeMid.x, eyeMid.y); ctx.lineTo(p.sto.x, p.sto.y);
      ctx.stroke();
    },
  },
  {
    id: "nasolabial",
    name: "Nasolabial Angle",
    category: "Nasal",
    ideal: 100,
    tolerance: 20,
    unit: "°",
    description: "Columella–Subnasale–Labiale superius",
    compute: (p) => {
      if (!p.c || !p.sn || !p.ls) return null;
      const a = { x: p.c.x - p.sn.x, y: p.c.y - p.sn.y };
      const b = { x: p.ls.x - p.sn.x, y: p.ls.y - p.sn.y };
      const dot = a.x * b.x + a.y * b.y;
      const ma = Math.hypot(a.x, a.y);
      const mb = Math.hypot(b.x, b.y);
      const ang = Math.acos(Math.max(-1, Math.min(1, dot / (ma * mb)))) * 180 / Math.PI;
      return ang;
    },
    draw: (ctx, p) => {
      if (!p.c || !p.sn || !p.ls) return;
      ctx.strokeStyle = "#06c1e4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.c.x, p.c.y);
      ctx.lineTo(p.sn.x, p.sn.y);
      ctx.lineTo(p.ls.x, p.ls.y);
      ctx.stroke();
    },
  },
  {
    id: "es_ratio",
    name: "EME Angle",
    category: "Proportions",
    ideal: 50.4,
    tolerance: 7.4,
    unit: "°",
    description: "Es–Nasion–Es (midface angular width)",
    compute: (p) => {
      if (!p.ex_l || !p.ex_r || !p.n) return null;
      const a = { x: p.ex_l.x - p.n.x, y: p.ex_l.y - p.n.y };
      const b = { x: p.ex_r.x - p.n.x, y: p.ex_r.y - p.n.y };
      const dot = a.x * b.x + a.y * b.y;
      const ma = Math.hypot(a.x, a.y);
      const mb = Math.hypot(b.x, b.y);
      return Math.acos(Math.max(-1, Math.min(1, dot / (ma * mb)))) * 180 / Math.PI;
    },
    draw: (ctx, p) => {
      if (!p.ex_l || !p.ex_r || !p.n) return;
      ctx.strokeStyle = "#06c1e4";
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(p.ex_l.x, p.ex_l.y);
      ctx.lineTo(p.n.x, p.n.y);
      ctx.lineTo(p.ex_r.x, p.ex_r.y);
      ctx.stroke();
    },
  },
  {
    id: "vermillion_ratio",
    name: "Lip Ratio",
    category: "Oral",
    ideal: 1.618,
    tolerance: 0.78,
    unit: "",
    description: "Lower lip thickness / Upper lip thickness (golden)",
    compute: (p) => {
      if (!p.ls || !p.sto || !p.sto_l || !p.li) return null;
      const upper = dist(p.ls, p.sto);
      const lower = dist(p.sto_l, p.li);
      return lower / Math.max(upper, 0.001);
    },
    draw: (ctx, p) => {
      if (!p.ls || !p.li || !p.sto) return;
      ctx.strokeStyle = "#06c1e4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.ls.x, p.ls.y);
      ctx.lineTo(p.li.x, p.li.y);
      ctx.stroke();
    },
  },
];

function scoreFrom(m: Metric, value: number) {
  const deviation = Math.abs(value - m.ideal) / m.tolerance;
  const s = Math.max(0, 1 - deviation);
  return Math.round(s * 1000) / 100; // 0-10 scale with 2 decimals, e.g. 9.84
}

export default function App() {
  const [stage, setStage] = useState<"upload" | "calibrate" | "report">("upload");
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [points, setPoints] = useState<Record<string, CalibratedPoint>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [faceLandmarker, setFaceLandmarker] = useState<any>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [autoDetectMsg, setAutoDetectMsg] = useState("");

  // Load MediaPipe
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingModel(true);
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const { FaceLandmarker, FilesetResolver } = vision;
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
        );
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "IMAGE",
          numFaces: 1,
          outputFacialTransformationMatrixes: false,
        });
        if (!cancelled) setFaceLandmarker(landmarker);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingModel(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleImageFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      setImgSrc(url);
      setPoints({});
      setCurrentIdx(0);
      setStage("calibrate");
      // run autodetection soon
      setTimeout(() => runAutoDetect(url, img.naturalWidth, img.naturalHeight), 90);
    };
    img.src = url;
  }, [faceLandmarker]);

  const runAutoDetect = useCallback(async (url: string, w: number, h: number) => {
    if (!faceLandmarker) {
      setAutoDetectMsg("MediaPipe warming up — place points manually.");
      const init: Record<string, CalibratedPoint> = {};
      LANDMARKS.forEach(ld => {
        init[ld.id] = { x: w * 0.5, y: h * 0.5, confirmed: false };
      });
      setPoints(init);
      return;
    }
    try {
      const imgEl = new Image();
      imgEl.crossOrigin = "anonymous";
      imgEl.src = url;
      await new Promise(res => { imgEl.onload = res; });
      const result = faceLandmarker.detect(imgEl);
      const lm = result?.faceLandmarks?.[0];
      const mapped: Record<string, CalibratedPoint> = {};
      if (lm) {
        LANDMARKS.forEach(def => {
          const mp = lm[def.mpIndex];
          if (mp) {
            mapped[def.id] = {
              x: mp.x * w,
              y: mp.y * h,
              confirmed: false,
            };
          } else {
            mapped[def.id] = { x: w / 2, y: h / 2, confirmed: false };
          }
        });
        setAutoDetectMsg("FaceMesh found 468 points → distilled to 50 anthropometric landmarks.");
      } else {
        LANDMARKS.forEach(def => {
          mapped[def.id] = { x: w / 2, y: h / 2, confirmed: false };
        });
        setAutoDetectMsg("No face detected. Manual calibration needed.");
      }
      setPoints(mapped);
    } catch (e) {
      console.error(e);
    }
  }, [faceLandmarker]);

  const confirmedCount = useMemo(() => Object.values(points).filter(p => p.confirmed).length, [points]);
  const allConfirmed = confirmedCount >= LANDMARKS.length && LANDMARKS.length > 0;

  const pointsForMetrics: Record<string, Point> = useMemo(() => {
    const o: Record<string, Point> = {};
    for (const [k, v] of Object.entries(points)) o[k] = { x: v.x, y: v.y };
    return o;
  }, [points]);

  const metricResults = useMemo(() => {
    return METRICS.map(m => {
      const v = m.compute(pointsForMetrics);
      if (v == null || isNaN(v)) return { metric: m, value: null as number | null, score: 0 };
      return { metric: m, value: v, score: scoreFrom(m, v) };
    });
  }, [pointsForMetrics]);

  const overallScore = useMemo(() => {
    const vals = metricResults.filter(r => r.value !== null).map(r => r.score);
    if (!vals.length) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [metricResults]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-zinc-900">
      <header className="w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-9">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[10px] bg-zinc-900 text-white text-[13px] font-semibold flex items-center justify-center">AF</div>
              <div className="text-[16.5px] tracking-tight font-[600]">AnthroFace</div>
              <span className="text-[11px] text-zinc-500 mt-[2px] ml-1">v2.1</span>
            </div>
            <nav className="hidden md:flex items-center gap-7 text-[13.5px] text-zinc-500">
              <span className="text-zinc-900 font-medium">Calibrate</span>
              <span>Analysis</span>
              <span>Exports</span>
              <span>Help</span>
            </nav>
          </div>
          <div className="flex items-center gap-5 text-[12.5px]">
            <span className="hidden sm:inline text-zinc-500">MediaPipe FaceMesh 468 → 50</span>
            <button className="px-3 py-1.5 rounded-full border border-zinc-300 text-zinc-700 hover:bg-zinc-50">Sign in</button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 md:px-10 py-8 md:py-12">
        <AnimatePresence mode="wait">
          {stage === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.32 }}
            >
              <div className="max-w-3xl">
                <div className="text-[13px] text-zinc-500 mb-2">Professional Facial Anthropometry</div>
                <h1 className="text-[44px] md:text-[58px] leading-[0.98] tracking-[-0.028em] font-[620] text-zinc-900">
                  Calibrate 50 landmarks.<br /> Get a clinical-grade<br /> proportion report.
                </h1>
                <p className="mt-5 text-[16.4px] text-zinc-600 leading-relaxed max-w-xl">
                  MediaPipe Face Landmarker auto-detects 468 blendshape points. You refine 50 ISO anthropometric points in the precision Sniper UI, then export a hover-interactive ratio dashboard.
                </p>
              </div>

              <div className="mt-10 bg-white rounded-[24px] shadow-[0_18px_80px_rgba(20,20,28,0.09)] ring-1 ring-zinc-200/90 p-7 md:p-12">
                <UploadCard
                  onFile={handleImageFile}
                  loadingModel={loadingModel}
                  setImgSrc={(src,w,h) => {
                    setImgSrc(src);
                    setImgSize({w,h});
                    setStage("calibrate");
                    runAutoDetect(src,w,h);
                  }}
                />
                <div className="flex flex-wrap items-center gap-6 text-[12.5px] text-zinc-500 mt-7">
                  <span>✔︎ 100% local — No upload</span>
                  <span>✔︎ 468 → 50 distilled</span>
                  <span>✔︎ Golden ratio & neoclassical canons</span>
                  <span>✔︎ PNG / CSV export</span>
                </div>
              </div>
              <div className="mt-8 grid md:grid-cols-3 gap-5 text-[13.4px] text-zinc-600">
                {[
                  ["Sniper Calibrator", "Center-locked crosshair, 4× magnifier, sub-pixel nudging."],
                  ["Hover-Draw Report", "Metric hover instantly draws vectors on the calibrated photo."],
                  ["19 Clinical Ratios", "Vertical thirds, canthal tilt, nasolabial, IPD, EME, lip golden ratio."],
                ].map(([t,d]) => (
                  <div key={t} className="bg-white/70 rounded-2xl border border-zinc-200 px-5 py-4">
                    <div className="font-[600] text-zinc-800">{t}</div>
                    <div className="mt-1 text-zinc-500">{d}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {stage === "calibrate" && imgSrc && (
            <motion.div
              key="calibrate"
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
                total={LANDMARKS.length}
                onFinish={() => setStage("report")}
                allConfirmed={allConfirmed}
                autoDetectMsg={autoDetectMsg}
              />
              <SniperCalibrator
                imgSrc={imgSrc}
                imgW={imgSize.w}
                imgH={imgSize.h}
                landmark={LANDMARKS[currentIdx]}
                point={points[LANDMARKS[currentIdx]?.id]}
                onConfirm={(pt) => {
                  const id = LANDMARKS[currentIdx].id;
                  setPoints(prev => ({ ...prev, [id]: { ...pt, confirmed: true } }));
                  if (currentIdx < LANDMARKS.length - 1) {
                    setCurrentIdx(i => i + 1);
                  } else {
                    setStage("report");
                  }
                }}
                goPrev={() => setCurrentIdx(i => Math.max(0, i - 1))}
                goNext={() => setCurrentIdx(i => Math.min(LANDMARKS.length - 1, i + 1))}
                progressLabel={`${currentIdx + 1} / ${LANDMARKS.length}`}
                isConfirmed={points[LANDMARKS[currentIdx]?.id]?.confirmed ?? false}
                onSetPoint={(pt) => {
                  const id = LANDMARKS[currentIdx]?.id;
                  if (!id) return;
                  setPoints(prev => ({ ...prev, [id]: { ...pt, confirmed: prev[id]?.confirmed ?? false } }));
                }}
              />
            </motion.div>
          )}

          {stage === "report" && imgSrc && (
            <motion.div
              key="report"
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
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-[1200px] mx-auto px-6 md:px-10 py-12 text-[12.5px] text-zinc-500">
        AnthroFace • For educational / clinical visualization only • FaceMesh 468-pt model © Google MediaPipe Apache-2.0
      </footer>
    </div>
  );
}

function UploadCard({ onFile, loadingModel, setImgSrc } : {
  onFile: (f: File) => void;
  loadingModel: boolean;
  setImgSrc: (src:string,w:number,h:number)=>void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const useDemo = () => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const src = canvas.toDataURL("image/jpeg", 0.92);
      setImgSrc(src, img.naturalWidth, img.naturalHeight);
    };
    img.src = "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1200&auto=format&fit=crop";
  };

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
        className={`rounded-[18px] border-[1.8px] border-dashed transition-all px-6 py-14 text-center ${drag ? "border-cyan-400 bg-cyan-50/60" : "border-zinc-300 bg-[#fbfbfc]"}`}
      >
        <div className="mx-auto w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 mb-4">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M12 16V4M8 8l4-4 4 4"/><rect x="3" y="14" width="18" height="7" rx="2"/></svg>
        </div>
        <div className="text-[17.5px] font-[580] text-zinc-800">Drop a frontal portrait, or browse</div>
        <div className="text-[13.4px] text-zinc-500 mt-1">JPG / PNG • 800px+ • neutral expression • good lighting</div>
        <div className="mt-5 flex items-center justify-center gap-3">
          <button onClick={() => inputRef.current?.click()} className="px-4 py-2 rounded-full bg-zinc-900 text-white text-[13.4px] font-medium hover:bg-zinc-800">Choose photo</button>
          <button onClick={useDemo} className="px-4 py-2 rounded-full border border-zinc-300 text-zinc-700 text-[13.4px] hover:bg-zinc-50">Use demo face</button>
        </div>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        <div className="mt-3 text-[11.7px] text-zinc-500">{loadingModel ? "Loading Face Landmarker…" : "MediaPipe ready • runs in-browser"}</div>
      </div>
    </div>
  );
}

function CalibrationSidebar({ points, currentIdx, setCurrentIdx, confirmedCount, total, onFinish, allConfirmed, autoDetectMsg }: any) {
  const groups = useMemo(() => {
    const m = new Map<string, typeof LANDMARKS>();
    LANDMARKS.forEach((l, i) => {
      if (!m.has(l.group)) m.set(l.group, []);
      m.get(l.group)!.push({ ...l, _i: i } as any);
    });
    return Array.from(m.entries());
  }, []);

  return (
    <div className="lg:sticky lg:top-[82px]">
      <div className="bg-white rounded-[22px] shadow-[0_12px_50px_rgba(23,23,27,0.08)] ring-1 ring-zinc-200">
        <div className="px-5 pt-5 pb-4 border-b border-zinc-100">
          <div className="text-[12.2px] text-zinc-500">Calibration</div>
          <div className="text-[20px] font-[650] tracking-tight mt-1">Refine landmarks</div>
          <div className="mt-3">
            <div className="flex justify-between text-[11.6px] text-zinc-500 mb-1">
              <span>{confirmedCount} / {total} confirmed</span>
              <span>{Math.round(confirmedCount/total*100)}%</span>
            </div>
            <div className="h-[7px] bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full bg-zinc-900 rounded-full transition-all" style={{ width: `${confirmedCount/total*100}%` }} />
            </div>
          </div>
          {autoDetectMsg && <div className="mt-3 text-[11.8px] text-zinc-600 bg-zinc-50 rounded-xl px-3 py-2 border border-zinc-100">{autoDetectMsg}</div>}
        </div>

        <div className="px-3 py-3 max-h-[560px] overflow-auto">
          {groups.map(([group, items]: any) => (
            <div key={group} className="mb-3">
              <div className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">{group}</div>
              <div className="space-y-1">
                {items.map((l: any) => {
                  const p = points[l.id];
                  const active = l._i === currentIdx;
                  return (
                    <button key={l.id}
                      onClick={() => setCurrentIdx(l._i)}
                      className={`w-full text-left px-3 py-[9px] rounded-xl text-[13.4px] transition flex items-center justify-between ${
                        active ? "bg-zinc-900 text-white" : "hover:bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      <span className="truncate">{l._i + 1}. {l.name}</span>
                      <span className={`text-[11px] ${active ? "text-zinc-300" : "text-zinc-400"}`}>{p?.confirmed ? "✓" : "○"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-zinc-100 flex items-center justify-between">
          <div className="text-[11.8px] text-zinc-500">Nudge: arrow keys • Zoom: scroll</div>
          <button onClick={onFinish} disabled={!allConfirmed && confirmedCount < 14}
            className="px-3.5 py-2 rounded-full text-[13px] font-medium bg-zinc-900 text-white disabled:opacity-35 disabled:cursor-not-allowed hover:bg-zinc-800">
            {allConfirmed ? "View Report →" : "Skip to report"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SniperCalibrator({ imgSrc, imgW, imgH, landmark, point, onConfirm, goPrev, goNext, progressLabel, isConfirmed, onSetPoint }: {
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
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(2.35);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // When landmark changes, fly to it
  useEffect(() => {
    if (!point) return;
    // center the landmark under the crosshair
    const targetPanX = -(point.x - imgW / 2) * zoom;
    const targetPanY = -(point.y - imgH / 2) * zoom;
    // smooth snap
    setPan({ x: targetPanX, y: targetPanY });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landmark?.id]);

  // Keep pan updated when zoom changes: keep crosshair world stable
  const setZoomKeepCenter = (nz: number) => {
    const ratio = nz / zoom;
    setPan(p => ({ x: p.x * ratio, y: p.y * ratio }));
    setZoom(nz);
  };

  const crossWorld = useMemo(() => {
    // image coordinate under crosshair
    return {
      x: imgW / 2 + (-pan.x) / zoom,
      y: imgH / 2 + (-pan.y) / zoom,
    };
  }, [pan, zoom, imgW, imgH]);

  // update the live point as user pans (for magnifier accuracy)
  useEffect(() => {
    if (!point) return;
    onSetPoint(crossWorld);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crossWorld.x, crossWorld.y]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.12 : 0.89;
    const nz = Math.min(6.5, Math.max(0.7, zoom * factor));
    setZoomKeepCenter(nz);
  };

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

  // keyboard nudging - move the image under the crosshair for sub-pixel precision
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 0.45 : 1.65;
      let dx = 0, dy = 0;
      if (e.key === "ArrowLeft") { dx = -step; e.preventDefault(); }
      if (e.key === "ArrowRight") { dx = step; e.preventDefault(); }
      if (e.key === "ArrowUp") { dy = -step; e.preventDefault(); }
      if (e.key === "ArrowDown") { dy = step; e.preventDefault(); }
      if (dx !== 0 || dy !== 0) {
        // move image opposite so the point under crosshair moves with arrow direction
        setPan(p => ({ x: p.x - dx * zoom, y: p.y - dy * zoom }));
      }
      if (e.key === "Enter") { if (point) onConfirm({ x: crossWorld.x, y: crossWorld.y }); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [zoom, onConfirm, point, crossWorld]);

  // Magnifier canvas
  const magRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const canvas = magRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete) return;
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
    ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size);
    // crosshair
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size / 2, 8); ctx.lineTo(size / 2, size - 8);
    ctx.moveTo(8, size / 2); ctx.lineTo(size - 8, size / 2);
    ctx.stroke();
    ctx.strokeStyle = "#06c1e4";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 3.2, 0, Math.PI * 2);
    ctx.stroke();
  }, [crossWorld, imgW, imgH, zoom, imgSrc]);

  if (!landmark) return null;

  return (
    <div className="bg-white rounded-[24px] shadow-[0_14px_60px_rgba(15,15,20,0.10)] ring-1 ring-zinc-200 overflow-hidden">
      <div className="px-5 sm:px-7 pt-5 pb-4 border-b border-zinc-100 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11.7px] text-zinc-500">Align to crosshair • {progressLabel}</div>
          <div className="text-[24px] font-[650] tracking-tight">{landmark.name}</div>
          <div className="text-[13.3px] text-zinc-500">{landmark.hint}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="px-3 py-1.5 rounded-full border border-zinc-300 text-[12.8px] text-zinc-700 hover:bg-zinc-50">Prev</button>
          <button onClick={goNext} className="px-3 py-1.5 rounded-full border border-zinc-300 text-[12.8px] text-zinc-700 hover:bg-zinc-50">Next</button>
          <button
            onClick={() => onConfirm({ x: crossWorld.x, y: crossWorld.y })}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium text-white ${isConfirmed ? "bg-emerald-600 hover:bg-emerald-600/90" : "bg-zinc-900 hover:bg-zinc-800"}`}
          >
            {isConfirmed ? "Confirmed ✓" : "Confirm / Next"}
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={viewportRef}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="relative w-full h-[600px] md:h-[660px] bg-[#eef0f3] overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
        >
          {/* The image, panned */}
          <img
            ref={imgRef}
            src={imgSrc}
            alt=""
            draggable={false}
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
            {/* Outer rings */}
            <div className="w-[66px] h-[66px] rounded-full border border-zinc-900/16"></div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[32px] h-[32px] rounded-full border border-zinc-900/24"></div>
            {/* cross lines */}
            <div className="absolute left-1/2 top-1/2 w-[150px] h-px bg-zinc-900/55 -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute left-1/2 top-1/2 w-px h-[150px] bg-zinc-900/55 -translate-x-1/2 -translate-y-1/2"></div>
            {/* center dot */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full bg-[#06c1e4] ring-4 ring-[#06c1e4]/20"></div>
          </div>

          {/* Zoom / magnifier */}
          <div className="absolute right-4 top-4 bg-white/95 rounded-[18px] shadow-xl ring-1 ring-zinc-200 p-[11px]">
            <div className="text-[10.7px] text-zinc-500 mb-1.5 font-mono">4× MAGNIFIER • {zoom.toFixed(2)}×</div>
            <canvas ref={magRef} className="rounded-[11px] bg-zinc-200 block w-[168px] h-[168px]" />
            <div className="mt-1.5 text-[10.8px] text-zinc-500 font-mono">x:{crossWorld.x.toFixed(1)} y:{crossWorld.y.toFixed(1)}</div>
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

// --- Report View ---

function ReportView({ imgSrc, imgW, imgH, points, metricResults, overallScore, onBack, onReupload }: any) {
  const [hoverMetric, setHoverMetric] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgElRef = useRef<HTMLImageElement>(null);
  const [imgDisplay, setImgDisplay] = useState({ w: 520, h: 650 });

  // Fit image for display
  const fit = useMemo(() => {
    const maxW = 560;
    const scale = Math.min(1, maxW / imgW);
    return { w: imgW * scale, h: imgH * scale, scale };
  }, [imgW, imgH]);

  useEffect(() => { setImgDisplay({ w: fit.w, h: fit.h }); }, [fit]);

  // draw overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // draw all points faint
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    Object.values(points).forEach((p: any) => {
      ctx.beginPath();
      ctx.arc(p.x * fit.scale, p.y * fit.scale, 2.15, 0, Math.PI * 2);
      ctx.fill();
    });

    if (hoverMetric) {
      const mr = metricResults.find((r: any) => r.metric.id === hoverMetric);
      if (mr) {
        ctx.save();
        ctx.scale(fit.scale, fit.scale);
        mr.metric.draw(ctx, points, imgW, imgH);
        ctx.restore();
      }
    }
  }, [hoverMetric, points, fit.scale, imgW, imgH, metricResults]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof metricResults> = {};
    metricResults.forEach((r: any) => {
      const cat = r.metric.category;
      if (!g[cat]) g[cat] = [];
      g[cat].push(r);
    });
    return g;
  }, [metricResults]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-[12.5px] text-zinc-500">Analysis Report</div>
          <h2 className="text-[34px] tracking-tight font-[660]">Facial Proportions</h2>
        </div>
        <div className="flex items-center gap-3 text-[12.8px]">
          <button onClick={onBack} className="px-3.5 py-1.5 rounded-full border border-zinc-300 text-zinc-700 hover:bg-zinc-50">← Back to calibrate</button>
          <button onClick={onReupload} className="px-3.5 py-1.5 rounded-full bg-zinc-900 text-white hover:bg-zinc-800">New photo</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[560px_1fr] gap-8 items-start">
        {/* Left Image */}
        <div className="bg-white rounded-[26px] shadow-[0_18px_70px_rgba(23,23,27,0.09)] ring-1 ring-zinc-200 p-5">
          <div className="relative mx-auto" style={{ width: imgDisplay.w, height: imgDisplay.h }}>
            <img
              ref={imgElRef}
              src={imgSrc}
              width={imgDisplay.w}
              height={imgDisplay.h}
              alt=""
              className="rounded-[16px] block object-contain select-none"
              draggable={false}
            />
            <canvas
              ref={canvasRef}
              width={imgDisplay.w}
              height={imgDisplay.h}
              className="absolute left-0 top-0 rounded-[16px] pointer-events-none"
            />
          </div>
          <div className="flex items-center justify-between text-[11.9px] text-zinc-500 mt-3 px-1">
            <span>Hover a metric on the right → overlay draws</span>
            <span className="font-mono">{Object.keys(points).length} pts • {imgW}×{imgH}</span>
          </div>
        </div>

        {/* Right Dashboard */}
        <div className="bg-[#fcfcfd] rounded-[26px] ring-1 ring-zinc-200 shadow-[0_12px_60px_rgba(23,23,27,0.07)]">
          <div className="px-6 pt-5 pb-4 border-b border-zinc-200/90 flex items-center justify-between">
            <div className="text-[20.5px] font-[650] tracking-tight">All Ratios</div>
            <div className="text-[12.4px] text-zinc-500">
              Harmony Score <span className="text-[#06a9c9] font-[650]">{(overallScore).toFixed(1)}/10</span>
            </div>
          </div>

          <div className="px-4 pb-5 pt-3 max-h-[760px] overflow-auto">
            {Object.entries(grouped).map(([cat, rows]: any) => (
              <div key={cat} className="mb-5">
                <div className="px-2 text-[11.3px] uppercase tracking-wider text-zinc-400 mb-2">{cat}</div>
                <div className="space-y-[10px]">
                  {rows.map((r: any) => {
                    const m = r.metric;
                    const v = r.value;
                    const s = r.score;
                    const pct = v == null ? 50 : Math.max(0, Math.min(100,
                      50 + ((v - m.ideal) / m.tolerance) * 50
                    ));
                    const active = hoverMetric === m.id;
                    return (
                      <div
                        key={m.id}
                        onMouseEnter={() => setHoverMetric(m.id)}
                        onMouseLeave={() => setHoverMetric(null)}
                        className={`rounded-[16px] border px-4 py-3 transition cursor-default ${active ? "bg-white border-zinc-300 shadow-sm" : "border-zinc-200/95 hover:bg-white"}`}
                      >
                        <div className="flex items-center justify-between text-[13.8px]">
                          <div className="font-[550] text-zinc-800">{m.name}</div>
                          <div className="text-[11.7px] text-[#069dbb] font-mono">Score: {s.toFixed(2)}/10</div>
                        </div>
                        <div className="text-[11.8px] text-zinc-500 mt-0.5">{m.description}</div>
                        <div className="mt-3 relative">
                          <div className="h-[10px] rounded-full"
                            style={{
                              background: "linear-gradient(90deg, #ff5252 0%, #ffca3a 22%, #3be8ff 50%, #ffca3a 78%, #ff5252 100%)",
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
                          <span>{v == null ? "—" : v.toFixed(m.unit === "°" ? 1 : 3)}{m.unit}</span>
                          <span>ideal {m.ideal}{m.unit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-4 border-t border-zinc-200 text-[12px] text-zinc-500 flex items-center justify-between">
            <span>Export: PNG • SVG • CSV • JSON (coming soon)</span>
            <span className="font-mono">AnthroFace ISO/TR 7250-2</span>
          </div>
        </div>
      </div>
    </div>
  );
}