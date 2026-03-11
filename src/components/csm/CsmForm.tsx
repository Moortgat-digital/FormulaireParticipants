"use client";

import { useState, useEffect, useCallback } from "react";
import type { DemandeInscription, CsmWebhookPayload } from "@/types/csm";

interface CsmFormProps {
  formationId: string;
  formationNom: string;
}

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
              <div className="hidden sm:grid sm:grid-cols-[40px_1fr_1fr_1fr_1fr_120px] gap-2 px-4 py-2 text-xs font-semibold text-csm-gris uppercase tracking-wide border-b border-csm-gris-clair">
                <div />
                <div>Participant</div>
                <div>E-mail</div>
                <div>Entreprise</div>
                <div>Groupe</div>
                <div>Statut</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-csm-gris-clair">
                {filtered.map((d) => (
                  <label
                    key={d.id}
                    className={`grid grid-cols-1 sm:grid-cols-[40px_1fr_1fr_1fr_1fr_120px] gap-2 px-4 py-3 items-center cursor-pointer transition-colors ${
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
                        className="h-4 w-4 rounded border-csm-gris-clair text-csm-action focus:ring-csm-action"
                      />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-csm-bleu">
                        {d.prenom} {d.nom}
                      </span>
                      {/* Mobile: show email below name */}
                      <span className="block sm:hidden text-xs text-csm-gris mt-0.5">
                        {d.email}
                      </span>
                    </div>
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
                            : d.statut === "Inscrit"
                            ? "bg-green-100 text-green-800"
                            : d.statut === "Refusé"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {d.statut || "—"}
                      </span>
                    </div>
                  </label>
                ))}
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
    </div>
  );
}
