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
}

export interface CsmWebhookPayload {
  formationId: string;
  formationNom: string;
  demandes: DemandeInscription[];
}
