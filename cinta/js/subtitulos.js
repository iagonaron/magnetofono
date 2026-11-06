/* Magnetófono · versión interactiva · LOS SUBTÍTULOS NÍTIDOS (Claude para Iago, 6-nov-2026)
   Los subtítulos de diálogo van GRABADOS dentro de los vídeos de las animáticas: en pantallas grandes o Retina se ven blandos.
   Aquí, encima de cada uno, la página pinta EL MISMO cuadro (mismas clases .sub de estilo.css, mismo texto, mismas líneas y
   en el mismo sitio, al píxel), con el fondo opaco del color medio del cuadro del vídeo para que no se trasluzca el de debajo.
   Los datos (cinta/js/subs.js): MAG.SUBS[tramo] = [[t0, t1, quién, 'línea\nlínea', x, y, fondo], …], en segundos del vídeo y
   píxeles de 1920×1080 (esquina de arriba a la izquierda del cuadro). Los cartelitos con flecha NO se tocan (siguen en el vídeo).
   Solo mira qué vídeo se ve y por qué fotograma va (requestVideoFrameCallback si lo hay): no cambia nada del motor.
   Quitarlo: borrar el <script> de este fichero en prueba.html (o vaciar MAG.SUBS). */
(function () {
  'use strict';
  const MAG = window.MAG = window.MAG || {};
  const $ = s => document.querySelector(s);
  let capa = null, caja = null, q = null, x = null, actual = null;
  const media = new WeakMap();                       // vídeo → { t: mediaTime del último fotograma pintado, cuando }

  function monta() {
    const vB = $('#vB'); if (!vB || capa) return !!capa;
    capa = document.createElement('div'); capa.id = 'subsVid';
    capa.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    vB.after(capa);                                  // encima de los vídeos, debajo de #fondo, las estaciones y los subtítulos de la página
    caja = document.createElement('div');
    q = document.createElement('div'); q.className = 'sub-q';
    x = document.createElement('div'); x.className = 'sub-x';
    caja.append(q, x); caja.hidden = true; capa.appendChild(caja);
    const st = document.createElement('style');
    st.textContent = '#subsVid .sub{left:0;top:0;bottom:auto;transform:none;max-width:none}' +
      '#escenario.fxCinta #subsVid{filter:blur(2.2px) saturate(.55) brightness(.92)}';   // con la cinta corriendo, como el vídeo
    document.head.appendChild(st);
    ['vA', 'vB'].forEach(id => sigue($('#' + id)));
    return true;
  }
  /* el fotograma que de verdad se está viendo (no el que viene): requestVideoFrameCallback */
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
  function pon(s) {
    if (s === actual) return;
    actual = s;
    if (!s) { caja.hidden = true; return; }
    const quien = s[2];
    caja.className = quien === 'NARRADOR' ? 'sub sub-n' : (quien === 'TÚ' ? 'sub sub-t' : 'sub sub-p');
    q.textContent = quien; x.textContent = s[3];
    // si el cuadro del vídeo es algo más grande (s[7] = [izq., dcha., arriba, abajo]), el de la página crece eso (la letra no se mueve)
    const m = s[7] || [0, 0, 0, 0];
    caja.style.left = (s[4] - m[0]) + 'px'; caja.style.top = (s[5] - m[2]) + 'px';
    caja.style.padding = (22 + m[2]) + 'px ' + (44 + m[1]) + 'px ' + (26 + m[3]) + 'px ' + (44 + m[0]) + 'px';
    caja.style.background = s[6] || '';
    caja.hidden = false;
  }
  function vuelta() {
    requestAnimationFrame(vuelta);
    if (!monta()) return;
    const S = MAG.SUBS; let s = null;
    const v = [$('#vA'), $('#vB')].find(e => e && e.classList.contains('ve'));
    if (S && v && v.dataset.ruta && v.readyState >= 2) {
      const id = (/(p_[^/]+?)\.mp4/.exec(v.dataset.ruta) || [])[1];
      const L = id && S[id];
      if (L) {
        const t = tiempo(v) + 0.004;
        for (let i = 0; i < L.length; i++) { if (t >= L[i][0] && t < L[i][1]) { s = L[i]; break; } if (L[i][0] > t) break; }
      }
    }
    pon(s);
  }
  requestAnimationFrame(vuelta);
})();
