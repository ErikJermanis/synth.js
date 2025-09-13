function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function* winIdGenerator() {
  let id = 1;
  while (true) {
    yield id++;
  }
}

const winIdGeneratorInstance: Generator<number> = winIdGenerator();
const getNextWinId = winIdGeneratorInstance.next.bind(winIdGeneratorInstance);

export { midiToFreq, winIdGenerator, getNextWinId };
