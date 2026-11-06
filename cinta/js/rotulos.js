/* Magnetófono · versión interactiva · LOS RÓTULOS NÍTIDOS (Claude para Iago, 7-nov-2026)
   Los cartelitos, rótulos, el epílogo y los títulos del final van GRABADOS dentro de los vídeos de las animáticas: en pantallas grandes
   o Retina se ven blandos. Aquí, encima de cada uno, la página vuelve a escribir el mismo texto (misma letra, mismo tamaño, mismo sitio,
   ajustado al píxel) y, debajo, un parche que borra el del vídeo alrededor de las letras (sacado del propio fotograma).
   Los datos: cinta/js/rotulos_datos.js (MAG.ROT) y los parches: cinta/rot/<tramo>.webp. Igual que subtitulos.js: solo mira qué vídeo se ve
   y por qué fotograma va; no cambia nada del motor. Quitarlo: borrar los dos <script> de prueba.html (o vaciar MAG.ROT). */
(function () {
  'use strict';
  const MAG = window.MAG = window.MAG || {};
  const $ = s => document.querySelector(s);
  let capa = null; const vivos = new Map(); const media = new WeakMap(); const atlas = {};
  function base() { const s = [...document.scripts].find(e => /rotulos\.js/.test(e.src)); return s ? s.src.replace(/js\/rotulos\.js.*$/, '') : 'cinta/'; }
  const B = base();
  function precarga() {
    const R = MAG.ROT; if (!R) return;
    Object.keys(R.tramos).forEach(id => { if (!atlas[id]) { atlas[id] = B + 'rot/' + id + '.webp?v=' + R.v; const i = new Image(); i.src = atlas[id]; } });
    const fs = new Set(); Object.values(R.tramos).forEach(L => L.forEach(e => fs.add(e.f)));
    if (document.fonts) fs.forEach(f => document.fonts.load(f).catch(() => {}));
  }
  function monta() {
    const vB = $('#vB'); if (!vB) return false;
    if (!capa) {
      capa = document.createElement('div'); capa.id = 'rotVid';
      capa.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden';
      const st = document.createElement('style');
      st.textContent = '#rotVid .rot{position:absolute;left:0;top:0;width:1920px;height:1080px;will-change:opacity,transform}' +
        '#rotVid .rot-p{position:absolute;background-repeat:no-repeat}' +
        '#rotVid .rot-t{position:absolute;white-space:pre;-webkit-font-smoothing:antialiased}' +
        '#escenario.fxCinta #rotVid{filter:blur(2.2px) saturate(.55) brightness(.92)}';
      document.head.appendChild(st);
      ['vA', 'vB'].forEach(id => sigue($('#' + id)));
      setTimeout(precarga, 1500);
    }
    // siempre justo encima de los vídeos y debajo de los subtítulos nítidos (#subsVid)
    const s = $('#subsVid');
    if (s) { if (capa.nextElementSibling !== s) s.before(capa); }
    else if (capa.previousElementSibling !== vB) vB.after(capa);
    return true;
  }
  function sigue(v) {
    if (!v || typeof v.requestVideoFrameCallback !== 'function') return;
    const cb = (ahora, md) => { media.set(v, { t: md.mediaTime, src: v.currentSrc }); v.requestVideoFrameCallback(cb); };
    v.requestVideoFrameCallback(cb);
  }
  function tiempo(v) {
    const m = media.get(v);
    if (!v.paused && !v.seeking && m && m.src === v.currentSrc && Math.abs(m.t - v.currentTime) < 0.25) return m.t;
    return v.currentTime;
  }
  function interp(K, t, j) {           // K: [[t, v1, v2…], …] → valor j en t (lineal; constante fuera)
    if (t <= K[0][0]) return K[0][j];
    for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const u = (t - K[i - 1][0]) / ((K[i][0] - K[i - 1][0]) || 1); return K[i - 1][j] + u * (K[i][j] - K[i - 1][j]); }
    return K[K.length - 1][j];
  }
  function crea(id, e) {
    const d = document.createElement('div'); d.className = 'rot';
    if (e.p) {
      const p = document.createElement('div'); p.className = 'rot-p';
      p.style.cssText += `left:${e.p[0]}px;top:${e.p[1]}px;width:${e.p[2]}px;height:${e.p[3]}px;background-image:url("${atlas[id] || (B + 'rot/' + id + '.webp?v=' + MAG.ROT.v)}");background-position:${-e.p[4]}px ${-e.p[5]}px`;
      d.appendChild(p);
    }
    const t = document.createElement('div'); t.className = 'rot-t';
    t.style.cssText += `left:${e.x}px;top:${e.y}px;font:${e.f};line-height:${e.lh}px;letter-spacing:${e.ls}px;color:${e.c};text-align:${e.al}` + (e.al === 'center' ? ';width:1920px' : '');
    t.textContent = e.tx; d.appendChild(t);
    capa.appendChild(d); return d;
  }
  function vuelta() {
    requestAnimationFrame(vuelta);
    if (!monta()) return;
    const R = MAG.ROT; const activos = new Set();
    const v = [$('#vA'), $('#vB')].find(e => e && e.classList.contains('ve'));
    if (R && v && v.dataset.ruta && v.readyState >= 2) {
      const id = (/(p_[^/]+?)\.mp4/.exec(v.dataset.ruta) || [])[1];
      const L = id && R.tramos[id];
      if (L) {
        const t = tiempo(v) + 0.004;
        for (let i = 0; i < L.length; i++) {
          const e = L[i]; if (t < e.a || t >= e.b) continue;
          const k = id + ':' + i; activos.add(k);
          let d = vivos.get(k); if (!d) { d = crea(id, e); vivos.set(k, d); }
          const o = e.op ? Math.max(0, Math.min(1, interp(e.op, t, 1))) : 1;
          d.style.opacity = o.toFixed(3);
          d.style.transform = e.mv ? `translate(${interp(e.mv, t, 1).toFixed(2)}px,${interp(e.mv, t, 2).toFixed(2)}px)` : '';
          if (e.w) d.style.clipPath = `inset(0 ${Math.max(0, 1920 - interp(e.w, t, 1)).toFixed(1)}px 0 0)`;
        }
      }
    }
    for (const [k, d] of vivos) if (!activos.has(k)) { d.remove(); vivos.delete(k); }
  }
  requestAnimationFrame(vuelta);
})();
