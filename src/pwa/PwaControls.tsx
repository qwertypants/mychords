import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { ConfirmDialog } from "../ConfirmDialog";
import "./pwa.css";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: InstallPrompt;
  }
  interface Navigator {
    standalone?: boolean;
  }
}

export function PwaControls({ dirty = false }: { dirty?: boolean }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [instructions, setInstructions] = useState(false);
  const [installError, setInstallError] = useState(false);
  const [standalone, setStandalone] = useState(() =>
    window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true,
  );
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const [later, setLater] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const [activating, setActivating] = useState(false);
  const launch = useRef(true);
  const { offlineReady: [offlineReady], needRefresh: [needRefresh] } = useRegisterSW({
    onRegisteredSW(_url, workerRegistration) { setRegistration(workerRegistration); },
  });

  useEffect(() => {
    const used = () => { launch.current = false; };
    window.addEventListener("pointerdown", used, true);
    window.addEventListener("keydown", used, true);
    return () => {
      window.removeEventListener("pointerdown", used, true);
      window.removeEventListener("keydown", used, true);
    };
  }, []);

  useEffect(() => {
    if (!registration) return;
    let checking = false;
    const check = async () => {
      if (checking || !navigator.onLine || document.visibilityState !== "visible") return;
      checking = true;
      try { await registration.update(); } catch { /* Keep the active offline release. */ }
      finally { checking = false; }
      if (launch.current && !registration.installing && !registration.waiting) launch.current = false;
    };
    const foreground = () => { if (document.visibilityState === "visible") void check(); };
    const online = () => { void check(); };
    void check();
    const timer = window.setInterval(() => { void check(); }, 15 * 60 * 1000);
    document.addEventListener("visibilitychange", foreground);
    window.addEventListener("online", online);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", foreground);
      window.removeEventListener("online", online);
    };
  }, [registration]);

  async function applyUpdate() {
    if (dirty) {
      setUpdateMessage("Save your song before updating. Use Retry saving if needed.");
      return;
    }
    const worker = registration?.waiting;
    if (!worker || activating) return;
    setActivating(true);
    const channel = new MessageChannel();
    const result = await new Promise<string>((resolve) => {
      const timeout = window.setTimeout(() => resolve("failed"), 5000);
      channel.port1.onmessage = (event: MessageEvent<string>) => {
        window.clearTimeout(timeout);
        resolve(event.data);
      };
      worker.postMessage({ type: "MYCHORDS_ACTIVATE" }, [channel.port2]);
    });
    channel.port1.close();
    if (result === "activating") {
      const reload = () => window.location.reload();
      navigator.serviceWorker.addEventListener("controllerchange", reload, { once: true });
      // The worker may have activated before the response arrived.
      if (worker.state === "activated") reload();
    } else {
      setActivating(false);
      setUpdateMessage(result === "other-windows"
        ? "Close or update your other MyChords windows first, then try again."
        : "Could not apply the update. Please try again.");
    }
  }

  useEffect(() => {
    if (needRefresh && registration?.waiting && launch.current && !dirty) {
      launch.current = false;
      void applyUpdate();
    }
  // Attempt automatic activation only when a ready update first appears.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needRefresh, registration]);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const installed = () => {
      setStandalone(true);
      setInstallPrompt(null);
      setInstructions(false);
    };
    const modeChanged = () => setStandalone(displayMode.matches || navigator.standalone === true);
    const offered = (event: InstallPrompt) => {
      event.preventDefault();
      setInstallPrompt(event);
      setInstallError(false);
    };
    window.addEventListener("beforeinstallprompt", offered);
    window.addEventListener("appinstalled", installed);
    displayMode.addEventListener("change", modeChanged);
    return () => {
      window.removeEventListener("beforeinstallprompt", offered);
      window.removeEventListener("appinstalled", installed);
      displayMode.removeEventListener("change", modeChanged);
    };
  }, []);

  async function install() {
    if (!installPrompt) {
      setInstructions(true);
      return;
    }
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setStandalone(true);
    } catch {
      setInstallError(true);
    } finally {
      setInstallPrompt(null);
    }
  }

  return (
    <>
      <div className="pwa-controls">
        <p role="status">
          {needRefresh && !later
            ? updateMessage || (dirty ? "Save your song before updating." : "Update ready.")
            : offlineReady ? "Ready offline · Chords, songs and guitar sound" : ""}
        </p>
        {needRefresh && !later && (
          <>
            <button className="text-button" disabled={dirty || activating} onClick={() => void applyUpdate()}>Update now</button>
            <button className="text-button" onClick={() => setLater(true)}>Later</button>
          </>
        )}
        {needRefresh && later && <button className="text-button" onClick={() => setLater(false)}>Update available</button>}
        {!standalone && (installPrompt || isIOS) && (
          <button className="text-button" onClick={() => void install()}>
            Install MyChords
          </button>
        )}
        {installError && <p role="alert">Installation could not start. Use your browser’s install menu.</p>}
      </div>
      {instructions && (
        <ConfirmDialog title="Install MyChords" onCancel={() => setInstructions(false)} actions={null}>
          <p>In Safari, open the Share menu, choose Add to Home Screen, then tap Add.</p>
          <p>Wait for “Ready offline” before using MyChords without a connection. Songs stay on this device; browser and installed-app storage may be separate.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
