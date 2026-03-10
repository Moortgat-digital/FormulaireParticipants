export interface CalendrierJournee {
  id: string;
  code: string;
  formationNom: string;
  groupeNom: string;
  animateur: string;
  date: string;       // ISO date "2026-03-10"
  heure: string;      // "09:00"
  heureFin: string;   // "17:30"
  etat: string;       // "Programmée" | "En cours" | "Clôturée" | …
  hasEvaluations: boolean;
}

export type CalendrierMode = "week" | "month";
