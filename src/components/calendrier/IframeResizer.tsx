"use client";

import { useEffect } from "react";

/**
 * Envoie la hauteur du contenu à la fenêtre parente via postMessage afin que
 * l'iframe d'intégration s'ajuste automatiquement — agrandissement ET réduction.
 *
 * Mesure via `offsetTop + offsetHeight` des enfants du body : ces propriétés
 * de mise en page sont indépendantes du viewport ET du défilement, contrairement
 * à scrollHeight (plafonné par la hauteur de l'iframe) ou getBoundingClientRect
 * (dépend du scroll) — ce qui évite le plafonnement et les boucles de rétroaction
 * où l'iframe « regrossit » toute seule.
 */
export default function IframeResizer() {
  useEffect(() => {
    let last = 0;
    let scheduled = false;

    function measure(): number {
      const body = document.body;
      if (!body) return 0;
      let h = 0;
      for (let i = 0; i < body.children.length; i++) {
        const el = body.children[i] as HTMLElement;
        // Élément hors flux (fixed/sticky) : on l'ignore pour la hauteur du flux.
        if (el.offsetParent === null && el !== body) continue;
        const bottom = el.offsetTop + el.offsetHeight;
        if (bottom > h) h = bottom;
      }
      const pb = parseFloat(getComputedStyle(body).paddingBottom) || 0;
      const total = Math.ceil(h + pb);
      return total > 0 ? total : body.scrollHeight;
    }

    function post() {
      scheduled = false;
      const h = measure();
      if (h > 0 && h !== last) {
        last = h;
        // Marqueur de version : confirme en console quelle version d'émetteur
        // tourne réellement dans l'iframe (utile en cas de cache/déploiement).
        console.log("[IframeResizer v3-offset] hauteur émise:", h);
        window.parent.postMessage({ type: "resize-iframe", height: h }, "*");
      }
    }

    function schedule() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(post);
    }

    schedule();
    window.addEventListener("load", schedule);
    // Sûr désormais : la mesure ne dépend pas du viewport, donc redimensionner
    // l'iframe ne peut pas relancer une boucle (la hauteur mesurée est stable).
    window.addEventListener("resize", schedule);

    // Changements de contenu (ajout/retrait de lignes, changement d'étape...).
    // On n'observe PAS les attributs : ils ne changent pas la hauteur du flux
    // et génèrent du bruit pouvant entretenir une boucle.
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Mesures différées pour les layouts / polices chargés tardivement.
    const timers = [150, 400, 1000].map((t) => window.setTimeout(schedule, t));

    return () => {
      window.removeEventListener("load", schedule);
      observer.disconnect();
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  return null;
}
