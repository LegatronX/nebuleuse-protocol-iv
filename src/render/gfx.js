// Niveaux de fidélité graphique — l'échelle rejoue l'histoire du jeu (v4.1 → v4.7+WebGL).
export const GFX_LEVELS = {
  1: { name:'Genèse',    additive:false, planets:false, nebulae:false, sectors:false,
       chromaticWaves:false, trails:false, cameraPunch:false, gradients:false,
       liveNebula:false, bloom:false, engine:'canvas2d' },
  2: { name:'Lumière',   additive:true,  planets:false, nebulae:false, sectors:false,
       chromaticWaves:false, trails:false, cameraPunch:false, gradients:false,
       liveNebula:false, bloom:false, engine:'canvas2d' },
  3: { name:'Cosmos',    additive:true,  planets:true,  nebulae:true,  sectors:false,
       chromaticWaves:false, trails:false, cameraPunch:false, gradients:false,
       liveNebula:false, bloom:false, engine:'canvas2d' },
  4: { name:'Traversée', additive:true,  planets:true,  nebulae:true,  sectors:true,
       chromaticWaves:true,  trails:true,  cameraPunch:true,  gradients:false,
       liveNebula:false, bloom:false, engine:'canvas2d' },
  5: { name:'Nébuleuse', additive:true,  planets:true,  nebulae:true,  sectors:true,
       chromaticWaves:true,  trails:true,  cameraPunch:true,  gradients:true,
       liveNebula:true,  bloom:true,  engine:'pixi' },
};
export const GFX_MAX = 5;
export function gfxFlags(level) {
  const n = Math.max(1, Math.min(GFX_MAX, level | 0));
  return { level: n, ...GFX_LEVELS[n] };
}
