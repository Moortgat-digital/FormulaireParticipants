"use client";

import { useEffect } from "react";

/**
 * Envoie la hauteur du contenu à la fenêtre parente via postMessage afin que
 * l'iframe d'intégration s'ajuste automatiquement — agrandissement ET réduction.
 *
 * On mesure le <body> (et non documentElement, dont le scrollHeight est borné
 * par la hauteur courante de l'iframe et empêche toute réduction).
 */
export default function IframeResizer() {
  useEffect(() => {
    let last = 0;
    let scheduled = false;

    function measure(): number {
      const body = document.body;
      if (!body) return 0;
      return Math.ceil(
        Math.max(
          body.scrollHeight,
          body.offsetHeight,
          body.getBoundingClientRect().height
        )
      );
    }

    function post() {
      scheduled = false;
      const h = measure();
      if (h > 0 && h !== last) {
        last = h;
        window.parent.postMessage({ type: "resize-iframe", height: h }, "*");
      }
    }

    function schedule() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(post);
    }

    schedule();
    window.addEventListener("resize", schedule);
    window.addEventListener("load", schedule);

    // Détecte les changements de contenu (ajout/retrait de lignes, étapes...).
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Détecte directement les variations de hauteur du body (y compris en baisse).
    let ro: ResizeObserver | undefined;
    if ("ResizeObserver" in window && document.body) {
      ro = new ResizeObserver(schedule);
      ro.observe(document.body);
    }

    // Mesures différées pour les layouts / polices chargés tardivement.
    const timers = [150, 400, 1000].map((t) => window.setTimeout(schedule, t));

    return () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("load", schedule);
      observer.disconnect();
      ro?.disconnect();
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  return null;
}
