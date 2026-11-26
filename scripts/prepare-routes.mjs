import { copyFile } from "node:fs/promises";

// GitHub Pages serves this shell for direct visits to client-side song routes.
await copyFile(new URL("../dist/index.html", import.meta.url), new URL("../dist/404.html", import.meta.url));
