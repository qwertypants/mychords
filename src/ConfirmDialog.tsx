import { useEffect, useRef } from "react";
export function ConfirmDialog({
  title,
  children,
  onCancel,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  onCancel: () => void;
  actions: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef(
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  useEffect(() => {
    const el = ref.current,
      returnTo = opener.current;
    el?.showModal();
    return () => {
      el?.close();
      queueMicrotask(() => {
        if (returnTo?.isConnected) returnTo.focus();
      });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <p className="eyebrow">YOUR SONG NOTEBOOK</p>
      <h2 id="confirm-title">{title}</h2>
      <div className="confirm-copy">{children}</div>
      <div className="confirm-actions">
        {actions}
        <button className="button secondary" onClick={onCancel} autoFocus>
          Cancel
        </button>
      </div>
    </dialog>
  );
}
