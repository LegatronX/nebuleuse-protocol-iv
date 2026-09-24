      // ============================================================
      // MODULE V5.14 — PIPELINE DE POST-TRAITEMENT GPU (WebGL2)
      // Le canvas 2D du jeu devient une texture ; un canvas WebGL2 superposé
      // le recompose chaque frame :
      //   1. bloom HDR multi-échelles (seuil doux + moyenne de Karis anti-scintillement,
      //      chaîne dual-filter 5 niveaux, recomposition additive)
      //   2. halos anamorphiques horizontaux sur les sources très lumineuses
      //   3. réfraction des ondes de choc (profil dérivée de gaussienne) + dispersion chromatique
      //   4. éclairage dynamique : explosions, réacteur du joueur et boss éclairent le décor
      //   5. aberration chromatique à l'impact, flou radial en bullet-time
      //   6. étalonnage : épaule filmique, saturation (surcharge), lumière ambiante, dithering
      // Paliers : 2 = complet, 1 = allégé, 0 = désactivé (canvas 2D d'origine réaffiché).
      // Le mode Auto rétrograde de lui-même si la frame dépasse le budget.
      // ============================================================
      (() => {
        const MAX_WAVES = 8;
        const MAX_LIGHTS = 12;

        if (meta.gpuFx === undefined) meta.gpuFx = 'auto';

        const fxCanvas = document.createElement('canvas');
        fxCanvas.id = 'fx';
        // même z-index que #game et inséré juste après : couvre le jeu, reste sous tout le HUD
        fxCanvas.style.cssText = 'position:fixed;inset:0;display:block;z-index:0;pointer-events:none';
        canvas.insertAdjacentElement('afterend', fxCanvas);

        let gl = null;
        let tier = 0;          // palier effectif
        let broken = false;    // WebGL2 absent / contexte perdu / erreur
        let res = null;        // ressources GPU
        let lastT = performance.now();
        let emaMs = 16.7;
        let slowFor = 0;
        const lights = [];     // {x, y, r, i, c:[r,g,b], life, max}

        // ---------- couleurs ----------
        const colorCache = new Map();
        function parseColor(c) {
          if (typeof c !== 'string') return [1, 1, 1];
          let v = colorCache.get(c);
          if (v) return v;
          let m;
          if ((m = /^#([0-9a-f]{3})$/i.exec(c))) {
            v = [...m[1]].map((h) => parseInt(h + h, 16) / 255);
          } else if ((m = /^#([0-9a-f]{6})/i.exec(c))) {
            v = [0, 2, 4].map((k) => parseInt(m[1].slice(k, k + 2), 16) / 255);
          } else if ((m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(c))) {
            v = [m[1], m[2], m[3]].map((x) => Math.min(1, parseFloat(x) / 255));
          } else {
            v = [1, 1, 1];
          }
          // une lumière blanche pâle (particules de fumée) reste discrète
          colorCache.set(c, v);
          return v;
        }

        function addLight(x, y, color, radius, intensity, life) {
          if (lights.length >= 32) lights.shift();
          lights.push({ x, y, r: radius, i: intensity, c: parseColor(color), life, max: life });
        }

        // ---------- shaders ----------
        const VS = `#version 300 es
          out vec2 vUv;
          void main() {
            vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
            vUv = p;
            gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
          }`;

        const HEAD = `#version 300 es
          precision highp float;
          in vec2 vUv;
          out vec4 o;
          float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
        `;

        // seuil doux + moyenne de Karis (évite le scintillement des petits points brillants)
        const FS_PREFILTER = HEAD + `
          uniform sampler2D uTex; uniform vec2 uTexel; uniform float uThreshold; uniform float uKnee;
          vec3 s(vec2 off) { return texture(uTex, vUv + off * uTexel).rgb; }
          void main() {
            // exposition : sur une scène déjà claire (flash, décor lumineux) seul le vrai pic fleurit
            float avg = luma(textureLod(uTex, vec2(0.5), 20.0).rgb);
            float thr = uThreshold + avg * 0.75;
            vec3 a = s(vec2(-1.0, -1.0)), b = s(vec2(1.0, -1.0)), c = s(vec2(-1.0, 1.0)), d = s(vec2(1.0, 1.0));
            float wa = 1.0 / (1.0 + luma(a)), wb = 1.0 / (1.0 + luma(b)), wc = 1.0 / (1.0 + luma(c)), wd = 1.0 / (1.0 + luma(d));
            vec3 col = (a * wa + b * wb + c * wc + d * wd) / (wa + wb + wc + wd);
            float br = max(col.r, max(col.g, col.b));
            float soft = clamp(br - thr + uKnee, 0.0, 2.0 * uKnee);
            soft = soft * soft / (4.0 * uKnee + 1e-4);
            float k = max(soft, br - thr) / max(br, 1e-4);
            // les couleurs saturées (néons) fleurissent plus que les blancs ternes
            float sat = br - min(col.r, min(col.g, col.b));
            o = vec4(col * k * (1.0 + sat * 0.6), 1.0);
          }`;

        const FS_DOWN = HEAD + `
          uniform sampler2D uTex; uniform vec2 uTexel;
          void main() {
            vec2 h = uTexel * 0.5;
            vec3 c = texture(uTex, vUv).rgb * 4.0;
            c += texture(uTex, vUv - h).rgb;
            c += texture(uTex, vUv + h).rgb;
            c += texture(uTex, vUv + vec2(h.x, -h.y)).rgb;
            c += texture(uTex, vUv - vec2(h.x, -h.y)).rgb;
            o = vec4(c / 8.0, 1.0);
          }`;

        const FS_UP = HEAD + `
          uniform sampler2D uTex; uniform vec2 uTexel; uniform float uGain;
          void main() {
            vec2 h = uTexel * 0.5;
            vec3 c = texture(uTex, vUv + vec2(-h.x * 2.0, 0.0)).rgb;
            c += texture(uTex, vUv + vec2(-h.x, h.y)).rgb * 2.0;
            c += texture(uTex, vUv + vec2(0.0, h.y * 2.0)).rgb;
            c += texture(uTex, vUv + vec2(h.x, h.y)).rgb * 2.0;
            c += texture(uTex, vUv + vec2(h.x * 2.0, 0.0)).rgb;
            c += texture(uTex, vUv + vec2(h.x, -h.y)).rgb * 2.0;
            c += texture(uTex, vUv + vec2(0.0, -h.y * 2.0)).rgb;
            c += texture(uTex, vUv + vec2(-h.x, -h.y)).rgb * 2.0;
            o = vec4(c / 12.0 * uGain, 1.0);
          }`;

        // flou horizontal à large étalement → traînée anamorphique
        const FS_STREAK = HEAD + `
          uniform sampler2D uTex; uniform vec2 uTexel; uniform float uSpread;
          void main() {
            vec3 c = texture(uTex, vUv).rgb * 0.227;
            for (int i = 1; i <= 6; i++) {
              float fi = float(i);
              float w = exp(-fi * fi * 0.09) * 0.14;
              vec2 off = vec2(fi * uSpread * uTexel.x, 0.0);
              c += (texture(uTex, vUv + off).rgb + texture(uTex, vUv - off).rgb) * w;
            }
            o = vec4(c, 1.0);
          }`;

        const FS_COMPOSITE = HEAD + `
          uniform sampler2D uScene, uBloom, uStreak, uAmbient;
          uniform vec4 uWaves[${MAX_WAVES}];      // x, y (uv), rayon (unités hauteur), force
          uniform int uWaveN;
          uniform vec4 uLights[${MAX_LIGHTS}];    // x, y (uv), rayon, intensité
          uniform vec3 uLightCol[${MAX_LIGHTS}];
          uniform int uLightN;
          uniform float uAspect, uAberr, uBloomK, uStreakK, uSlow, uSat, uTime;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
          void main() {
            vec2 uv = vUv;
            vec2 disp = vec2(0.0);
            float ringE = 0.0;
            for (int i = 0; i < ${MAX_WAVES}; i++) {
              if (i >= uWaveN) break;
              vec4 w = uWaves[i];
              vec2 d = uv - w.xy; d.x *= uAspect;
              float dist = length(d);
              float x = (dist - w.z) / (0.018 + w.z * 0.10);
              float g = exp(-x * x);
              vec2 dir = dist > 1e-4 ? d / dist : vec2(0.0);
              dir.x /= uAspect;
              disp += dir * (-x * g) * w.w * 0.022;   // lentille : pousse puis tire
              ringE += g * w.w;
            }
            vec2 c = uv + disp;
            float avg = luma(textureLod(uScene, vec2(0.5), 20.0).rgb);
            float expo = 1.0 / (1.0 + max(0.0, avg - 0.22) * 6.0);

            // dispersion radiale : impacts + anneaux d'ondes
            vec2 ca = (c - 0.5) * (uAberr + ringE * 0.006);
            vec3 col = vec3(texture(uScene, c + ca).r, texture(uScene, c).g, texture(uScene, c - ca).b);

            // bullet-time : flou radial vers le centre
            if (uSlow > 0.001) {
              vec3 acc = col;
              for (int k = 1; k < 6; k++) {
                float s = 1.0 - float(k) * 0.010 * uSlow;
                acc += texture(uScene, (c - 0.5) * s + 0.5).rgb;
              }
              col = mix(col, acc / 6.0, 0.65 * uSlow);
            }

            // éclairage dynamique : le décor capte la lumière des explosions
            vec3 light = vec3(0.0);
            for (int i = 0; i < ${MAX_LIGHTS}; i++) {
              if (i >= uLightN) break;
              vec4 L = uLights[i];
              vec2 d = uv - L.xy; d.x *= uAspect;
              float f = max(0.0, 1.0 - dot(d, d) / (L.z * L.z));
              light += uLightCol[i] * (f * f * L.w);
            }
            light = min(light, vec3(1.2)) * expo;
            col += col * light * 1.5 + light * 0.04;

            // bloom + halos
            col += texture(uBloom, c).rgb * uBloomK * expo;
            col += texture(uStreak, c).rgb * uStreakK * expo * vec3(0.55, 0.82, 1.0);

            // lumière ambiante : les ombres prennent la teinte dominante de la scène
            vec3 amb = texture(uAmbient, vec2(0.5)).rgb;
            col += amb * 0.10 * expo * (1.0 - clamp(luma(col) * 2.0, 0.0, 1.0));

            // épaule filmique (asymptote 1.0) + saturation + léger contraste
            vec3 over = max(col - 0.8, 0.0);
            col = min(col, vec3(0.8)) + over / (1.0 + over * 5.0);
            col = mix(vec3(luma(col)), col, uSat);
            col = mix(col, col * col * (3.0 - 2.0 * col), 0.12);

            // dithering : supprime le banding des dégradés du bloom
            col += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 255.0;
            o = vec4(clamp(col, 0.0, 1.0), 1.0);
          }`;

        // ---------- utilitaires GL ----------
        function compile(type, src) {
          const s = gl.createShader(type);
          gl.shaderSource(s, src);
          gl.compileShader(s);
          if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
          return s;
        }
        function program(fs) {
          const p = gl.createProgram();
          gl.attachShader(p, compile(gl.VERTEX_SHADER, VS));
          gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
          gl.linkProgram(p);
          if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
          const u = {};
          const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
          for (let i = 0; i < n; i++) {
            const name = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, '');
            u[name] = gl.getUniformLocation(p, name);
          }
          return { p, u };
        }
        function makeTex(w, h, fmt) {
          const t = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, t);
          gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internal, w, h, 0, gl.RGBA, fmt.type, null);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          return t;
        }
        function makeTarget(w, h, fmt) {
          const tex = makeTex(w, h, fmt);
          const fb = gl.createFramebuffer();
          gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
          return { tex, fb, w, h };
        }

        function init() {
          gl = fxCanvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
          if (!gl) throw new Error('WebGL2 indisponible');
          // HDR si possible : le bloom accumule au-delà de 1.0 sans écrêter
          const hdr = gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float');
          const fmt = hdr ? { internal: gl.RGBA16F, type: gl.HALF_FLOAT } : { internal: gl.RGBA8, type: gl.UNSIGNED_BYTE };
          res = {
            fmt,
            vao: gl.createVertexArray(),
            scene: makeTex(1, 1, { internal: gl.RGBA8, type: gl.UNSIGNED_BYTE }),
            sceneW: 0, sceneH: 0,
            mips: [], streakA: null, streakB: null,
            pre: program(FS_PREFILTER), down: program(FS_DOWN), up: program(FS_UP),
            streak: program(FS_STREAK), comp: program(FS_COMPOSITE),
            waves: new Float32Array(MAX_WAVES * 4),
            lights: new Float32Array(MAX_LIGHTS * 4),
            lightCol: new Float32Array(MAX_LIGHTS * 3)
          };
        }

        function freeTargets() {
          for (const t of [...res.mips, res.streakA, res.streakB]) {
            if (!t) continue;
            gl.deleteTexture(t.tex);
            gl.deleteFramebuffer(t.fb);
          }
          res.mips = [];
          res.streakA = res.streakB = null;
        }

        function ensureSize() {
          const w = canvas.width, h = canvas.height;
          if (fxCanvas.style.width !== canvas.style.width) fxCanvas.style.width = canvas.style.width;
          if (fxCanvas.style.height !== canvas.style.height) fxCanvas.style.height = canvas.style.height;
          if (w === res.sceneW && h === res.sceneH) return;
          fxCanvas.width = w;
          fxCanvas.height = h;
          res.sceneW = w;
          res.sceneH = h;
          freeTargets();
          let mw = Math.max(1, w >> 1), mh = Math.max(1, h >> 1);
          for (let i = 0; i < 6; i++) {
            res.mips.push(makeTarget(mw, mh, res.fmt));
            mw = Math.max(1, mw >> 1);
            mh = Math.max(1, mh >> 1);
          }
          const sw = Math.max(1, w >> 2), sh = Math.max(1, h >> 3);
          res.streakA = makeTarget(sw, sh, res.fmt);
          res.streakB = makeTarget(sw, sh, res.fmt);
          gl.bindTexture(gl.TEXTURE_2D, res.scene);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          gl.generateMipmap(gl.TEXTURE_2D);
        }

        function pass(prog, target, tex, texW, texH) {
          gl.useProgram(prog.p);
          gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
          gl.viewport(0, 0, target ? target.w : res.sceneW, target ? target.h : res.sceneH);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          if (prog.u.uTex) gl.uniform1i(prog.u.uTex, 0);
          if (prog.u.uTexel) gl.uniform2f(prog.u.uTexel, 1 / texW, 1 / texH);
        }
        const drawTri = () => gl.drawArrays(gl.TRIANGLES, 0, 3);

        // ---------- paliers & préférences ----------
        function wantedTier() {
          if (broken || meta.gpuFx === 'off') return 0;
          if (meta.gpuFx === 'cinema') return 2;
          if (meta.qualityOverride === 'low' || (meta.qualityOverride == null && lowQuality)) return 0;
          return 2;
        }
        let autoCap = 2;   // plafond abaissé par la surveillance de performance (mode Auto)
        function applyTier() {
          const t = Math.min(wantedTier(), meta.gpuFx === 'auto' ? autoCap : 2);
          if (t > 0 && !gl && !broken) {
            try { init(); } catch (err) { console.warn('[fx]', err.message); broken = true; }
          }
          tier = broken ? 0 : t;
          fxCanvas.style.display = tier > 0 ? 'block' : 'none';
          canvas.style.visibility = tier > 0 ? 'hidden' : 'visible';
        }

        fxCanvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          gl = null; res = null;
          applyTier();
        });
        fxCanvas.addEventListener('webglcontextrestored', () => applyTier());

        // ---------- sources de lumière ----------
        const baseExplosion14 = explosion;
        explosion = function (x, y, color, count = 20, speed = 220) {
          if (tier > 0) {
            const k = Math.min(1.4, 0.45 + count / 26);
            addLight(x, y, color, 50 + Math.sqrt(count) * 22 + speed * 0.12, k, 0.28 + Math.min(0.3, count / 120));
          }
          return baseExplosion14.apply(this, arguments);
        };

        // ---------- rendu ----------
        function render(dt) {
          ensureSize();
          const R = res;
          const reduced = reducedMotion;

          // 0. le canvas 2D devient une texture
          gl.bindTexture(gl.TEXTURE_2D, R.scene);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
          gl.generateMipmap(gl.TEXTURE_2D);   // pyramide → luminance moyenne pour l'exposition
          gl.bindVertexArray(R.vao);
          gl.disable(gl.BLEND);

          // 1. extraction des hautes lumières (demi-résolution)
          const levels = tier >= 2 ? 6 : 4;
          const M = R.mips;
          pass(R.pre, M[0], R.scene, R.sceneW, R.sceneH);
          gl.uniform1f(R.pre.u.uThreshold, 0.58);
          gl.uniform1f(R.pre.u.uKnee, 0.22);
          drawTri();

          // 2. descente de la pyramide
          for (let i = 1; i < levels; i++) {
            pass(R.down, M[i], M[i - 1].tex, M[i - 1].w, M[i - 1].h);
            drawTri();
          }

          // 3. halos anamorphiques (depuis le niveau 1)
          if (tier >= 2) {
            pass(R.streak, R.streakA, M[1].tex, M[1].w, M[1].h);
            gl.uniform1f(R.streak.u.uSpread, 2.0);
            drawTri();
            pass(R.streak, R.streakB, R.streakA.tex, R.streakA.w, R.streakA.h);
            gl.uniform1f(R.streak.u.uSpread, 6.0);
            drawTri();
          }

          // 4. remontée additive (chaque niveau reçoit le flou du niveau inférieur)
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.ONE, gl.ONE);
          for (let i = levels - 1; i > 0; i--) {
            pass(R.up, M[i - 1], M[i].tex, M[i].w, M[i].h);
            gl.uniform1f(R.up.u.uGain, 1.0);
            drawTri();
          }
          gl.disable(gl.BLEND);

          // 5. données dynamiques : ondes de choc et lumières
          const invH = 1 / Math.max(1, H);
          let wn = 0;
          if (!reduced) {
            for (let i = shockwaves.length - 1; i >= 0 && wn < (tier >= 2 ? MAX_WAVES : 4); i--) {
              const s = shockwaves[i];
              const a = clamp(s.life / (s.maxLife || 1), 0, 1);
              R.waves.set([s.x / W, 1 - s.y * invH, s.r * invH, a * a * 1.2], wn * 4);
              wn++;
            }
          }

          for (let i = lights.length - 1; i >= 0; i--) {
            lights[i].life -= dt;
            if (lights[i].life <= 0) lights.splice(i, 1);
          }
          const frameLights = [];
          if (player && player.alive && state === 'playing') {
            frameLights.push({ x: player.x, y: player.y + 16, r: 120, i: 0.32 + Math.sin(globalTime * 23) * 0.04, c: [0.25, 0.75, 1.0] });
          }
          if (boss && boss.hp > 0) {
            frameLights.push({ x: boss.x, y: boss.y, r: (boss.r || 50) * 3.4, i: 0.34, c: parseColor(boss.color || '#f43f5e') });
          }
          for (const L of lights) {
            const t = L.life / L.max;
            frameLights.push({ x: L.x, y: L.y, r: L.r * (1.25 - t * 0.25), i: L.i * t * t, c: L.c });
          }
          frameLights.sort((a, b) => b.i - a.i);
          const ln = Math.min(frameLights.length, tier >= 2 ? MAX_LIGHTS : 6);
          for (let i = 0; i < ln; i++) {
            const L = frameLights[i];
            R.lights.set([L.x / W, 1 - L.y * invH, L.r * invH, L.i], i * 4);
            R.lightCol.set(L.c, i * 3);
          }

          // 6. composition finale → écran
          const C = R.comp;
          gl.useProgram(C.p);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.viewport(0, 0, R.sceneW, R.sceneH);
          const bind = (unit, tex, name) => {
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.uniform1i(C.u[name], unit);
          };
          bind(0, R.scene, 'uScene');
          bind(1, M[0].tex, 'uBloom');
          bind(2, (tier >= 2 ? R.streakB : M[0]).tex, 'uStreak');
          bind(3, M[levels - 1].tex, 'uAmbient');
          gl.uniform4fv(C.u.uWaves, R.waves);
          gl.uniform1i(C.u.uWaveN, wn);
          gl.uniform4fv(C.u.uLights, R.lights);
          gl.uniform3fv(C.u.uLightCol, R.lightCol);
          gl.uniform1i(C.u.uLightN, ln);
          gl.uniform1f(C.u.uAspect, W / Math.max(1, H));
          gl.uniform1f(C.u.uAberr, reduced ? 0 : Math.min(0.022, hitFlash * 0.03 + shake * 0.004));
          gl.uniform1f(C.u.uBloomK, (tier >= 2 ? 0.95 : 0.8) / (levels - 1) * 1.6);
          gl.uniform1f(C.u.uStreakK, tier >= 2 ? 0.55 : 0);
          gl.uniform1f(C.u.uSlow, reduced ? 0 : (slowTime > 0 ? Math.min(1, slowTime * 2) : 0));
          gl.uniform1f(C.u.uSat, document.body.classList.contains('fever') ? 1.32 : 1.07);
          gl.uniform1f(C.u.uTime, globalTime);
          drawTri();

          // filtre daltonien éventuellement posé sur le canvas 2D : reporté sur la sortie
          const f = canvas.style.filter || '';
          if (fxCanvas.style.filter !== f) fxCanvas.style.filter = f;
        }

        // ---------- surveillance de performance (mode Auto) ----------
        function monitor(ms) {
          emaMs += (ms - emaMs) * 0.05;
          if (meta.gpuFx !== 'auto' || tier === 0 || document.hidden) { slowFor = 0; return; }
          slowFor = emaMs > 22 ? slowFor + ms / 1000 : 0;
          if (slowFor > 4) {
            slowFor = 0;
            emaMs = 16.7;
            autoCap = tier - 1;
            applyTier();
            toast(autoCap > 0 ? 'Effets GPU allégés pour la fluidité' : 'Effets GPU désactivés pour la fluidité');
          }
        }

        const baseDraw14 = draw;
        draw = function () {
          baseDraw14();
          const now = performance.now();
          const ms = Math.min(100, now - lastT);
          lastT = now;
          if (tier === 0 || !gl) return;
          try {
            render(Math.min(0.05, ms / 1000));
            monitor(ms);
          } catch (err) {
            console.warn('[fx] désactivé :', err);
            broken = true;
            applyTier();
          }
        };

        // ---------- réglage ----------
        const settings = $('settingsOverlay');
        const cbRow = settings && settings.querySelector('#stColorblind');
        if (cbRow) {
          const row = document.createElement('div');
          row.className = 'settings-row';
          row.innerHTML = `
            <label>Effets GPU<span class="settings-desc">Bloom, halos, lumières dynamiques, ondes réfractives</span></label>
            <div class="settings-control">
              <select id="stGpuFx">
                <option value="auto">Auto</option>
                <option value="cinema">Cinéma</option>
                <option value="off">Désactivés</option>
              </select>
            </div>`;
          cbRow.closest('.settings-row').insertAdjacentElement('afterend', row);
          const sel = row.querySelector('#stGpuFx');
          sel.value = meta.gpuFx;
          sel.addEventListener('change', () => {
            meta.gpuFx = sel.value;
            autoCap = 2;
            saveMeta();
            applyTier();
            AudioSys.ui();
          });
        }
        // la qualité graphique globale pilote aussi le mode Auto
        const stQ = settings && settings.querySelector('#stQuality');
        if (stQ) stQ.addEventListener('change', () => { autoCap = 2; applyTier(); });

        applyTier();

        if (window.__NP4) {
          window.__NP4.fx = {
            tier: () => tier,
            broken: () => broken,
            ms: () => emaMs,
            lights: () => lights.length,
            set: (mode) => { meta.gpuFx = mode; autoCap = 2; applyTier(); return tier; }
          };
        }
      })();

