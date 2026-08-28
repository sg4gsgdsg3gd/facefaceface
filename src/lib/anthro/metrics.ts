// Facial proportion metrics — 19 clinical ratios with on-canvas vector drawing.
import type { Point } from "./landmarks";

export type Metric = {
  id: string;
  name: string;
  category:
    | "Vertical Thirds"
    | "Proportions"
    | "Orbital"
    | "Nasal"
    | "Oral"
    | "Mandibular";
  ideal: number;
  tolerance: number;
  unit: string;
  description: string;
  compute: (p: Record<string, Point>) => number | null;
  draw: (
    ctx: CanvasRenderingContext2D,
    p: Record<string, Point>,
    w: number,
    h: number,
  ) => void;
};

export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const mid = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

function angleAt(vertex: Point, a: Point, b: Point): number {
  const v1 = { x: a.x - vertex.x, y: a.y - vertex.y };
  const v2 = { x: b.x - vertex.x, y: b.y - vertex.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const ma = Math.hypot(v1.x, v1.y);
  const mb = Math.hypot(v2.x, v2.y);
  if (ma === 0 || mb === 0) return 0;
  return (
    (Math.acos(Math.max(-1, Math.min(1, dot / (ma * mb)))) * 180) / Math.PI
  );
}

export const METRICS: Metric[] = [
  {
    id: "upper_third",
    name: "Upper Third",
    category: "Vertical Thirds",
    ideal: 33.33,
    tolerance: 7.5,
    unit: "%",
    description: "Trichion → Glabella / total facial height",
    compute: (p) => {
      if (!p.tr || !p.g || !p.me) return null;
      const upper = dist(p.tr, p.g);
      const total = dist(p.tr, p.me);
      if (total <= 0) return null;
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
      if (total <= 0) return null;
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
      if (total <= 0) return null;
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
      ctx.strokeStyle = "#06c1e4";
      ctx.beginPath();
      ctx.moveTo(p.sn.x, p.sn.y);
      ctx.lineTo(p.me.x, p.me.y);
      ctx.stroke();
      const arrows: Array<[Point, number]> = [
        [p.sn, -8],
        [p.me, 8],
      ];
      arrows.forEach(([pt, dir]) => {
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
      if (!p.tr || !p.me || !p.zy_l || !p.zy_r) return null;
      const h = dist(p.tr, p.me);
      const w = dist(p.zy_l, p.zy_r);
      if (w <= 0) return null;
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
      if (!p.en_l || !p.en_r || !p.ex_l) return null;
      const inter = dist(p.en_l, p.en_r);
      const eyeW = dist(p.ex_l, p.en_l);
      if (eyeW <= 0) return null;
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
      const denom = dist(p.zy_l, p.zy_r);
      if (denom <= 0) return null;
      return dist(p.pu_l, p.pu_r) / denom;
    },
    draw: (ctx, p) => {
      if (!p.pu_l || !p.pu_r) return;
      ctx.fillStyle = "#06c1e4";
      [p.pu_l, p.pu_r].forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
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
      const angleL =
        (Math.atan2(p.ex_l.y - p.en_l.y, p.ex_l.x - p.en_l.x) * 180) / Math.PI;
      const angleR =
        (Math.atan2(p.en_r.y - p.ex_r.y, p.en_r.x - p.ex_r.x) * 180) / Math.PI;
      return -(angleL + angleR) / 2;
    },
    draw: (ctx, p) => {
      if (!p.en_l || !p.ex_l || !p.en_r || !p.ex_r) return;
      ctx.strokeStyle = "#06c1e4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.en_l.x, p.en_l.y);
      ctx.lineTo(p.ex_l.x, p.ex_l.y);
      ctx.moveTo(p.en_r.x, p.en_r.y);
      ctx.lineTo(p.ex_r.x, p.ex_r.y);
      ctx.stroke();
    },
  },
  {
    id: "nasal_index",
    name: "Nasal Index",
    category: "Nasal",
    ideal: 0.69,
    tolerance: 0.2,
    unit: "",
    description: "Alare width / Nose height (Nasion–Subnasale)",
    compute: (p) => {
      if (!p.al_l || !p.al_r || !p.n || !p.sn) return null;
      const h = dist(p.n, p.sn);
      if (h <= 0) return null;
      return dist(p.al_l, p.al_r) / h;
    },
    draw: (ctx, p) => {
      if (!p.al_l || !p.al_r || !p.n || !p.sn) return;
      ctx.strokeStyle = "#06c1e4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.al_l.x, p.al_l.y);
      ctx.lineTo(p.al_r.x, p.al_r.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.n.x, p.n.y);
      ctx.lineTo(p.sn.x, p.sn.y);
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
      const denom = dist(p.en_l, p.en_r);
      if (denom <= 0) return null;
      return dist(p.ch_l, p.ch_r) / denom;
    },
    draw: (ctx, p) => {
      if (!p.ch_l || !p.ch_r) return;
      ctx.strokeStyle = "#06c1e4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.ch_l.x, p.ch_l.y);
      ctx.lineTo(p.ch_r.x, p.ch_r.y);
      ctx.stroke();
      [p.ch_l, p.ch_r].forEach((pt) => {
        ctx.fillStyle = "#06c1e4";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
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
      if (upper <= 0) return null;
      return lower / upper / 2.0;
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
      const denom = dist(p.zy_l, p.zy_r);
      if (denom <= 0) return null;
      return dist(p.gn_l, p.gn_r) / denom;
    },
    draw: (ctx, p) => {
      if (!p.gn_l || !p.gn_r || !p.zy_l || !p.zy_r) return;
      ctx.strokeStyle = "rgba(6,193,228,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.zy_l.x, p.zy_l.y);
      ctx.lineTo(p.zy_r.x, p.zy_r.y);
      ctx.stroke();
      ctx.strokeStyle = "#f49c45";
      ctx.beginPath();
      ctx.moveTo(p.gn_l.x, p.gn_l.y);
      ctx.lineTo(p.gn_r.x, p.gn_r.y);
      ctx.stroke();
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
      if (v <= 0) return null;
      return ipd / v;
    },
    draw: (ctx, p) => {
      if (!p.pu_l || !p.pu_r || !p.sto) return;
      const eyeMid = mid(p.pu_l, p.pu_r);
      ctx.strokeStyle = "#06c1e4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.pu_l.x, p.pu_l.y);
      ctx.lineTo(p.pu_r.x, p.pu_r.y);
      ctx.moveTo(eyeMid.x, eyeMid.y);
      ctx.lineTo(p.sto.x, p.sto.y);
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
      return angleAt(p.sn, p.c, p.ls);
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
      return angleAt(p.n, p.ex_l, p.ex_r);
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
      if (upper <= 0) return null;
      return lower / upper;
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

/**
 * Convert a metric value into a 0..10 score.  Linear falloff from ideal,
 * reaching 0 at ±tolerance from ideal.
 */
export function scoreFrom(m: Metric, value: number): number {
  const deviation = Math.abs(value - m.ideal) / m.tolerance;
  const s = Math.max(0, 1 - deviation);
  return Math.round(s * 1000) / 100;
}

export type MetricResult = {
  metric: Metric;
  value: number | null;
  score: number;
};

export function computeAllMetrics(
  points: Record<string, Point>,
): MetricResult[] {
  return METRICS.map((m) => {
    const v = m.compute(points);
    if (v == null || isNaN(v) || !isFinite(v))
      return { metric: m, value: null as number | null, score: 0 };
    return { metric: m, value: v, score: scoreFrom(m, v) };
  });
}
