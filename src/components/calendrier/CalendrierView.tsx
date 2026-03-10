"use client";

import { useState, useEffect, useCallback } from "react";
import type { CalendrierJournee, CalendrierMode } from "@/types/calendrier";
import CalendrierCard from "./CalendrierCard";

// ── date helpers ──

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const r = new Date(d);
  r.setDate(diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  const r = new Date(s);
  r.setDate(s.getDate() + 4); // Friday (Mon + 4)
  return r;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDay(a: string, b: string): boolean {
  return a === b;
}

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// ── component ──

interface CalendrierViewProps {
  email?: string;
  animateurId?: string;
  titre?: string;
  hideAnimateur?: boolean;
}

export default function CalendrierView({ email, animateurId, titre, hideAnimateur }: CalendrierViewProps = {}) {
  const [mode, setMode] = useState<CalendrierMode>("week");
  const [refDate, setRefDate] = useState(() => new Date());
  const [journees, setJournees] = useState<CalendrierJournee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const range = useCallback(() => {
    if (mode === "week") {
      return { start: startOfWeek(refDate), end: endOfWeek(refDate) };
    }
    // For month view, include partial weeks at start/end
    const ms = startOfMonth(refDate);
    const me = endOfMonth(refDate);
    const weekStart = startOfWeek(ms);
    const weekEnd = endOfWeek(me);
    return { start: weekStart, end: weekEnd };
  }, [mode, refDate]);

  useEffect(() => {
    const { start, end } = range();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ start: fmt(start), end: fmt(end) });
    if (animateurId) params.set("animateurId", animateurId);
    else if (email) params.set("email", email);
    fetch(`/api/calendrier?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("Erreur serveur");
        return r.json();
      })
      .then((data) => setJournees(data.journees ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [range, email, animateurId]);

  // navigation
  function prev() {
    setRefDate((d) => {
      if (mode === "week") return addDays(d, -7);
      return new Date(d.getFullYear(), d.getMonth() - 1, 1);
    });
  }
  function next() {
    setRefDate((d) => {
      if (mode === "week") return addDays(d, 7);
      return new Date(d.getFullYear(), d.getMonth() + 1, 1);
    });
  }
  function today() {
    setRefDate(new Date());
  }

  // title
  const { start: rStart, end: rEnd } = range();
  const title =
    mode === "week"
      ? `${rStart.getDate()} ${MOIS[rStart.getMonth()]} – ${rEnd.getDate()} ${MOIS[rEnd.getMonth()]} ${rEnd.getFullYear()}`
      : `${MOIS[refDate.getMonth()]} ${refDate.getFullYear()}`;

  // build day columns (weekdays only)
  const days: Date[] = [];
  {
    let cur = new Date(rStart);
    while (cur <= rEnd) {
      const dow = cur.getDay();
      if (dow >= 1 && dow <= 5) days.push(new Date(cur));
      cur = addDays(cur, 1);
    }
  }

  const todayStr = fmt(new Date());

  function journeesForDay(date: string) {
    return journees.filter((j) => isSameDay(j.date, date));
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-cal-bleu">{titre || "Calendrier"}</h1>

        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-cal-gris-clair overflow-hidden text-sm">
            <button
              onClick={() => setMode("week")}
              className={`px-3 py-1.5 transition-colors ${
                mode === "week"
                  ? "bg-cal-bleu text-white"
                  : "bg-white text-cal-bleu hover:bg-cal-blanc"
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => setMode("month")}
              className={`px-3 py-1.5 transition-colors ${
                mode === "month"
                  ? "bg-cal-bleu text-white"
                  : "bg-white text-cal-bleu hover:bg-cal-blanc"
              }`}
            >
              Mois
            </button>
          </div>

          {/* Navigation */}
          <button
            onClick={prev}
            className="p-1.5 rounded hover:bg-cal-gris-clair transition-colors"
            aria-label="Précédent"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={today}
            className="px-3 py-1 text-sm rounded border border-cal-gris-clair hover:bg-cal-gris-clair transition-colors"
          >
            Aujourd&apos;hui
          </button>
          <button
            onClick={next}
            className="p-1.5 rounded hover:bg-cal-gris-clair transition-colors"
            aria-label="Suivant"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <span className="ml-2 text-base font-semibold">{title}</span>
        </div>
      </div>

      {/* ── Loading / Error ── */}
      {loading && (
        <div className="text-center py-12 text-cal-gris">Chargement…</div>
      )}
      {error && (
        <div className="text-center py-6 text-cal-rouge">{error}</div>
      )}

      {/* ── Week view ── */}
      {!loading && mode === "week" && (
        <>
          {/* Desktop: 7-column grid */}
          <div className="hidden md:grid grid-cols-5 gap-px bg-cal-gris-clair rounded-lg overflow-hidden border border-cal-gris-clair">
            {days.map((day) => {
              const dateStr = fmt(day);
              const isToday = dateStr === todayStr;
              const dayJournees = journeesForDay(dateStr);

              return (
                <div
                  key={dateStr}
                  className="min-h-[200px] flex flex-col bg-white"
                >
                  <div className="px-2 py-2 text-center border-b border-cal-gris-clair">
                    <span className="text-xs text-cal-gris uppercase">
                      {JOURS[day.getDay() - 1]}
                    </span>
                    <div
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full ml-1 text-sm font-semibold ${
                        isToday ? "bg-cal-action text-white" : "text-cal-bleu"
                      }`}
                    >
                      {day.getDate()}
                    </div>
                  </div>
                  <div className="flex-1 p-1 space-y-1">
                    {dayJournees.map((j) => (
                      <CalendrierCard key={j.id} journee={j} compact={false} hideAnimateur={hideAnimateur} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile: vertical list by day */}
          <div className="md:hidden space-y-3">
            {days.map((day) => {
              const dateStr = fmt(day);
              const isToday = dateStr === todayStr;
              const dayJournees = journeesForDay(dateStr);
              if (dayJournees.length === 0) return null;

              return (
                <div key={dateStr}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs text-cal-gris uppercase font-semibold">
                      {JOURS[day.getDay() - 1]}
                    </span>
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold ${
                        isToday ? "bg-cal-action text-white" : "text-cal-bleu"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    <span className="text-xs text-cal-gris">
                      {MOIS[day.getMonth()]}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {dayJournees.map((j) => (
                      <CalendrierCard key={j.id} journee={j} compact={false} hideAnimateur={hideAnimateur} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Month view ── */}
      {!loading && mode === "month" && (
        <>
          {/* Desktop: 7-column grid */}
          <div className="hidden md:block">
            <div className="grid grid-cols-5 gap-px bg-cal-gris-clair rounded-t-lg overflow-hidden border border-cal-gris-clair border-b-0">
              {JOURS.map((j) => (
                <div
                  key={j}
                  className="bg-cal-bleu text-white text-xs text-center py-2 font-semibold uppercase"
                >
                  {j}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-px bg-cal-gris-clair rounded-b-lg overflow-hidden border border-cal-gris-clair">
              {days.map((day) => {
                const dateStr = fmt(day);
                const isToday = dateStr === todayStr;
                const isCurrentMonth = day.getMonth() === refDate.getMonth();
                const dayJournees = journeesForDay(dateStr);

                return (
                  <div
                    key={dateStr}
                    className={`min-h-[120px] flex flex-col ${
                      isCurrentMonth ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <div className="px-2 pt-1 text-right">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                          isToday
                            ? "bg-cal-action text-white"
                            : isCurrentMonth
                            ? "text-cal-bleu"
                            : "text-cal-gris"
                        }`}
                      >
                        {day.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 px-1 pb-1 space-y-0.5">
                      {dayJournees.map((j) => (
                        <CalendrierCard key={j.id} journee={j} compact={true} hideAnimateur={hideAnimateur} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile: vertical list by day */}
          <div className="md:hidden space-y-3">
            {days.map((day) => {
              const dateStr = fmt(day);
              const isToday = dateStr === todayStr;
              const isCurrentMonth = day.getMonth() === refDate.getMonth();
              const dayJournees = journeesForDay(dateStr);
              if (dayJournees.length === 0 && !isCurrentMonth) return null;

              return (
                <div key={dateStr}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs text-cal-gris uppercase font-semibold">
                      {JOURS[day.getDay() - 1]}
                    </span>
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold ${
                        isToday
                          ? "bg-cal-action text-white"
                          : isCurrentMonth
                          ? "text-cal-bleu"
                          : "text-cal-gris"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    <span className="text-xs text-cal-gris">
                      {MOIS[day.getMonth()]}
                    </span>
                  </div>
                  {dayJournees.length > 0 ? (
                    <div className="space-y-1.5">
                      {dayJournees.map((j) => (
                        <CalendrierCard key={j.id} journee={j} compact={false} hideAnimateur={hideAnimateur} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-cal-gris italic pl-2">—</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
