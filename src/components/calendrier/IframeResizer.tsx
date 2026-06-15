"use client";

import { useEffect } from "react";

/**
 * Envoie la hauteur du contenu à la fenêtre parente via postMessage afin que
 * l'iframe d'intégration s'ajuste automatiquement — agrandissement ET réduction.
 *
 * Anti-boucle : on ne remesure PAS suite à nos propres redimensionnements
 * (pas d'écouteur `resize` ni de ResizeObserver, qui créaient un cycle
 * « on rétrécit → le contenu reflow plus haut → on remesure plus grand »).
 * On ne réagit qu'aux vrais changements de contenu (MutationObserver), avec
 * une courte fenêtre d'ignorance après chaque émission pour laisser le layout
 * se stabiliser.
 */
export default function IframeResizer() {
  useEffect(() => {
    let last = 0;
    let scheduled = false;
    let ignoreUntil = 0;
    const IGNORE_MS = 700;

    function measure(): number {
      const body = document.body;
      if (!body) return 0;
      let h = 0;
      for (let i = 0; i < body.children.length; i++) {
        const el = body.children[i] as HTMLElement;
        if (el.offsetParent === null && el !== body) continue; // hors flux
        const bottom = el.offsetTop + el.offsetHeight;
        if (bottom > h) h = bottom;
      }
      const pb = parseFloat(getComputedStyle(body).paddingBottom) || 0;
      const total = Math.ceil(h + pb);
      return total > 0 ? total : body.scrollHeight;
    }

    function post() {
      scheduled = false;
      const now = performance.now();
      // Pendant la fenêtre d'ignorance (juste après une émission), on diffère
      // la mesure au lieu d'agir : ça casse l'oscillation due au reflow.
      if (now < ignoreUntil) {
        window.setTimeout(schedule, ignoreUntil - now + 10);
        return;
      }
      const h = measure();
      if (h > 0 && h !== last) {
        last = h;
        ignoreUntil = performance.now() + IGNORE_MS;
        console.log(
          "[IframeResizer v5] hauteur émise:",
          h,
          "| viewport h×w=",
          document.documentElement.clientHeight,
          "×",
          document.documentElement.clientWidth
        );
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

    // Uniquement les vrais changements de contenu (ajout/retrait de lignes,
    // changement d'étape...). PAS d'écouteur resize / ResizeObserver.
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
