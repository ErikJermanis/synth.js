import { AudioEngine } from "./audio/engine";
import { Metronome } from "./audio/metronome";
import { SynthMono } from "./audio/synthMono";
import { midiToFreq } from "./utils";

const engine = new AudioEngine();
const synth = new SynthMono(engine.context);
const metro = new Metronome(engine.context);

synth.out.connect(engine.master);
metro.out.connect(engine.master);

// 1-bar pattern: quarter notes C4 E4 G4 C5
const pattern = [
  { beat: 0, midi: 60, dur: 0.25 },
  { beat: 1, midi: 64, dur: 0.25 },
  { beat: 2, midi: 67, dur: 0.25 },
  { beat: 3, midi: 72, dur: 0.25 },
];

const testNoteButton = document.getElementById("testNote");
testNoteButton?.addEventListener("click", () => {
  const now = engine.context.currentTime;
  synth.note({ freq: midiToFreq(60), dur: 0.5, when: now + 0.1 });
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
    synth.note({ freq: midiToFreq(midi), dur: 0.2, when: now });
  }
});

engine.onSchedule = (now: number, until: number) => {
  const spb = engine.secondsPerBeat();
  const startBeat = Math.floor((now - engine.beatStartTime) / spb);
  const endBeat = Math.floor((until - engine.beatStartTime) / spb) + 1;

  for (let b = startBeat; b < endBeat; b++) {
    const barBeat = ((b % engine.loopBeats) + engine.loopBeats) % engine.loopBeats;

    for (const ev of pattern) {
      if (Math.floor(ev.beat) === barBeat) {
        const when = engine.beatStartTime + (b + (ev.beat - barBeat)) * spb;
        engine.scheduleAbs(when, () => {
          console.log(`note ${ev.midi} at beat ${b + (ev.beat - barBeat)}`);
          synth.note({ freq: midiToFreq(ev.midi), dur: ev.dur, when });
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
const btnStop = document.getElementById("stop");
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
  console.log("Stop");
});

tempoIn?.addEventListener("change", () => {
  const v = Number(tempoIn.value) || 120;
  // keep phase-aligned by recomputing beatStartTime so the current beat stays continuous
  const now = engine.context.currentTime;
  const beat = engine.isPlaying ? (now - engine.beatStartTime) / engine.secondsPerBeat() : engine.playheadBeat;
  engine.tempo = Math.max(40, Math.min(240, v));
  engine.beatStartTime = now - engine.beatsToSeconds(beat);
});
