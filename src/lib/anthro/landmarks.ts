// Shared anthropometric types and 50-point landmark set
// Mapped to MediaPipe FaceLandmarker indices (468-pt + 5-pt iris = 478).

export type Point = { x: number; y: number };

export type LandmarkGroup =
  | "Cranial"
  | "Orbital"
  | "Nasal"
  | "Oral"
  | "Mandibular"
  | "Zygomatic";

export type LandmarkDef = {
  id: string;
  name: string;
  group: LandmarkGroup;
  /** MediaPipe FaceLandmarker landmark index (0..477). */
  mpIndex: number;
  hint: string;
};

export type CalibratedPoint = Point & { confirmed: boolean };

/**
 * 50-point anthropometric landmark set, distilled from MediaPipe's 468/478
 * blendshape mesh into canonical ISO 7250 / Farkas anthropometric points.
 */
export const LANDMARKS: LandmarkDef[] = [
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

export const LANDMARK_BY_ID: Record<string, LandmarkDef> = Object.fromEntries(
  LANDMARKS.map((l) => [l.id, l]),
);

export const LANDMARK_GROUPS: LandmarkGroup[] = [
  "Cranial",
  "Orbital",
  "Nasal",
  "Oral",
  "Zygomatic",
  "Mandibular",
];

export function landmarkIndexById(id: string | undefined): number {
  if (!id) return -1;
  return LANDMARKS.findIndex((l) => l.id === id);
}

/** Group landmarks by their group field, preserving overall order. */
export function groupLandmarks(): Array<[LandmarkGroup, LandmarkDef[]]> {
  const out: Array<[LandmarkGroup, LandmarkDef[]]> = [];
  for (const g of LANDMARK_GROUPS) {
    const items = LANDMARKS.filter((l) => l.group === g);
    if (items.length) out.push([g, items]);
  }
  return out;
}
