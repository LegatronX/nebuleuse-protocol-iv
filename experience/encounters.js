/* Authored campaign encounters. Pure data: no DOM, renderer or random generator. */
(function (root) {
  'use strict';
  const COST = { drone: 1, zig: 1.3, speeder: 1.4, tank: 3, turret: 3,
    splitter: 2.5, elite: 4, miniboss: 8, qubit: 2, intrigue: 3, asteroid: 0 };
  const PACKS = {
    scouts: [['drone', .25], ['drone', .5], ['drone', .75]],
    sweep: [['zig', .2], ['drone', .4], ['drone', .6], ['zig', .8]],
    chase: [['speeder', .22], ['speeder', .5], ['speeder', .78]],
    shield: [['drone', .2], ['tank', .5], ['drone', .8]],
    split: [['splitter', .32], ['drone', .5], ['splitter', .68]],
    battery: [['turret', .28], ['zig', .5], ['turret', .72]],
    ace: [['zig', .18], ['elite', .5], ['zig', .82]],
    pincer: [['speeder', .16], ['drone', .33], ['drone', .67], ['speeder', .84]],
    gate: [['tank', .22], ['drone', .4], ['drone', .6], ['tank', .78]],
    sentinel: [['miniboss', .5]]
  };
  // Each packet introduces a readable shape. A longer gap precedes a new mechanic.
  const WAVES = {
    1: ['Balises perdues', 'Traversez les escadrilles. Gardez une issue.', ['scouts', 'scouts', 'sweep', 'scouts', 'sweep', 'chase']],
    2: ['Feux croisés', 'Contournez les blindés ; surveillez leurs escortes.', ['sweep', 'shield', 'scouts', 'pincer', 'shield', 'chase', 'sweep']],
    4: ['Fragments', 'Les diviseurs libèrent de nouvelles menaces.', ['scouts', 'split', 'sweep', 'shield', 'split', 'pincer', 'sentinel']],
    5: ['La chasse', 'Les rapides arrivent par les flancs.', ['chase', 'pincer', 'shield', 'chase', 'ace', 'sweep', 'pincer', 'chase']],
    7: ['Angles morts', 'Éliminez les batteries avant de traverser.', ['sweep', 'battery', 'pincer', 'shield', 'battery', 'chase', 'ace', 'sweep']],
    8: ['Le verrou', 'Ouvrez un passage dans les lignes lourdes.', ['gate', 'chase', 'split', 'shield', 'gate', 'pincer', 'ace', 'sentinel']],
    10: ['Convergence', 'Alternez les cibles lourdes et les escadrilles.', ['pincer', 'battery', 'chase', 'ace', 'split', 'gate', 'sweep', 'sentinel']],
    11: ['Pulsations', 'Gardez votre NOVA pour les regroupements.', ['chase', 'chase', 'gate', 'sweep', 'pincer', 'ace', 'battery', 'chase', 'sweep']],
    13: ['Dernier passage', 'Choisissez vos cibles ; préservez votre bouclier.', ['sweep', 'ace', 'pincer', 'split', 'gate', 'chase', 'battery', 'ace', 'sweep']],
    14: ['Avant le Signal', 'Un dernier verrou avant le cœur de la nébuleuse.', ['shield', 'pincer', 'battery', 'chase', 'ace', 'gate', 'split', 'sweep', 'sentinel']]
  };
  function plan(wave, density) {
    const spec = WAVES[wave];
    if (!spec) return null;
    const pace = density === 'dechaine' ? .82 : density === 'classique' ? 1.18 : 1;
    const items = [];
    const sequence = spec[2].concat(spec[2]);
    sequence.forEach((key, beat) => {
      const pack = PACKS[key].map(x => x.slice());
      if (key !== 'sentinel' && density !== 'classique') {
        pack.push(['drone', beat % 2 ? .64 : .36]);
        if (density === 'dechaine') pack.push(['drone', beat % 2 ? .36 : .64]);
      }
      const breathing = beat > 0 && beat % 4 === 0;
      pack.forEach(([type, lane], i) => items.push({ type, lane: beat >= spec[2].length ? 1 - lane : lane,
        delay: i === 0 ? (beat === 0 ? 1.8 : breathing ? 3.2 : 1.35) * pace : .16 * pace,
        encounter: true, beat, packet: key, wing: 0,
        fireDelay: .75 + i * .22 }));
    });
    return { title: spec[0], hint: spec[1], items, packets: sequence.length };
  }
  function cost(type) { return COST[type] == null ? 2 : COST[type]; }
  function budget(wave, density, width) {
    const base = Math.min(30, 10 + wave * 1.35);
    return base * (density === 'dechaine' ? 1.2 : density === 'classique' ? .85 : 1) * (width < 480 ? .85 : 1);
  }
  const api = { plan, cost, budget, waves: Object.keys(WAVES).map(Number) };
  root.NebulaEncounters = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
