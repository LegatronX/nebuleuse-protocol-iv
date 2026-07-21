// src/render/nebula.frag.js
// Conventions Pixi : vTextureCoord et uSampler sont pré-déclarés par le moteur.
export const NEBULA_FRAGMENT = /* glsl */`
precision highp float;
varying vec2 vTextureCoord;
uniform float uTime;
uniform vec2  uResolution;

// hash + value noise
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.02; a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = (vTextureCoord * uResolution) / uResolution.y;   // ratio corrigé
  vec2 q = vec2(fbm(uv*1.6 + uTime*0.03),
                fbm(uv*1.6 + vec2(5.2,1.3) - uTime*0.02));
  float n = fbm(uv*2.2 + q*1.8 + uTime*0.015);              // domain warping
  // palette cyan -> indigo -> violet, pondérée par la densité
  vec3 c1 = vec3(0.02,0.05,0.12);
  vec3 c2 = vec3(0.40,0.91,0.98);   // cyan
  vec3 c3 = vec3(0.75,0.52,0.99);   // violet
  vec3 col = mix(c1, c2, smoothstep(0.30,0.70,n));
  col = mix(col, c3, smoothstep(0.55,0.95, length(q)));
  col *= 0.55 + 0.45*n;
  gl_FragColor = vec4(col, 1.0);
}
`;