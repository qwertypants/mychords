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
  Square,
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
import { catalog, getVoicing } from "../chords/catalog";
import { groupChords } from "../chords/browse";
import { ChordDiagram } from "../chords/ChordDiagram";
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
  playing: boolean;
  onStop: () => void;
  onMove: (id: string, index: number) => void;
  onChangeVoicing: (id: string, voicingId: string) => void;
  onRemoveChord: (id: string) => void;
};
const shapesByChord = new Map(
  groupChords(catalog).map((group) => [group.id, group.voicings]),
);
function ChordCard({
  entry,
  index,
  active,
  strumInterval,
  onSelectShape,
  onRemove,
  onHear,
}: {
  entry: ChordEntry;
  index: number;
  active: boolean;
  strumInterval?: number;
  onSelectShape: (voicingId: string) => void;
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
  const shapes = shapesByChord.get(`${voicing.root}:${voicing.suffix}`) ?? [voicing];
  const shapeIndex = shapes.findIndex((shape) => shape.id === voicing.id);
  const previous = shapes[shapeIndex - 1];
  const next = shapes[shapeIndex + 1];
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`song-chord ${active ? "is-playing" : ""} ${isDragging ? "is-dragging" : ""}`}
      data-entry-id={entry.id}
      data-voicing={voicing.id}
    >
      <span className="motion-card-edge" aria-hidden="true" />
      <div className="song-chord-name">
        <h3>{voicing.label}</h3>
        <button
          className="drag-handle icon-button"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${voicing.label}, position ${index + 1}`}
        >
          <GripVertical size={18} />
        </button>
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
          onClick={() => previous && onSelectShape(previous.id)}
          disabled={!previous}
          aria-label={`Previous shape for ${voicing.label}, position ${index + 1}`}
        >
          <ArrowLeft size={16} />
        </button>
        <button
          className="icon-button"
          onClick={() => next && onSelectShape(next.id)}
          disabled={!next}
          aria-label={`Next shape for ${voicing.label}, position ${index + 1}`}
        >
          <ArrowRight size={16} />
        </button>
        <button
          className="icon-button remove-chord"
          onClick={(event) => { event.currentTarget.focus(); onRemove(); }}
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
  playing,
  onStop,
  onMove,
  onChangeVoicing,
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
            onClick={playing ? onStop : onPlay}
            disabled={!section.chords.length}
            aria-label={`${playing ? "Stop" : "Play"} section ${section.name}`}
          >
            {playing ? <Square size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
          </button>
          <button
            className="icon-button muted"
            onClick={(event) => { event.currentTarget.focus(); onRemove(); }}
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
                active={activeEntryId === previewEntryId("song", entry.id)}
                strumInterval={strumInterval}
                onSelectShape={(voicingId) => onChangeVoicing(entry.id, voicingId)}
                onRemove={() => onRemoveChord(entry.id)}
                onHear={onHear}
              />
            ))}
            <button
              className="add-chord-button"
              onClick={(e) => {
                e.currentTarget.focus();
                onAdd();
              }}
              aria-label="Add chord"
            >
              <Plus size={17} aria-hidden="true" />
              Add chord
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
