import { useEffect, useState } from "react";
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

export function PwaControls() {
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [instructions, setInstructions] = useState(false);
  const [installError, setInstallError] = useState(false);
  const [standalone, setStandalone] = useState(() =>
    window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true,
  );
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const { offlineReady: [offlineReady], needRefresh: [needRefresh] } = useRegisterSW();

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
          {needRefresh
            ? "Update ready. Save your changes, then close all MyChords windows and reopen to update."
            : offlineReady ? "Ready offline · Chords, songs and guitar sound" : ""}
        </p>
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
