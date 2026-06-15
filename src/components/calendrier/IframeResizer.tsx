"use client";

import { useEffect } from "react";

/**
 * Envoie la hauteur du contenu à la fenêtre parente via postMessage afin que
 * l'iframe d'intégration s'ajuste automatiquement — agrandissement ET réduction.
 *
 * On mesure la position du bas réel du contenu (les enfants directs du body),
 * et NON document.documentElement / body.scrollHeight : ces derniers sont
 * plafonnés par la hauteur courante de l'iframe et empêchent toute réduction
 * (l'iframe restait « haute » après le passage d'un contenu long à court).
 */
export default function IframeResizer() {
  useEffect(() => {
    let last = 0;
    let scheduled = false;

    function measure(): number {
      const body = document.body;
      if (!body) return 0;
      // Bas du contenu = plus grande valeur de `bottom` parmi les enfants du
      // body (relatif au haut du viewport, contenu non scrollé en iframe).
      let bottom = 0;
      for (let i = 0; i < body.children.length; i++) {
        const rect = (body.children[i] as HTMLElement).getBoundingClientRect();
        if (rect.bottom > bottom) bottom = rect.bottom;
      }
      // Marge basse éventuelle du body (Tailwind met margin:0, mais on reste sûr).
      const mb = parseFloat(getComputedStyle(body).paddingBottom) || 0;
      const h = Math.ceil(bottom + mb);
      return h > 0 ? h : body.scrollHeight;
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

    // Changements de contenu (ajout/retrait de lignes, changement d'étape...).
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Variations de hauteur du contenu, y compris en baisse.
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
