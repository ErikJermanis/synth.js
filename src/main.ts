import { AudioEngine } from "./audio/engine";
import { Metronome } from "./audio/metronome";
import { SynthMono } from "./audio/synthMono";
import { midiToFreq } from "./utils";

const engine = new AudioEngine();
engine.loopBeats = 16;
const synth = new SynthMono(engine.context);
const metro = new Metronome(engine.context);

synth.out.connect(engine.master);
metro.out.connect(engine.master);

const BEATS = 16;
const BEAT_WIDTH = 40;
const ROW_HEIGHT = 40;
const PITCHES = [72, 67, 64, 60];

interface NoteEvt {
  beat: number;
  midi: number;
  dur: number;
  el: HTMLDivElement;
}

const board = document.getElementById("board") as HTMLDivElement;
board.style.width = `${BEAT_WIDTH * BEATS}px`;
board.style.height = `${ROW_HEIGHT * PITCHES.length}px`;

const notes: NoteEvt[] = [
  { beat: 0, midi: 60, dur: 1, el: document.createElement("div") },
  { beat: 4, midi: 64, dur: 1, el: document.createElement("div") },
  { beat: 8, midi: 67, dur: 1, el: document.createElement("div") },
  { beat: 12, midi: 72, dur: 1, el: document.createElement("div") },
];

for (const n of notes) {
  initNoteEl(n);
}

function initNoteEl(n: NoteEvt) {
  const el = n.el;
  el.className = "note";
  el.style.height = `${ROW_HEIGHT - 4}px`;
  updateNoteEl(n);
  board.appendChild(el);
  setupDrag(n);
}

function updateNoteEl(n: NoteEvt) {
  const row = PITCHES.indexOf(n.midi);
  n.el.style.left = `${n.beat * BEAT_WIDTH}px`;
  n.el.style.top = `${row * ROW_HEIGHT + 2}px`;
  n.el.style.width = `${n.dur * BEAT_WIDTH - 4}px`;
}

function setupDrag(n: NoteEvt) {
  let mode: "drag" | "resize" | null = null;
  let startX = 0;
  let startY = 0;
  let startBeat = 0;
  let startRow = 0;
  let startDur = 0;

  const onDown = (e: PointerEvent) => {
    e.preventDefault();
    const rect = n.el.getBoundingClientRect();
    if (e.clientX > rect.right - 10) {
      mode = "resize";
    } else {
      mode = "drag";
    }
    startX = e.clientX;
    startY = e.clientY;
    startBeat = n.beat;
    startRow = PITCHES.indexOf(n.midi);
    startDur = n.dur;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const onMove = (e: PointerEvent) => {
    if (!mode) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (mode === "drag") {
      let beat = Math.round((startBeat * BEAT_WIDTH + dx) / BEAT_WIDTH);
      beat = Math.max(0, Math.min(BEATS - n.dur, beat));
      let row = Math.round((startRow * ROW_HEIGHT + dy) / ROW_HEIGHT);
      row = Math.max(0, Math.min(PITCHES.length - 1, row));
      n.beat = beat;
      n.midi = PITCHES[row];
    } else if (mode === "resize") {
      let dur = Math.round((startDur * BEAT_WIDTH + dx) / BEAT_WIDTH);
      dur = Math.max(1, Math.min(BEATS - n.beat, dur));
      n.dur = dur;
    }
    updateNoteEl(n);
  };

  const onUp = () => {
    mode = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  n.el.addEventListener("pointerdown", onDown);
}

const testNoteButton = document.getElementById("testNote");
testNoteButton?.addEventListener("click", () => {
  const now = engine.context.currentTime;
  synth.note({ freq: midiToFreq(60), dur: 1, when: now + 0.1 });
});

window.addEventListener("keydown", (e) => {
  const keyMap: Record<string, number> = {
    q: 60,
    w: 64,
    e: 67,
    r: 72,
    t: 76,
    z: 79,
    u: 84,
    i: 88,
    o: 91,
    p: 96,
  };
  const midi = keyMap[e.key.toLowerCase()];
  if (midi !== undefined) {
    const now = engine.context.currentTime;
    synth.noteOn({ freq: midiToFreq(midi), when: now });
  }
});

window.addEventListener("keyup", (e) => {
  const keyMap: Record<string, number> = {
    q: 60,
    w: 64,
    e: 67,
    r: 72,
    t: 76,
    z: 79,
    u: 84,
    i: 88,
    o: 91,
    p: 96,
  };
  const midi = keyMap[e.key.toLowerCase()];
  if (midi !== undefined) {
    const now = engine.context.currentTime;
    synth.noteOff({ freq: midiToFreq(midi), when: now });
  }
});

engine.onSchedule = (now: number, until: number) => {
  const spb = engine.secondsPerBeat();
  const startBeat = Math.floor((now - engine.beatStartTime) / spb);
  const endBeat = Math.floor((until - engine.beatStartTime) / spb) + 1;

  for (let b = startBeat; b < endBeat; b++) {
    const barBeat =
      ((b % engine.loopBeats) + engine.loopBeats) % engine.loopBeats;

    for (const ev of notes) {
      if (Math.floor(ev.beat) === barBeat) {
        const when = engine.beatStartTime + (b + (ev.beat - barBeat)) * spb;
        engine.scheduleAbs(when, () => {
          synth.note({
            freq: midiToFreq(ev.midi),
            dur: engine.beatsToSeconds(ev.dur),
            when,
          });
        });
      }
    }

    const whenBeat = engine.beatStartTime + b * spb;
    engine.scheduleAbs(whenBeat, () => {
      metro.click({ strong: barBeat === 0, when: whenBeat });
    });
  }
};

const btnStart = document.getElementById("start");
const btnPlay = document.getElementById("play");
const btnPause = document.getElementById("pause");
const btnStop = document.getElementById("stop");
const tempoIn: HTMLInputElement | null = document.getElementById(
  "tempo",
) as HTMLInputElement;

btnStart?.addEventListener("click", async () => {
  await engine.resume();
  engine.startScheduler();
  console.log("Audio running");
});

btnPlay?.addEventListener("click", () => {
  engine.play();
  console.log("Play");
});

btnPause?.addEventListener("click", () => {
  engine.pause();
  console.log("Pause");
});

btnStop?.addEventListener("click", () => {
  engine.stop();
  console.log("Stop");
});

tempoIn?.addEventListener("change", () => {
  const v = Number(tempoIn.value) || 120;
  // keep phase-aligned by recomputing beatStartTime so the current beat stays continuous
  const now = engine.context.currentTime;
  const beat = engine.isPlaying
    ? (now - engine.beatStartTime) / engine.secondsPerBeat()
    : engine.playheadBeat;
  engine.tempo = Math.max(40, Math.min(240, v));
  engine.beatStartTime = now - engine.beatsToSeconds(beat);
});
