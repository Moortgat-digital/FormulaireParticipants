"use client";

import { useEffect } from "react";

/**
 * Sends the document height to the parent window via postMessage
 * so the embedding iframe can auto-resize with no scrollbars.
 */
export default function IframeResizer() {
  useEffect(() => {
    function sendHeight() {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: "resize-iframe", height }, "*");
    }

    // Send on load, on resize, and on DOM changes
    sendHeight();
    window.addEventListener("resize", sendHeight);

    const observer = new MutationObserver(sendHeight);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      window.removeEventListener("resize", sendHeight);
      observer.disconnect();
    };
  }, []);

  return null;
}
