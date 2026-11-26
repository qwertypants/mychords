import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const library = JSON.parse(await readFile(new URL("../e2e/fixtures/pagination-songs.json", import.meta.url), "utf8"));
const serialized = JSON.stringify(JSON.stringify(library)).replaceAll("<", "\\u003c");
const port = 4181;

const server = await createServer({
  server: { host: "0.0.0.0", port, strictPort: true },
  plugins: [{
    name: "sample-song-preview",
    configureServer(vite) {
      vite.middlewares.use("/load-sample-songs", (_request, response) => {
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end(`<!doctype html><html lang="en"><title>Loading sample songs</title><script>localStorage.setItem("mychords.library.v1", ${serialized}); location.replace("/songs?page=2");</script></html>`);
      });
    },
  }],
});

await server.listen();
server.printUrls();
console.log(`Sample songs: http://localhost:${port}/load-sample-songs`);
