"use client";

import { useState } from "react";
import type { Participant, SubmitPayload, SubmitResponse } from "@/types/participant";
import ParticipantRow from "./ParticipantRow";

interface ParticipantFormProps {
  groupId: string;
  groupName: string;
  submittedBy: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createEmptyParticipant(): Participant {
  return {
    id: crypto.randomUUID(),
    nom: "",
    prenom: "",
    email: "",
    entreprise: "",
  };
}

export default function ParticipantForm({
  groupId,
  groupName,
  submittedBy,
}: ParticipantFormProps) {
  const [participants, setParticipants] = useState<Participant[]>([
    createEmptyParticipant(),
  ]);
  const [errors, setErrors] = useState<
    (Partial<Record<keyof Participant, string>> | null)[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);

  function handleChange(index: number, field: keyof Participant, value: string) {
    setParticipants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    // Clear field error on change
    setErrors((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: undefined };
      }
      return updated;
    });
    // Clear global result on edit
    if (result) setResult(null);
  }

  function handleAddRow() {
    setParticipants((prev) => [...prev, createEmptyParticipant()]);
  }

  function handleRemove(index: number) {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): boolean {
    const newErrors: (Partial<Record<keyof Participant, string>> | null)[] =
      participants.map((p) => {
        const errs: Partial<Record<keyof Participant, string>> = {};
        if (!p.nom.trim()) errs.nom = "Requis";
        if (!p.prenom.trim()) errs.prenom = "Requis";
        if (!p.email.trim()) errs.email = "Requis";
        else if (!EMAIL_REGEX.test(p.email)) errs.email = "E-mail invalide";
        if (!p.entreprise.trim()) errs.entreprise = "Requis";
        return Object.keys(errs).length > 0 ? errs : null;
      });

    setErrors(newErrors);
    return newErrors.every((e) => e === null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setResult(null);

    const payload: SubmitPayload = {
      participants: participants.map(({ nom, prenom, email, entreprise }) => ({
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim().toLowerCase(),
        entreprise: entreprise.trim(),
      })),
      groupId,
      groupName,
      submittedBy,
    };

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: SubmitResponse = await res.json();
      setResult(data);

      if (data.success) {
        // Reset form on success
        setParticipants([createEmptyParticipant()]);
        setErrors([]);
      }
    } catch {
      setResult({
        success: false,
        message: "Erreur de connexion. Veuillez réessayer.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-4 p-4">
      {/* Group header */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
        <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
          Groupe
        </p>
        <p className="text-lg font-semibold text-blue-900">{groupName}</p>
      </div>

      {/* Participant rows */}
      <div className="space-y-3">
        {participants.map((participant, index) => (
          <ParticipantRow
            key={participant.id}
            participant={participant}
            index={index}
            onChange={handleChange}
            onRemove={handleRemove}
            canRemove={participants.length > 1}
            errors={errors[index] || null}
          />
        ))}
      </div>

      {/* Add participant button */}
      <button
        type="button"
        onClick={handleAddRow}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-600"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
        Ajouter un participant
      </button>

      {/* Result message */}
      {result && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            result.success
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {result.message}
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Envoi en cours...
          </span>
        ) : (
          `Soumettre ${participants.length > 1 ? `les ${participants.length} inscriptions` : "l'inscription"}`
        )}
      </button>
    </form>
  );
}
