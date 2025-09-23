import { AudioEngine } from "./audio/engine";
import { Metronome } from "./audio/metronome";
import { SynthMono } from "./audio/synthMono";
import { WindowManager } from "./gui/windowManager";
import { SequencerBoard } from "./gui/sequencerBoard";
import { midiToFreq } from "./utils";

const engine = new AudioEngine();
const wm = new WindowManager();
const synth = new SynthMono(engine.context);
const metro = new Metronome(engine.context);

synth.out.connect(engine.master);
// metro.out.connect(engine.master);

const sequencerContainer = document.getElementById("sequencer-container");
if (!sequencerContainer) {
  throw new Error("Sequencer container not found");
}
const sequencer = new SequencerBoard(sequencerContainer);

// Initialize sequencer with default pattern
sequencer.addNote(0, 60, 1);
sequencer.addNote(4, 64, 1);
sequencer.addNote(8, 67, 1);
sequencer.addNote(12, 72, 1);

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
  const spb = engine.secondsPerBeat() / 4; // 16th note subdivisions
  const startStep = Math.floor((now - engine.beatStartTime) / spb);
  const endStep = Math.floor((until - engine.beatStartTime) / spb) + 1;
  const loopSteps = engine.loopBeats * 4; // 16 steps per 4-beat loop

  for (let s = startStep; s < endStep; s++) {
    const loopStep = ((s % loopSteps) + loopSteps) % loopSteps;
    const beatInLoop = Math.floor(loopStep / 4);

    // Schedule sequencer notes
    const notes = sequencer.getNotesForScheduling();
    for (const note of notes) {
      if (note.step === loopStep) {
        const eventId = `loop-${Math.floor(s / loopSteps)}-step-${note.step}-note-${note.note}`;
        if (!sequencer.isEventScheduled(eventId)) {
          const when = engine.beatStartTime + s * spb;
          const duration = note.duration * spb;
          engine.scheduleAbs(when, () => {
            synth.note({ freq: midiToFreq(note.note), dur: duration, when });
          });
          sequencer.markEventScheduled(eventId);
        }
      }
    }

    // Schedule metronome clicks on quarter note beats
    if (loopStep % 4 === 0) {
      const when = engine.beatStartTime + s * spb;
      engine.scheduleAbs(when, () => {
        metro.click({ strong: beatInLoop === 0, when });
      });
    }
  }
};

const btnStart = document.getElementById("start");
const btnPlay = document.getElementById("play");
const btnStop = document.getElementById("stop");
const btnCreateWindow = document.getElementById("createWindow");
const tempoIn: HTMLInputElement | null = document.getElementById("tempo") as HTMLInputElement;

btnStart?.addEventListener("click", async () => {
  await engine.resume();
  engine.startScheduler();
  console.log("Audio running");
});

btnPlay?.addEventListener("click", () => {
  engine.play();
  console.log("Play");
});

btnStop?.addEventListener("click", () => {
  engine.stop();
  sequencer.clearScheduledEvents();
  console.log("Stop");
});

btnCreateWindow?.addEventListener("click", () => {
  const newWin = wm.createWindow("New Window " + Math.floor(Math.random() * 1000));
  console.log("Created window:", newWin);
});

tempoIn?.addEventListener("change", () => {
  const v = Number(tempoIn.value) || 120;
  // keep phase-aligned by recomputing beatStartTime so the current beat stays continuous
  const now = engine.context.currentTime;
  const beat = engine.isPlaying ? (now - engine.beatStartTime) / engine.secondsPerBeat() : engine.playheadBeat;
  engine.tempo = Math.max(40, Math.min(240, v));
  engine.beatStartTime = now - engine.beatsToSeconds(beat);
});
