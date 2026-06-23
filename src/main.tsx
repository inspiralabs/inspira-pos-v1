import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    console.error("[UnhandledRejection]", event.reason);
  });

  window.addEventListener("error", (event) => {
    console.error("[WindowError]", event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });

  // Request persistent storage so IndexedDB data survives browser-close
  // and browser-level "clear on exit" privacy settings.
  // PWA installed apps get this automatically; regular browser sessions need
  // an explicit request. Without this, storeSettings (including onboardingDone)
  // can be evicted, causing a blank onboarding screen on next visit.
  if (navigator.storage?.persist) {
    navigator.storage.persist().catch(() => {
      // Non-fatal — best-effort storage is the fallback
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
