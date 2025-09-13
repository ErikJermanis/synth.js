export class SynthMono {
  private readonly ATTACK = 0.001;
  private readonly DECAY = 0.25;
  private readonly SUSTAIN = 0.4;
  private readonly RELEASE = 0.2;

  private ctx: AudioContext;
  private _out: GainNode;
  private vcf: BiquadFilterNode;
  private activeNotes: Map<number, { osc: OscillatorNode; vca: GainNode; at: number }>;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this._out = new GainNode(ctx, { gain: 0.9 });
    this.vcf = new BiquadFilterNode(ctx, { type: "lowpass", frequency: 4000, Q: 1.5 });
    this.vcf.connect(this._out);
    this.activeNotes = new Map();
  }

  get out() {
    return this._out;
  }

  note({ freq = 440, dur = 0.3, when = this.ctx.currentTime }) {
    this.noteOn({ freq, when });
    this.noteOff({ freq, when: when + dur });
  }

  noteOn({ freq = 440, when = this.ctx.currentTime }) {
    if (this.activeNotes.has(freq)) return;

    const osc = new OscillatorNode(this.ctx, { type: "sawtooth", frequency: freq });
    const vca = new GainNode(this.ctx, { gain: 0 });
    osc.connect(vca);
    vca.connect(this.vcf);

    const t0 = when;
    const t1 = t0 + this.ATTACK;
    const t2 = t1 + this.DECAY;

    const g = vca.gain;
    g.cancelAndHoldAtTime(t0);
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(1, t1);
    g.exponentialRampToValueAtTime(this.SUSTAIN, t2);

    osc.start(t0);
    this.activeNotes.set(freq, { osc, vca, at: when });
  }

  noteOff({ freq = 440, when = this.ctx.currentTime }) {
    const note = this.activeNotes.get(freq);
    if (!note) return;

    const t0 = when;
    const t1 = t0 + this.RELEASE;

    const g = note.vca.gain;
    g.cancelAndHoldAtTime(t0);
    g.setValueAtTime(g.value, t0);
    g.exponentialRampToValueAtTime(0.0001, t1);

    note.osc.stop(t1 + 0.02);
    this.activeNotes.delete(freq);
  }
}
