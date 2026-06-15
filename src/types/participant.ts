export interface Participant {
  id: string;
  prenom: string;
  nom: string;
  entreprise: string;
  email: string;
  showNplus1: boolean;
  prenomNplus1: string;
  nomNplus1: string;
  emailNplus1: string;
}

export interface Group {
  id: string;
  name: string;
  dateDebut?: string;
}

export interface SubmitPayload {
  participants: Omit<Participant, "id">[];
  formationId: string;
  groupId: string;
  groupName: string;
  submittedBy: string;
}

export interface SubmitResponse {
  success: boolean;
  message: string;
  created?: number;
  failed?: number;
}
