// ---- Notion data models ----

export type Mode = "Présentiel" | "Distanciel" | "Hybride";

export interface Formation {
  id: string;
  nom: string;
}

export interface GroupeSession {
  id: string;
  nom: string;
  lieu: string;
  dateDebut: string;
  dateFin: string;
  etat: string;
  journees: Journee[];
}

export interface Journee {
  id: string;
  code: string;
  nom: string;
  dateDebut: string;
  dateDebutEnd: string;
  dateFin: string;
  mode: Mode | "";
  lieu: string;
  adresse: string;
  ville: string;
  codePostal: number | null;
  pays: string;
  prefilled: boolean;
}

// ---- Form state models ----

export interface LieuData {
  mode: Mode | "";
  nom: string;
  adresse: string;
  ville: string;
  codePostal: string;
  pays: string;
}

export const EMPTY_LIEU: LieuData = {
  mode: "",
  nom: "",
  adresse: "",
  ville: "",
  codePostal: "",
  pays: "France",
};

export type FillStrategy = "all-same" | "per-group";

export type GroupStrategy = "custom" | `same-as:${string}`;

export type JourneeStrategy = "custom" | "same-as-previous";

export interface GroupFormState {
  groupId: string;
  strategy: GroupStrategy;
  lieuData: LieuData;
  journeeStrategy: "all-same" | "per-journee";
  journees: JourneeFormState[];
}

export interface JourneeFormState {
  journeeId: string;
  strategy: JourneeStrategy;
  lieuData: LieuData;
  prefilled: boolean;
  dirty: boolean;
}

export interface LieuxFormState {
  formationId: string;
  formationNom: string;
  fillStrategy: FillStrategy;
  globalLieu: LieuData;
  groups: GroupFormState[];
  saving: boolean;
  saveResults: SaveResult[];
}

export interface FieldErrors {
  mode?: string;
  nom?: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
}

// ---- Save/API models ----

export interface JourneePatchPayload {
  journeeId: string;
  lieu: LieuData;
}

export interface GroupPatchPayload {
  groupId: string;
  lieuLabel: string;
}

export interface SavePayload {
  formationId: string;
  journees: JourneePatchPayload[];
  groups: GroupPatchPayload[];
}

export interface SaveResult {
  journeeId: string;
  success: boolean;
  error?: string;
}

export interface SaveResponse {
  success: boolean;
  message: string;
  results: SaveResult[];
  patchedCount: number;
  failedCount: number;
}

// ---- Reducer actions ----

export type LieuxAction =
  | { type: "SET_FILL_STRATEGY"; strategy: FillStrategy }
  | { type: "SET_GLOBAL_LIEU"; field: keyof LieuData; value: string }
  | { type: "SET_GROUP_STRATEGY"; groupId: string; strategy: GroupStrategy }
  | { type: "SET_GROUP_JOURNEE_STRATEGY"; groupId: string; strategy: "all-same" | "per-journee" }
  | { type: "SET_GROUP_LIEU"; groupId: string; field: keyof LieuData; value: string }
  | { type: "SET_JOURNEE_STRATEGY"; groupId: string; journeeId: string; strategy: JourneeStrategy }
  | { type: "SET_JOURNEE_LIEU"; groupId: string; journeeId: string; field: keyof LieuData; value: string }
  | { type: "SET_SAVING"; saving: boolean }
  | { type: "SET_SAVE_RESULTS"; results: SaveResult[] };
