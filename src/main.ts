import { AudioEngine } from "./audio/engine";
import { Metronome } from "./audio/metronome";
import { SynthMono } from "./audio/synthMono";
import { midiToFreq } from "./utils";

const engine = new AudioEngine();
const synth = new SynthMono(engine.context);
const metro = new Metronome(engine.context);

synth.out.connect(engine.master);
// metro.out.connect(engine.master);

// 1-bar pattern: quarter notes C4 E4 G4 C5
const pattern = [
  { beat: 0, midi: 60, dur: 0.25 },
  { beat: 1, midi: 64, dur: 0.25 },
  { beat: 2, midi: 67, dur: 0.25 },
  { beat: 3, midi: 72, dur: 0.25 },
];

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
