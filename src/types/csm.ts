export interface DemandeInscription {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  entreprise: string;
  groupeId: string;
  groupeNom: string;
  statut: string;
  soumisPar: string;
  createdTime: string;
  // N+1 (facultatif) — non transmis au webhook n8n, utilisé pour l'affichage
  // et l'export « complet ».
  prenomNplus1?: string;
  nomNplus1?: string;
  emailNplus1?: string;
}

export interface CsmWebhookPayload {
  formationId: string;
  formationNom: string;
  demandes: DemandeInscription[];
}
