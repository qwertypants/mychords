export type SongRoute = { kind: "library" } | { kind: "songs"; page: number } | { kind: "song"; id: string } | { kind: "not-found" };

export function appRoot(pathname = window.location.pathname): string {
  return pathname.startsWith("/mychords/") ? "/mychords/" : "/";
}

export function readSongRoute(pathname = window.location.pathname, search = window.location.search): SongRoute {
  const root = appRoot(pathname);
  if (pathname === root) return { kind: "library" };
  if (pathname === `${root}songs`) {
    const value = new URLSearchParams(search).get("page");
    const page = value && /^[1-9]\d*$/.test(value) ? Number(value) : 1;
    return { kind: "songs", page: Number.isSafeInteger(page) ? page : 1 };
  }
  const match = /^songs\/([^/]+)$/.exec(pathname.slice(root.length));
  if (!match) return { kind: "not-found" };
  try {
    return { kind: "song", id: decodeURIComponent(match[1]) };
  } catch {
    return { kind: "not-found" };
  }
}

export function songsPath(page = 1): string {
  return `${appRoot()}songs${page > 1 ? `?page=${page}` : ""}`;
}

export function songPath(id: string): string {
  return `${appRoot()}songs/${encodeURIComponent(id)}`;
}
