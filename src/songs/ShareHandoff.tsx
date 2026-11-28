import { useEffect, useState } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void> };

export function ShareHandoff({ link, name, onContinue }: { link: string; name: string; onContinue: () => void }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const agent = navigator.userAgent;
  const appleMobile = /iPhone|iPad|iPod/.test(agent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const macSafari = /Macintosh/.test(agent) && /Safari/.test(agent) && !/Chrome|Chromium|Edg/.test(agent) && !appleMobile;
  useEffect(() => {
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }
  return (
    <main className="share-handoff" id="main-content" tabIndex={-1}>
      <p className="eyebrow">A SONG FOR YOUR NOTEBOOK</p>
      <h1>Open {name || "this song"} in MyChords</h1>
      <p>If MyChords is installed, use your browser’s open in app control. The song link stays here until you choose how to open it.</p>
      {prompt && <button className="button primary" onClick={async () => { await prompt.prompt(); setPrompt(null); }}>Install MyChords</button>}
      {appleMobile && <p>To install, open the browser’s Share menu and choose Add to Home Screen. Then copy this link and use Open shared link in MyChords.</p>}
      {macSafari && <p>In Safari, look for Open in web app in the address bar or page menu when available. For a first install, choose File → Add to Dock. Then copy this link and open it in MyChords.</p>}
      <div className="share-handoff-actions">
        <button className="button secondary" onClick={copy}>Copy song link</button>
        <button className="button primary" onClick={onContinue}>Continue in browser</button>
      </div>
      {copyState === "copied" && <p role="status">Link copied.</p>}
      {copyState === "failed" && <div role="alert"><p>Could not copy the link. Select and copy it below.</p><input aria-label="Shared song link" className="shared-link-input" readOnly value={link} onFocus={(event) => event.currentTarget.select()} /></div>}
    </main>
  );
}
