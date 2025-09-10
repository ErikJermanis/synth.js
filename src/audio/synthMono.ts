export class SynthMono {
  private ctx: AudioContext;
  private _out: GainNode;
  private vcf: BiquadFilterNode;
  private active: Map<number, { osc: OscillatorNode; vca: GainNode }>;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this._out = new GainNode(ctx, { gain: 0.9 });
    this.vcf = new BiquadFilterNode(ctx, {
      type: "lowpass",
      frequency: 4000,
      Q: 1.5,
    });
    this.vcf.connect(this._out);
    this.active = new Map();
  }

  get out() {
    return this._out;
  }

  note({ freq = 440, dur = 0.3, when = this.ctx.currentTime }) {
    this.noteOn({ freq, when });
    this.noteOff({ freq, when: when + dur });
  }

  noteOn({ freq = 440, when = this.ctx.currentTime }) {
    if (this.active.has(freq)) return;

    const osc = new OscillatorNode(this.ctx, {
      type: "sawtooth",
      frequency: freq,
    });
    const vca = new GainNode(this.ctx, { gain: 0 });
    osc.connect(vca);
    vca.connect(this.vcf);

    const attack = 0.2;
    const decay = 0.6;
    const sustain = 0.2;
    const t0 = when;
    const t1 = t0 + attack;
    const t2 = t1 + decay;

    const g = vca.gain;
    g.cancelAndHoldAtTime(t0);
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(1, t1);
    g.exponentialRampToValueAtTime(sustain, t2);

    osc.start(t0);
    this.active.set(freq, { osc, vca });
  }

  noteOff({ freq = 440, when = this.ctx.currentTime }) {
    const active = this.active.get(freq);
    if (!active) return;

    const release = 0.4;
    const g = active.vca.gain;
    const t0 = when;
    g.cancelAndHoldAtTime(t0);
    g.setValueAtTime(g.value, t0);
    g.exponentialRampToValueAtTime(0.0001, t0 + release);

    active.osc.stop(t0 + release + 0.02);
    this.active.delete(freq);
  }
}
