interface SequencerNote {
  id: string;
  step: number;
  note: number;
  duration: number;
}

export class SequencerBoard {
  private _notes: Map<string, SequencerNote>;
  private _container: HTMLElement;
  private _grid: HTMLElement[][];
  private _scheduledEvents: Set<string>;
  private _isDragging: boolean;
  private _isResizing: boolean;
  private _dragStartStep: number;
  private _dragStartNote: number;
  private _currentDragNote: SequencerNote | null;

  readonly STEPS = 16;
  readonly NOTES = [72, 67, 64, 60]; // C5, G4, E4, C4 (top to bottom)
  readonly NOTE_NAMES = ["C5", "G4", "E4", "C4"];

  constructor(container: HTMLElement) {
    this._notes = new Map();
    this._container = container;
    this._grid = [];
    this._scheduledEvents = new Set();
    this._isDragging = false;
    this._isResizing = false;
    this._dragStartStep = 0;
    this._dragStartNote = 0;
    this._currentDragNote = null;

    this._createGrid();
    this._setupEventListeners();
  }

  get notes(): SequencerNote[] {
    return Array.from(this._notes.values());
  }

  private _createGrid() {
    this._container.innerHTML = "";
    this._container.className = "sequencer-board";

    // Create header with step numbers
    const header = document.createElement("div");
    header.className = "sequencer-header";

    const cornerCell = document.createElement("div");
    cornerCell.className = "sequencer-corner";
    header.appendChild(cornerCell);

    for (let step = 0; step < this.STEPS; step++) {
      const stepHeader = document.createElement("div");
      stepHeader.className = "sequencer-step-header";
      stepHeader.textContent = (step + 1).toString();
      header.appendChild(stepHeader);
    }
    this._container.appendChild(header);

    // Create grid rows
    for (let noteIndex = 0; noteIndex < this.NOTES.length; noteIndex++) {
      const row = document.createElement("div");
      row.className = "sequencer-row";

      // Note label
      const noteLabel = document.createElement("div");
      noteLabel.className = "sequencer-note-label";
      noteLabel.textContent = this.NOTE_NAMES[noteIndex];
      row.appendChild(noteLabel);

      const gridRow: HTMLElement[] = [];

      for (let step = 0; step < this.STEPS; step++) {
        const cell = document.createElement("div");
        cell.className = "sequencer-cell";
        cell.dataset.step = step.toString();
        cell.dataset.note = this.NOTES[noteIndex].toString();
        cell.dataset.noteIndex = noteIndex.toString();
        row.appendChild(cell);
        gridRow.push(cell);
      }

      this._grid.push(gridRow);
      this._container.appendChild(row);
    }
  }

  private _setupEventListeners() {
    this._container.addEventListener("mousedown", this._onMouseDown.bind(this));
    document.addEventListener("mousemove", this._onMouseMove.bind(this));
    document.addEventListener("mouseup", this._onMouseUp.bind(this));
  }

  private _onMouseDown(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (
      !target.classList.contains("sequencer-cell") &&
      !target.classList.contains("sequencer-note")
    ) {
      return;
    }

    e.preventDefault();

    if (target.classList.contains("sequencer-note")) {
      // Start dragging or resizing existing note
      const noteId = target.dataset.noteId;
      const note = noteId ? this._notes.get(noteId) : null;
      if (!note) return;

      const rect = target.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const isResizeHandle = mouseX > rect.width - 10; // 10px resize handle

      if (isResizeHandle) {
        this._isResizing = true;
        this._currentDragNote = note;
      } else {
        this._isDragging = true;
        this._currentDragNote = note;
        this._dragStartStep = note.step;
        this._dragStartNote = note.note;
      }
    } else {
      // Click on empty cell - add new note
      const step = parseInt(target.dataset.step!);
      const note = parseInt(target.dataset.note!);
      this._addNote(step, note, 1);
    }
  }

  private _onMouseMove(e: MouseEvent) {
    if (!this._isDragging && !this._isResizing) return;
    if (!this._currentDragNote) return;

    const target = document.elementFromPoint(
      e.clientX,
      e.clientY,
    ) as HTMLElement;
    if (!target || !target.classList.contains("sequencer-cell")) return;

    const step = parseInt(target.dataset.step!);
    const note = parseInt(target.dataset.note!);

    if (this._isDragging) {
      // Move note to new position
      this._currentDragNote.step = step;
      this._currentDragNote.note = note;
      this._renderNotes();
    } else if (this._isResizing) {
      // Resize note duration
      const newDuration = Math.max(1, step - this._currentDragNote.step + 1);
      this._currentDragNote.duration = Math.min(
        newDuration,
        this.STEPS - this._currentDragNote.step,
      );
      this._renderNotes();
    }
  }

  private _onMouseUp(e: MouseEvent) {
    if (this._isDragging || this._isResizing) {
      this._renderNotes();
    }

    this._isDragging = false;
    this._isResizing = false;
    this._currentDragNote = null;
  }

  private _addNote(step: number, note: number, duration: number = 1) {
    // Remove any existing note at this position
    this._removeNoteAt(step, note);

    const id = `note-${Date.now()}-${Math.random()}`;
    const newNote: SequencerNote = { id, step, note, duration };
    this._notes.set(id, newNote);
    this._renderNotes();
  }

  addNote(step: number, note: number, duration: number = 1) {
    this._addNote(step, note, duration);
  }

  private _removeNoteAt(step: number, note: number) {
    for (const [id, noteObj] of this._notes.entries()) {
      if (
        noteObj.step <= step &&
        step < noteObj.step + noteObj.duration &&
        noteObj.note === note
      ) {
        this._notes.delete(id);
        break;
      }
    }
  }

  removeNote(id: string) {
    this._notes.delete(id);
    this._renderNotes();
  }

  private _renderNotes() {
    // Clear existing note elements
    this._container
      .querySelectorAll(".sequencer-note")
      .forEach((el) => el.remove());

    // Render all notes
    for (const note of this._notes.values()) {
      this._renderNote(note);
    }
  }

  private _renderNote(note: SequencerNote) {
    const noteIndex = this.NOTES.indexOf(note.note);
    if (noteIndex === -1) return;

    const startCell = this._grid[noteIndex][note.step];
    if (!startCell) return;

    const noteEl = document.createElement("div");
    noteEl.className = "sequencer-note";
    noteEl.dataset.noteId = note.id;
    noteEl.style.width = `${note.duration * 100}%`;
    noteEl.textContent = this.NOTE_NAMES[noteIndex];

    // Add right-click to remove
    noteEl.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.removeNote(note.id);
    });

    startCell.appendChild(noteEl);
  }

  getNotesForScheduling(): Array<{
    step: number;
    note: number;
    duration: number;
  }> {
    return this.notes.map((note) => ({
      step: note.step,
      note: note.note,
      duration: note.duration,
    }));
  }

  clearScheduledEvents() {
    this._scheduledEvents.clear();
  }

  markEventScheduled(eventId: string) {
    this._scheduledEvents.add(eventId);
  }

  isEventScheduled(eventId: string): boolean {
    return this._scheduledEvents.has(eventId);
  }
}
