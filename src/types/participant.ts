export interface Participant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  entreprise: string;
}

export interface SubmitPayload {
  participants: Omit<Participant, "id">[];
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
