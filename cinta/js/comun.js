/* Magnetófono · versión interactiva (prueba) · LO COMÚN (Claude para Iago, 17-oct-2026)
   Todo lo que comparten la página (prueba.html) y las estaciones (cinta/js/b1.js, b2.js, b3.js):
   el escenario de 1920×1080 que se escala a la pantalla, la carga de ficheros con su progreso, el sonido (Web Audio),
   los subtítulos y las tarjetas con el MISMO aspecto que las animáticas, los botones, la botonera del magnetófono,
   lo que se guarda en el navegador (localStorage + IndexedDB) y el micrófono.
   Reglas de Iago que esto respeta: nada de fundidos en pantalla (los cambios, de golpe), cargas precargadas, pocos
   movimientos (la pantalla del aula va con pocos fotogramas) y el mismo lenguaje visual que el vídeo. */
(function () {
  'use strict';
  const MAG = window.MAG = window.MAG || {};
  MAG.W = 1920; MAG.H = 1080;
  if (MAG.base == null) MAG.base = 'cinta/';
  MAG.est = MAG.est || {};
  MAG.registra = function (id, def) { MAG.est[id] = def; };
  const $ = (s, r) => (r || document).querySelector(s);
  MAG.$ = $;
  MAG.espera = ms => new Promise(r => setTimeout(r, ms));
  MAG.db = d => Math.pow(10, d / 20);
  MAG.el = function (tag, at, hijos) {
    const e = document.createElement(tag);
    if (at) for (const k in at) {
      if (k === 'style' && typeof at[k] === 'object') Object.assign(e.style, at[k]);
      else if (k === 'class') e.className = at[k];
      else if (k === 'html') e.innerHTML = at[k];
      else if (k === 'text') e.textContent = at[k];
      else if (k.startsWith('on') && typeof at[k] === 'function') e.addEventListener(k.slice(2), at[k]);
      else if (at[k] !== undefined && at[k] !== null && at[k] !== false) e.setAttribute(k, at[k] === true ? '' : at[k]);
    }
    (hijos || []).forEach(h => { if (h != null) e.appendChild(typeof h === 'string' ? document.createTextNode(h) : h); });
    return e;
  };

  // ───────────────────────── el escenario (1920×1080, escalado a la pantalla) ─────────────────────────
  MAG.escala = 1;
  MAG.ajusta = function () {
    const e = document.getElementById('escenario'); if (!e) return;
    const s = Math.min(window.innerWidth / MAG.W, window.innerHeight / MAG.H);
    MAG.escala = s;
    e.style.transform = 'translate(' + Math.round((window.innerWidth - MAG.W * s) / 2) + 'px,' + Math.round((window.innerHeight - MAG.H * s) / 2) + 'px) scale(' + s + ')';
  };
  window.addEventListener('resize', () => MAG.ajusta());
  /* coordenadas de un evento de puntero en el sistema del escenario (1920×1080) */
  MAG.punto = function (ev) {
    const r = document.getElementById('escenario').getBoundingClientRect();
    return { x: (ev.clientX - r.left) / MAG.escala, y: (ev.clientY - r.top) / MAG.escala };
  };

  // ───────────────────────── guardar (en este navegador) ─────────────────────────
  MAG.lee = function (k, def) { try { const v = localStorage.getItem('lm_mag_' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } };
  MAG.guarda = function (k, v) { try { localStorage.setItem('lm_mag_' + k, JSON.stringify(v)); } catch (e) {} };
  /* IndexedDB para las grabaciones (Float32 por canal + sampleRate), por si se cierra la página */
  let _idb = null;
  function idb() {
    if (_idb) return _idb;
    _idb = new Promise((ok) => {
      try {
        const q = indexedDB.open('lm_magnetofono', 1);
        q.onupgradeneeded = () => { try { q.result.createObjectStore('g'); } catch (e) {} };
        q.onsuccess = () => ok(q.result); q.onerror = () => ok(null);
      } catch (e) { ok(null); }
    });
    return _idb;
  }
  MAG.idbPon = async function (clave, valor) {
    const d = await idb(); if (!d) return false;
    return new Promise(ok => { try { const tx = d.transaction('g', 'readwrite'); tx.objectStore('g').put(valor, clave); tx.oncomplete = () => ok(true); tx.onerror = () => ok(false); } catch (e) { ok(false); } });
  };
  MAG.idbLee = async function (clave) {
    const d = await idb(); if (!d) return null;
    return new Promise(ok => { try { const q = d.transaction('g', 'readonly').objectStore('g').get(clave); q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null); } catch (e) { ok(null); } });
  };
  MAG.idbBorra = async function (clave) {
    const d = await idb(); if (!d) return false;
    return new Promise(ok => { try { const tx = d.transaction('g', 'readwrite'); tx.objectStore('g').delete(clave); tx.oncomplete = () => ok(true); } catch (e) { ok(false); } });
  };
  /* un AudioBuffer ⇄ algo que se pueda guardar */
  MAG.bufAObj = b => ({ sr: b.sampleRate, ch: Array.from({ length: b.numberOfChannels }, (_, i) => b.getChannelData(i).slice()) });
  MAG.objABuf = o => { const a = MAG.audio(); const b = a.createBuffer(o.ch.length, o.ch[0].length, o.sr); o.ch.forEach((c, i) => b.copyToChannel(c instanceof Float32Array ? c : new Float32Array(c), i)); return b; };

  // ───────────────────────── el sonido ─────────────────────────
  MAG.ac = null;
  MAG.audio = function () {
    if (!MAG.ac) {
      const C = window.AudioContext || window.webkitAudioContext;
      MAG.ac = new C({ latencyHint: 'interactive' });
      MAG.master = MAG.ac.createGain(); MAG.master.connect(MAG.ac.destination);
    }
    if (MAG.ac.state === 'suspended') { try { MAG.ac.resume(); } catch (e) {} }
    return MAG.ac;
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, () => { try { MAG.audio(); } catch (e) {} }, { capture: true }));

  // ───────────────────────── la carga (con progreso) ─────────────────────────
  /* MAG.R[ruta] = { url (blob:), buf (AudioBuffer si es sonido), img (si es imagen), bytes } */
  MAG.R = MAG.R || {};
  const ES_AUDIO = /\.(mp3|m4a|aac|ogg|wav|opus)$/i, ES_IMG = /\.(jpe?g|png|webp|gif|svg)$/i;
  MAG.url = ruta => (MAG.R[ruta] && MAG.R[ruta].url) || (MAG.base + ruta);
  async function trae(ruta, alAvance) {
    if (MAG.R[ruta] && MAG.R[ruta].listo) return MAG.R[ruta];
    const r = await fetch(MAG.base + ruta, { cache: 'force-cache' });
    if (!r.ok) throw new Error('No se encuentra ' + ruta + ' (' + r.status + ')');
    const total = +r.headers.get('content-length') || 0;
    let blob;
    if (r.body && r.body.getReader && alAvance) {
      const rd = r.body.getReader(), partes = []; let n = 0;
      for (;;) { const { done, value } = await rd.read(); if (done) break; partes.push(value); n += value.length; alAvance(n, total); }
      blob = new Blob(partes, { type: r.headers.get('content-type') || '' });
    } else { blob = await r.blob(); if (alAvance) alAvance(blob.size, blob.size); }
    const o = { url: URL.createObjectURL(blob), bytes: blob.size, listo: true };
    // (18-oct) las pistas de los tramos (p/…) suenan por un <audio>: no se decodifican (serían 90 MB de memoria por pista);
    // las colas de las libretas se decodifican al usarlas (MAG.decodifica)
    if (/^p\//.test(ruta)) { o.blob = blob; MAG.R[ruta] = o; return o; }
    if (ES_AUDIO.test(ruta)) {
      try { o.buf = await MAG.audio().decodeAudioData(await blob.arrayBuffer()); } catch (e) { console.warn('[MAG] no se pudo decodificar', ruta, e); }
    } else if (ES_IMG.test(ruta)) {
      o.img = await new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = o.url; });
    }
    MAG.R[ruta] = o; return o;
  }
  MAG.trae = trae;
  /* el AudioBuffer de algo ya traído sin decodificar (las colas de las libretas, p/…_cola.m4a) */
  MAG.decodifica = async function (ruta) {
    const o = MAG.R[ruta] || await trae(ruta);
    if (o.buf) return o.buf;
    try { o.buf = await MAG.audio().decodeAudioData(await o.blob.arrayBuffer()); } catch (e) { console.warn('[MAG] no se pudo decodificar', ruta, e); o.buf = null; }
    return o.buf;
  };
  /* carga una lista; alProgreso(fraccion 0..1, texto) — tamaños aproximados si se pasan en pesos{ruta: bytes} */
  MAG.cargaTodo = async function (lista, alProgreso, pesos) {
    lista = Array.from(new Set(lista.filter(Boolean)));
    const tot = lista.reduce((s, r) => s + ((pesos && pesos[r]) || 200000), 0);
    const hecho = {}; let fallos = [];
    const avisa = () => { if (alProgreso) { const n = Object.values(hecho).reduce((s, v) => s + v, 0); alProgreso(Math.min(1, n / tot)); } };
    let i = 0;
    async function obrero() {
      while (i < lista.length) {
        const ruta = lista[i++]; const p = (pesos && pesos[ruta]) || 200000;
        try { await trae(ruta, (n, t) => { hecho[ruta] = t ? p * n / t : Math.min(p, n); avisa(); }); }
        catch (e) { console.warn('[MAG]', e.message); fallos.push(ruta); }
        hecho[ruta] = p; avisa();
      }
    }
    await Promise.all([obrero(), obrero(), obrero(), obrero()]);
    return fallos;
  };

  /* MAG.suena(ruta|AudioBuffer, op) → mando { parar(fuera), fuente, gan, fin: Promise }
     op: db (ganancia en dB, 0 = tal cual), desde, dur (segundos del buffer), bucle, rate, al (instante ac), destino (nodo),
         entra (s de subida), lp/hp (filtros), pan (-1..1) */
  MAG.suena = function (q, op) {
    op = op || {};
    const a = MAG.audio(); const buf = (q instanceof AudioBuffer) ? q : (MAG.R[q] && MAG.R[q].buf);
    if (!buf) { console.warn('[MAG] sonido sin cargar', q); return { parar() {}, fin: Promise.resolve(), nulo: true }; }
    const f = a.createBufferSource(); f.buffer = buf;
    if (op.rate) f.playbackRate.value = op.rate;
    if (op.bucle) { f.loop = true; if (op.bucleDesde != null) f.loopStart = op.bucleDesde; if (op.bucleHasta != null) f.loopEnd = op.bucleHasta; }
    const g = a.createGain(); let nodo = f;
    if (op.hp) { const h = a.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = op.hp; nodo.connect(h); nodo = h; }
    if (op.lp) { const l = a.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = op.lp; nodo.connect(l); nodo = l; }
    if (op.pan) { const p = a.createStereoPanner(); p.pan.value = op.pan; nodo.connect(p); nodo = p; }
    nodo.connect(g); g.connect(op.destino || MAG.master);
    const v = MAG.db(op.db || 0), t0 = op.al || a.currentTime;
    if (op.entra) { g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + op.entra); } else g.gain.setValueAtTime(v, t0);
    const desde = op.desde || 0;
    if (op.bucle) f.start(t0, desde); else if (op.dur) f.start(t0, desde, op.dur); else f.start(t0, desde);
    let fin; const prom = new Promise(r => { fin = r; }); f.onended = () => fin();
    const m = { fuente: f, gan: g, fin: prom, t0,
      parar(fuera) {
        try {
          const t = a.currentTime;
          if (fuera) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fuera); f.stop(t + fuera + 0.02); }
          else f.stop();
        } catch (e) {}
      },
      volumen(db, t) { try { const n = a.currentTime; g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(g.gain.value, n); g.gain.linearRampToValueAtTime(MAG.db(db), n + (t || 0.2)); } catch (e) {} } };
    return m;
  };
  /* filtros de época, como en las animáticas: 'radio' (válvulas), 'telefono', 'fonografo' (lata: 250–2500 Hz) */
  MAG.filtro = function (tipo) {
    const a = MAG.audio(), ent = a.createGain(), sal = a.createGain();
    const bp = (f, q) => { const b = a.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; return b; };
    let cad;
    if (tipo === 'radio') { const h = a.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = 280; const l = a.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = 3600; const p = a.createBiquadFilter(); p.type = 'peaking'; p.frequency.value = 1500; p.gain.value = 4; cad = [h, l, p]; }
    else if (tipo === 'telefono') { cad = [bp(1400, 0.9)]; }
    else if (tipo === 'fonografo') { const h = a.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = 250; const l = a.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = 2500; const p = a.createBiquadFilter(); p.type = 'peaking'; p.frequency.value = 1100; p.gain.value = 6; p.Q.value = 1.2; cad = [h, l, p]; }
    else cad = [];
    let n = ent; cad.forEach(c => { n.connect(c); n = c; }); n.connect(sal);
    return { entrada: ent, salida: sal };
  };

  // ───────────────────────── los textos (como en el vídeo) ─────────────────────────
  /* MAG.ui.sub(capa, quien, texto) → el cuadro de subtítulo de las animáticas, abajo y centrado (lo quita .quita()).
     quien: 'NARRADOR' | 'TÚ' | 'ODILE' | 'HERR KESSLER' | 'LUCIEN' | 'EL LOCUTOR, POR LA RADIO' … */
  MAG.ui = MAG.ui || {};
  MAG.ui.sub = function (capa, quien, texto) {
    const cl = quien === 'NARRADOR' ? 'sub sub-n' : (quien === 'TÚ' ? 'sub sub-t' : 'sub sub-p');
    const e = MAG.el('div', { class: cl }, [MAG.el('div', { class: 'sub-q', text: quien }), MAG.el('div', { class: 'sub-x', text: texto })]);
    (capa || $('#subs')).appendChild(e);
    return { el: e, quita() { e.remove(); }, cambia(t) { e.querySelector('.sub-x').textContent = t; } };
  };
  /* la tarjeta crema de las PARADAS (título rojo en Bodoni, texto a máquina) */
  MAG.ui.tarjeta = function (capa, op) {
    const e = MAG.el('div', { class: 'tarjeta' + (op.clase ? ' ' + op.clase : '') }, [
      op.titulo ? MAG.el('div', { class: 'tj-tit', text: op.titulo }) : null,
      op.texto ? MAG.el('div', { class: 'tj-txt', html: op.texto }) : null]);
    if (op.x != null) Object.assign(e.style, { left: op.x + 'px', top: op.y + 'px', width: (op.w || 900) + 'px' });
    capa.appendChild(e); return e;
  };
  /* un botón del portal (rectángulo de esquinas suaves; el principal, crema con contorno; el secundario, cristal oscuro) */
  MAG.ui.boton = function (texto, op) {
    op = op || {};
    const b = MAG.el('button', { class: 'mbtn ' + (op.clase || 'mbtn-prin'), type: 'button', title: op.titulo || null },
      [op.icono ? MAG.el('span', { class: 'mbtn-ic', html: op.icono }) : null, texto ? MAG.el('span', { class: 'mbtn-tx', text: texto }) : null]);
    if (op.al) b.addEventListener('click', op.al);
    return b;
  };
  /* «Seguir con la historia»: el botón de abajo a la derecha (Intro, Espacio o → también lo pulsan). Devuelve una promesa. */
  MAG.ui.seguir = function (capa, texto, op) {
    op = op || {};
    let cancela = () => {};
    const p = new Promise(ok => {
      const b = MAG.ui.boton(texto || 'Seguir con la historia', { clase: 'mbtn-prin mbtn-seguir', icono: ICO.sigue });
      const tecla = ev => { if ((ev.key === 'Enter' || ev.key === ' ' || ev.key === 'ArrowRight') && !ev.shiftKey && !ev.repeat) { ev.preventDefault(); ev.stopPropagation(); fin(); } };
      let t = null;
      const quita = () => { if (t) clearTimeout(t); window.removeEventListener('keydown', tecla, true); b.remove(); };
      const fin = () => { quita(); ok(); };
      cancela = quita;
      b.addEventListener('click', fin);
      if (op.x != null) Object.assign(b.style, { left: op.x + 'px', top: op.y + 'px', right: 'auto', bottom: 'auto' });
      ($('#capaTop') || capa || $('#capaEst')).appendChild(b);
      t = setTimeout(() => window.addEventListener('keydown', tecla, true), op.retardo || 250);
    });
    p.cancela = () => cancela();
    return p;
  };
  const ICO = MAG.ICO = {
    sigue: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5l8 7-8 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>',
    pausa: '<svg viewBox="0 0 24 24" width="22" height="22"><rect x="6" y="4.5" width="4.2" height="15" fill="currentColor"/><rect x="13.8" y="4.5" width="4.2" height="15" fill="currentColor"/></svg>',
    rec: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="7" fill="currentColor"/></svg>',
    stop: '<svg viewBox="0 0 24 24" width="22" height="22"><rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor"/></svg>',
    otra: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 12a7 7 0 1 0 2.1-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M5 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  /* los personajes: un PNG recortado en su sitio (las mismas posiciones que en el vídeo: i/fig_*.png de 1920×1080 con
     transparencia, o recortes con su caja). Cambio SECO: se sustituye la imagen en el mismo fotograma. */
  MAG.ui.figura = function (capa, ruta, op) {
    op = op || {};
    const im = MAG.el('img', { class: 'figura', src: MAG.url(ruta), alt: '', draggable: 'false' });
    Object.assign(im.style, op.caja ? { left: op.caja[0] + 'px', top: op.caja[1] + 'px', width: op.caja[2] + 'px', height: op.caja[3] + 'px' } : { left: '0', top: '0', width: '1920px', height: '1080px' });
    capa.appendChild(im);
    return { el: im, cambia(r2) { im.src = MAG.url(r2); }, quita() { im.remove(); } };
  };

  // ───────────────────────── la botonera del magnetófono (arriba a la izquierda, como en el vídeo) ─────────────────────────
  /* (18-oct, notas de Iago N2, N7, N8, N17) SIEMPRE A LA VISTA y OPACA, con el mismo dibujo y en el mismo sitio que la del vídeo
     (botonera.py: X0 36, Y0 30, panel de 350×76, teclas de 58×50; el rótulo, Courier Prime 30, a su derecha): la tapa entera,
     así que ya no se ven dos «PAUSA» ni la tecla que pulsa el narrador en la historia: lo que se ve es lo que hace la página
     (▶ hundida mientras suena, ‖ en pausa…). El rótulo es la ventanita de la máquina: siempre dice algo (PLAY, PAUSA,
     REBOBINANDO, AVANZANDO, GRABANDO, AHORA TÚ…). Las teclas que no sirven en ese momento, apagadas; ● solo donde se graba.
     MAG.botonera.on('play'|'pausa'|'rew'|'ff'|'rec', fn): una pulsación · on('rec-abajo'|'rec-arriba', fn): con .mantener('rec', true),
     se graba MANTENIENDO la tecla (también la R del teclado) y al soltar, para · .enclava(tecla|null) · .rotulo(texto|'') (''
     = el de la tecla hundida o el de reposo) · .reposo(texto) · .usables([teclas]) · .apaga(tecla, si) · .senala(tecla|null, texto)
     (una flechita y un letrero bajo esa tecla) · .modo() (ya no hace nada; se deja por compatibilidad). */
  MAG.botonera = (function () {
    const T = ['rew', 'play', 'pausa', 'ff', 'rec'];
    const ROT = { pausa: 'PAUSA', rew: 'REBOBINANDO', play: 'PLAY', ff: 'AVANZANDO', rec: 'GRABANDO' };
    const TIT = { rew: 'Atrás (la frase anterior)', play: 'Reproducir', pausa: 'Pausa', ff: 'Adelante (la frase siguiente)', rec: 'Grabar' };
    const oyentes = {}, quieta = {}, hold = {};
    let raiz = null, rot = null, senal = null, enclavada = null, texto = null, reposoTx = '', sujeta = null;
    const tecla = k => raiz && raiz.querySelector('.bot-' + k);
    const avisa = (ev, arg) => (oyentes[ev] || []).slice().forEach(fn => { try { fn(arg); } catch (e) { console.error(e); } });
    const clic = () => { try { if (MAG.R['a/ui_tecla.mp3']) MAG.suena('a/ui_tecla.mp3', { db: -8 }); } catch (e) {} };
    function monta(padre) {
      raiz = MAG.el('div', { id: 'botonera' });
      const panel = MAG.el('div', { class: 'bot-panel' });
      T.forEach(k => {
        const b = MAG.el('button', { class: 'bot-tecla bot-' + k, type: 'button', 'data-k': k, title: TIT[k] }, [MAG.el('span', { class: 'bot-cara', html: ICO_B[k] })]);
        b.addEventListener('pointerdown', ev => {
          ev.preventDefault(); ev.stopPropagation();
          if (quieta[k]) return;
          if (hold[k]) { try { b.setPointerCapture(ev.pointerId); } catch (e) {} abajo(k); return; }
          pulsa(k, true);
        });
        const suelta = () => { if (sujeta === k) arriba(k); };
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(e => b.addEventListener(e, suelta));
        b.addEventListener('contextmenu', ev => ev.preventDefault());
        panel.appendChild(b);
      });
      rot = MAG.el('div', { class: 'bot-rotulo' });
      senal = MAG.el('div', { class: 'bot-senal', hidden: true }, [MAG.el('div', { class: 'bot-flecha' }), MAG.el('div', { class: 'bot-senal-tx' })]);
      raiz.appendChild(panel); raiz.appendChild(rot); raiz.appendChild(senal);
      padre.appendChild(raiz); pinta();
      // la R del teclado: como la tecla ● (y, donde se graba manteniendo, mientras se tiene pulsada)
      window.addEventListener('keydown', ev => {
        if (ev.key !== 'r' && ev.key !== 'R') return;
        if (ev.target && (/input|textarea|select/i.test(ev.target.tagName) || ev.target.isContentEditable)) return;
        if (!raiz || raiz.classList.contains('bot-oculta') || quieta.rec) return;
        ev.preventDefault(); if (ev.repeat) return;
        if (hold.rec) { if (sujeta !== 'rec') abajo('rec'); } else pulsa('rec', true);
      });
      window.addEventListener('keyup', ev => { if ((ev.key === 'r' || ev.key === 'R') && sujeta === 'rec') arriba('rec'); });
      window.addEventListener('blur', () => { if (sujeta) arriba(sujeta); });
    }
    function abajo(k) { sujeta = k; const b = tecla(k); if (b) b.classList.add('sujeta'); clic(); avisa(k + '-abajo'); }
    function arriba(k) { sujeta = null; const b = tecla(k); if (b) b.classList.remove('sujeta'); avisa(k + '-arriba'); }
    function pinta() {
      if (!raiz) return;
      T.forEach(t => { const b = tecla(t); b.classList.toggle('on', t === enclavada); b.classList.toggle('apagada', !!quieta[t]); });
      rot.textContent = texto || (enclavada ? ROT[enclavada] : reposoTx) || '';
    }
    const ICO_B = {
      rew: '<svg viewBox="0 0 30 24"><path d="M15.5 2v20L3 12zM28 2v20L15.5 12z" fill="currentColor"/></svg>',
      play: '<svg viewBox="0 0 24 24"><path d="M5 1v22l17-11z" fill="currentColor"/></svg>',
      pausa: '<svg viewBox="0 0 24 24"><rect x="2" y="1" width="7" height="22" fill="currentColor"/><rect x="15" y="1" width="7" height="22" fill="currentColor"/></svg>',
      ff: '<svg viewBox="0 0 30 24"><path d="M14.5 2v20L27 12zM2 2v20L14.5 12z" fill="currentColor"/></svg>',
      rec: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor"/></svg>'
    };
    function pulsa(k, delUsuario) {
      if (!raiz) return;
      if (quieta[k] && delUsuario) return;                         // apagada: no hace nada
      const b = tecla(k);
      if (b) { b.classList.add('baja'); setTimeout(() => b.classList.remove('baja'), 180); }
      clic();
      avisa(k, delUsuario);
    }
    function senala(k, txt) {
      if (!raiz) return;
      T.forEach(t => tecla(t).classList.toggle('senalada', t === k));
      if (!k) { senal.hidden = true; return; }
      const i = T.indexOf(k), cx = 2 + 10 + i * 66 + (i === 4 ? 8 : 0) + 29;      // el centro de la tecla (botonera.py: _kx)
      senal.style.left = (cx - 23) + 'px'; senal.querySelector('.bot-senal-tx').textContent = txt || ''; senal.hidden = false;
    }
    return {
      monta, pulsa, teclas: T,
      on(k, fn) { (oyentes[k] = oyentes[k] || []).push(fn); return () => { oyentes[k] = (oyentes[k] || []).filter(f => f !== fn); }; },
      enclava(k) { enclavada = k || null; pinta(); },
      rotulo(txt) { texto = txt ? String(txt) : null; pinta(); },
      reposo(txt) { reposoTx = txt || ''; pinta(); },
      usables(lista) { T.forEach(t => { quieta[t] = (lista || []).indexOf(t) < 0; }); pinta(); },
      apaga(k, si) { quieta[k] = !!si; pinta(); },
      mantener(k, si) { hold[k] = !!si; if (!si && sujeta === k) arriba(k); },
      soltar() { if (sujeta) arriba(sujeta); },
      senala,
      modo() {},
      get raiz() { return raiz; }, get enclavada() { return enclavada; }, get sujeta() { return sujeta; }, get usadas() { return T.filter(t => !quieta[t]); }
    };
  })();

  // ───────────────────────── el micrófono ─────────────────────────
  /* MAG.mic.graba(op) → { para(): Promise<AudioBuffer|null>, nivel(): 0..1 } — si no hay micro, null en .error */
  /* (18-oct, N17) el permiso se pide UNA vez, al empezar la bobina que graba con el micro (el motor llama a .abre()); el micro
     queda abierto hasta el final de la bobina (.suelta()), así que luego basta con la tecla ● */
  MAG.mic = {
    stream: null, _pide: null,
    async abre() {
      if (this.stream && this.stream.getTracks().some(t => t.readyState === 'live')) return this.stream;
      if (this._pide) return this._pide;
      this._pide = (async () => {
        try { this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
        catch (e) { console.warn('[MAG] sin micrófono', e); this.stream = null; }
        this._pide = null; return this.stream;
      })();
      return this._pide;
    },
    suelta() { try { if (this.stream) this.stream.getTracks().forEach(t => t.stop()); } catch (e) {} this.stream = null; },
    async graba(op) {
      op = op || {};
      const st = await this.abre(); if (!st) return { error: true, para: async () => null, nivel: () => 0 };
      const a = MAG.audio(), src = a.createMediaStreamSource(st), sp = a.createScriptProcessor(2048, 1, 1), mudo = a.createGain(); mudo.gain.value = 0;
      const trozos = []; let pico = 0, rms = 0, n = 0; const max = (op.max || 30) * a.sampleRate;
      sp.onaudioprocess = ev => {
        const d = ev.inputBuffer.getChannelData(0); if (n < max) { trozos.push(new Float32Array(d)); n += d.length; }
        let s = 0, p = 0; for (let i = 0; i < d.length; i++) { const v = d[i]; s += v * v; if (Math.abs(v) > p) p = Math.abs(v); }
        rms = Math.sqrt(s / d.length); pico = Math.max(pico * 0.92, p);
        if (op.alNivel) op.alNivel(rms, d);
      };
      src.connect(sp); sp.connect(mudo); mudo.connect(a.destination);
      return {
        nivel: () => rms, pico: () => pico,
        async para() {
          try { sp.disconnect(); src.disconnect(); } catch (e) {}
          if (!n) return null;
          const b = a.createBuffer(1, n, a.sampleRate), c = b.getChannelData(0); let o = 0;
          trozos.forEach(t => { c.set(t.subarray(0, Math.min(t.length, n - o)), o); o += t.length; });
          return op.recorta === false ? b : MAG.recortaSilencio(b);
        }
      };
    }
  };
  /* quita el silencio del principio y del final (con un margen), y normaliza a -1 dBFS de pico */
  MAG.recortaSilencio = function (b, umbral) {
    const c = b.getChannelData(0), sr = b.sampleRate, w = Math.floor(sr * 0.02); umbral = umbral || 0.02;
    let a0 = 0, a1 = c.length;
    for (let i = 0; i + w < c.length; i += w) { let p = 0; for (let j = i; j < i + w; j++) p = Math.max(p, Math.abs(c[j])); if (p > umbral) { a0 = Math.max(0, i - Math.floor(sr * 0.06)); break; } }
    for (let i = c.length - w; i > a0; i -= w) { let p = 0; for (let j = i; j < i + w; j++) p = Math.max(p, Math.abs(c[j])); if (p > umbral) { a1 = Math.min(c.length, i + w + Math.floor(sr * 0.12)); break; } }
    if (a1 - a0 < sr * 0.15) { a0 = 0; a1 = c.length; }
    const a = MAG.audio(), o = a.createBuffer(1, a1 - a0, sr), d = o.getChannelData(0); let p = 0;
    for (let i = a0; i < a1; i++) p = Math.max(p, Math.abs(c[i]));
    const k = p > 0.001 ? 0.89 / p : 1;
    for (let i = a0; i < a1; i++) d[i - a0] = c[i] * k;
    const fx = Math.min(d.length, Math.floor(sr * 0.008)); for (let i = 0; i < fx; i++) { d[i] *= i / fx; d[d.length - 1 - i] *= i / fx; }
    return o;
  };
  /* un buffer al revés (para «al revés») */
  MAG.alReves = function (b) {
    const a = MAG.audio(), o = a.createBuffer(b.numberOfChannels, b.length, b.sampleRate);
    for (let c = 0; c < b.numberOfChannels; c++) { const s = b.getChannelData(c), d = o.getChannelData(c); for (let i = 0, n = s.length; i < n; i++) d[i] = s[n - 1 - i]; }
    return o;
  };
  /* un trozo de buffer [a, b) en segundos */
  MAG.trozo = function (buf, a, b) {
    const sr = buf.sampleRate, i0 = Math.max(0, Math.floor(a * sr)), i1 = Math.min(buf.length, Math.floor(b * sr));
    const ac_ = MAG.audio(), o = ac_.createBuffer(buf.numberOfChannels, Math.max(1, i1 - i0), sr);
    for (let c = 0; c < buf.numberOfChannels; c++) o.copyToChannel(buf.getChannelData(c).subarray(i0, i1), c);
    return o;
  };
  /* la forma de onda (picos) de un buffer, en n columnas */
  MAG.picos = function (buf, n) {
    const c = buf.getChannelData(0), paso = c.length / n, out = new Float32Array(n);
    for (let i = 0; i < n; i++) { let p = 0; const a = Math.floor(i * paso), b = Math.floor((i + 1) * paso); for (let j = a; j < b; j++) { const v = Math.abs(c[j]); if (v > p) p = v; } out[i] = p; }
    return out;
  };

  // ───────────────────────── el contexto de una estación ─────────────────────────
  /* MAG.contexto(raiz, op) → ctx, con todo lo que la estación crea apuntado para quitarlo al salir.
     ctx.raiz · ctx.el(tag, at, hijos) (lo cuelga de raiz) · ctx.suena(ruta, op) · ctx.bucle(ruta, op) · ctx.voz(quien, texto, ruta, op)
     ctx.sub(quien, texto) · ctx.tarjeta(op) · ctx.boton(texto, op) · ctx.seguir(texto) · ctx.on(obj, ev, fn) · ctx.cada(fn)
     ctx.espera(ms) · ctx.botonera(tecla, fn) · ctx.limpia()
     ctx.datos: lo que el alumno va construyendo (sonidos de París, ruidos de clase, pieza, título…), compartido entre bobinas. */
  MAG.contexto = function (raiz, op) {
    op = op || {};
    const sonidos = [], quitar = [], bucles = [];
    let vivo = true, raf = null; const cadas = [];
    const ctx = {
      raiz, op, vivo: () => vivo,
      el(tag, at, hijos) { const e = MAG.el(tag, at, hijos); raiz.appendChild(e); return e; },
      suena(q, o) { const m = MAG.suena(q, o); sonidos.push(m); return m; },
      bucle(q, o) { const m = MAG.suena(q, Object.assign({ bucle: true, entra: 0.6 }, o || {})); bucles.push(m); return m; },
      sub(quien, texto) { const s = MAG.ui.sub(MAG.$('#subs'), quien, texto); quitar.push(() => s.quita()); return s; },
      /* una frase con su voz y su subtítulo; resuelve al acabar la voz (+ pausa) */
      async voz(quien, texto, ruta, o) {
        o = o || {}; const s = texto ? ctx.sub(quien, texto) : null;
        let m = null;
        if (ruta) { m = ctx.suena(ruta, { db: o.db || 0, destino: o.destino }); await m.fin; }
        else await MAG.espera(Math.max(1600, 62 * (texto || '').length + 700));
        if (o.pausa !== 0) await MAG.espera(o.pausa != null ? o.pausa : 300);
        if (s && !o.deja) s.quita();
        return s;
      },
      tarjeta(o) { const e = MAG.ui.tarjeta(raiz, o); return e; },
      boton(texto, o) { const b = MAG.ui.boton(texto, o); (o && o.padre ? o.padre : raiz).appendChild(b); return b; },
      seguir(texto, o) { const p = MAG.ui.seguir(raiz, texto, o); quitar.push(() => p.cancela()); return p; },
      figura(ruta, o) { const f = MAG.ui.figura(raiz, ruta, o); return f; },
      on(obj, ev, fn, o) { obj.addEventListener(ev, fn, o); quitar.push(() => obj.removeEventListener(ev, fn, o)); },
      botonera(k, fn) { const off = MAG.botonera.on(k, fn); quitar.push(off); },
      /* (18-oct) las teclas que se usan en esta estación (las demás, apagadas; ◀◀ siempre vuelve a ver lo de antes y ▶▶, solo el profe) */
      teclas(lista) { MAG.botonera.usables(Array.from(new Set((lista || []).concat(['rew'], op.profe ? ['ff'] : [])))); },
      /* señalar la tecla que hay que pulsar (una flechita y un letrero debajo): ctx.senala('rec', 'MANTÉN PULSADO PARA GRABAR') */
      senala(k, txt) { MAG.botonera.senala(k || null, txt); },
      /* grabar manteniendo la tecla: abajo() al pulsarla, arriba() al soltarla (o al soltar la R) */
      mantener(k, abajo, arriba) {
        MAG.botonera.mantener(k, true);
        const o1 = MAG.botonera.on(k + '-abajo', abajo), o2 = MAG.botonera.on(k + '-arriba', arriba);
        quitar.push(() => { o1(); o2(); MAG.botonera.mantener(k, false); });
      },
      cada(fn) { cadas.push(fn); if (!raf) { const paso = (t) => { if (!vivo) return; cadas.forEach(f => { try { f(t); } catch (e) { console.error(e); } }); raf = requestAnimationFrame(paso); }; raf = requestAnimationFrame(paso); } },
      espera: ms => MAG.espera(ms),
      datos: MAG.datos,
      /* un tramo de vídeo en mitad de la estación (p. ej. llegar a un sitio del mapa): al acabar queda a la vista su último
         fotograma. id = el del tramo en el guion del motor. En el banco no hace nada.
         (18-oct, N29) TODO A LA VEZ: el motor prepara el vídeo (cargado y en su primer fotograma) con la estación aún a la vista, y
         en el MISMO fotograma esconde la interfaz (y el fondo, con op.sinFondo) y enseña el vídeo; así no hay fotogramas raros. */
      async video(id, o2) {
        o2 = o2 || {};
        const vis = raiz.style.visibility;
        const alMostrar = () => { raiz.style.visibility = 'hidden'; if (o2.sinFondo) { const f = MAG.$('#fondo'); if (f) f.classList.remove('ve'); } if (o2.alMostrar) o2.alMostrar(); };
        try { if (MAG.videoHook) await MAG.videoHook(id, { alMostrar }); else { await MAG.espera(400); alMostrar(); } } finally { raiz.style.visibility = vis; }
      },
      /* cambia la imagen de fondo de la estación (#fondo, por encima del vídeo parado); null la quita */
      fondo(ruta) {
        const f = MAG.$('#fondo'); if (!f) return;
        if (ruta) { f.src = MAG.url(ruta); f.classList.add('ve'); quitar.push(() => f.classList.remove('ve')); } else f.classList.remove('ve');
      },
      limpia() {
        vivo = false; if (raf) cancelAnimationFrame(raf);
        sonidos.forEach(m => m.parar(0.08)); bucles.forEach(m => m.parar(0.5));
        quitar.forEach(f => { try { f(); } catch (e) {} });
        raiz.innerHTML = '';
        MAG.botonera.soltar(); MAG.botonera.mantener('rec', false); MAG.botonera.senala(null);
        MAG.botonera.enclava(null); MAG.botonera.rotulo('');
      }
    };
    return ctx;
  };


  // ───────────────────────── el repaso «como en Atonalidad»: Odile pregunta y hay tres respuestas ─────────────────────────
  /* await MAG.quiz(ctx, {
       preguntas: [{ q: '¿Qué hay en la cinta?', voz: 'a/b2_OQ1.mp3',
                     ops: [{ txt: 'Millones de partículas de hierro…', voz: 'a/b2_Y14.mp3', bien: true }, …] }, …],
       odile: { idle: 'i/b2_o06.png', bien: 'i/b2_o11.png', mal: 'i/b2_o12.png', vozBien: 'a/b2_O13.mp3', vozMal: 'a/b2_O14.mp3',
                txtBien: 'Bien.', txtMal: 'Non, non. Otra vez.' },   // PNG de 1920×1080 con transparencia, en su sitio (como en el vídeo)
       caja: { x: 100, y: 150, w: 1060 },                             // dónde va la tarjeta (por defecto, a la izquierda)
       titulo: 'REPASO · ODILE PREGUNTA', barajar: true })
     Pregunta (la lee Odile) → el alumno elige (ratón o teclas A/B/C, 1/2/3) → TÚ dice la respuesta → Odile reacciona (su pose
     cambia en el mismo instante que empieza su frase) → si falla, «Otra vez»; si acierta, la siguiente pregunta sale ya,
     sin hueco. Resuelve al acertar la última. */
  MAG.quiz = async function (ctx, cfg) {
    const od = cfg.odile || {}, caja = cfg.caja || { x: 100, y: 150, w: 1060 };
    const fig = od.idle ? ctx.figura(od.idle) : null;
    const card = ctx.el('div', { class: 'quiz' }); Object.assign(card.style, { left: caja.x + 'px', top: caja.y + 'px', width: caja.w + 'px' });
    const tit = MAG.el('div', { class: 'qz-tit', text: cfg.titulo || 'REPASO · ODILE PREGUNTA' });
    const preg = MAG.el('div', { class: 'qz-preg' }); const lista = MAG.el('div', { class: 'qz-ops' });
    card.appendChild(tit); card.appendChild(preg); card.appendChild(lista);
    const pose = r => { if (fig && r) fig.cambia(r); };
    for (let n = 0; n < cfg.preguntas.length; n++) {
      const P = cfg.preguntas[n];
      let ops = P.ops.map((o, i) => Object.assign({ i }, o));
      if (cfg.barajar !== false && P.orden) ops = P.orden.map(k => ops[k]); else if (cfg.barajar !== false && !P.fijo) ops = baraja(ops, n);
      preg.textContent = P.q; lista.innerHTML = ''; pose(od.idle);
      ajustaPregunta(preg);
      const filas = ops.map((o, k) => {
        const f = MAG.el('button', { class: 'qz-op', type: 'button' }, [MAG.el('span', { class: 'qz-letra', text: 'ABC'[k] }), MAG.el('span', { class: 'qz-txt', text: o.txt }), MAG.el('span', { class: 'qz-marca' })]);
        lista.appendChild(f); return f;
      });
      let ocupado = false, resuelto = false;
      const vozP = P.voz ? ctx.suena(P.voz, { db: 0 }) : null;
      await new Promise(listo => {
        const elige = async (k) => {
          if (ocupado || resuelto || filas[k].classList.contains('mal')) return;
          ocupado = true; if (vozP) vozP.parar(0.05);
          const o = ops[k]; filas.forEach(f => f.classList.add('quieta'));
          if (MAG.R['a/ui_tecla.mp3']) ctx.suena('a/ui_tecla.mp3', { db: -9 });
          if (o.voz) { const m = ctx.suena(o.voz, { db: 0 }); await m.fin; await MAG.espera(220); } else await MAG.espera(500);
          if (!ctx.vivo()) return;
          if (o.bien) {
            filas[k].classList.add('bien'); pose(od.bien);
            const s = od.txtBien ? ctx.sub('ODILE', od.txtBien) : null;
            if (od.vozBien) await ctx.suena(od.vozBien).fin; else await MAG.espera(900);
            await MAG.espera(450); if (s) s.quita();
            resuelto = true; listo();
          } else {
            filas[k].classList.add('mal'); pose(od.mal);
            const s = od.txtMal ? ctx.sub('ODILE', od.txtMal) : null;
            if (od.vozMal) await ctx.suena(od.vozMal).fin; else await MAG.espera(1100);
            await MAG.espera(250); if (s) s.quita(); pose(od.idle);
            filas.forEach(f => f.classList.remove('quieta')); ocupado = false;
          }
        };
        filas.forEach((f, k) => f.addEventListener('click', () => elige(k)));
        const tecla = ev => { const k = { a: 0, b: 1, c: 2, '1': 0, '2': 1, '3': 2 }[String(ev.key).toLowerCase()]; if (k != null && k < filas.length) { ev.preventDefault(); elige(k); } };
        ctx.on(window, 'keydown', tecla);
      });
      if (!ctx.vivo()) return;
    }
    card.remove(); if (fig) fig.quita();
  };
  function baraja(a, semilla) { const o = a.slice(); let x = (semilla + 1) * 9301 + 49297; for (let i = o.length - 1; i > 0; i--) { x = (x * 9301 + 49297) % 233280; const j = Math.floor(x / 233280 * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; }
  function ajustaPregunta(el) { el.style.fontSize = '46px'; for (let s = 46; s > 28 && el.scrollWidth > el.clientWidth + 1; s--) el.style.fontSize = s + 'px'; }

  // ───────────────────────── lo que el alumno va construyendo (entre bobinas) ─────────────────────────
  /* MAG.datos.paris: [{id, nombre, tipo:'LARGO'|'CORTO', ruta}] (los ocho de la bobina 2)
     MAG.datos.clase: [{id, nombre, tipo, clave (IndexedDB)}] (los cuatro ruidos de la clase, bobina 3)
     MAG.datos.titulo · MAG.datos.pieza (las cuatro frases) */
  MAG.datos = MAG.lee('datos', { paris: [], clase: [], titulo: '', pieza: null, describe: {} });
  MAG.guardaDatos = () => MAG.guarda('datos', MAG.datos);

  /* el grupo de clase (para guardar los ruidos de cada grupo en el ordenador del aula), por la hora: el horario de GP
     (horario_clases 2026-27, el mismo que usa Voluntarios; comprobado el 18-oct): martes 18–19 2GpC y 19–20 2GpF; jueves 18–19
     2GpF y 19–20 2GpC. Con cerca = true, fuera de clase da el de la clase MÁS CERCANA (la que acaba de pasar o la que viene). */
  MAG.HORARIO_GP = [{ d: 2, i: 18, g: '2GpC' }, { d: 2, i: 19, g: '2GpF' }, { d: 4, i: 18, g: '2GpF' }, { d: 4, i: 19, g: '2GpC' }];
  MAG.grupoAhora = function (cerca) {
    try {
      const p = {};
      new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Madrid', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
        .formatToParts(new Date()).forEach(x => { p[x.type] = x.value; });
      const d = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[p.weekday] || 1, m = (+p.hour % 24) * 60 + (+p.minute);
      const ahora = (d - 1) * 1440 + m, SEM = 7 * 1440;
      const en = MAG.HORARIO_GP.find(h => h.d === d && m >= h.i * 60 && m < h.i * 60 + 60);
      if (en) return en.g;
      if (!cerca) return null;
      let mejor = null, dist = 1e9;
      MAG.HORARIO_GP.forEach(h => {
        const a = (h.d - 1) * 1440 + h.i * 60, b = a + 60;
        const dd = Math.min(...[a, b].map(x => { const z = Math.abs(x - ahora) % SEM; return Math.min(z, SEM - z); }));
        if (dd < dist) { dist = dd; mejor = h.g; }
      });
      return mejor;
    } catch (e) {}
    return null;
  };
})();
