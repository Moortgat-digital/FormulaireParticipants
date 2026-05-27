"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { DemandeInscription, CsmWebhookPayload } from "@/types/csm";
import type { Journee } from "@/types/lieux";

interface CsmFormProps {
  formationId: string;
  formationNom: string;
}

type EditableFields = Pick<DemandeInscription, "nom" | "prenom" | "email" | "entreprise">;

// ---- Détection de doublons ----

interface DupInfo {
  confidence: number; // 0-100
  matchId: string;
}

function normEmail(s: string): string {
  return s.trim().toLowerCase();
}

function normName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    const curr = [i + 1];
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      curr[j + 1] = Math.min(curr[j] + 1, prev[j + 1] + 1, prev[j] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// Confiance que deux demandes soient un doublon (mail + groupe = critère fort,
// tolérance aux fautes de frappe sur le nom/prénom).
function dupConfidence(a: DemandeInscription, b: DemandeInscription): number {
  const emailSim =
    a.email && b.email
      ? normEmail(a.email) === normEmail(b.email)
        ? 1
        : similarity(normEmail(a.email), normEmail(b.email))
      : 0;
  const nameSim = similarity(
    normName(`${a.prenom} ${a.nom}`),
    normName(`${b.prenom} ${b.nom}`)
  );
  // Le groupe identique est requis pour une forte confiance ; sinon on divise par deux.
  const groupeFactor = a.groupeId && b.groupeId && a.groupeId === b.groupeId ? 1 : 0.5;

  return Math.round(100 * groupeFactor * (0.7 * emailSim + 0.3 * nameSim));
}

const DUP_THRESHOLD = 60; // % minimum pour afficher l'indicateur

export default function CsmForm({ formationId, formationNom }: CsmFormProps) {
  const [demandes, setDemandes] = useState<DemandeInscription[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>("all");
  const [filterGroupe, setFilterGroupe] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<EditableFields>({ nom: "", prenom: "", email: "", entreprise: "" });
  const [saving, setSaving] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<DemandeInscription | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Unsubscribe modal state
  const [unsubTarget, setUnsubTarget] = useState<DemandeInscription | null>(null);
  const [unsubJournees, setUnsubJournees] = useState<Journee[]>([]);
  const [unsubSelected, setUnsubSelected] = useState<Set<string>>(new Set());
  const [unsubAll, setUnsubAll] = useState(true);
  const [unsubLoading, setUnsubLoading] = useState(false);
  const [unsubSending, setUnsubSending] = useState(false);

  // Cache journées per groupeId to avoid redundant fetches
  const [journeesCache, setJourneesCache] = useState<Record<string, Journee[]>>({});

  const fetchDemandes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/csm?formationId=${encodeURIComponent(formationId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setDemandes(data.demandes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [formationId]);

  useEffect(() => {
    fetchDemandes();
  }, [fetchDemandes]);

  // Filtered demandes
  const filtered = demandes.filter((d) => {
    if (filterStatut !== "all" && d.statut !== filterStatut) return false;
    if (filterGroupe !== "all" && d.groupeNom !== filterGroupe) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        d.nom.toLowerCase().includes(q) ||
        d.prenom.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.entreprise.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Carte des doublons : pour chaque demande, le meilleur score de ressemblance
  // avec une autre demande (calculée sur l'ensemble, pas seulement le filtre).
  const dupMap = useMemo(() => {
    const map = new Map<string, DupInfo>();
    for (let i = 0; i < demandes.length; i++) {
      for (let j = i + 1; j < demandes.length; j++) {
        const score = dupConfidence(demandes[i], demandes[j]);
        if (score < DUP_THRESHOLD) continue;
        const a = demandes[i];
        const b = demandes[j];
        const prevA = map.get(a.id);
        if (!prevA || score > prevA.confidence) map.set(a.id, { confidence: score, matchId: b.id });
        const prevB = map.get(b.id);
        if (!prevB || score > prevB.confidence) map.set(b.id, { confidence: score, matchId: a.id });
      }
    }
    return map;
  }, [demandes]);

  const demandesById = useMemo(
    () => new Map(demandes.map((d) => [d.id, d])),
    [demandes]
  );

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((d) => selected.has(d.id));

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const d of filtered) next.delete(d.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const d of filtered) next.add(d.id);
        return next;
      });
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSend() {
    if (selected.size === 0) return;
    setSending(true);
    setResult(null);

    const selectedDemandes = demandes.filter((d) => selected.has(d.id));
    const payload: CsmWebhookPayload = {
      formationId,
      formationNom,
      demandes: selectedDemandes,
    };

    try {
      const res = await fetch("/api/csm/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur webhook");
      setResult({ success: true, message: data.message });
      setSelected(new Set());
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : "Erreur lors de l'envoi.",
      });
    } finally {
      setSending(false);
    }
  }

  function startEdit(d: DemandeInscription) {
    setEditingId(d.id);
    setEditFields({ nom: d.nom, prenom: d.prenom, email: d.email, entreprise: d.entreprise });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/csm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: editingId, fields: editFields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      // Update local state
      setDemandes((prev) =>
        prev.map((d) => (d.id === editingId ? { ...d, ...editFields } : d))
      );
      setEditingId(null);
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : "Erreur lors de la sauvegarde.",
      });
    } finally {
      setSaving(false);
    }
  }

  // ---- Delete logic ----

  function openDelete(d: DemandeInscription) {
    setDeleteTarget(d);
  }

  function closeDelete() {
    if (deleting) return;
    setDeleteTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleting(true);
    setResult(null);
    try {
      const res = await fetch(`/api/csm?pageId=${encodeURIComponent(target.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setDemandes((prev) => prev.filter((d) => d.id !== target.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(target.id);
        return next;
      });
      setResult({ success: true, message: `Demande de ${target.prenom} ${target.nom} supprimée.` });
      setDeleteTarget(null);
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : "Erreur lors de la suppression.",
      });
    } finally {
      setDeleting(false);
    }
  }

  // ---- Unsubscribe modal logic ----

  async function openUnsub(d: DemandeInscription) {
    setUnsubTarget(d);
    setUnsubAll(true);
    setUnsubSelected(new Set());
    setUnsubSending(false);

    // Use cache if available
    if (journeesCache[d.groupeId]) {
      const cached = journeesCache[d.groupeId];
      setUnsubJournees(cached);
      setUnsubSelected(new Set(cached.map((j) => j.id)));
      return;
    }

    setUnsubLoading(true);
    try {
      const res = await fetch(`/api/csm/journees?groupeId=${encodeURIComponent(d.groupeId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setUnsubJournees(data.journees);
      setUnsubSelected(new Set(data.journees.map((j: Journee) => j.id)));
      setJourneesCache((prev) => ({ ...prev, [d.groupeId]: data.journees }));
    } catch {
      setUnsubJournees([]);
    } finally {
      setUnsubLoading(false);
    }
  }

  function closeUnsub() {
    setUnsubTarget(null);
    setUnsubJournees([]);
    setUnsubSelected(new Set());
  }

  function toggleUnsubAll(checked: boolean) {
    setUnsubAll(checked);
    if (checked) {
      setUnsubSelected(new Set(unsubJournees.map((j) => j.id)));
    } else {
      setUnsubSelected(new Set());
    }
  }

  function toggleUnsubJournee(id: string) {
    setUnsubSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setUnsubAll(false);
  }

  async function confirmUnsub() {
    if (!unsubTarget || unsubSelected.size === 0) return;
    setUnsubSending(true);
    setResult(null);

    const payload = {
      participant: {
        id: unsubTarget.id,
        nom: unsubTarget.nom,
        prenom: unsubTarget.prenom,
        email: unsubTarget.email,
        groupeId: unsubTarget.groupeId,
        groupeNom: unsubTarget.groupeNom,
      },
      journees: [...unsubSelected],
      toutes: unsubAll,
    };

    try {
      const res = await fetch("/api/csm/webhook-unsub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur webhook");
      setResult({ success: true, message: data.message });
      closeUnsub();
      fetchDemandes();
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : "Erreur lors de la désinscription.",
      });
    } finally {
      setUnsubSending(false);
    }
  }

  function renderDupBadge(d: DemandeInscription) {
    const dup = dupMap.get(d.id);
    if (!dup) return null;
    const match = demandesById.get(dup.matchId);
    const strong = dup.confidence >= 85;
    return (
      <span
        className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold align-middle ${
          strong ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
        }`}
        title={
          match
            ? `Doublon probable de ${match.prenom} ${match.nom}${match.statut ? ` (${match.statut})` : ""}`
            : "Doublon probable"
        }
      >
        ⚠ Doublon {dup.confidence}%
      </span>
    );
  }

  function formatJourneeDate(iso: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }

  // Unique statuts & groupes for filters
  const statuts = [...new Set(demandes.map((d) => d.statut).filter(Boolean))];
  const groupes = [...new Set(demandes.map((d) => d.groupeNom).filter(Boolean))];

  return (
    <div className="mx-auto max-w-7xl px-4">
      {/* Header */}
      <div className="mb-5">
        <h2
          className="text-2xl font-semibold text-csm-bleu"
          style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
        >
          Gestion des inscriptions
        </h2>
        <p className="mt-1 text-sm text-csm-gris">
          Sélectionnez les demandes à valider pour cette formation.
        </p>
      </div>

      {/* Formation banner */}
      <div className="mb-4 rounded-lg border border-csm-action/30 bg-csm-action/5 px-4 py-3">
        <p className="text-xs font-medium text-csm-action uppercase tracking-wide">
          Formation
        </p>
        <p className="text-lg font-semibold text-csm-bleu">{formationNom}</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Rechercher (nom, prénom, email, entreprise)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-md border border-csm-gris-clair px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-csm-action hover:border-csm-gris"
        />
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="rounded-md border border-csm-gris-clair px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-csm-action hover:border-csm-gris"
        >
          <option value="all">Tous les statuts</option>
          {statuts.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterGroupe}
          onChange={(e) => setFilterGroupe(e.target.value)}
          className="rounded-md border border-csm-gris-clair px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-csm-action hover:border-csm-gris"
        >
          <option value="all">Tous les groupes</option>
          {groupes.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={fetchDemandes}
          disabled={loading}
          className="rounded-md border border-csm-gris-clair px-3 py-2 text-sm text-csm-gris transition-colors hover:bg-csm-blanc hover:border-csm-gris"
          title="Rafraîchir"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-csm-orange/30 bg-csm-orange-light px-4 py-3 text-sm text-csm-orange">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <svg className="h-6 w-6 animate-spin text-csm-action" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="ml-2 text-sm text-csm-gris">Chargement des demandes...</span>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="rounded-lg border border-csm-gris-clair bg-white overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-csm-gris">
              {demandes.length === 0
                ? "Aucune demande d'inscription pour cette formation."
                : "Aucun résultat ne correspond aux filtres."}
            </div>
          ) : (
            <>
              {/* Selection bar */}
              <div className="flex items-center justify-between border-b border-csm-gris-clair bg-csm-blanc px-4 py-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-csm-bleu cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-csm-gris-clair text-csm-action focus:ring-csm-action"
                    />
                    Tout sélectionner
                  </label>
                  <span className="text-xs text-csm-gris">
                    {selected.size > 0
                      ? `${selected.size} sélectionné${selected.size > 1 ? "s" : ""}`
                      : `${filtered.length} demande${filtered.length > 1 ? "s" : ""}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={selected.size === 0 || sending}
                  className="rounded-lg bg-csm-action px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-csm-action-hover focus:outline-none focus:ring-2 focus:ring-csm-action focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Envoi...
                    </span>
                  ) : (
                    `Valider ${selected.size > 0 ? `(${selected.size})` : ""}`
                  )}
                </button>
              </div>

              {/* Table header */}
              <div className="hidden sm:grid sm:grid-cols-[40px_1fr_1fr_1fr_1fr_120px_80px] gap-2 px-4 py-2 text-xs font-semibold text-csm-gris uppercase tracking-wide border-b border-csm-gris-clair">
                <div />
                <div>Participant</div>
                <div>E-mail</div>
                <div>Entreprise</div>
                <div>Groupe</div>
                <div>Statut</div>
                <div />
              </div>

              {/* Rows */}
              <div className="divide-y divide-csm-gris-clair">
                {filtered.map((d) =>
                  editingId === d.id ? (
                    /* ---- Edit mode ---- */
                    <div
                      key={d.id}
                      className="grid grid-cols-1 sm:grid-cols-[40px_1fr_1fr_1fr_1fr_120px_80px] gap-2 px-4 py-3 items-center bg-csm-action/5"
                    >
                      <div />
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={editFields.prenom}
                          onChange={(e) => setEditFields((f) => ({ ...f, prenom: e.target.value }))}
                          placeholder="Prénom"
                          className="w-1/2 rounded border border-csm-gris-clair px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-csm-action"
                        />
                        <input
                          type="text"
                          value={editFields.nom}
                          onChange={(e) => setEditFields((f) => ({ ...f, nom: e.target.value }))}
                          placeholder="Nom"
                          className="w-1/2 rounded border border-csm-gris-clair px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-csm-action"
                        />
                      </div>
                      <div>
                        <input
                          type="email"
                          value={editFields.email}
                          onChange={(e) => setEditFields((f) => ({ ...f, email: e.target.value }))}
                          placeholder="E-mail"
                          className="w-full rounded border border-csm-gris-clair px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-csm-action"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={editFields.entreprise}
                          onChange={(e) => setEditFields((f) => ({ ...f, entreprise: e.target.value }))}
                          placeholder="Entreprise"
                          className="w-full rounded border border-csm-gris-clair px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-csm-action"
                        />
                      </div>
                      <div className="hidden sm:block text-sm text-csm-gris truncate">
                        {d.groupeNom}
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            d.statut === "À traiter"
                              ? "bg-amber-100 text-amber-800"
                              : d.statut === "Inscrit(e)"
                              ? "bg-green-100 text-green-800"
                              : d.statut === "Refusé"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {d.statut || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={saving}
                          className="rounded p-1 text-csm-vert hover:bg-csm-vert-light transition-colors disabled:opacity-50"
                          title="Enregistrer"
                        >
                          {saving ? (
                            <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={saving}
                          className="rounded p-1 text-csm-gris hover:bg-gray-100 transition-colors disabled:opacity-50"
                          title="Annuler"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ---- Display mode ---- */
                    <div
                      key={d.id}
                      className={`grid grid-cols-1 sm:grid-cols-[40px_1fr_1fr_1fr_1fr_120px_80px] gap-2 px-4 py-3 items-center transition-colors ${
                        selected.has(d.id)
                          ? "bg-csm-action/5"
                          : "hover:bg-csm-blanc"
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selected.has(d.id)}
                          onChange={() => toggleOne(d.id)}
                          className="h-4 w-4 rounded border-csm-gris-clair text-csm-action focus:ring-csm-action cursor-pointer"
                        />
                      </div>
                      <label className="cursor-pointer" onClick={() => toggleOne(d.id)}>
                        <span className="text-sm font-medium text-csm-bleu">
                          {d.prenom} {d.nom}
                        </span>
                        {renderDupBadge(d)}
                        <span className="block sm:hidden text-xs text-csm-gris mt-0.5">
                          {d.email}
                        </span>
                      </label>
                      <div className="hidden sm:block text-sm text-csm-bleu truncate">
                        {d.email}
                      </div>
                      <div className="hidden sm:block text-sm text-csm-gris truncate">
                        {d.entreprise}
                      </div>
                      <div className="hidden sm:block text-sm text-csm-gris truncate">
                        {d.groupeNom}
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            d.statut === "À traiter"
                              ? "bg-amber-100 text-amber-800"
                              : d.statut === "Inscrit(e)"
                              ? "bg-green-100 text-green-800"
                              : d.statut === "Refusé"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {d.statut || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {d.statut !== "Inscrit(e)" && (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(d)}
                              className="rounded p-1 text-csm-gris hover:text-csm-action hover:bg-csm-action/10 transition-colors"
                              title="Modifier"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => openDelete(d)}
                              className="rounded p-1 text-csm-gris hover:text-csm-orange hover:bg-csm-orange/10 transition-colors"
                              title="Supprimer la demande"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </>
                        )}
                        {d.statut === "Inscrit(e)" && (
                          <button
                            type="button"
                            onClick={() => openUnsub(d)}
                            className="rounded p-1 text-csm-gris hover:text-csm-orange hover:bg-csm-orange/10 transition-colors"
                            title="Désinscrire"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Result banner */}
      {result && (
        <div
          className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium ${
            result.success
              ? "bg-csm-vert-light border border-csm-vert/30 text-csm-vert"
              : "bg-csm-orange-light border border-csm-orange/30 text-csm-orange"
          }`}
        >
          {result.message}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="border-b border-csm-gris-clair px-6 py-4">
              <h3 className="text-lg font-semibold text-csm-bleu">Supprimer la demande</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-csm-gris">
                Voulez-vous vraiment supprimer la demande d&apos;inscription de{" "}
                <span className="font-medium text-csm-bleu">
                  {deleteTarget.prenom} {deleteTarget.nom}
                </span>
                {deleteTarget.groupeNom ? ` (${deleteTarget.groupeNom})` : ""} ?
              </p>
              <p className="mt-2 text-xs text-csm-gris">
                La demande sera archivée dans Notion (restaurable). Cette action ne touche pas aux
                inscriptions déjà validées.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-csm-gris-clair px-6 py-4">
              <button
                type="button"
                onClick={closeDelete}
                disabled={deleting}
                className="rounded-lg border border-csm-gris-clair px-4 py-2 text-sm font-medium text-csm-gris transition-colors hover:bg-csm-blanc disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-lg bg-csm-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-csm-orange/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Suppression...
                  </span>
                ) : (
                  "Supprimer"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsubscribe modal */}
      {unsubTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="border-b border-csm-gris-clair px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-csm-bleu">Désinscrire un participant</h3>
                <button
                  type="button"
                  onClick={closeUnsub}
                  className="rounded p-1 text-csm-gris hover:bg-gray-100 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <p className="mt-1 text-sm text-csm-gris">
                <span className="font-medium text-csm-bleu">{unsubTarget.prenom} {unsubTarget.nom}</span>
                {" — "}{unsubTarget.groupeNom}
              </p>
            </div>

            {/* Modal body */}
            <div className="px-6 py-4">
              {unsubLoading ? (
                <div className="flex items-center justify-center py-8">
                  <svg className="h-5 w-5 animate-spin text-csm-action" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="ml-2 text-sm text-csm-gris">Chargement des journées...</span>
                </div>
              ) : unsubJournees.length === 0 ? (
                <p className="py-4 text-center text-sm text-csm-gris">
                  Aucune journée trouvée pour ce groupe.
                </p>
              ) : (
                <>
                  {/* Toggle all */}
                  <label className="flex items-center gap-3 rounded-lg border border-csm-orange/30 bg-csm-orange-light px-4 py-3 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={unsubAll}
                      onChange={(e) => toggleUnsubAll(e.target.checked)}
                      className="h-4 w-4 rounded border-csm-gris-clair text-csm-orange focus:ring-csm-orange"
                    />
                    <div>
                      <span className="text-sm font-medium text-csm-orange">
                        Toutes les journées
                      </span>
                      <span className="ml-1 text-xs text-csm-gris">
                        ({unsubJournees.length} journée{unsubJournees.length > 1 ? "s" : ""})
                      </span>
                    </div>
                  </label>

                  {/* Individual journées */}
                  <div className="max-h-60 overflow-y-auto rounded-lg border border-csm-gris-clair divide-y divide-csm-gris-clair">
                    {unsubJournees.map((j) => (
                      <label
                        key={j.id}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                          unsubSelected.has(j.id) ? "bg-csm-orange/5" : "hover:bg-csm-blanc"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={unsubSelected.has(j.id)}
                          onChange={() => toggleUnsubJournee(j.id)}
                          className="h-4 w-4 rounded border-csm-gris-clair text-csm-orange focus:ring-csm-orange"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-csm-bleu">
                            {j.nom || j.code}
                          </span>
                          {j.dateDebut && (
                            <span className="ml-2 text-xs text-csm-gris">
                              {formatJourneeDate(j.dateDebut)}
                            </span>
                          )}
                        </div>
                        {j.mode && (
                          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-csm-gris">
                            {j.mode}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-csm-gris-clair px-6 py-4">
              <button
                type="button"
                onClick={closeUnsub}
                className="rounded-lg border border-csm-gris-clair px-4 py-2 text-sm font-medium text-csm-gris transition-colors hover:bg-csm-blanc"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmUnsub}
                disabled={unsubSelected.size === 0 || unsubSending}
                className="rounded-lg bg-csm-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-csm-orange/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {unsubSending ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Envoi...
                  </span>
                ) : (
                  `Désinscrire${unsubSelected.size > 0 ? ` (${unsubSelected.size})` : ""}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
