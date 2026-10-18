/* Magnetófono · bobina 3 · «MONTA TU PIEZA» (fork D, Claude para Iago, 18-oct-2026)
   La interfaz de la simulación de la animática (b3v33.py: capa_compo), pero de verdad: tres pistas, cuatro frases de 8 s, el fonógeno
   a lo ancho (la tecla del centro «=» = el sonido tal cual; a la izquierda, más grave y más lento; a la derecha, más agudo y más
   rápido), CORTAR (un corte por vez; otro clic selecciona el trozo), AL REVÉS, SIGUIENTE FRASE (llegan cintas nuevas, VACÍAS) y el dado.
   Los doce sonidos (los 8 de París de la bobina 2 + los 4 de la clase) se GASTAN al usarlos: cuatro frases de tres.
   Expone MAG.piezaAudio() → AudioBuffer (32 s, estéreo) para la emisión de la radio. Id de la estación: b3_pieza. */
(function () {
  'use strict';
  const MAG = window.MAG;
  const FR = 8, NF = 4, SR = 44100;
  const COL = [[112, 142, 84], [186, 118, 66], [84, 112, 166]];
  const rgb = (c, a) => a == null ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const X0C = 540, X1C = 1880, WC = X1C - X0C, YP = [250, 392, 534], HP = 104;
  const BLANCAS = [-12, -10, -8, -7, -5, -3, -1, 0, 2, 4, 5, 7, 9, 11, 12];
  const KW = 120, KH = 186, KBX = 40, KBY = 668, KBW = BLANCAS.length * KW + 40, KBH = KH + 64;
  const NEGRAS = []; BLANCAS.forEach((st, i) => { if (i < BLANCAS.length - 1 && BLANCAS[i + 1] - st === 2) NEGRAS.push({ st: st + 1, x: 20 + (i + 1) * KW - 26 }); });
  // el teclado del ordenador, como en los «trackers»: abajo, la octava grave; arriba, la del centro y la aguda
  const TECLAS_PC = { z: -12, s: -11, x: -10, d: -9, c: -8, v: -7, g: -6, b: -5, h: -4, n: -3, j: -2, m: -1,
    q: 0, '2': 1, w: 2, '3': 3, e: 4, r: 5, '5': 6, t: 7, '6': 8, y: 9, '7': 10, u: 11, i: 12 };
  const rate = st => Math.pow(2, st / 12);
  // nombres cortos (los de la animática) para los sonidos de París de la bobina 2
  const CORTO_DE = { estacion_0: 'el silbato', estacion_1: 'la locomotora', estacion_2: 'el vapor', estacion_3: 'el tren que pasa', estacion_4: '«¡Al tren!»',
    mercado_0: '«¡Qué manzanas!»', mercado_1: 'la balanza', mercado_2: 'las monedas', mercado_3: 'las gallinas', mercado_4: 'el cuchillo',
    cafe_0: 'la cafetera', cafe_1: 'la cucharilla', cafe_2: 'el periódico', cafe_3: '«¿Un cafecito?»', cafe_4: 'el café lleno',
    muelles_0: 'el barco', muelles_1: 'la campana del barco', muelles_2: 'las palomas', muelles_3: 'el libro viejo', muelles_4: 'pasar una página', muelles_5: '«Attention, on passe !»' };
  // por si no estuviera cargado cinta/js/sonidos_paris.js (MAG.PARIS): la misma lista, con los mismos ficheros (a/b2_p_*)
  const PROV = [
    ['estacion_0', 'CORTO'], ['estacion_1', 'LARGO'], ['estacion_2', 'CORTO'], ['estacion_3', 'LARGO'], ['estacion_4', 'CORTO'],
    ['mercado_0', 'LARGO'], ['mercado_1', 'CORTO'], ['mercado_2', 'CORTO'], ['mercado_3', 'LARGO'], ['mercado_4', 'CORTO'],
    ['cafe_0', 'LARGO'], ['cafe_1', 'CORTO'], ['cafe_2', 'CORTO'], ['cafe_3', 'CORTO'], ['cafe_4', 'LARGO'],
    ['muelles_0', 'LARGO'], ['muelles_1', 'CORTO'], ['muelles_2', 'CORTO'], ['muelles_3', 'CORTO'], ['muelles_4', 'CORTO'], ['muelles_5', 'CORTO']
  ].map(([id, tipo]) => ({ id, sitio: id.split('_')[0], nombre: CORTO_DE[id], tipo, ruta: 'a/b2_p_' + id + '.mp3' }));
  const EJEMPLO = ['estacion_0', 'estacion_1', 'mercado_1', 'mercado_2', 'cafe_0', 'cafe_2', 'muelles_0', 'muelles_5'];
  const CLASE_PROV = [
    { id: 'clase_lapiz', nombre: 'los lápices', tipo: 'CORTO', ruta: 'a/b3p_clase_lapiz.mp3' },
    { id: 'clase_silla', nombre: 'las sillas', tipo: 'CORTO', ruta: 'a/b3p_clase_silla.mp3' },
    { id: 'clase_cremallera', nombre: 'la cremallera', tipo: 'CORTO', ruta: 'a/b3p_clase_cremallera.mp3' },
    { id: 'clase_libro', nombre: 'el libro', tipo: 'CORTO', ruta: 'a/b3p_clase_libro.mp3' }];
  const UI = ['a/ui_tecla.mp3', 'a/b3p_reloj.mp3', 'a/b3p_cambio.mp3', 'a/b3p_tic.mp3', 'a/b3p_corta.mp3', 'a/b3p_reves.mp3', 'a/b3p_dado.mp3', 'a/b3p_Y46.mp3', 'i/b3p_fondo.jpg'];
  const listaParis = () => (MAG.PARIS && MAG.PARIS.length) ? MAG.PARIS : PROV;
  /* los ocho de París de la bobina del alumno: los que eligió en la bobina 2 y, si faltan, los del vídeo */
  function parisDeLaBobina() {
    if (typeof MAG.bobinaParis === 'function') { try { const b = MAG.bobinaParis().filter(Boolean); if (b.length) return b.slice(0, 8); } catch (e) {} }
    const L = listaParis();
    const out = ((MAG.datos && MAG.datos.paris) || []).map(s => L.find(q => q.id === s.id) || (s && s.ruta ? s : null)).filter(Boolean).slice(0, 8);
    const ej = (MAG.PARIS_EJEMPLO && MAG.PARIS_EJEMPLO.length) ? MAG.PARIS_EJEMPLO : EJEMPLO;
    for (const id of ej) { if (out.length >= 8) break; if (!out.some(s => s.id === id)) { const s = L.find(q => q.id === id); if (s) out.push(s); } }
    return out;
  }
  /* los cuatro de la clase (MAG.datos.clase, de la estación b3_clase); si faltan, los del vídeo */
  function claseDeLaBobina() {
    const out = ((MAG.datos && MAG.datos.clase) || []).filter(s => s && (s.clave || s.ruta)).slice(0, 4)
      .map((s, i) => Object.assign({ id: s.id || ('clase_' + (i + 1)), tipo: s.tipo || 'CORTO' }, s, { nombre: s.nombre || ('ruido ' + (i + 1)) }));
    for (const c of CLASE_PROV) { if (out.length >= 4) break; if (!out.some(s => s.id === c.id || s.nombre === c.nombre)) out.push(Object.assign({}, c)); }
    return out;
  }
  const nombreCorto = s => (s && (CORTO_DE[s.id] || s.corto || s.nombre)) || '';

  // ───────────────────────── los sonidos (buffers) ─────────────────────────
  const _bufs = {};
  async function bufDe(s) {
    if (!s) return null;
    if (_bufs[s.id]) return _bufs[s.id];
    let b = null;
    try {
      if (s.clave) { const o = await MAG.idbLee(s.clave); if (o && o.ch) b = MAG.objABuf(o); }
      if (!b && s.ruta) { const r = MAG.R[s.ruta] && MAG.R[s.ruta].buf ? MAG.R[s.ruta] : await MAG.trae(s.ruta); b = r && r.buf; }
    } catch (e) { console.warn('[b3p] sin sonido', s.id, e); }
    if (b) _bufs[s.id] = b;
    return b;
  }
  /* los doce de la bobina: los 8 de París (lo que grabó el alumno en la bobina 2, o el ejemplo) + los 4 de clase */
  async function catalogo() {
    const paris = parisDeLaBobina().map(s => Object.assign({}, s, { tipo: s.tipo || 'CORTO' }));
    const clase = claseDeLaBobina();
    clase.forEach(s => { if (s.clave) delete _bufs[s.id]; });        // (lo grabado en clase se lee de nuevo: pudo regrabarse)
    _mezcla = null;
    const todo = paris.concat(clase);
    await Promise.all(todo.map(bufDe));
    todo.forEach(s => { s.buf = _bufs[s.id] || null; if (s.buf && !s.tipo) s.tipo = s.buf.duration >= 3 ? 'LARGO' : 'CORTO'; });
    return todo.filter(s => s.buf);
  }

  // ───────────────────────── el sonido de una pista ─────────────────────────
  /* una nota: el sonido a la velocidad de la tecla. LARGO: mientras se mantiene, con fundido de entrada y de salida (y en bucle si el
     sonido es más corto que lo mantenido); CORTO: el golpe entero, con su ataque. Sirve para el contexto en vivo y para el renderizado. */
  function nota(ac, destino, son, st, t, d) {
    const src = ac.createBufferSource(); src.buffer = son.buf; src.playbackRate.value = rate(st);
    const g = ac.createGain(); src.connect(g); g.connect(destino);
    if (son.tipo === 'LARGO') {
      const dur = son.buf.duration;
      if (dur > 1) { src.loop = true; src.loopStart = dur * 0.12; src.loopEnd = dur * 0.86; }
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 0.12);
      src.start(t);
      if (d != null) { const fin = t + Math.max(0.15, d); g.gain.setValueAtTime(1, fin); g.gain.linearRampToValueAtTime(0, fin + 0.35); src.stop(fin + 0.4); }
    } else { g.gain.setValueAtTime(1, t); src.start(t); }
    return { src, g, suelta(t2) { try { g.gain.cancelScheduledValues(t2); g.gain.setValueAtTime(g.gain.value, t2); g.gain.linearRampToValueAtTime(0, t2 + 0.35); src.stop(t2 + 0.4); } catch (e) {} } };
  }
  async function renderPista(p) {
    if (!p.son || !p.son.buf || !p.ev.length) return null;
    const oc = new OfflineAudioContext(2, SR * FR, SR);
    p.ev.forEach(e => { if (e.t < FR) nota(oc, oc.destination, p.son, e.st, e.t, p.son.tipo === 'LARGO' ? (e.d != null ? e.d : 0.5) : null); });
    let b = await oc.startRendering();
    p.revs.forEach(([a, z]) => { b = reves(b, a, z); });
    return b;
  }
  function reves(b, a, z) {
    const i0 = Math.max(0, Math.floor(a * b.sampleRate)), i1 = Math.min(b.length, Math.floor(z * b.sampleRate));
    for (let c = 0; c < b.numberOfChannels; c++) {
      const d = b.getChannelData(c);
      for (let i = i0, j = i1 - 1; i < j; i++, j--) { const x = d[i]; d[i] = d[j]; d[j] = x; }
    }
    return b;
  }
  /* la pieza entera (o una lista de frases) en un buffer: cuatro frases seguidas, mezcla limpia (pico a -1 dBFS) */
  async function mezcla(frases) {
    const n = frases.length; if (!n) return null;
    const oc = new OfflineAudioContext(2, SR * FR * n, SR);
    const comp = oc.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
    comp.connect(oc.destination);
    for (let f = 0; f < n; f++) {
      for (const pq of frases[f].pistas) {
        if (!pq || !pq.ev || !pq.ev.length) continue;
        const son = Object.assign({}, pq.son); son.buf = await bufDe(pq.son); if (!son.buf) continue;
        const b = await renderPista({ son, ev: pq.ev, revs: pq.revs || [] }); if (!b) continue;
        const s = oc.createBufferSource(); s.buffer = b; const g = oc.createGain(); g.gain.value = pq.vol != null ? pq.vol : 0.85;
        s.connect(g); g.connect(comp); s.start(f * FR);
      }
    }
    const out = await oc.startRendering();
    // el nivel: el percentil 99,9 de |x| a −2,5 dBFS (sin pasar de +12 dB sobre normalizar al pico) y, por encima de −4,4 dBFS,
    // un recorte suave con techo en −1 dBFS: así un golpe suelto no deja la pieza entera bajita
    const H = new Uint32Array(2048); let pk = 0, ns = 0;
    for (let c = 0; c < out.numberOfChannels; c++) { const d = out.getChannelData(c); for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > pk) pk = v; H[Math.min(2047, (v * 1024) | 0)]++; ns++; } }
    if (pk > 0.0001) {
      let p = pk, acc = 0; for (let q = 2047; q > 0; q--) { acc += H[q]; if (acc > ns * 0.001) { p = Math.min(pk, (q + 1) / 1024); break; } }
      const k = Math.min(0.75 / p, 4 * 0.891 / pk), U = 0.6, T = 0.891 - U;
      for (let c = 0; c < out.numberOfChannels; c++) { const d = out.getChannelData(c); for (let i = 0; i < d.length; i++) { const y = d[i] * k, a = Math.abs(y); d[i] = a <= U ? y : Math.sign(y) * (U + T * Math.tanh((a - U) / T)); } }
    }
    return out;
  }
  /* para la emisión: la pieza guardada (32 s), o null si no hay */
  let _mezcla = null, _mezclaDe = null;          // (la última mezcla: si la pieza no ha cambiado, no se vuelve a renderizar)
  MAG.piezaAudio = async function () {
    const P = MAG.datos && MAG.datos.pieza;
    if (!P || !P.frases || !P.frases.length) return null;
    const k = JSON.stringify(P.frases);
    if (_mezcla && _mezclaDe === k) return _mezcla;
    try { const b = await mezcla(P.frases); _mezcla = b; _mezclaDe = k; return b; } catch (e) { console.warn('[b3p] no se pudo mezclar la pieza', e); return null; }
  };

  // ───────────────────────── la estación ─────────────────────────
  MAG.registra('b3_pieza', {
    get recursos() { return parisDeLaBobina().map(s => s.ruta).concat(claseDeLaBobina().map(s => s.ruta), CLASE_PROV.map(s => s.ruta), UI).filter((r, i, a) => r && a.indexOf(r) === i); },
    fondo: 'i/b3p_fondo.jpg',
    async monta(ctx) {
      const ac = MAG.audio();
      ctx.fondo('i/b3p_fondo.jpg');
      const bus = ac.createDynamicsCompressor(); bus.threshold.value = -12; bus.ratio.value = 3; bus.attack.value = 0.005; bus.release.value = 0.2;
      const busG = ac.createGain(); busG.gain.value = 1; bus.connect(busG); busG.connect(MAG.master);
      const SONES = await catalogo();
      if (!ctx.vivo()) return;
      const S = { k: 0, frases: [], pistas: [0, 1, 2].map(nuevaPista), sel: 0, corte: false, selSeg: null, grab: null, play: null, lista: null, fin: false, vivos: [] };
      function nuevaPista() { return { son: null, ev: [], revs: [], cortes: [], vol: 0.85, buf: null }; }
      // si ya había una pieza (a medias o entera), se sigue donde estaba
      const prev = MAG.datos.pieza;
      if (prev && prev.frases && prev.frases.length) {
        S.frases = prev.frases.map(f => ({ pistas: f.pistas.map(pq => Object.assign({}, pq, { son: Object.assign({}, pq.son, { buf: (SONES.find(x => x.id === pq.son.id) || {}).buf || null }) })) }));
        S.k = Math.min(S.frases.length, NF);
      }
      const usados = () => { const u = new Set(); S.frases.forEach(f => f.pistas.forEach(pq => pq && pq.son && u.add(pq.son.id))); return u; };
      const quedan = (j) => { const u = usados(); S.pistas.forEach((p, i) => { if (i !== j && p.son) u.add(p.son.id); }); return SONES.filter(s => !u.has(s.id)); };

      // ── la interfaz ──
      const css = ctx.el('style', { text: CSS });
      // (los botones no se quedan con el foco al pulsarlos con el ratón: si no, Espacio o Intro los «volverían a pulsar»)
      ctx.on(window, 'mousedown', ev => { const t = ev.target; if (t && t.closest && t.closest('.b3p button')) ev.preventDefault(); }, true);
      const raiz = ctx.el('div', { class: 'b3p' }); raiz.__S = S;     // (para las pruebas del banco)
      const cab = MAG.el('div', { class: 'b3p-cab' }); raiz.appendChild(cab);
      const ayuda = MAG.el('div', { class: 'b3p-ayuda', text: 'Elige una pista y su sonido · pulsa ● y toca el fonógeno · ▶ para escucharla' });
      raiz.appendChild(ayuda);
      const bDado = boton('dado', 924, 118, 66, 66, '', 'Si te atascas, tira el dado');
      const bCortar = boton('cortar', 1010, 118, 250, 66, 'CORTAR', 'Cortar: un corte en una pista (otro clic, elige el trozo)');
      const bReves = boton('reves', 1278, 118, 250, 66, 'AL REVÉS', 'Dar la vuelta al trozo elegido (o a la pista entera)');
      const bSig = boton('sig', 1546, 118, 334, 66, 'SIGUIENTE FRASE', 'Guardar esta frase y pasar a la siguiente');
      function boton(cual, x, y, w, h, texto, titulo) {
        const b = MAG.el('button', { class: 'b3p-bt b3p-bt-' + cual, type: 'button', title: titulo, html: ICON[cual] + (texto ? '<span>' + texto + '</span>' : '') });
        Object.assign(b.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' }); raiz.appendChild(b); return b;
      }
      const tarjetas = [], calles = [], lienzos = [], capas = [];
      for (let j = 0; j < 3; j++) {
        const t = MAG.el('div', { class: 'b3p-tj' }); t.style.top = (YP[j] - 2) + 'px'; t.style.borderColor = rgb(COL[j]); t.dataset.j = j; raiz.appendChild(t); tarjetas.push(t);
        const c = MAG.el('div', { class: 'b3p-calle' }); c.style.top = YP[j] + 'px'; c.dataset.j = j; raiz.appendChild(c); calles.push(c);
        const lz = MAG.el('canvas', { width: WC, height: HP, class: 'b3p-lienzo' }); c.appendChild(lz); lienzos.push(lz);
        const cp = MAG.el('div', { class: 'b3p-capa' }); c.appendChild(cp); capas.push(cp);
      }
      const cabezal = MAG.el('div', { class: 'b3p-cabezal' }); raiz.appendChild(cabezal);
      const cuenta = MAG.el('div', { class: 'b3p-cuenta' }); raiz.appendChild(cuenta);
      // el fonógeno
      const kb = MAG.el('div', { class: 'b3p-kb', title: 'También con el teclado del ordenador: Z X C V B N M (las graves) · Q W E R T Y U I (desde «=» hacia arriba)' }); Object.assign(kb.style, { left: KBX + 'px', top: KBY + 'px', width: KBW + 'px', height: KBH + 'px' }); raiz.appendChild(kb);
      kb.innerHTML = '<div class="b3p-kb-l"><svg viewBox="0 0 16 20" width="16" height="20"><path d="M0 10L16 0v20z" fill="currentColor"/></svg> MÁS GRAVE = MÁS LENTO</div>'
        + '<div class="b3p-kb-c" style="left:' + (20 + 7 * KW + KW / 2) + 'px">EL FONÓGENO · = TAL CUAL</div>'
        + '<div class="b3p-kb-r">MÁS AGUDO = MÁS RÁPIDO <svg viewBox="0 0 16 20" width="16" height="20"><path d="M16 10L0 0v20z" fill="currentColor"/></svg></div>';
      const teclas = {};
      BLANCAS.forEach((st, i) => {
        const e = MAG.el('div', { class: 'b3p-bl', 'data-st': st }); Object.assign(e.style, { left: (20 + i * KW + 2) + 'px', width: (KW - 4) + 'px' });
        if (st === 0) e.appendChild(MAG.el('span', { class: 'b3p-igual', text: '=' }));
        e.appendChild(MAG.el('span', { class: 'b3p-mant', text: 'MANTENIDA' }));
        kb.appendChild(e); teclas[st] = e;
      });
      NEGRAS.forEach(n => { const e = MAG.el('div', { class: 'b3p-ng', 'data-st': n.st }); e.style.left = n.x + 'px'; e.appendChild(MAG.el('span', { class: 'b3p-mant', text: 'MANTENIDA' })); kb.appendChild(e); teclas[n.st] = e; });
      // el panel final (la pieza entera)
      const final = MAG.el('div', { class: 'b3p-final', hidden: true }); raiz.appendChild(final);

      // ── dibujar ──
      function pintaCab() {
        cab.textContent = S.k < NF ? `TU PIEZA · FRASE ${S.k + 1} DE ${NF} · ${FR} s` : `TU PIEZA · ${NF} FRASES · ${NF * FR} s`;
      }
      function pintaTarjeta(j) {
        const p = S.pistas[j], t = tarjetas[j], grab = S.grab && S.grab.j === j;
        t.classList.toggle('sel', S.sel === j); t.innerHTML = '';
        const fila = MAG.el('div', { class: 'b3p-tj-f1' }, [MAG.el('span', { class: 'b3p-tj-n', text: 'PISTA ' + (j + 1) })]);
        fila.firstChild.style.color = rgb(COL[j]);
        if (grab) fila.appendChild(MAG.el('span', { class: 'b3p-tj-rec', html: '<i></i>GRABANDO' }));
        if (p.son) fila.appendChild(MAG.el('span', { class: 'b3p-tag ' + (p.son.tipo === 'LARGO' ? 'largo' : 'corto'), text: p.son.tipo }));
        t.appendChild(fila);
        if (p.son) {
          const nom = MAG.el('div', { class: 'b3p-tj-son' }, [MAG.el('span', { class: 'b3p-tj-nom', text: nombreCorto(p.son) })]);
          const bs = MAG.el('button', { class: 'b3p-solo', type: 'button', title: 'Escuchar esta pista', html: ICON.play });
          bs.addEventListener('click', ev => { ev.stopPropagation(); reproduce([j]); });
          if (!p.buf) bs.disabled = true;
          nom.appendChild(bs); t.appendChild(nom);
          const pie = MAG.el('div', { class: 'b3p-tj-pie' }, [MAG.el('span', { class: 'b3p-modo', text: p.son.tipo === 'LARGO' ? 'LARGO: mantén la tecla' : 'CORTO: pulsa la tecla' })]);
          const vol = MAG.el('div', { class: 'b3p-vol', title: 'Volumen de la pista' }, [MAG.el('span', { text: 'VOL' }), MAG.el('div', { class: 'b3p-vol-r' }), MAG.el('div', { class: 'b3p-vol-k' })]);
          vol.querySelector('.b3p-vol-k').style.left = (34 + p.vol * 84) + 'px'; vol.querySelector('.b3p-vol-k').style.background = rgb(COL[j]);
          arrastraVol(vol, j); pie.appendChild(vol); t.appendChild(pie);
        } else {
          t.appendChild(MAG.el('div', { class: 'b3p-elige' + (S.lista === j ? ' abierta' : ''), html: '<span>elige un sonido</span><svg viewBox="0 0 20 14" width="20" height="14"><path d="M0 0h20L10 14z" fill="currentColor"/></svg>' }));
        }
      }
      function pintaTodo() { pintaCab(); for (let j = 0; j < 3; j++) { pintaTarjeta(j); pintaCalle(j); } estadoBotones(); }
      function pintaCalle(j) {
        const p = S.pistas[j], g = lienzos[j].getContext('2d');
        // la cinta (el marrón de la animática, más claro en el centro)
        const gr = g.createLinearGradient(0, 0, 0, HP);
        gr.addColorStop(0, 'rgb(46,29,19)'); gr.addColorStop(0.04, 'rgb(64,40,26)'); gr.addColorStop(0.5, 'rgb(84,53,33)'); gr.addColorStop(0.96, 'rgb(64,40,26)'); gr.addColorStop(1, 'rgb(46,29,19)');
        g.fillStyle = gr; g.fillRect(0, 0, WC, HP);
        if (p.buf) {
          const n = 335, pk = MAG.picos(p.buf, n); let mx = 0; pk.forEach(v => { if (v > mx) mx = v; });
          g.fillStyle = rgb(COL[j].map(c => Math.round(c * 0.5 + 127.5)));
          for (let i = 0; i < n; i++) {
            const v = mx > 0 ? Math.pow(pk[i] / mx, 0.7) : 0, hh = Math.max(1, Math.round(v * (HP / 2 - 8)));
            g.fillRect(Math.round(i * WC / n), HP / 2 - hh, 3, hh * 2);
          }
        }
        // los cortes, la selección y los «al revés»
        const cp = capas[j]; cp.innerHTML = '';
        p.cortes.forEach(c => { const e = MAG.el('div', { class: 'b3p-corte' }); e.style.left = (c / FR * WC - 3) + 'px'; cp.appendChild(e); });
        if (S.selSeg && S.selSeg.j === j) { const [a, z] = S.selSeg.seg; const e = MAG.el('div', { class: 'b3p-selseg' }); Object.assign(e.style, { left: (a / FR * WC + 2) + 'px', width: ((z - a) / FR * WC - 4) + 'px' }); cp.appendChild(e); }
        tramosReves(p).forEach(([a, z]) => { const e = MAG.el('div', { class: 'b3p-pill', text: 'AL REVÉS' }); e.style.left = Math.min(WC - 130, a / FR * WC + 14) + 'px'; cp.appendChild(e); });
      }
      /* los trozos que están al revés (un número impar de vueltas) */
      function tramosReves(p) {
        const m = new Map(); p.revs.forEach(([a, z]) => { const k = a.toFixed(3) + '|' + z.toFixed(3); m.set(k, (m.get(k) || 0) + 1); });
        return [...m.entries()].filter(([, n]) => n % 2).map(([k]) => k.split('|').map(Number));
      }
      function segmentos(p) { const c = [0].concat(p.cortes.slice().sort((a, b) => a - b), [FR]); const o = []; for (let i = 0; i < c.length - 1; i++) o.push([c[i], c[i + 1]]); return o; }
      function estadoBotones() {
        const listo = S.pistas.some(p => p.buf) && S.pistas.every((p, j) => (p.son && p.buf) || (!p.son && quedan(j).length === 0));
        // (no se desactivan de verdad: apagados, y si se pulsan dicen qué falta)
        apaga(bSig, !listo || !!S.grab);
        bCortar.classList.toggle('arm', S.corte);
        const p = S.pistas[S.sel]; apaga(bReves, !(p && p.buf) || !!S.grab);
        apaga(bCortar, !S.pistas.some(q => q.buf) || !!S.grab);
        apaga(bDado, !(p && p.son) || !!S.grab);
      }
      function apaga(b, si) { b.classList.toggle('apagado', si); b.setAttribute('aria-disabled', si ? 'true' : 'false'); }
      const apagado = b => b.classList.contains('apagado');
      function porQue(b) {
        if (S.grab) return '';
        const p = S.pistas[S.sel];
        if (b === bDado) return 'Primero elige un sonido para la pista ' + (S.sel + 1);
        if (b === bCortar || b === bReves) return p && p.son ? 'Primero graba la pista ' + (S.sel + 1) + ': pulsa ● y toca el fonógeno' : 'Primero graba algo en una pista';
        const falta = S.pistas.map((q, j) => (q.son && q.buf) || (!q.son && quedan(j).length === 0) ? null : j + 1).filter(Boolean);
        if (!falta.length) return '';
        const cuales = falta.length === 1 ? 'Te falta la pista ' + falta[0] : falta.length === 2 ? 'Te faltan las pistas ' + falta.join(' y ') : 'Te faltan las tres pistas';
        return cuales + ': elige el sonido y grábalo (o tira el dado)';
      }
      function destella(b) { b.classList.add('pulsa'); setTimeout(() => b.classList.remove('pulsa'), 260); }

      // ── elegir pista y sonido ──
      tarjetas.forEach((t, j) => t.addEventListener('pointerdown', ev => {
        ev._b3p = true;                    // (al repintar la tarjeta, ev.target se descuelga: que el oyente de window no cierre la lista)
        if (ev.target.closest('.b3p-vol') || ev.target.closest('.b3p-solo')) return;
        if (S.grab) return;
        S.sel = j; if (!S.pistas[j].son || ev.target.closest('.b3p-tj-son') || ev.target.closest('.b3p-elige')) abreLista(j); else cierraLista();
        pintaTodo();
      }));
      let listaEl = null, previa = null;
      function abreLista(j) {
        cierraLista(); S.lista = j;
        const q = quedan(j), h = 56 + 38 * q.length + 14, y = Math.max(60, Math.min(YP[j] - 30, 1080 - h - 30));
        listaEl = MAG.el('div', { class: 'b3p-lista' }); Object.assign(listaEl.style, { left: '525px', top: y + 'px' });
        listaEl.appendChild(MAG.el('div', { class: 'b3p-lista-t', text: 'TUS SONIDOS · quedan ' + q.length }));
        q.forEach(s => {
          const f = MAG.el('div', { class: 'b3p-lista-f' + (S.pistas[j].son && S.pistas[j].son.id === s.id ? ' marca' : '') }, [
            MAG.el('span', { class: 'b3p-lista-n', text: nombreCorto(s) }),
            MAG.el('button', { class: 'b3p-lista-o', type: 'button', title: 'Escucharlo', html: ICON.play }),
            MAG.el('span', { class: 'b3p-tag ' + (s.tipo === 'LARGO' ? 'largo' : 'corto'), text: s.tipo })]);
          f.querySelector('.b3p-lista-o').addEventListener('click', ev => { ev.stopPropagation(); if (previa) previa.parar(0.05); previa = ctx.suena(s.buf, { destino: bus }); });
          f.addEventListener('click', () => { asigna(j, s); });
          listaEl.appendChild(f);
        });
        if (!q.length) listaEl.appendChild(MAG.el('div', { class: 'b3p-lista-f vacia', text: 'ya no quedan: has usado los doce' }));
        raiz.appendChild(listaEl); pintaTarjeta(j);
      }
      function cierraLista() { if (listaEl) { listaEl.remove(); listaEl = null; } if (previa) { previa.parar(0.1); previa = null; } const j = S.lista; S.lista = null; if (j != null) pintaTarjeta(j); }
      function asigna(j, s) {
        const p = S.pistas[j];
        if (!p.son || p.son.id !== s.id) { S.pistas[j] = Object.assign(nuevaPista(), { son: s, vol: p.vol }); if (S.selSeg && S.selSeg.j === j) S.selSeg = null; }
        cierraLista(); S.sel = j; ctx.suena('a/ui_tecla.mp3', { db: -10 }); pintaTodo();
      }
      ctx.on(window, 'pointerdown', ev => { if (ev._b3p || !listaEl) return; const t = ev.target; if (t && t.closest && (t.closest('.b3p-lista') || t.closest('.b3p-tj'))) return; cierraLista(); });

      // ── el volumen ──
      function arrastraVol(el, j) {
        const pon = ev => { const p = MAG.punto(ev), r = el.getBoundingClientRect(), x0 = (r.left - document.getElementById('escenario').getBoundingClientRect().left) / MAG.escala;
          const v = Math.max(0, Math.min(1, (p.x - x0 - 34) / 84)); S.pistas[j].vol = v; el.querySelector('.b3p-vol-k').style.left = (34 + v * 84) + 'px';
          if (S.play && S.play.gan[j]) S.play.gan[j].gain.setTargetAtTime(v, ac.currentTime, 0.03); };
        el.addEventListener('pointerdown', ev => { ev.stopPropagation(); ev.preventDefault(); el.setPointerCapture(ev.pointerId); pon(ev);
          const mv = e => pon(e), up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); };
          el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); });
      }

      // ── el fonógeno: tocar (y grabar, si se está grabando) ──
      const pulsadas = new Map();          // st → {n: nota viva, e: evento}
      function aprieta(st) {
        if (pulsadas.has(st) || S.fin) return;
        const p = S.pistas[S.sel]; if (!p || !p.son) { avisa('Primero elige un sonido para la pista ' + (S.sel + 1)); return; }
        if (S.vivos.length > 24) { const v = S.vivos.shift(); try { v.suelta(); } catch (e) {} }
        const ahora = ac.currentTime, n = notaViva(p.son, st); S.vivos.push(n);
        let e = null;
        if (S.grab && S.grab.j === S.sel && ahora >= S.grab.t0 && ahora < S.grab.t0 + FR) {
          e = { t: +(ahora - S.grab.t0).toFixed(3), st, d: null }; S.grab.ev.push(e); marcaViva(S.sel, e, p.son);
        }
        pulsadas.set(st, { n, e, largo: p.son.tipo === 'LARGO' });
        const k = teclas[st]; if (k) { k.classList.add('on'); k.classList.toggle('mantenida', p.son.tipo === 'LARGO'); }
      }
      function suelta(st) {
        const x = pulsadas.get(st); if (!x) return; pulsadas.delete(st);
        const ahora = ac.currentTime;
        if (x.largo) x.n.suelta();
        if (x.e && x.largo) x.e.d = +(Math.min(ahora, S.grab ? S.grab.t0 + FR : ahora) - (S.grab ? S.grab.t0 : 0) - x.e.t).toFixed(3);
        const k = teclas[st]; if (k) k.classList.remove('on', 'mantenida');
      }
      Object.entries(teclas).forEach(([st, el]) => {
        st = +st;
        el.addEventListener('pointerdown', ev => { ev.preventDefault(); el.setPointerCapture(ev.pointerId); aprieta(st); });
        const fin = () => suelta(st); el.addEventListener('pointerup', fin); el.addEventListener('pointercancel', fin); el.addEventListener('lostpointercapture', fin);
      });
      ctx.on(window, 'keydown', ev => {
        if (ev.ctrlKey || ev.metaKey || ev.altKey || S.fin) return;
        const st = TECLAS_PC[String(ev.key).toLowerCase()]; if (st == null) return;
        ev.preventDefault(); if (!ev.repeat) aprieta(st);
      });
      ctx.on(window, 'keydown', ev => { if (ev.key === 'Escape') { cierraLista(); if (S.corte) { S.corte = false; estadoBotones(); avisa(''); } } });
      ctx.on(window, 'keyup', ev => { const st = TECLAS_PC[String(ev.key).toLowerCase()]; if (st != null) suelta(st); });
      ctx.on(window, 'blur', () => { [...pulsadas.keys()].forEach(suelta); });

      /* una nota en vivo (la misma que nota(), pero con ctx.suena: si el profe salta la estación, ctx.limpia la para) */
      const vdb = v => 20 * Math.log10(Math.max(0.0001, v));
      function notaViva(son, st) {
        const dur = son.buf.duration, largo = son.tipo === 'LARGO';
        const m = ctx.suena(son.buf, { destino: bus, rate: rate(st), entra: largo ? 0.12 : 0, bucle: largo && dur > 1, bucleDesde: dur * 0.12, bucleHasta: dur * 0.86 });
        return { suelta() { if (largo) m.parar(0.35); else m.parar(0.05); }, m };
      }
      // ── marcas en vivo mientras se graba ──
      function marcaViva(j, e, son) {
        const g = lienzos[j].getContext('2d'), x = e.t / FR * WC; g.fillStyle = rgb(COL[j].map(c => Math.round(c * 0.5 + 127.5)));
        if (son.tipo === 'CORTO') {
          const d = Math.min(son.buf.duration / rate(e.st), FR - e.t), n = Math.max(2, Math.round(d / FR * 335)), pk = MAG.picos(son.buf, n); let mx = 0; pk.forEach(v => { if (v > mx) mx = v; });
          for (let i = 0; i < n; i++) { const v = mx > 0 ? Math.pow(pk[i] / mx, 0.7) : 0, hh = Math.max(1, Math.round(v * (HP / 2 - 8))); g.fillRect(Math.round(x + i * WC / 335), HP / 2 - hh, 3, hh * 2); }
        }
      }
      function pintaLargosVivos(t) {
        if (!S.grab) return;
        const j = S.grab.j, g = lienzos[j].getContext('2d'); g.fillStyle = rgb(COL[j].map(c => Math.round(c * 0.5 + 127.5)));
        pulsadas.forEach(x => { if (x.e && x.largo) { const a = x.e.t / FR * WC, b = Math.min(WC, (t - S.grab.t0) / FR * WC); for (let xx = Math.round(a); xx < b; xx += 4) { const hh = Math.round((0.55 + 0.25 * Math.sin(xx * 0.37) * Math.sin(xx * 0.11)) * (HP / 2 - 8)); g.fillRect(xx, HP / 2 - hh, 3, hh * 2); } } });
      }

      // ── el cabezal (la línea roja) ──
      let raf = null;
      function mueveCabezal() {
        if (!ctx.vivo()) { raf = null; return; }
        const t = ac.currentTime; let t0 = null;
        if (S.grab) t0 = S.grab.t0; else if (S.play) t0 = S.play.t0;
        if (t0 == null || t < t0) { cabezal.style.display = t0 == null ? 'none' : 'block'; if (t0 != null) cabezal.style.transform = 'translateX(0px)'; }
        else { cabezal.style.display = 'block'; cabezal.style.transform = 'translateX(' + Math.round(Math.min(1, (t - t0) / FR) * WC) + 'px)'; }
        pintaLargosVivos(t);
        if (S.grab && t >= S.grab.t0 + FR) terminaGrabacion();
        if (S.play && t >= S.play.t0 + S.play.dur) paraTodo();
        if (S.grab || S.play) raf = requestAnimationFrame(mueveCabezal); else { raf = null; cabezal.style.display = 'none'; }
      }
      function arranca() { if (!raf && ctx.vivo()) raf = requestAnimationFrame(mueveCabezal); }

      // ── reproducir ──
      function reproduce(js, desde) {
        paraTodo(); cierraLista();
        js = js || [0, 1, 2]; const t0 = ac.currentTime + 0.06, gan = [];
        const fuentes = [];
        js.forEach(j => { const p = S.pistas[j]; if (!p.buf) return; const m = ctx.suena(p.buf, { destino: bus, al: t0, db: vdb(p.vol) }); fuentes.push(m); gan[j] = m.gan; });
        if (!fuentes.length) return;
        S.play = { t0, dur: FR, fuentes, gan };
        MAG.botonera.enclava('play'); MAG.botonera.rotulo('PLAY'); arranca();
      }
      function paraTodo() {
        if (S.play) { S.play.fuentes.forEach(m => m.parar(0.04)); S.play = null; }
        if (!S.grab) { MAG.botonera.enclava(null); MAG.botonera.rotulo(''); }
      }

      // ── grabar una pista ──
      async function graba() {
        if (S.grab || S.fin) return;
        const j = S.sel, p = S.pistas[j];
        if (!p.son) { abreLista(j); avisa('Elige primero el sonido de la pista ' + (j + 1)); return; }
        paraTodo(); cierraLista(); S.corte = false;
        const t0 = ac.currentTime + 1.6;
        S.grab = { j, t0, ev: [], otras: [] };
        Object.assign(S.pistas[j], { ev: [], revs: [], cortes: [], buf: null }); if (S.selSeg && S.selSeg.j === j) S.selSeg = null;
        pintaCalle(j); pintaTarjeta(j); estadoBotones();
        MAG.botonera.enclava('rec'); MAG.botonera.rotulo('GRABANDO');
        // las otras pistas suenan a la vez
        [0, 1, 2].forEach(q => { if (q === j) return; const o = S.pistas[q]; if (!o.buf) return; S.grab.otras.push(ctx.suena(o.buf, { destino: bus, al: t0, db: vdb(o.vol) })); });
        // la cuenta: 3, 2, 1
        for (let n = 3; n >= 1; n--) {
          const cuando = t0 - n * 0.5; ctx.suena('a/b3p_tic.mp3', { al: cuando, db: n === 1 ? -3 : -7 });
          setTimeout(() => { if (S.grab && S.grab.j === j) { cuenta.textContent = String(n); cuenta.style.display = 'flex'; } }, Math.max(0, (cuando - ac.currentTime) * 1000));
        }
        setTimeout(() => { cuenta.style.display = 'none'; }, Math.max(0, (t0 - ac.currentTime) * 1000));
        arranca();
      }
      async function terminaGrabacion() {
        const G = S.grab; if (!G) return;
        [...pulsadas.keys()].forEach(suelta);
        S.grab = null; G.otras.forEach(m => m.parar(0.05));
        cuenta.style.display = 'none';
        const p = S.pistas[G.j]; p.ev = G.ev.filter(e => e.t >= 0 && e.t < FR).map(e => ({ t: e.t, st: e.st, d: e.d == null && p.son.tipo === 'LARGO' ? +(FR - e.t).toFixed(3) : e.d }));
        MAG.botonera.enclava(null); MAG.botonera.rotulo('');
        p.buf = p.ev.length ? await renderPista(p) : null;
        if (!ctx.vivo()) return;
        if (!p.ev.length) avisa('No has tocado nada: pulsa ● otra vez y toca el fonógeno');
        // la siguiente pista vacía, ya elegida
        const sig = [0, 1, 2].find(q => !S.pistas[q].buf);
        if (p.ev.length && sig != null) S.sel = sig;
        pintaTodo();
      }
      function paraGrabacion() { if (S.grab) { const G = S.grab; if (ac.currentTime < G.t0) { S.grab = null; G.otras.forEach(m => m.parar(0.05)); cuenta.style.display = 'none'; MAG.botonera.enclava(null); MAG.botonera.rotulo(''); pintaTodo(); } else terminaGrabacion(); } }

      // ── la botonera del magnetófono ──
      ctx.botonera('rec', () => { if (S.grab) paraGrabacion(); else graba(); });
      ctx.botonera('play', () => { if (S.grab) return; if (S.fin) escuchaPieza(); else reproduce(); });
      ctx.botonera('pausa', () => { if (S.grab) paraGrabacion(); paraTodo(); if (piezaFuente) { piezaFuente.parar(0.05); piezaFuente = null; MAG.botonera.enclava(null); MAG.botonera.rotulo(''); } });

      // ── cortar, seleccionar, al revés ──
      bCortar.addEventListener('click', () => { if (apagado(bCortar)) { avisa(porQue(bCortar)); return; } destella(bCortar); S.corte = !S.corte; estadoBotones(); avisa(S.corte ? 'Pulsa en una pista, donde quieras cortar' : ''); });
      calles.forEach((c, j) => c.addEventListener('pointerdown', ev => {
        if (S.grab) return; const p = S.pistas[j]; if (!p.buf) return;
        const x = MAG.punto(ev).x - X0C, t = Math.max(0, Math.min(FR, x / WC * FR));
        if (S.corte) {
          if (t < 0.12 || t > FR - 0.12 || p.cortes.some(cc => Math.abs(cc - t) < 0.12)) return;
          paraTodo(); p.cortes.push(+t.toFixed(3)); p.cortes.sort((a, b) => a - b); S.corte = false; ctx.suena('a/b3p_corta.mp3', { db: -6 });
          S.sel = j; S.selSeg = null; avisa('');
        } else {
          const seg = segmentos(p).find(([a, z]) => t >= a && t < z);
          if (S.selSeg && S.selSeg.j === j && S.selSeg.seg[0] === seg[0]) S.selSeg = null; else S.selSeg = { j, seg };
          S.sel = j;
        }
        pintaTodo();
      }));
      bReves.addEventListener('click', () => {
        if (apagado(bReves)) { avisa(porQue(bReves)); return; } destella(bReves); paraTodo();
        let j = S.sel, seg = [0, FR];
        if (S.selSeg) { j = S.selSeg.j; seg = S.selSeg.seg; }
        const p = S.pistas[j]; if (!p.buf) return;
        p.revs.push([+seg[0].toFixed(3), +seg[1].toFixed(3)]); reves(p.buf, seg[0], seg[1]);
        ctx.suena('a/b3p_reves.mp3', { db: -10 });
        // se oye el trozo al revés
        setTimeout(() => { if (!ctx.vivo() || S.grab) return; ctx.suena(MAG.trozo(p.buf, seg[0], Math.min(seg[1], seg[0] + 4)), { destino: bus, db: vdb(p.vol) }); }, 380);
        pintaTodo();
      });

      // ── el dado ──
      let dijoDado = false;
      bDado.addEventListener('click', async () => {
        if (apagado(bDado)) { avisa(porQue(bDado)); return; } destella(bDado);
        const j = S.sel, p = S.pistas[j]; if (!p.son) return;
        ctx.suena('a/b3p_dado.mp3', { db: -6 });
        if (!dijoDado) { dijoDado = true; ctx.voz('TÚ', 'A ver qué sale…', 'a/b3p_Y46.mp3', { pausa: 0 }); }
        const caras = bDado.querySelector('svg'); let n = 0; const giro = setInterval(() => { n++; caras.dataset.c = 1 + Math.floor(Math.random() * 6); pintaDado(caras); if (n >= 6) clearInterval(giro); }, 90);
        await MAG.espera(600); if (!ctx.vivo()) return;
        p.ev = patron(p.son); p.revs = Math.random() < 0.3 ? [[0, FR]] : []; p.cortes = [];
        p.buf = await renderPista(p); if (!ctx.vivo()) return;
        if (S.selSeg && S.selSeg.j === j) S.selSeg = null;
        pintaTodo(); reproduce();
      });
      function patron(son) {
        const notas = [-5, -3, 0, 2, 4, 7, 9, 12], r = () => notas[Math.floor(Math.random() * notas.length)];
        if (son.tipo === 'LARGO') { const a = 0.2 + Math.random() * 0.6, b = 3.6 + Math.random() * 1.2; return [{ t: +a.toFixed(2), st: r() - 5, d: +(b - a - 0.3).toFixed(2) }, { t: +b.toFixed(2), st: r() - 5, d: +(FR - b - 0.2).toFixed(2) }]; }
        for (let intento = 0; ; intento++) {
          const paso = [0.5, 0.25, 1][Math.floor(Math.random() * 3)], ev = [];
          for (let t = 0.1; t < FR - 0.3; t += paso) if (Math.random() < 0.62) ev.push({ t: +t.toFixed(2), st: r(), d: null });
          if (ev.length >= 4 || intento >= 6) return ev.length ? ev : [{ t: 0.1, st: 0, d: null }];
        }
      }
      function pintaDado(svg) {
        const c = +svg.dataset.c || 5, P = { 1: [[20, 20]], 2: [[12, 12], [28, 28]], 3: [[11, 11], [20, 20], [29, 29]], 4: [[12, 12], [28, 12], [12, 28], [28, 28]], 5: [[11, 11], [29, 11], [20, 20], [11, 29], [29, 29]], 6: [[12, 10], [28, 10], [12, 20], [28, 20], [12, 30], [28, 30]] }[c];
        svg.innerHTML = '<rect x="2" y="2" width="36" height="36" rx="7" fill="rgb(246,240,226)" stroke="rgb(60,50,40)" stroke-width="2.5"/>' + P.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6" fill="rgb(30,26,22)"/>`).join('');
      }
      pintaDado(bDado.querySelector('svg'));

      // ── siguiente frase ──
      bSig.addEventListener('click', () => {
        if (apagado(bSig)) { avisa(porQue(bSig)); return; } destella(bSig); paraTodo(); cierraLista();
        S.frases[S.k] = { pistas: S.pistas.map(p => ({ son: { id: p.son.id, nombre: nombreCorto(p.son), tipo: p.son.tipo, ruta: p.son.ruta || null, clave: p.son.clave || null }, ev: p.ev, revs: p.revs, cortes: p.cortes, vol: +p.vol.toFixed(3) })) };
        guarda();
        ctx.suena('a/b3p_cambio.mp3', { db: -4 });
        S.k++; S.pistas = [0, 1, 2].map(nuevaPista); S.sel = 0; S.selSeg = null; S.corte = false;
        if (S.k >= NF) return acaba();
        pintaTodo();
      });
      function guarda() { MAG.datos.pieza = { v: 1, frases: S.frases.slice(0, NF), fr: FR }; MAG.guardaDatos(); }

      // ── la pieza entera ──
      let piezaFuente = null, piezaBuf = null, piezaT0 = 0, rafF = null;
      async function escuchaPieza() {
        if (piezaFuente) { piezaFuente.parar(0.05); piezaFuente = null; }
        if (!piezaBuf) piezaBuf = await mezcla(S.frases);
        if (!piezaBuf || !ctx.vivo()) return;
        piezaT0 = ac.currentTime + 0.05; const m = ctx.suena(piezaBuf, { al: piezaT0 }); piezaFuente = m;
        MAG.botonera.enclava('play'); MAG.botonera.rotulo('PLAY');
        m.fin.then(() => { if (piezaFuente === m) { piezaFuente = null; MAG.botonera.enclava(null); MAG.botonera.rotulo(''); } });
        const linea = final.querySelector('.b3p-f-linea');
        const paso = () => {
          if (!ctx.vivo() || !piezaFuente) { if (linea) linea.style.display = 'none'; rafF = null; return; }
          const u = Math.max(0, Math.min(0.9999, (ac.currentTime - piezaT0) / (NF * FR))), f = Math.floor(u * NF), x = f * 300 + (u * NF - f) * 290;
          if (linea) { linea.style.display = 'block'; linea.style.transform = 'translateX(' + Math.round(x) + 'px)'; } rafF = requestAnimationFrame(paso); };
        if (!rafF) rafF = requestAnimationFrame(paso);
      }
      async function acaba() {
        S.fin = true; pintaCab();
        [cab, ayuda, bDado, bCortar, bReves, bSig, kb, cabezal, cuenta].forEach(e => { e.hidden = true; });
        tarjetas.forEach(e => { e.hidden = true; }); calles.forEach(e => { e.hidden = true; });
        final.hidden = false; final.innerHTML = '';
        final.appendChild(MAG.el('div', { class: 'b3p-f-tit', text: 'TU PIEZA' }));
        final.appendChild(MAG.el('div', { class: 'b3p-f-sub', text: 'Cuatro frases · tres pistas · ' + (NF * FR) + ' segundos' }));
        const rej = MAG.el('div', { class: 'b3p-f-rej' }); final.appendChild(rej);
        const mini = [];
        for (let f = 0; f < NF; f++) {
          const col = MAG.el('div', { class: 'b3p-f-col' }, [MAG.el('div', { class: 'b3p-f-n', text: 'FRASE ' + (f + 1) })]);
          for (let j = 0; j < 3; j++) { const cv = MAG.el('canvas', { width: 290, height: 46, class: 'b3p-f-mini' }); cv.style.borderColor = rgb(COL[j]); col.appendChild(cv); mini.push([f, j, cv]); }
          rej.appendChild(col);
        }
        rej.appendChild(MAG.el('div', { class: 'b3p-f-linea' }));
        const nombres = MAG.el('div', { class: 'b3p-f-nombres' }); final.appendChild(nombres);
        S.frases.forEach((fz, f) => nombres.appendChild(MAG.el('div', { class: 'b3p-f-nom', text: fz.pistas.map(pq => pq.son.nombre).join(' · ') })));
        const fila = MAG.el('div', { class: 'b3p-f-bots' }); final.appendChild(fila);
        const bEsc = MAG.ui.boton('Escuchar mi pieza', { clase: 'mbtn-prin', icono: MAG.ICO.play, al: () => escuchaPieza() }); fila.appendChild(bEsc);
        const bOtra = MAG.ui.boton('Empezar otra vez', { clase: 'mbtn-sec', icono: MAG.ICO.otra }); fila.appendChild(bOtra);
        let seguro = false;
        bOtra.addEventListener('click', () => {
          if (!seguro) { seguro = true; bOtra.querySelector('.mbtn-tx').textContent = '¿Seguro? Pulsa otra vez'; setTimeout(() => { seguro = false; if (bOtra.isConnected) bOtra.querySelector('.mbtn-tx').textContent = 'Empezar otra vez'; }, 3500); return; }
          if (piezaFuente) { piezaFuente.parar(0.05); piezaFuente = null; }
          MAG.botonera.enclava(null); MAG.botonera.rotulo('');
          S.frases = []; S.k = 0; S.fin = false; piezaBuf = null; MAG.datos.pieza = null; MAG.guardaDatos();
          final.hidden = true; [cab, ayuda, bDado, bCortar, bReves, bSig, kb, cabezal, cuenta].forEach(e => { e.hidden = false; }); tarjetas.forEach(e => { e.hidden = false; }); calles.forEach(e => { e.hidden = false; });
          if (seguir) seguir.cancela(); seguir = null; pintaTodo();
        });
        // las ondas pequeñas de cada frase y pista
        for (const [f, j, cv] of mini) {
          const pq = S.frases[f] && S.frases[f].pistas[j]; const g = cv.getContext('2d'); g.fillStyle = 'rgb(64,40,26)'; g.fillRect(0, 0, 290, 46);
          if (!pq) continue; const son = Object.assign({}, pq.son, { buf: await bufDe(pq.son) }); if (!son.buf) continue;
          const b = await renderPista({ son, ev: pq.ev, revs: pq.revs || [] }); if (!b || !ctx.vivo()) continue;
          const pk = MAG.picos(b, 96); let mx = 0; pk.forEach(v => { if (v > mx) mx = v; });
          g.fillStyle = rgb(COL[j].map(c => Math.round(c * 0.5 + 127.5)));
          for (let i = 0; i < 96; i++) { const v = mx > 0 ? Math.pow(pk[i] / mx, 0.7) : 0, hh = Math.max(1, Math.round(v * 19)); g.fillRect(Math.round(i * 290 / 96), 23 - hh, 2, hh * 2); }
        }
        if (!ctx.vivo()) return;
        escuchaPieza();
        if (fin) fin();
      }
      // termina cuando la pieza está hecha y el alumno pulsa «Seguir con la historia»
      let seguir = null, fin = null;
      const listo = new Promise(ok => { fin = async () => { seguir = ctx.seguir(); await seguir; ok(); }; });

      // ── avisos cortos (sin ventanas) ──
      let tAv = null;
      function avisa(txt) { ayuda.textContent = txt || 'Elige una pista y su sonido · pulsa ● y toca el fonógeno · ▶ para escucharla'; ayuda.classList.toggle('aviso', !!txt); clearTimeout(tAv); if (txt) tAv = setTimeout(() => avisa(''), 3200); }

      // ── el ambiente: el reloj del estudio de noche, suave y en bucle (baja mientras se graba o suena algo) ──
      const AMB_DB = -8;
      const amb = (() => {
        const r = 'a/b3p_reloj.mp3', b = MAG.R[r] && MAG.R[r].buf; if (!b) return null;
        const c = b.getChannelData(0); let a = 0, z = c.length - 1;                 // (sin el silencio que mete el mp3)
        while (a < c.length * 0.1 && Math.abs(c[a]) < 1e-4) a++;
        while (z > c.length * 0.9 && Math.abs(c[z]) < 1e-4) z--;
        return ctx.bucle(r, { db: AMB_DB, entra: 0.6, desde: a / b.sampleRate, bucleDesde: a / b.sampleRate, bucleHasta: (z + 1) / b.sampleRate });
      })();
      let ambBajo = false; raiz.__amb = amb;                                       // (para las pruebas del banco)
      ctx.cada(() => { const bajo = !!(S.grab || S.play || piezaFuente || pulsadas.size); if (!amb || bajo === ambBajo) return; ambBajo = bajo; amb.volumen(bajo ? AMB_DB - 18 : AMB_DB, bajo ? 0.12 : 0.8); });

      // ── arranque ──
      if (S.k >= NF) { acaba(); } else pintaTodo();
      await listo;
      // al salir: nada sonando
      paraTodo(); if (piezaFuente) piezaFuente.parar(0.1);
      S.vivos.forEach(v => { try { v.suelta(); } catch (e) {} });
      if (raf) cancelAnimationFrame(raf); if (rafF) cancelAnimationFrame(rafF);
      setTimeout(() => { try { busG.disconnect(); } catch (e) {} }, 800);
      css.remove();
    }
  });

  const ICON = {
    cortar: '<svg viewBox="0 0 52 40" width="52" height="40"><g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><circle cx="9" cy="12" r="6.5"/><circle cx="9" cy="28" r="6.5"/><path d="M14.5 15.5L46 30M14.5 24.5L46 10"/></g></svg>',
    reves: '<svg viewBox="0 0 56 40" width="56" height="40"><g fill="currentColor"><rect x="4" y="10" width="40" height="4"/><path d="M42 3l12 9-12 9z"/><rect x="12" y="26" width="40" height="4"/><path d="M14 19L2 28l12 9z"/></g></svg>',
    sig: '<svg viewBox="0 0 40 28" width="40" height="28"><path d="M2 1l17 13L2 27zM20 1l17 13-17 13z" fill="currentColor"/></svg>',
    dado: '<svg viewBox="0 0 40 40" width="44" height="44" data-c="5"></svg>',
    play: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 3.5v17l14-8.5z" fill="currentColor"/></svg>'
  };

  const CSS = `
.b3p { position: absolute; inset: 0; font-family: var(--maq); color: var(--tinta); }
.b3p [hidden] { display: none !important; }
.b3p-cab { position: absolute; left: 64px; top: 134px; height: 54px; box-sizing: border-box; padding: 0 18px; display: flex; align-items: center;
  background: rgba(239,229,207,.94); border: 2px solid var(--borde); border-radius: 8px; font: 700 30px/1 var(--maq); letter-spacing: 2px; color: rgb(40,30,22); }
.b3p-ayuda { position: absolute; left: 66px; top: 202px; font: italic 400 22px/1 var(--maq); color: rgba(239,229,207,.78); text-shadow: 0 1px 6px rgba(0,0,0,.8); }
.b3p-ayuda.aviso { color: rgb(255,214,140); }
.b3p-bt { position: absolute; box-sizing: border-box; display: flex; align-items: center; gap: 14px; padding: 0 18px; border-radius: 12px; cursor: pointer; outline: none;
  background: rgba(239,229,207,.96); border: 3px solid var(--borde); color: rgb(40,30,22); font: 700 26px/1 var(--maq); letter-spacing: .02em; }
.b3p-bt:hover { background: rgb(248,240,222); }
.b3p-bt.apagado { opacity: .5; cursor: default; } .b3p-bt.apagado:hover { background: rgba(239,229,207,.96); }
.b3p-bt.arm { background: rgb(250,214,160); border-color: rgb(200,58,44); }
.b3p-bt.pulsa { background: rgb(229,72,59); border-color: rgb(200,58,44); color: rgb(255,246,236); }
.b3p-bt span { white-space: nowrap; }
.b3p-bt-sig { justify-content: space-between; gap: 10px; padding: 0 14px 0 20px; letter-spacing: 0; }
.b3p-bt-sig svg { order: 2; width: 34px; height: 24px; flex: none; } .b3p-bt-dado { padding: 0; justify-content: center; }
.b3p-tj { position: absolute; left: 62px; width: 444px; height: 106px; box-sizing: border-box; border: 4px solid; border-radius: 12px; background: rgba(239,229,207,.96);
  padding: 8px 12px 0 14px; cursor: pointer; }
.b3p-tj.sel { box-shadow: 0 0 0 4px rgba(255,214,140,.92), 0 6px 18px rgba(0,0,0,.45); }
.b3p-tj-f1 { display: flex; align-items: center; gap: 14px; height: 28px; }
.b3p-tj-n { font: 700 24px/1 var(--maq); }
.b3p-tj-rec { display: flex; align-items: center; gap: 7px; font: 700 21px/1 var(--maq); color: rgb(206,48,38); }
.b3p-tj-rec i { width: 18px; height: 18px; border-radius: 50%; background: rgb(206,48,38); display: block; }
.b3p-tag { margin-left: auto; padding: 4px 9px 3px; border-radius: 7px; font: 700 18px/1 var(--maq); color: rgb(250,244,230); }
.b3p-tag.largo { background: rgb(92,74,54); } .b3p-tag.corto { background: rgb(176,156,120); }
.b3p-tj-son { display: flex; align-items: center; gap: 10px; height: 38px; }
.b3p-tj-nom { font: 700 27px/1.2 var(--maq); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 360px; }
.b3p-solo { margin-left: auto; width: 34px; height: 30px; border-radius: 7px; border: 2px solid var(--borde); background: rgb(248,243,230); color: rgb(40,30,22);
  display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
.b3p-solo[disabled] { opacity: .35; cursor: default; }
.b3p-tj-pie { display: flex; align-items: center; height: 28px; }
.b3p-modo { font: italic 400 19px/1 var(--maq); color: rgb(110,90,66); white-space: nowrap; }
.b3p-vol { position: relative; margin-left: auto; width: 128px; height: 28px; cursor: ew-resize; }
.b3p-vol > span { position: absolute; left: 0; top: 6px; font: 700 17px/1 var(--maq); color: rgb(110,90,66); }
.b3p-vol-r { position: absolute; left: 34px; top: 12px; width: 84px; height: 4px; background: var(--borde); border-radius: 2px; }
.b3p-vol-k { position: absolute; top: 5px; width: 18px; height: 18px; margin-left: -9px; border-radius: 50%; border: 2px solid rgb(40,34,30); box-sizing: border-box; }
.b3p-elige { margin-top: 6px; height: 50px; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; padding: 0 12px 0 14px;
  background: rgb(250,246,236); border: 2px solid var(--borde2); border-radius: 8px; font: italic 400 26px/1 var(--maq); color: rgb(110,90,66); }
.b3p-elige.abierta { background: rgb(250,232,180); }
.b3p-calle { position: absolute; left: ${X0C}px; width: ${WC}px; height: ${HP}px; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.45); }
.b3p-lienzo { position: absolute; left: 0; top: 0; width: ${WC}px; height: ${HP}px; }
.b3p-capa { position: absolute; inset: 0; pointer-events: none; }
.b3p-corte { position: absolute; top: -6px; width: 6px; height: ${HP + 12}px; background: rgb(20,15,12); }
.b3p-corte::after { content: ''; position: absolute; left: 2px; top: 0; width: 2px; height: 100%; background: rgb(250,245,230); }
.b3p-selseg { position: absolute; top: -4px; height: ${HP + 8}px; box-sizing: border-box; border: 4px solid rgb(255,209,89); border-radius: 4px; }
.b3p-pill { position: absolute; top: -34px; height: 28px; padding: 0 10px; display: flex; align-items: center; box-sizing: border-box;
  background: rgba(239,229,207,.95); border: 2px solid var(--borde); border-radius: 6px; font: 700 17px/1 var(--maq); letter-spacing: 2px; color: rgb(40,30,22); }
.b3p-cabezal { position: absolute; left: ${X0C}px; top: ${YP[0] - 10}px; width: 4px; height: ${YP[2] + HP + 20 - YP[0]}px; margin-left: -2px; background: rgb(235,64,51); display: none; pointer-events: none; }
.b3p-cuenta { position: absolute; left: ${X0C}px; top: ${YP[0]}px; width: ${WC}px; height: ${YP[2] + HP - YP[0]}px; display: none; align-items: center; justify-content: center;
  font: 700 190px/1 var(--maq); color: rgba(255,214,140,.95); text-shadow: 0 6px 30px rgba(0,0,0,.85); pointer-events: none; }
.b3p-lista { position: absolute; width: 560px; box-sizing: border-box; padding: 12px 10px 14px; background: rgba(239,229,207,.99); border: 3px solid var(--borde); border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,.6); z-index: 4; }
.b3p-lista-t { padding: 2px 10px 10px; font: 700 22px/1 var(--maq); color: var(--rojo); }
.b3p-lista-f { display: flex; align-items: center; gap: 10px; height: 38px; padding: 0 8px 0 12px; border-radius: 8px; cursor: pointer; }
.b3p-lista-f:hover { background: rgb(250,236,206); }
.b3p-lista-f.marca { background: rgb(250,214,160); box-shadow: inset 0 0 0 2px rgb(200,150,50); }
.b3p-lista-f.vacia { font: italic 400 22px/1 var(--maq); color: rgb(110,90,66); cursor: default; }
.b3p-lista-n { font: 400 24px/1 var(--maq); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1 1 auto; min-width: 0; }
.b3p-lista-o { width: 34px; height: 28px; border-radius: 6px; border: 2px solid var(--borde2); background: rgb(250,246,236); color: rgb(40,30,22); padding: 0;
  display: flex; align-items: center; justify-content: center; cursor: pointer; }
.b3p-lista .b3p-tag { margin-left: 0; font-size: 16px; }
.b3p-kb { position: absolute; box-sizing: border-box; border-radius: 14px; background: rgba(40,30,22,.94); touch-action: none; }
.b3p-kb-l, .b3p-kb-r, .b3p-kb-c { position: absolute; top: 14px; font: 700 22px/22px var(--maq); color: var(--crema); display: flex; align-items: center; gap: 10px; white-space: nowrap; }
.b3p-kb-l { left: 26px; } .b3p-kb-r { right: 26px; } .b3p-kb-c { transform: translateX(-50%); color: rgb(255,190,170); }
.b3p-bl { position: absolute; top: 50px; height: ${KH}px; box-sizing: border-box; background: rgb(246,240,226); border: 2px solid rgb(60,50,40); cursor: pointer; }
.b3p-bl.on { background: rgb(250,150,130); top: 56px; height: ${KH - 6}px; }
.b3p-ng { position: absolute; top: 50px; width: 52px; height: ${Math.round(KH * 0.6)}px; background: rgb(26,22,18); cursor: pointer; z-index: 2; }
.b3p-ng.on { background: rgb(200,70,60); }
.b3p-igual { position: absolute; left: 0; right: 0; bottom: 8px; text-align: center; font: 700 36px/1 var(--maq); color: rgb(176,50,38); pointer-events: none; }
.b3p-mant { position: absolute; left: 0; right: 0; bottom: 48px; text-align: center; font: 700 15px/1 var(--maq); color: rgb(176,50,38); display: none; pointer-events: none; }
.b3p-ng .b3p-mant { bottom: auto; top: calc(100% + 12px); left: 50%; right: auto; transform: translateX(-50%); white-space: nowrap; padding: 2px 5px 1px; background: rgb(246,240,226); border-radius: 3px; }   /* (bajo la negra, que es estrecha) */
.b3p-bl.mantenida .b3p-mant, .b3p-ng.mantenida .b3p-mant { display: block; }
.b3p-final { position: absolute; left: 260px; top: 150px; width: 1400px; box-sizing: border-box; padding: 34px 100px 40px; background: rgba(239,229,207,.985);
  border: 3px solid var(--borde); border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,.6); color: var(--tinta); }
.b3p-f-tit { font: 900 44px/1 var(--tit); letter-spacing: 6px; color: var(--rojo); }
.b3p-f-sub { margin: 10px 0 26px; font: italic 400 26px/1.2 var(--maq); color: rgb(110,90,66); }
.b3p-f-rej { position: relative; display: flex; gap: 10px; }
.b3p-f-col { width: 290px; display: flex; flex-direction: column; gap: 8px; }
.b3p-f-n { font: 700 20px/1 var(--maq); letter-spacing: 2px; color: rgb(110,90,66); margin-bottom: 2px; }
.b3p-f-mini { width: 290px; height: 46px; border-left: 5px solid; box-sizing: border-box; display: block; }
.b3p-f-linea { position: absolute; left: 0; top: 26px; width: 4px; height: 162px; background: rgb(235,64,51); display: none; }
.b3p-f-nombres { margin-top: 18px; display: flex; gap: 10px; }
.b3p-f-nom { width: 290px; font: 400 19px/1.3 var(--maq); color: rgb(70,58,44); }
.b3p-f-bots { margin-top: 30px; display: flex; gap: 18px; }
`;
})();
