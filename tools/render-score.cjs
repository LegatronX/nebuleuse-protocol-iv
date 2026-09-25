// Offline audition of the exact game score; no browser or remote audio service.
const fs = require('node:fs');
const path = require('node:path');
const { RenderingAudioContext } = require('web-audio-engine');
const { Score } = require('../experience/score.js');
async function render(output) {
  const ctx = new RenderingAudioContext({ sampleRate: 44100, numberOfChannels: 2, bitDepth: 16 });
  const master = ctx.createGain(); master.gain.value = 0.4; master.connect(ctx.destination);
  const score = new Score(ctx, master);
  score.setActive(true);
  const marks = [
    { at: 0, label: 'Départ / exploration', playing: true, sector: 0, threat: 0.2 },
    { at: 16, label: 'La forge / tension', playing: true, sector: 1, threat: 0.7 },
    { at: 30, label: 'Confrontation', playing: true, sector: 1, boss: true },
    { at: 44, label: 'Mémoire de glace / accalmie', playing: true, sector: 3, rest: true }
  ];
  let nextMark = 0;
  while (ctx.currentTime < 60) {
    const t = ctx.currentTime;
    if (nextMark < marks.length && t >= marks[nextMark].at) score.setScene(marks[nextMark++]);
    if (t >= 58) score.setActive(false);
    await ctx.resume(); score.tick(); ctx.processTo(t + 0.025);
  }
  const data = ctx.exportAsAudioData();
  let peak = 0, sum = 0, count = 0;
  for (const channel of data.channelData) for (const v of channel) {
    if (!Number.isFinite(v)) throw new Error('Invalid audio sample');
    peak = Math.max(peak, Math.abs(v)); sum += v * v; count++;
  }
  const rms = Math.sqrt(sum / count);
  if (peak >= 0.98 || rms < 0.015) throw new Error(`Invalid levels: peak ${peak}, RMS ${rms}`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, Buffer.from(await ctx.encodeAudioData(data)));
  const report = { seconds: data.length / data.sampleRate, peak, peakDbFS: 20 * Math.log10(peak), rms,
    sections: marks.map(({at,label}) => ({at,label})), notes: 'Offline musical excerpt; real-device listening and browser mix validation remain necessary.' };
  fs.writeFileSync(output.replace(/\.wav$/, '.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  score.dispose();
}
render(path.resolve(process.argv[2] || '../outputs/nebuleuse-v518-extrait.wav')).catch(e => { console.error(e); process.exitCode = 1; });
