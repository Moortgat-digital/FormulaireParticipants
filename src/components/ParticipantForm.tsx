"use client";

import { useState } from "react";
import type { Participant, Group, SubmitPayload, SubmitResponse } from "@/types/participant";
import ParticipantRow from "./ParticipantRow";

interface ParticipantFormProps {
  formationId: string;
  formationName: string;
  groups: Group[];
  submittedBy: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createEmptyParticipant(): Participant {
  return {
    id: crypto.randomUUID(),
    prenom: "",
    nom: "",
    entreprise: "",
    email: "",
    showNplus1: false,
    prenomNplus1: "",
    nomNplus1: "",
    emailNplus1: "",
  };
}

export default function ParticipantForm({
  formationId,
  formationName,
  groups,
  submittedBy,
}: ParticipantFormProps) {
  // Step management
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [participantCount, setParticipantCount] = useState<number | "">(1);

  // Step 2 state
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [errors, setErrors] = useState<
    (Partial<Record<keyof Participant, string>> | null)[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);

  function handleContinue() {
    if (!selectedGroupId) return;
    const raw = typeof participantCount === "number" ? participantCount : 1;
    const count = Math.max(1, Math.min(50, raw));
    setParticipants(
      Array.from({ length: count }, () => createEmptyParticipant())
    );
    setErrors([]);
    setResult(null);
    setStep(2);
  }

  function handleBack() {
    setStep(1);
    setParticipants([]);
    setErrors([]);
    setResult(null);
  }

  function handleChange(index: number, field: keyof Participant, value: string) {
    setParticipants((prev) => {
      const updated = [...prev];
      if (field === "showNplus1") {
        updated[index] = { ...updated[index], showNplus1: value === "true" };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
    setErrors((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: undefined };
      }
      return updated;
    });
    if (result) setResult(null);
  }

  function handlePaste(startIndex: number, rows: string[][]) {
    setParticipants((prev) => {
      const updated = [...prev];
      for (let i = 0; i < rows.length; i++) {
        const targetIndex = startIndex + i;
        const [prenom = "", nom = "", email = "", entreprise = ""] = rows[i];
        if (targetIndex < updated.length) {
          updated[targetIndex] = {
            ...updated[targetIndex],
            prenom: prenom.trim(),
            nom: nom.trim(),
            entreprise: entreprise.trim(),
            email: email.trim(),
          };
        } else {
          updated.push({
            id: crypto.randomUUID(),
            prenom: prenom.trim(),
            nom: nom.trim(),
            entreprise: entreprise.trim(),
            email: email.trim(),
            showNplus1: false,
            prenomNplus1: "",
            nomNplus1: "",
            emailNplus1: "",
          });
        }
      }
      return updated;
    });
    setErrors((prev) => {
      const updated = [...prev];
      for (let i = 0; i < rows.length; i++) {
        const targetIndex = startIndex + i;
        if (targetIndex < updated.length) {
          updated[targetIndex] = null;
        }
      }
      return updated;
    });
    if (result) setResult(null);
  }

  function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
      // Skip header row
      const dataLines = lines.slice(1);
      if (dataLines.length === 0) return;

      const newParticipants: Participant[] = dataLines.map((line) => {
        // Support both ; and , as separators
        const sep = line.includes(";") ? ";" : ",";
        const cols = line.split(sep).map((c) => c.trim());
        const [prenom = "", nom = "", email = "", entreprise = "", prenomN1 = "", nomN1 = "", emailN1 = ""] = cols;
        const hasNplus1 = !!(prenomN1 || nomN1 || emailN1);
        return {
          id: crypto.randomUUID(),
          prenom,
          nom,
          email,
          entreprise,
          showNplus1: hasNplus1,
          prenomNplus1: prenomN1,
          nomNplus1: nomN1,
          emailNplus1: emailN1,
        };
      });

      setParticipants(newParticipants);
      setParticipantCount(newParticipants.length);
      setErrors([]);
      if (result) setResult(null);
    };
    reader.readAsText(file, "UTF-8");

    // Reset input so re-importing the same file works
    e.target.value = "";
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
        if (!p.prenom.trim()) errs.prenom = "Requis";
        if (!p.nom.trim()) errs.nom = "Requis";
        if (!p.email.trim()) errs.email = "Requis";
        else if (!EMAIL_REGEX.test(p.email)) errs.email = "E-mail invalide";
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
      participants: participants.map(({ nom, prenom, entreprise, email, showNplus1, prenomNplus1, nomNplus1, emailNplus1 }) => ({
        prenom: prenom.trim(),
        nom: nom.trim(),
        entreprise: entreprise.trim(),
        email: email.trim().toLowerCase(),
        showNplus1,
        prenomNplus1: showNplus1 ? prenomNplus1.trim() : "",
        nomNplus1: showNplus1 ? nomNplus1.trim() : "",
        emailNplus1: showNplus1 ? emailNplus1.trim().toLowerCase() : "",
      })),
      formationId,
      groupId: selectedGroupId,
      groupName: selectedGroupName,
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
        setParticipants(
          Array.from({ length: participantCount || 1 }, () => createEmptyParticipant())
        );
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
    <div className="mx-auto max-w-7xl px-4">
      {/* Title */}
      <div className="mb-6">
        <h2
          className="text-2xl font-semibold text-gray-900"
          style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
        >
          Inscription des participants
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Inscrivez les participants à cette formation.
        </p>
      </div>

      {/* Card container */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {step === 1 && (
          <div className="space-y-4 p-6">
            {/* Formation header */}
            <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3">
              <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">
                Formation
              </p>
              <p className="text-lg font-semibold text-indigo-900">
                {formationName}
              </p>
            </div>

            {groups.length === 0 ? (
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3">
                <p className="text-sm font-medium text-yellow-800">
                  Aucun groupe disponible pour cette formation.
                </p>
              </div>
            ) : (
              <>
                {/* Group dropdown */}
                <div>
                  <label
                    htmlFor="group-select"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Groupe
                  </label>
                  <select
                    id="group-select"
                    value={selectedGroupId}
                    onChange={(e) => {
                      setSelectedGroupId(e.target.value);
                      const g = groups.find((g) => g.id === e.target.value);
                      setSelectedGroupName(g?.name ?? "");
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400"
                  >
                    <option value="">-- Sélectionnez un groupe --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Participant count */}
                <div>
                  <label
                    htmlFor="participant-count"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Nombre de participants
                  </label>
                  <input
                    id="participant-count"
                    type="number"
                    min={1}
                    max={50}
                    value={participantCount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setParticipantCount(val === "" ? "" : parseInt(val) || 0);
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400"
                  />
                </div>

                {/* Continue button */}
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!selectedGroupId || !participantCount || participantCount < 1}
                  className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  Continuer
                </button>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 p-6">
              {/* Back button + group header */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-md border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
                  aria-label="Retour"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <div className="flex-1 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                    Groupe
                  </p>
                  <p className="text-lg font-semibold text-blue-900">
                    {selectedGroupName}
                  </p>
                </div>
              </div>

              {/* Import hints */}
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Remplissage rapide
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 cursor-pointer transition-colors hover:bg-blue-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    Importer un CSV
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvImport}
                      className="hidden"
                    />
                  </label>
                  <a
                    href="/trame-participants.csv"
                    download
                    className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Trame CSV
                  </a>
                </div>
                <p className="text-xs text-blue-600/70">
                  Ou copiez-collez directement depuis Excel : sélectionnez vos colonnes Prénom, Nom, E-mail, Entreprise et collez dans le premier champ Prénom.
                </p>
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
                    onPaste={handlePaste}
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
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
                    <svg
                      className="h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Envoi en cours...
                  </span>
                ) : (
                  `Soumettre ${participants.length > 1 ? `les ${participants.length} inscriptions` : "l'inscription"}`
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
