export class AudioEngine {
  private ctx: AudioContext | null = null;
  private _master: GainNode | null = null;
  private _tempo: number;
  private _events: any[];
  private _lookahead: number;
  private _horizon: number;
  private _timer: any;
  private _isPlaying: boolean;
  private _beatStartTime: number;
  private _playheadBeat: number;
  private _loopBeats: number;

  onSchedule: any;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this._master = new GainNode(this.ctx, { gain: 0.1 });
    const compressor = new DynamicsCompressorNode(this.ctx);
    this._master.connect(compressor);
    compressor.connect(this.ctx.destination);

    this._tempo = 120;
    this._isPlaying = false;
    this._beatStartTime = 0;
    this._playheadBeat = 0;
    this._loopBeats = 4;

    this._events = [];
    this._lookahead = 0.025;
    this._horizon = 0.1;
    this._timer = null;
  }

  get context(): AudioContext {
    if (!this.ctx) {
      throw new Error("AudioContext is not initialized");
    }
    return this.ctx;
  }

  get master(): GainNode {
    if (!this._master) {
      throw new Error("Master GainNode is not initialized");
    }
    return this._master;
  }

  get tempo(): number {
    return this._tempo;
  }
  set tempo(value: number) {
    this._tempo = value;
  }

  get beatStartTime(): number {
    return this._beatStartTime;
  }
  set beatStartTime(value: number) {
    this._beatStartTime = value;
  }

  get loopBeats(): number {
    return this._loopBeats;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get playheadBeat(): number {
    return this._playheadBeat;
  }

  secondsPerBeat(): number {
    return 60 / this._tempo;
  }

  beatsToSeconds(b: number) {
    return this.secondsPerBeat() * b;
  }

  scheduleAbs(timeSec: number, fn: () => void) {
    this._events.push({ timeSec, fn });
  }

  scheduleAtBeat(beat: number, fn: () => void) {
    const when = this._beatStartTime + this.beatsToSeconds(beat);
    this.scheduleAbs(when, fn);
  }

  _tick() {
    const now = this.context.currentTime;
    const until = now + this._horizon;

    // drain due events
    const due = [];
    const later = [];
    for (const e of this._events) {
      if (e.timeSec < until) {
        due.push(e);
      } else {
        later.push(e);
      }
    }
    this._events = later;
    for (const e of due) {
      // should we remove params from fn?
      e.fn(now, this.context);
    }

    if (!this._isPlaying) return;

    // compute playhead beats
    const playheadSec = now - this._beatStartTime;
    const spb = this.secondsPerBeat();
    this._playheadBeat = playheadSec / spb;

    // ask the sequencer to fill the horizon
    if (this.onSchedule) {
      this.onSchedule(now, until);
    }
  }

  startScheduler() {
    if (this._timer) return;
    this._timer = setInterval(() => {
      this._tick();
    }, this._lookahead * 1000);
  }

  stopScheduler() {
    if (!this._timer) return;
    clearInterval(this._timer);
    this._timer = null;
  }

  play() {
    if (this._isPlaying) return;
    this._isPlaying = true;
    this._beatStartTime = this.context.currentTime - this.beatsToSeconds(this._playheadBeat);
  }

  stop() {
    this._isPlaying = false;
    this._playheadBeat = 0;
    this._events.length = 0;
  }

  async resume() {
    if (this.ctx && this.ctx.state !== "running") {
      await this.ctx.resume();
    }
  }
}
