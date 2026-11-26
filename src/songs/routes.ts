export type SongRoute = { kind: "library" } | { kind: "song"; id: string } | { kind: "not-found" };

export function appRoot(pathname = window.location.pathname): string {
  return pathname.startsWith("/mychords/") ? "/mychords/" : "/";
}

export function readSongRoute(pathname = window.location.pathname): SongRoute {
  const root = appRoot(pathname);
  if (pathname === root) return { kind: "library" };
  const match = /^songs\/([^/]+)$/.exec(pathname.slice(root.length));
  if (!match) return { kind: "not-found" };
  try {
    return { kind: "song", id: decodeURIComponent(match[1]) };
  } catch {
    return { kind: "not-found" };
  }
}

export function songPath(id: string): string {
  return `${appRoot()}songs/${encodeURIComponent(id)}`;
}
