export interface CalendrierJournee {
  id: string;
  code: string;
  formationNom: string;
  groupeNom: string;
  animateur: string;
  date: string;       // ISO date "2026-03-10"
  heure: string;      // "09:00"
  heureFin: string;   // "17:30"
  lieu: string;        // "LEVALLOIS B512 – 1 rue de Villiers, 92300 Levallois"
  etat: string;        // "Programmée" | "En cours" | "Clôturée" | …
  hasEvaluations: boolean;
  questionsAnimOk: boolean; // true when both "Remarques animateur" & "Retex animateur" are filled
}

export type CalendrierMode = "week" | "month";
