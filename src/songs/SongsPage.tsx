import { Plus } from "lucide-react";
import type { Song } from "./types";
import { SongCards } from "./SongLibrary";

const PAGE_SIZE = 12;

export function SongsPage({ songs, page, onPage, onNew, onOpen }: {
  songs: Song[];
  page: number;
  onPage: (page: number) => void;
  onNew: () => void;
  onOpen: (song: Song) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(songs.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;

  return (
    <main className="library-main songs-page" id="main-content" tabIndex={-1}>
      <section className="saved-songs">
        <header className="library-section-header">
          <h1>Your songs <span>{songs.length.toString().padStart(2, "0")}</span></h1>
          <button className="button secondary" onClick={onNew}><Plus size={16} /> New song</button>
        </header>
        {songs.length ? (
          <SongCards songs={songs.slice(start, start + PAGE_SIZE)} start={start} onOpen={onOpen} />
        ) : (
          <div className="library-empty">
            <h2>Every idea deserves a page.</h2>
            <p>Your songs will live here, ready for the next time you pick up your guitar.</p>
            <button className="text-button" onClick={onNew}>Start your first song</button>
          </div>
        )}
        {totalPages > 1 && (
          <nav className="songs-pagination" aria-label="Song pages">
            <button className="button secondary" disabled={currentPage === 1} onClick={() => onPage(currentPage - 1)}>Previous</button>
            <span aria-live="polite">Page {currentPage} of {totalPages}</span>
            <button className="button secondary" disabled={currentPage === totalPages} onClick={() => onPage(currentPage + 1)}>Next</button>
          </nav>
        )}
      </section>
    </main>
  );
}
