/* Magnetófono · versión interactiva (prueba) · EL MOTOR (Claude para Iago, 18-oct-2026)
   La portada, la carga de cada bobina, los tramos de vídeo (dos <video> que se alternan: el siguiente ya está cargado y en
   su primer fotograma, así que el corte es seco, sin negro), las estaciones entre tramo y tramo, la botonera del magnetófono
   (◀◀ ▶ ‖ ▶▶ ●), «Seguir con la historia» después de cada libreta, «Salir» y «Continuar», y lo especial de la bobina 3:
   la emisión suena con la pieza del alumno (filtro de radio) y su título sale en pantalla y en la etiqueta de la bobina.
   Reglas: nada de fundidos (todo cambia de golpe), carga ligera (lo justo para empezar y el resto por detrás, siempre por
   delante de lo que se ve), nada de animaciones de interfaz en bucle. */
(function () {
  'use strict';
  const MAG = window.MAG, $ = MAG.$;
  const G = MAG.GUION;
  const PROFE = () => !!MAG.lee('profe', false);
  const est = { modo: 'portada', bobina: 0, paso: 0, pasos: [], vid: null, otro: null, enEst: null, tramoAct: null, pieza: null, sigue: null };
  MAG.motor = est;
  const vA = $('#vA'), vB = $('#vB');
  [vA, vB].forEach(v => { v.muted = false; v.playsInline = true; v.preload = 'auto'; v.disablePictureInPicture = true; });

  // ───────────────── los pasos de una bobina (cada tramo, en sus partes) ─────────────────
  function pasosDe(n) {
    const B = G.bobinas[n], out = [];
    B.pasos.forEach(p => {
      if (p.t === 'v') p.partes.forEach((q, i) => out.push({ t: 'v', id: p.id, parte: i, nPartes: p.partes.length, f: q.f, dur: q.dur, bytes: q.bytes, b7: q.b7,
        nombre: p.nombre, libreta: !!p.libreta && i === p.partes.length - 1, pieza: q.pieza, titulo: q.titulo, etiqueta: q.etiqueta }));
      else out.push({ t: 'e', id: p.id, nombre: p.nombre });
    });
    return out;
  }
  const es720 = () => MAG.lee('calidad', '1080') === '720' && !!G.v7;
  /* la calidad se fija al cargar cada bobina (lo precargado es lo que se ve); el botón vale para la próxima carga */
  function rutaVideo(f) { return (est.c720 == null ? es720() : est.c720) ? f.replace(/^v\//, 'v7/') : f; }
  const peso = q => ((est.c720 == null ? es720() : est.c720) && q.b7) || q.bytes || 3e6;
  /* lo que hay que tener ANTES de empezar: lo de todas las estaciones (imágenes y sonidos: pocos MB), los vídeos sueltos del
     mapa y los primeros tramos (unos 20 MB desde donde se empieza). El resto de los vídeos se va cargando por detrás, siempre
     por delante de lo que se ve (rueda). */
  const PRIMERO = 20e6, DELANTE = 70e6, DETRAS = 3;
  function recursosDe(n, desde) {
    const B = G.bobinas[n], L = [], pesos = {}, P = pasosDe(n);
    P.forEach(p => { if (p.t === 'v' && p.pieza) L.push('a/b3_pieza_ejemplo.mp3'); });
    Object.values(B.lugares || {}).forEach(l => l.partes.forEach(q => { const r = rutaVideo(q.f); L.push(r); pesos[r] = peso(q); }));
    B.pasos.filter(p => p.t === 'e').forEach(p => {
      const d = MAG.est[p.id]; if (!d) return;
      let r = d.recursos || []; if (typeof r === 'function') { try { r = r(); } catch (e) { r = []; } }
      r.forEach(x => { L.push(x); pesos[x] = pesos[x] || (/\.(jpe?g|png|webp)$/i.test(x) ? 260000 : 120000); });
      if (d.fondo) { L.push(d.fondo); pesos[d.fondo] = 260000; }
    });
    L.push('a/ui_tecla.mp3');
    // si se continúa en una estación, el tramo de antes (su último fotograma es el fondo)
    desde = desde || 0;
    if (P[desde] && P[desde].t === 'e') { const ant = P.slice(0, desde).reverse().find(q => q.t === 'v'); if (ant) { const r = rutaVideo(ant.f); L.push(r); pesos[r] = peso(ant); } }
    let ac = 0;
    for (let i = desde; i < P.length && ac < PRIMERO; i++) { const p = P[i]; if (p.t !== 'v') continue; const r = rutaVideo(p.f); L.push(r); pesos[r] = peso(p); ac += peso(p); }
    return { L: Array.from(new Set(L)), pesos };
  }
  // ── la rueda: un vídeo cada vez, en orden, hasta ~70 MB por delante; y suelta (de la memoria) lo que queda 3 tramos atrás ──
  const enCurso = {};
  const listo = r => !!(MAG.R[r] && MAG.R[r].url);
  function trae(r) {
    if (listo(r)) return Promise.resolve(true);
    if (!enCurso[r]) enCurso[r] = MAG.trae(r).then(() => true, e => { console.warn('[MAG] no se pudo cargar', r, e && e.message); return false; }).then(x => { delete enCurso[r]; return x; });
    return enCurso[r];
  }
  function suelta(r) {
    const o = MAG.R[r]; if (!o || enCurso[r] || [vA, vB].some(v => v.dataset.ruta === r)) return;
    try { URL.revokeObjectURL(o.url); } catch (e) {} delete MAG.R[r];
  }
  async function rueda(n, ficha) {
    while (est.rueda === ficha && est.bobina === n && !est.cancelado) {
      const vids = est.pasos.map((p, i) => p.t === 'v' ? { i, r: rutaVideo(p.f), b: peso(p) } : null).filter(Boolean);
      const k = vids.findIndex(v => v.i >= est.paso);
      vids.forEach((v, j) => { if (k >= 0 && j < k - DETRAS) suelta(v.r); });
      let delante = 0, sig = null;
      for (let j = Math.max(0, k); j < vids.length && k >= 0; j++) { if (listo(vids[j].r)) delante += vids[j].b; else { sig = vids[j]; break; } }
      if (sig && delante < DELANTE) {
        const ok = await trae(sig.r);
        if (!ok) await MAG.espera(4000);
        else { const s2 = siguienteVideo(); if (s2 && rutaVideo(s2.f) === sig.r && est.otro && est.otro !== est.vid) prepara(est.otro, sig.r); }
      } else await MAG.espera(1500);
    }
  }
  /* el vídeo de un paso, cargado (si aún no lo está: «CARGANDO» junto a la botonera, sin más) */
  async function asegura(r) {
    if (listo(r)) return true;
    MAG.botonera.rotulo('CARGANDO');
    const ok = await trae(r);
    MAG.botonera.rotulo('');
    return ok;
  }

  // ───────────────── los dos vídeos ─────────────────
  function prepara(el, ruta) {
    return new Promise(ok => {
      const url = MAG.url(ruta);
      if (el.dataset.ruta === ruta && el.readyState >= 2) { try { el.pause(); el.currentTime = 0; } catch (e) {} ok(); return; }
      el.dataset.ruta = ruta;
      let hecho = false; const fin = () => { if (hecho) return; hecho = true; el.removeEventListener('loadeddata', fin); el.removeEventListener('error', fin); ok(); };
      el.addEventListener('loadeddata', fin); el.addEventListener('error', fin);
      el.src = url; el.load();
      setTimeout(fin, 6000);
    });
  }
  function muestra(el) { [vA, vB].forEach(v => v.classList.toggle('ve', v === el)); }
  function elOtro(el) { return el === vA ? vB : vA; }

  /* reproduce un paso de vídeo; resuelve al acabar (o al saltarlo). Deja a la vista su último fotograma. */
  function reproduce(p) {
    return new Promise(async ok => {
      if (est.modo !== 'lugar') est.modo = 'historia';
      const ruta = rutaVideo(p.f);
      if (!listo(ruta)) { await asegura(ruta); if (est.cancelado) { ok('cancelado'); return; } }
      let el = (est.vid && est.vid.dataset.ruta === ruta) ? est.vid : (est.otro && est.otro.dataset.ruta === ruta ? est.otro : elOtro(est.vid || vB));
      await prepara(el, ruta);
      if (est.cancelado) { ok('cancelado'); return; }
      if (el.error) { console.warn('[MAG] no se puede ver', ruta, el.error && el.error.message); el.dataset.ruta = ''; ok('error'); return; }
      est.vid = el; est.otro = elOtro(el); est.tramoAct = p;
      muestra(el);
      MAG.botonera.modo('video'); MAG.botonera.enclava('play');
      const acaba = () => { limpiaEv(); quitaOverlays(); ok('fin'); };
      const limpiaEv = () => { el.removeEventListener('ended', acaba); est.sigue = null; if (est.botonPlay) { est.botonPlay.remove(); est.botonPlay = null; } };
      el.addEventListener('ended', acaba);
      est.sigue = (motivo) => {
        limpiaEv(); quitaOverlays(); try { el.pause(); } catch (e) {}
        // saltado con ▶▶: que quede a la vista su último fotograma (el fondo de la estación que viene, como si hubiera acabado)
        if ((motivo || 'salto') === 'salto') { try { if (el.duration) el.currentTime = Math.max(0, el.duration - 0.04); } catch (e) {} }
        ok(motivo || 'salto');
      };
      // la pieza del alumno se mezcla (OfflineAudioContext) unos pasos ANTES de la parte de la emisión, para que esté a tiempo
      if (!est.piezaPromesa && est.pasos.slice(est.paso, est.paso + 4).some(q => q.pieza)) {
        try { est.piezaPromesa = Promise.resolve(typeof MAG.piezaAudio === 'function' ? MAG.piezaAudio() : null).catch(() => null); }
        catch (e) { est.piezaPromesa = Promise.resolve(null); }
      }
      montaOverlays(p, el);
      try { el.currentTime = 0; await el.play(); } catch (e) { console.warn('[MAG] play', e); muestraPlayManual(el); }
      // el siguiente paso de vídeo, ya preparado en el otro elemento
      const sig = siguienteVideo(); if (sig && listo(rutaVideo(sig.f))) prepara(est.otro, rutaVideo(sig.f));
    });
  }
  function siguienteVideo() {
    for (let i = est.paso + 1; i < est.pasos.length; i++) { if (est.pasos[i].t === 'v') return est.pasos[i]; }
    return null;
  }
  function muestraPlayManual(el) {
    const b = MAG.ui.boton('Reproducir', { clase: 'mbtn-prin', icono: MAG.ICO.play });
    Object.assign(b.style, { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: 40 });
    b.addEventListener('click', () => { b.remove(); est.botonPlay = null; el.play().catch(() => {}); });
    $('#capaTop').appendChild(b); est.botonPlay = b;
  }

  // ───────────────── lo especial de la bobina 3: la pieza del alumno y su título ─────────────────
  function montaOverlays(p, el) {
    quitaOverlays();
    if (p.pieza) {
      const o = { el, t: p.pieza.t, fuente: null, buf: null, deAlumno: false };
      const ejemplo = () => (MAG.R['a/b3_pieza_ejemplo.mp3'] && MAG.R['a/b3_pieza_ejemplo.mp3'].buf) || null;
      /* la pieza por la radio, con el mismo equilibrio que en la animática (allí: −8 dB y el filtro de radio): se iguala por
         SONORIDAD (−36 dB RMS antes del filtro), sin pasar de −3 dBFS de pico; la de ejemplo queda como en el vídeo */
      const ganancia = b => {
        let s = 0, n = 0, pk = 0;
        for (let c = 0; c < b.numberOfChannels; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i += 3) { const v = d[i]; s += v * v; n++; if (v > pk) pk = v; else if (-v > pk) pk = -v; } }
        const rms = 10 * Math.log10(s / Math.max(1, n) + 1e-12);
        return Math.max(-24, Math.min(8, Math.min(-36 - rms, -3 - 20 * Math.log10(pk + 1e-9))));
      };
      const programa = () => {
        para(); if (!o.buf || el.paused || el.ended) return;
        const a = MAG.audio(), dt = o.t - el.currentTime, off = Math.max(0, -dt);
        if (off >= o.buf.duration - 0.05) return;
        const f = MAG.filtro('radio'), g = a.createGain(); g.gain.value = MAG.db(o.db);
        const s = a.createBufferSource(); s.buffer = o.buf; s.connect(f.entrada); f.salida.connect(g); g.connect(MAG.master);
        s.start(a.currentTime + Math.max(0, dt), off); o.fuente = s; o.g = g;
      };
      const para = () => { if (o.fuente) { try { o.fuente.stop(); } catch (e) {} try { o.g.disconnect(); } catch (e) {} o.fuente = null; } };
      o.ev = [['playing', programa], ['seeked', programa], ['pause', para], ['waiting', para], ['ended', para]];
      o.ev.forEach(([e, f]) => el.addEventListener(e, f));
      o.para = para; est.pieza = o;
      let pide = est.piezaPromesa || null;
      if (!pide) { try { pide = (typeof MAG.piezaAudio === 'function') ? MAG.piezaAudio() : null; } catch (e) { pide = null; } }
      Promise.resolve(pide).catch(() => null).then(b => {
        if (est.pieza !== o) return;
        o.deAlumno = !!b; o.buf = b || ejemplo(); o.db = o.buf ? ganancia(o.buf) : -6;
        window.__magPieza = o.deAlumno ? 'alumno' : (o.buf ? 'ejemplo' : 'ninguna');
        if (!el.paused) programa();
      });
    }
    if (p.titulo) {
      const tit = (MAG.datos && MAG.datos.titulo) || 'Estudio de los lápices';
      const c = MAG.el('div', { class: 'tit-radio' }, [MAG.el('div', { class: 'tr-arr', text: 'ESTA NOCHE, EN LA RADIO' }), MAG.el('div', { class: 'tr-tit', text: '«' + tit + '»' }),
        MAG.el('div', { class: 'tr-linea' }), MAG.el('div', { class: 'tr-abj', text: 'el estudio de un aprendiz · Concierto de ruidos' })]);
      $('#capaOver').appendChild(c); mide(c, () => ajustaTexto(c.querySelector('.tr-tit'), 1560, 64, 34));
      const mira = () => { const t = el.currentTime, h = !(t >= p.titulo.t0 && t < p.titulo.t1); if (c.hidden !== h) c.hidden = h; };
      el.addEventListener('timeupdate', mira); est.overTit = { c, mira, el };
      if (!est.relojOver) { const paso = () => { if (est.overTit) est.overTit.mira(); if (est.overEtq) est.overEtq.mira(); est.relojOver = requestAnimationFrame(paso); }; est.relojOver = requestAnimationFrame(paso); }
    }
    if (p.etiqueta) {
      const tit = (MAG.datos && MAG.datos.titulo) || 'Estudio de los lápices';
      const c = MAG.el('div', { class: 'etq-peg' }, [MAG.el('div', { class: 'etq-tx', text: tit })]);
      $('#capaOver').appendChild(c);
      // la pegatina de P1h (b3v33.QUAD): sus cuatro esquinas, y el texto en un lienzo plano de 402×182 deformado encima
      c.style.transform = matriz3d([[0, 0], [402, 0], [402, 182], [0, 182]], [[464, 604], [865, 610], [865, 797], [464, 778]]);
      mide(c, () => ajustaTexto(c.querySelector('.etq-tx'), 358, 33, 14));
      const mira = () => { const t = el.currentTime, h = !(t >= p.etiqueta.t0 && t < p.etiqueta.t1); if (c.hidden !== h) c.hidden = h; };
      est.overEtq = { c, mira, el };
      if (!est.relojOver) { const paso = () => { if (est.overTit) est.overTit.mira(); if (est.overEtq) est.overEtq.mira(); est.relojOver = requestAnimationFrame(paso); }; est.relojOver = requestAnimationFrame(paso); }
    }
  }
  function quitaOverlays() {
    if (est.pieza) { est.pieza.para(); est.pieza.ev.forEach(([e, f]) => est.pieza.el.removeEventListener(e, f)); est.pieza = null; }
    if (est.overTit) { est.overTit.el.removeEventListener('timeupdate', est.overTit.mira); est.overTit = null; }
    est.overEtq = null;
    if (est.relojOver) { cancelAnimationFrame(est.relojOver); est.relojOver = null; }
    $('#capaOver').innerHTML = '';
  }
  /* mide con el elemento en la página (invisible) y lo deja oculto */
  function mide(c, fn) { c.style.visibility = 'hidden'; c.hidden = false; try { fn(); } catch (e) {} c.hidden = true; c.style.visibility = ''; }
  function ajustaTexto(el, ancho, max, min) {
    el.style.fontSize = max + 'px';
    for (let s = max; s > min && el.scrollWidth > ancho; s--) el.style.fontSize = s + 'px';
  }
  /* la matriz3d de CSS que lleva el rectángulo (de) a las cuatro esquinas (a) */
  function matriz3d(de, a) {
    function adj(m) { return [m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4], m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5], m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3]]; }
    function mul(a, b) { const c = Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j]; c[3 * i + j] = s; } return c; }
    function mulv(m, v) { return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]]; }
    function base(p) { const m = [p[0][0], p[1][0], p[2][0], p[0][1], p[1][1], p[2][1], 1, 1, 1]; const v = mulv(adj(m), [p[3][0], p[3][1], 1]); return mul(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]); }
    const s = base(de), d = base(a), t = mul(d, adj(s));
    for (let i = 0; i < 9; i++) t[i] = t[i] / t[8];
    const m = [t[0], t[3], 0, t[6], t[1], t[4], 0, t[7], 0, 0, 1, 0, t[2], t[5], 0, t[8]];
    return 'matrix3d(' + m.join(',') + ')';
  }

  // ───────────────── una estación ─────────────────
  async function estacion(p) {
    const def = MAG.est[p.id];
    if (!def) { console.warn('[MAG] falta la estación', p.id); return 'falta'; }
    est.modo = 'estacion'; est.piezaPromesa = null;           // (si se rehace la pieza, se vuelve a mezclar)
    MAG.botonera.modo('propia'); MAG.botonera.enclava(null); MAG.botonera.rotulo('');
    if (est.vid) { try { est.vid.pause(); } catch (e) {} }
    const fondo = $('#fondo');
    if (def.fondo) { fondo.src = MAG.url(def.fondo); fondo.classList.add('ve'); }
    const raiz = $('#capaEst'); raiz.innerHTML = '';
    const ctx = MAG.contexto(raiz, { profe: PROFE(), bobina: est.bobina });
    est.enEst = ctx;
    // la siguiente parte de vídeo, ya preparada mientras tanto
    const sig = siguienteVideo(); if (sig && listo(rutaVideo(sig.f))) { const otro = est.vid ? elOtro(est.vid) : vA; prepara(otro, rutaVideo(sig.f)); est.otro = otro; }
    let r = 'fin';
    try {
      r = await Promise.race([def.monta(ctx).then(() => 'fin'), new Promise(ok => { est.sigue = ok; })]);
    } catch (e) { console.error('[MAG] estación', p.id, e); r = 'error'; }
    est.sigue = null; ctx.limpia(); est.enEst = null;
    fondo.classList.remove('ve');
    $('#subs').innerHTML = ''; $('#capaTop').innerHTML = '';
    est.modo = 'historia';
    return r;
  }

  // ───────────────── la historia: paso a paso ─────────────────
  async function corre(n, desde) {
    est.bobina = n; est.pasos = pasosDe(n); est.paso = desde || 0; est.modo = 'historia'; est.cancelado = false; est.piezaPromesa = null;
    const ficha = {}; est.rueda = ficha; rueda(n, ficha);
    MAG.videoHook = videoPorId;
    portada(false); $('#mandos').classList.add('enHistoria');
    MAG.botonera.raiz.classList.remove('bot-oculta');
    // si se continúa a mitad (en una estación), se enseña el último fotograma del tramo de antes
    if (est.paso > 0 && est.pasos[est.paso].t === 'e') {
      const ant = est.pasos.slice(0, est.paso).reverse().find(q => q.t === 'v');
      if (ant) { const el = vA; await asegura(rutaVideo(ant.f)); await prepara(el, rutaVideo(ant.f)); try { el.currentTime = Math.max(0, el.duration - 0.05); } catch (e) {} est.vid = el; est.otro = vB; muestra(el); }
    }
    while (est.paso < est.pasos.length && !est.cancelado) {
      const p = est.pasos[est.paso];
      MAG.guarda('progreso', { bobina: n, paso: est.paso, v: G.version });
      let r;
      if (p.t === 'v') {
        r = await reproduce(p);
        if (r === 'atras') continue;
        if (p.libreta && r !== 'salto' && r !== 'error' && !est.cancelado) { r = await seguirTrasLibreta(); if (r === 'atras') continue; }
      } else {
        r = await estacion(p);
        if (r === 'atras') continue;
      }
      if (est.cancelado) break;
      est.paso++;
    }
    if (!est.cancelado) finBobina(n);
  }
  function seguirTrasLibreta() {
    est.modo = 'libreta';
    MAG.botonera.modo('propia'); MAG.botonera.enclava('pausa'); MAG.botonera.rotulo('');
    return new Promise(ok => {
      const pr = MAG.ui.seguir($('#capaTop'), 'Seguir con la historia');
      est.sigue = (m) => { pr.cancela(); ok(m || 'salto'); };
      pr.then(() => { est.sigue = null; est.modo = 'historia'; ok('fin'); });
    });
  }
  /* para b2_mapa: un tramo «suelto» (los sitios del mapa), por su id */
  async function videoPorId(id) {
    const B = G.bobinas[est.bobina]; const l = (B.lugares || {})[id];
    if (!l) { console.warn('[MAG] no hay tramo', id); return; }
    const modoAntes = est.modo, sigueEst = est.sigue; est.modo = 'lugar';
    for (let i = 0; i < l.partes.length; i++) {
      const q = l.partes[i];
      const r = await reproduce({ t: 'v', id, f: q.f, dur: q.dur });
      if (est.cancelado || r === 'salir') break;
    }
    est.sigue = sigueEst;                     // ▶▶ vuelve a ser «saltar la estación» (el profe)
    MAG.botonera.modo('propia'); MAG.botonera.enclava(null);
    if (!est.cancelado) est.modo = modoAntes;
  }

  // ───────────────── la botonera y el teclado ─────────────────
  function pausa(si) {
    if (est.modo !== 'historia' && est.modo !== 'lugar') return;
    const v = est.vid; if (!v) return;
    if (si === undefined) si = !v.paused;
    if (si) { v.pause(); MAG.botonera.modo('propia'); MAG.botonera.enclava('pausa'); MAG.botonera.rotulo('PAUSA'); }
    else { v.play().catch(() => {}); MAG.botonera.enclava('play'); MAG.botonera.rotulo(''); MAG.botonera.modo('video'); }
  }
  MAG.pausaHistoria = () => pausa(true);
  function adelante() {
    if (est.modo === 'historia' || est.modo === 'lugar' || est.modo === 'libreta') { if (est.sigue) est.sigue('salto'); }
    else if (est.modo === 'estacion' && PROFE() && est.sigue) est.sigue('salto');
  }
  /* ◀◀: a más de 2 s del principio de un tramo, vuelve a su principio; si no, al paso anterior (un tramo, desde su principio).
     Con la libreta a la vista: otra vez ese tramo. */
  function principio(i) { while (i > 0 && est.pasos[i].t === 'v' && est.pasos[i].parte > 0) i--; return Math.max(0, i); }
  function atras() {
    if (est.modo === 'lugar' || est.modo === 'fin' || est.modo === 'portada' || est.modo === 'cargando') return;
    const p = est.pasos[est.paso]; const s = est.sigue;
    if (est.modo === 'libreta') { est.paso = principio(est.paso); if (s) s('atras'); return; }
    if (est.modo === 'historia' && p && p.t === 'v') {
      const enCurso = p.parte > 0 || (est.vid && est.vid.currentTime > 2.0);
      if (enCurso) {
        if (p.parte === 0) { try { est.vid.currentTime = 0; est.vid.play().catch(() => {}); } catch (e) {} MAG.botonera.enclava('play'); MAG.botonera.modo('video'); MAG.botonera.rotulo(''); return; }
        est.paso = principio(est.paso); if (s) s('atras'); return;
      }
    }
    est.paso = principio(est.paso - 1); if (s) s('atras');
  }
  MAG.botonera.on('play', () => { if (est.modo === 'historia' || est.modo === 'lugar') pausa(false); });
  MAG.botonera.on('pausa', () => { if (est.modo === 'historia' || est.modo === 'lugar') pausa(true); });
  MAG.botonera.on('ff', () => adelante());
  MAG.botonera.on('rew', () => atras());
  window.addEventListener('keydown', ev => {
    if (ev.defaultPrevented || ev.target && (/input|textarea|select/i.test(ev.target.tagName) || ev.target.isContentEditable)) return;
    if (est.modo === 'portada' || est.modo === 'cargando') return;
    if (ev.shiftKey && ev.key === 'ArrowRight') { ev.preventDefault(); MAG.botonera.pulsa('ff', true); return; }
    if (ev.shiftKey && ev.key === 'ArrowLeft') { ev.preventDefault(); MAG.botonera.pulsa('rew', true); return; }
    if ((ev.key === ' ' || ev.key === 'k' || ev.key === 'K') && (est.modo === 'historia' || est.modo === 'lugar')) { ev.preventDefault(); MAG.botonera.pulsa(est.vid && !est.vid.paused ? 'pausa' : 'play', true); return; }
  });
  [vA, vB].forEach(v => v.addEventListener('click', () => { if (est.modo === 'historia') MAG.botonera.pulsa(v.paused ? 'play' : 'pausa', true); }));

  // ───────────────── la portada ─────────────────
  let musica = null;
  function suenaPortada() {
    if (musica || !MAG.R['a/portada_musica.mp3']) return;
    musica = MAG.suena('a/portada_musica.mp3', { db: -10, bucle: true, entra: 2.5 });
  }
  function callaPortada() { if (musica) { musica.parar(1.2); musica = null; } }
  function portada(si) {
    $('#portada').hidden = !si; est.modo = si ? 'portada' : est.modo;
    if (si) {
      est.cancelado = true; if (est.sigue) est.sigue('salir');
      [vA, vB].forEach(v => { try { v.pause(); } catch (e) {} v.classList.remove('ve'); });
      quitaOverlays(); $('#capaEst').innerHTML = ''; $('#subs').innerHTML = ''; $('#capaTop').innerHTML = ''; $('#fondo').classList.remove('ve');
      MAG.botonera.raiz.classList.add('bot-oculta'); $('#mandos').classList.remove('enHistoria');
      $('#finBobina').hidden = true;
      pintaBobinas(); est.modo = 'portada';
      if (MAG.ac) suenaPortada();
    } else callaPortada();
  }
  const ICO_BOB = '<svg viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="32" cy="32" r="6" fill="none" stroke="currentColor" stroke-width="3"/>' +
    [0, 120, 240].map(a => { const r = a * Math.PI / 180; const x = 32 + 17 * Math.sin(r), y = 32 - 17 * Math.cos(r); return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="7.5" fill="currentColor" opacity=".9"/>'; }).join('') + '</svg>';
  const ICO_CANDADO = '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="5" y="10.5" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  function pintaBobinas() {
    const caja = $('#pBobinas'); caja.innerHTML = '';
    const prog = MAG.lee('progreso', null), hechas = MAG.lee('hechas', []);
    [1, 2, 3].forEach(n => {
      const B = G.bobinas[n]; if (!B) return;
      const abierta = !window.MagHitos || window.MagHitos.abierto(n);
      const sigue = prog && prog.bobina === n && prog.paso > 0 && prog.v === G.version;
      let estado = abierta ? (sigue ? 'Continuar' : (hechas.indexOf(n) >= 0 ? 'Volver a verla' : 'Empezar')) : 'Se abre en clase';
      const b = MAG.el('button', { class: 'pBob' + (abierta ? '' : ' cerrada'), type: 'button' }, [
        MAG.el('span', { class: 'pBob-ic', html: ICO_BOB }),
        MAG.el('span', { class: 'pBob-tx' }, [MAG.el('span', { class: 'pBob-n', text: 'BOBINA ' + n }), MAG.el('span', { class: 'pBob-t', text: B.titulo }),
          MAG.el('span', { class: 'pBob-e', html: (abierta ? '' : ICO_CANDADO + ' ') + estado + (hechas.indexOf(n) >= 0 && abierta && !sigue ? ' <span class="pBob-v">✓</span>' : '') })])]);
      if (abierta) b.addEventListener('click', () => elige(n, sigue ? prog.paso : 0));
      caja.appendChild(b);
    });
  }
  async function elige(n, desde) {
    MAG.audio(); est.modo = 'cargando'; est.c720 = es720();
    const vista = $('#pCarga'); $('#pBobinas').hidden = true; vista.hidden = false;
    const tx = vista.querySelector('.pc-tx'), barra = vista.querySelector('.pc-barra i'), bot = vista.querySelector('.pc-bot');
    bot.innerHTML = ''; tx.textContent = 'Cargando la bobina ' + n + ' · 0 %'; barra.style.width = '0%';
    const volver = MAG.ui.boton('', { clase: 'mbtn-sec pc-volver', icono: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>', titulo: 'Volver' });
    let anulado = false, tecla = null;
    volver.addEventListener('click', () => { anulado = true; if (tecla) window.removeEventListener('keydown', tecla, true); vista.hidden = true; $('#pBobinas').hidden = false; est.modo = 'portada'; });
    bot.appendChild(volver);
    const { L, pesos } = recursosDe(n, desde);
    const mios = new Set(pasosDe(n).filter(p => p.t === 'v').map(p => rutaVideo(p.f)).concat(L));
    Object.keys(MAG.R).forEach(r => { if (/^v7?\//.test(r) && !mios.has(r)) suelta(r); });
    const fallos = await MAG.cargaTodo(L, f => { const p = Math.round(f * 100); tx.textContent = 'Cargando la bobina ' + n + ' · ' + p + ' %'; barra.style.width = p + '%'; }, pesos);
    if (anulado) return;
    if (fallos.length) console.warn('[MAG] no se pudo cargar', fallos);
    tx.textContent = desde ? 'La bobina ' + n + ' está lista: sigue donde la dejaste.' : 'La bobina ' + n + ' está lista.';
    barra.style.width = '100%';
    const emp = MAG.ui.boton(desde ? 'Continuar la bobina ' + n : 'Empezar la bobina ' + n, { clase: 'mbtn-prin', icono: MAG.ICO.play });
    bot.insertBefore(emp, volver);
    const arranca = () => { window.removeEventListener('keydown', tecla, true); vista.hidden = true; $('#pBobinas').hidden = false; corre(n, desde); };
    tecla = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); arranca(); } };
    window.addEventListener('keydown', tecla, true);
    emp.addEventListener('click', arranca);
  }
  function finBobina(n) {
    const hechas = MAG.lee('hechas', []); if (hechas.indexOf(n) < 0) { hechas.push(n); MAG.guarda('hechas', hechas); }
    MAG.guarda('progreso', null);
    est.modo = 'fin'; MAG.botonera.modo('propia'); MAG.botonera.enclava(null);
    const c = $('#finBobina'); c.hidden = false;
    c.querySelector('.fb-t').textContent = 'Fin de la bobina ' + n;
    c.querySelector('.fb-s').textContent = G.bobinas[n].titulo;
    const bot = c.querySelector('.fb-bot'); bot.innerHTML = '';
    const sig = G.bobinas[n + 1] && (!window.MagHitos || window.MagHitos.abierto(n + 1));
    if (sig) { const b = MAG.ui.boton('Bobina ' + (n + 1) + ' · ' + G.bobinas[n + 1].titulo, { clase: 'mbtn-prin', icono: MAG.ICO.play }); b.addEventListener('click', () => { portada(true); elige(n + 1, 0); }); bot.appendChild(b); }
    const v = MAG.ui.boton('Volver a la portada', { clase: sig ? 'mbtn-sec' : 'mbtn-prin' }); v.addEventListener('click', () => portada(true)); bot.appendChild(v);
    try { bot.querySelector('.mbtn-prin').focus({ preventScroll: true }); } catch (e) {}
  }

  // ───────────────── los mandos de arriba a la derecha ─────────────────
  function montaMandos() {
    const m = $('#mandos');
    const pc = MAG.el('button', { class: 'mnd', id: 'bPantalla', type: 'button', title: 'Pantalla completa',
      html: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' });
    pc.addEventListener('click', () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) {} });
    const cal = MAG.el('button', { class: 'mnd txt', id: 'bCalidad', type: 'button', title: 'Calidad del vídeo: 720 es la versión ligera, por si va a tirones (vale desde la próxima bobina que cargues)' });
    const pinta = () => { cal.textContent = MAG.lee('calidad', '1080') === '720' ? '720' : '1080'; };
    cal.addEventListener('click', () => { MAG.guarda('calidad', MAG.lee('calidad', '1080') === '720' ? '1080' : '720'); pinta(); });
    pinta(); if (!G.v7) cal.hidden = true;
    const sal = MAG.el('button', { class: 'mnd', id: 'bSalir', type: 'button', title: 'Salir a la portada (se guarda por dónde ibas)',
      html: '<svg viewBox="0 0 24 24"><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' });
    sal.addEventListener('click', () => portada(true));
    m.appendChild(cal); m.appendChild(pc); m.appendChild(sal);
  }

  // ───────────────── arranque ─────────────────
  MAG.ajusta();
  MAG.botonera.monta($('#escenario'));
  MAG.botonera.raiz.classList.add('bot-oculta');
  montaMandos();
  pintaBobinas();
  MAG.trae('a/portada_musica.mp3').catch(() => {});
  MAG.trae('a/ui_tecla.mp3').catch(() => {});
  const primerToque = () => { window.removeEventListener('pointerdown', primerToque, true); window.removeEventListener('keydown', primerToque, true); MAG.audio(); if (est.modo === 'portada') { const t = setInterval(() => { if (MAG.R['a/portada_musica.mp3']) { clearInterval(t); if (est.modo === 'portada') suenaPortada(); } }, 200); } };
  window.addEventListener('pointerdown', primerToque, true); window.addEventListener('keydown', primerToque, true);
  // desde el aviso de la campana («&dia=N»): esa bobina, directamente
  try { const ir = window.MagHitos ? window.MagHitos.ir() : 0; if (ir && G.bobinas[ir] && (!window.MagHitos || window.MagHitos.abierto(ir))) setTimeout(() => elige(ir, 0), 300); } catch (e) {}
  window.__mag = est;
  est._overlays = { monta: montaOverlays, quita: quitaOverlays };      // (para las pruebas)
})();
