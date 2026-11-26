import { useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ArrowLeft,
  ArrowRight,
  Plus,
  Play,
  Trash2,
  X,
} from "lucide-react";
import type { Section, ChordEntry } from "./types";
import type { Voicing } from "../chords/types";
import { getVoicing } from "../chords/catalog";
import { ChordDiagram } from "../chords/ChordDiagram";
import { positionOf } from "../chords/pitch";
import { previewEntryId } from "../audio/guitar";
import { useViewEntrance } from "../motion";
type Props = {
  section: Section;
  index: number;
  activeEntryId: string | null;
  strumInterval?: number;
  onRename: (name: string) => void;
  onRemove: () => void;
  onAdd: () => void;
  onHear: (v: Voicing, entryId: string, stringIndex?: number) => void;
  onPlay: () => void;
  onMove: (id: string, index: number) => void;
  onRemoveChord: (id: string) => void;
};
function ChordCard({
  entry,
  index,
  total,
  active,
  strumInterval,
  onMove,
  onRemove,
  onHear,
}: {
  entry: ChordEntry;
  index: number;
  total: number;
  active: boolean;
  strumInterval?: number;
  onMove: (index: number) => void;
  onRemove: () => void;
  onHear: Props["onHear"];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });
  const voicing = getVoicing(entry.voicingId);
  if (!voicing) return null;
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`song-chord ${active ? "is-playing" : ""} ${isDragging ? "is-dragging" : ""}`}
      data-entry-id={entry.id}
      data-voicing={voicing.id}
    >
      <span className="motion-card-edge" aria-hidden="true" />
      <div className="card-top">
        <span className="chord-index">
          {String(index + 1).padStart(2, "0")}
        </span>
        <button
          className="drag-handle icon-button"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${voicing.label}, position ${index + 1}`}
        >
          <GripVertical size={18} />
        </button>
      </div>
      <div className="song-chord-name">
        <h3>{voicing.label}</h3>
        <span>Fret {positionOf(voicing.frets)}</span>
      </div>
      <ChordDiagram
        voicing={voicing}
        playing={active}
        strumInterval={strumInterval}
        onNote={(stringIndex) => onHear(voicing, `song-note:${entry.id}:${stringIndex}`, stringIndex)}
      />
      <button
        className="hear-chord"
        onClick={() => onHear(voicing, previewEntryId("song", entry.id))}
        aria-label={`Hear ${voicing.label}, position ${index + 1}`}
      >
        <Play size={18} fill="currentColor" aria-hidden="true" />
      </button>
      <div className="card-bottom">
        <button
          className="icon-button"
          onClick={() => onMove(index - 1)}
          disabled={index === 0}
          aria-label={`Move ${voicing.label} earlier, position ${index + 1}`}
        >
          <ArrowLeft size={16} />
        </button>
        <button
          className="icon-button"
          onClick={() => onMove(index + 1)}
          disabled={index === total - 1}
          aria-label={`Move ${voicing.label} later, position ${index + 1}`}
        >
          <ArrowRight size={16} />
        </button>
        <button
          className="icon-button remove-chord"
          onClick={onRemove}
          aria-label={`Remove ${voicing.label}, position ${index + 1}`}
        >
          <X size={15} />
        </button>
      </div>
    </article>
  );
}
export function SectionEditor({
  section,
  index,
  activeEntryId,
  strumInterval,
  onRename,
  onRemove,
  onAdd,
  onHear,
  onPlay,
  onMove,
  onRemoveChord,
}: Props) {
  const sectionElement = useRef<HTMLElement>(null);
  useViewEntrance(sectionElement);
  const [announcement, setAnnouncement] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 7 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  function move(id: string, target: number) {
    const v = getVoicing(
      section.chords.find((c) => c.id === id)?.voicingId ?? "",
    );
    onMove(id, target);
    setAnnouncement(
      `Moved ${v?.label ?? "chord"} to position ${target + 1} of ${section.chords.length} in ${section.name}.`,
    );
  }
  return (
    <section
      ref={sectionElement}
      className="song-section"
      aria-label={`Section ${section.name || index + 1}`}
    >
      <header className="section-header" data-motion-entrance>
        <span className="section-number" data-motion-heading>
          {String(index + 1).padStart(2, "0")}
        </span>
        <label className="section-title">
          <span className="sr-only">Section name</span>
          <input
            value={section.name}
            maxLength={200}
            placeholder="Section name"
            onChange={(e) => onRename(e.target.value)}
          />
        </label>
        <span className="section-count">{section.chords.length} chords</span>
        <div className="section-controls">
          <button
            className="icon-button"
            onClick={onPlay}
            disabled={!section.chords.length}
            aria-label={`Play section ${section.name}`}
          >
            <Play size={17} />
          </button>
          <button
            className="icon-button muted"
            onClick={onRemove}
            aria-label={`Remove section ${section.name}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (over && active.id !== over.id)
            move(
              String(active.id),
              section.chords.findIndex((c) => c.id === over.id),
            );
        }}
      >
        <SortableContext
          items={section.chords.map((c) => c.id)}
          strategy={rectSortingStrategy}
        >
          <div className="section-chords" data-motion-entrance>
            {section.chords.map((entry, i) => (
              <ChordCard
                key={entry.id}
                entry={entry}
                index={i}
                total={section.chords.length}
                active={activeEntryId === previewEntryId("song", entry.id)}
                strumInterval={strumInterval}
                onMove={(target) => move(entry.id, target)}
                onRemove={() => onRemoveChord(entry.id)}
                onHear={onHear}
              />
            ))}
            <button
              className={`add-chord-tile ${section.chords.length ? "" : "empty"}`}
              onClick={(e) => {
                e.currentTarget.focus();
                onAdd();
              }}
              aria-label="Add chord"
            >
              <span className="add-circle">
                <Plus size={22} />
              </span>
              <strong>Add chord</strong>
              <span>
                {section.chords.length
                  ? "Find the next sound"
                  : "Find a shape you love"}
              </span>
            </button>
          </div>
        </SortableContext>
      </DndContext>
      <span className="sr-only" role="status">
        {announcement}
      </span>
    </section>
  );
}
