export class Metronome {
  private _ctx: AudioContext;
  private _out: GainNode;

  constructor(ctx: AudioContext) {
    this._ctx = ctx;
    this._out = new GainNode(ctx, { gain: 0.6 });
  }

  get out() {
    return this._out;
  }

  click({ strong = false, when }: { strong?: boolean; when: number }) {
    const osc = new OscillatorNode(this._ctx, { type: "square", frequency: strong ? 2000 : 1200 });
    const vca = new GainNode(this._ctx, { gain: 0 });
    osc.connect(vca);
    vca.connect(this._out);

    const t0 = when;
    const a = 0.001;
    const r = 0.08;
    vca.gain.setValueAtTime(0, t0);
    vca.gain.linearRampToValueAtTime(1, t0 + a);
    vca.gain.linearRampToValueAtTime(0.0001, t0 + r);
    osc.start(t0);
    osc.stop(t0 + r + 0.01);
  }
}
