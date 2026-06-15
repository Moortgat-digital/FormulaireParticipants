import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Suivi des interfaces — Panoorama",
  description: "Tableau de bord interne de suivi des formulaires et interfaces.",
  robots: { index: false, follow: false },
};

// URL de production (base Vercel). Sert à construire les exemples de liens.
const BASE_URL = "https://formulaire-participants.vercel.app";

type Statut = "Production" | "Bêta" | "Brouillon";

interface Param {
  nom: string;
  requis: boolean;
  note?: string;
}

interface Interface {
  nom: string;
  route: string;
  statut: Statut;
  public: string;
  description: string;
  params: Param[];
  donnees: string;
  notes?: string;
}

const INTERFACES: Interface[] = [
  {
    nom: "Inscription participants",
    route: "/",
    statut: "Production",
    public: "Formateurs (Softr)",
    description:
      "Formulaire d'inscription des participants à une formation. Parcours en 2 étapes (sélection du groupe + saisie) avec copier-coller depuis Excel. Intégré en iframe dans les pages Formation de Softr.",
    params: [
      { nom: "recordId", requis: true, note: "ID Notion de la formation" },
      { nom: "submitted_by", requis: false, note: "E-mail du formateur connecté" },
    ],
    donnees: "Notion — Demandes d'inscription",
    notes:
      "Dépend de la structure BSoft → Notion (formation, sessions, journées). Sans journées, aucun groupe n'est proposé.",
  },
  {
    nom: "Gestion des inscriptions",
    route: "/csm",
    statut: "Production",
    public: "CSM",
    description:
      "Validation des demandes d'inscription : sélection, édition, suppression, désinscription, détection de doublons et export CSV par groupe.",
    params: [{ nom: "recordId", requis: true, note: "ID Notion de la formation" }],
    donnees: "Notion — Demandes d'inscription",
  },
  {
    nom: "Calendrier (général)",
    route: "/calendrier",
    statut: "Production",
    public: "Interne",
    description:
      "Vue calendrier de l'ensemble des sessions et journées.",
    params: [],
    donnees: "Notion — Calendrier / Sessions",
  },
  {
    nom: "Calendrier animateur",
    route: "/calendrier-animateur",
    statut: "Production",
    public: "Animateurs (Softr)",
    description:
      "Calendrier personnel d'un animateur, filtré sur ses propres sessions.",
    params: [
      { nom: "email", requis: false, note: "E-mail de l'animateur" },
      { nom: "animateurId", requis: false, note: "ID Notion de l'animateur" },
    ],
    donnees: "Notion — Calendrier / Animateurs",
    notes: "Au moins un des deux paramètres (email ou animateurId) est requis.",
  },
  {
    nom: "Gestion des lieux",
    route: "/lieux",
    statut: "Production",
    public: "Interne / Logistique",
    description:
      "Saisie et gestion des lieux par journée pour une formation (présentiel / distanciel).",
    params: [{ nom: "formation_id", requis: true, note: "ID Notion de la formation" }],
    donnees: "Notion — Lieux / Sessions",
  },
];

function StatutBadge({ statut }: { statut: Statut }) {
  const cls =
    statut === "Production"
      ? "bg-green-100 text-green-800"
      : statut === "Bêta"
      ? "bg-amber-100 text-amber-800"
      : "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {statut}
    </span>
  );
}

export default function AdminPage() {
  const total = INTERFACES.length;
  const enProd = INTERFACES.filter((i) => i.statut === "Production").length;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-8">
          <h1
            className="text-3xl font-bold text-gray-900"
            style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
          >
            Suivi des interfaces
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Tableau de bord interne — formulaires et interfaces déployés pour Panoorama.
          </p>

          {/* Stats */}
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Interfaces</p>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">En production</p>
              <p className="text-2xl font-bold text-green-700">{enProd}</p>
            </div>
          </div>
        </header>

        {/* Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {INTERFACES.map((it) => (
            <article
              key={it.route}
              className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900">{it.nom}</h2>
                <StatutBadge statut={it.statut} />
              </div>

              <code className="mb-3 inline-block w-fit rounded bg-gray-100 px-2 py-0.5 text-sm font-medium text-gray-700">
                {it.route}
              </code>

              <p className="mb-4 flex-1 text-sm text-gray-600">{it.description}</p>

              <dl className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 font-medium text-gray-400">Public</dt>
                  <dd className="text-gray-700">{it.public}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 font-medium text-gray-400">Données</dt>
                  <dd className="text-gray-700">{it.donnees}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 font-medium text-gray-400">Paramètres</dt>
                  <dd className="text-gray-700">
                    {it.params.length === 0 ? (
                      <span className="text-gray-400">Aucun</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {it.params.map((p) => (
                          <li key={p.nom}>
                            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-700">
                              {p.nom}
                            </code>
                            <span
                              className={`ml-1.5 text-xs ${
                                p.requis ? "text-csm-orange font-medium" : "text-gray-400"
                              }`}
                            >
                              {p.requis ? "requis" : "optionnel"}
                            </span>
                            {p.note && <span className="ml-1 text-xs text-gray-400">— {p.note}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </dd>
                </div>
              </dl>

              {it.notes && (
                <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  ⚠ {it.notes}
                </p>
              )}

              <p className="mt-4 truncate text-xs text-gray-400" title={`${BASE_URL}${it.route}`}>
                {BASE_URL}
                {it.route}
              </p>
            </article>
          ))}
        </div>

        <footer className="mt-8 text-center text-xs text-gray-400">
          Page interne, non indexée. Mise à jour manuelle dans{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5">src/app/admin/page.tsx</code>.
        </footer>
      </div>
    </main>
  );
}
