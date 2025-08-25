export class SynthMono {
  private ctx: AudioContext;
  private _out: GainNode;
  private vcf: BiquadFilterNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this._out = new GainNode(ctx, { gain: 0.9 });
    this.vcf = new BiquadFilterNode(ctx, { type: "lowpass", frequency: 4000, Q: 1.5 });
    this.vcf.connect(this._out);
  }

  get out() {
    return this._out;
  }

  note({ freq = 440, dur = 0.3, when = this.ctx.currentTime }) {
    const osc = new OscillatorNode(this.ctx, { type: "sawtooth", frequency: freq });
    const vca = new GainNode(this.ctx, { gain: 0 });
    osc.connect(vca);
    vca.connect(this.vcf);

    const a = 0.01;
    const d = 0.15;
    const s = 0.2;
    const r = 0.2;
    const t0 = when;
    const t1 = t0 + a;
    const t2 = t1 + d;
    const t3 = t0 + dur;

    const g = vca.gain;
    g.cancelAndHoldAtTime(t0);
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(1, t1);
    g.exponentialRampToValueAtTime(s, t2);
    g.setValueAtTime(s, t3);
    g.exponentialRampToValueAtTime(0.0001, t3 + r);

    osc.start(t0);
    osc.stop(t3 + r + 0.02);
  }
}
