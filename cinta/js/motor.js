/* Magnetófono · versión interactiva (prueba) · EL MOTOR (Claude para Iago, 18-oct-2026)
   La portada, la carga de cada bobina, los tramos de vídeo, las estaciones entre tramo y tramo, la botonera del magnetófono
   (◀◀ ▶ ‖ ▶▶ ●), «Seguir con la historia» después de cada libreta, «Salir» y «Continuar», y lo especial de la bobina 3:
   la emisión suena con la pieza del alumno (filtro de radio) y su título sale en pantalla y en la etiqueta de la bobina.
   v3 (18-oct, noche · «va a tirones»: como en La cabaña, que va fina en la pantalla del aula):
   · cada TRAMO SEGUIDO (de una estación a la siguiente) es UN solo vídeo con su sonido DENTRO (cinta/r/: 1080p a 60
     fotogramas; cinta/r3/: la versión ligera, 720p a 30). El navegador lleva la imagen y el sonido juntos: ya no hay vídeos
     mudos persiguiendo a una pista, ni cambios de velocidad para corregir la deriva, ni cambios de fichero a mitad de tramo.
   · TODO se carga en la memoria antes de «Empezar la bobina N» (con su barra y los MB): luego, nada espera a la red.
   · el PERMISO del micrófono se pide al pulsar la bobina en la portada; el micro solo se abre en las estaciones que graban.
   · 60 / 30 (arriba a la derecha): la versión ligera, por si un ordenador va justo (vale desde la próxima bobina que cargues).
   De la v2 (18-oct, notas de Iago de esa mañana), lo que sigue igual:
   · N2b / N3 · ◀◀ y ▶▶ van por HITOS (cada frase o cada plano), con la cinta corriendo en pantalla y su sonido. ◀◀ al principio
     de un tramo vuelve a la estación de antes (o al final del tramo anterior).
   · N12 · tras la libreta, la música SIGUE (la «cola», en bucle) hasta «Seguir con la historia» (o ▶).
   · N2 / N7 / N8 · la botonera siempre a la vista (comun.js); ▶ hundida mientras suena; las teclas que no sirven, apagadas.
   · N6 · los mandos de arriba a la derecha se esconden mientras corre el vídeo (vuelven al mover el ratón o en pausa).
   · N29 · ir a un sitio del mapa: todo cambia en el mismo fotograma (ctx.video con alMostrar).
   Reglas: nada de fundidos de imagen (todo cambia de golpe), nada de animaciones de interfaz en bucle. */
(function () {
  'use strict';
  const MAG = window.MAG, $ = MAG.$;
  const G = MAG.GUION, RUNS = MAG.RUNS || {};
  const PROFE = () => !!MAG.lee('profe', false);
  const est = { modo: 'portada', bobina: 0, paso: 0, pasos: [], vid: null, otro: null, enEst: null, sigue: null, run: null, desdeT: 0 };
  MAG.motor = est;
  const vA = $('#vA'), vB = $('#vB');
  [vA, vB].forEach(v => { v.muted = false; v.defaultMuted = false; v.removeAttribute('muted'); v.playsInline = true; v.preload = 'auto'; v.disablePictureInPicture = true; });
  // la cinta corriendo (◀◀ ▶▶): una capa encima del vídeo
  const fxC = MAG.el('div', { id: 'fxCinta' }, [MAG.el('i')]);
  $('#escenario').insertBefore(fxC, $('#capaOver'));

  // ───────────────── el sonido de los vídeos: cada <video> suena por Web Audio (para poder subirlo y bajarlo) ─────────────────
  const gVid = new Map();
  function conecta(el) {
    if (gVid.has(el)) return gVid.get(el);
    let g = null;
    try { const a = MAG.audio(); const s = a.createMediaElementSource(el); g = a.createGain(); s.connect(g); g.connect(MAG.master); }
    catch (e) { console.warn('[MAG] el vídeo suena sin Web Audio', e); g = null; }
    gVid.set(el, g); return g;
  }
  function volVid(el, v, t) {
    if (!el) return;
    const g = conecta(el);
    if (g) { const a = MAG.audio(), n = a.currentTime; g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(g.gain.value, n); g.gain.linearRampToValueAtTime(v, n + (t || 0.01)); return; }
    try { el.volume = Math.max(0, Math.min(1, v)); } catch (e) {}          // sin Web Audio (en el iPad no se puede: de golpe)
  }
  const callaVideos = () => [vA, vB].forEach(v => { try { v.pause(); } catch (e) {} });

  // ───────────────── los pasos de una bobina (las partes del guion: ahora son MARCAS dentro del vídeo de su tramo seguido) ─────────────────
  function pasosDe(n) {
    const B = G.bobinas[n], out = [];
    B.pasos.forEach(p => {
      if (p.t === 'v') {
        let rt = p.rt0 || 0;
        p.partes.forEach((q, i) => {
          out.push({ t: 'v', id: p.id, parte: i, nPartes: p.partes.length, f: q.f, dur: q.dur, nombre: p.nombre,
            libreta: !!p.libreta && i === p.partes.length - 1, pieza: q.pieza, titulo: q.titulo, etiqueta: q.etiqueta, ruidos: q.ruidos, run: p.run, rt0: rt });
          rt += q.dur;
        });
      } else out.push({ t: 'e', id: p.id, nombre: p.nombre });
    });
    out.forEach((p, i) => { p.i = i; });
    return out;
  }
  const runDe = id => { const B = G.bobinas[est.bobina]; return (B && B.runs && B.runs[id]) || null; };
  const partesDeRun = id => est.pasos.filter(p => p.t === 'v' && p.run === id);
  /* el vídeo de un tramo seguido (cinta/js/runs.js) */
  const vidDe = (n, id) => (RUNS[n] && RUNS[n][id]) || null;
  /* 60 (normal) o 30 (ligera); se fija al cargar cada bobina (lo cargado es lo que se ve); el botón vale para la próxima carga */
  const hay30 = () => !!MAG.RUNS30 && Object.values(RUNS).some(B => Object.values(B).some(x => x.f3));
  function calidad() { let c = String(MAG.lee('calidad', '60')); if (c === '720') c = '30'; if (c === '1080') c = '60'; return c === '30' && hay30() ? '30' : '60'; }
  const ligera = () => (est.c30 == null ? calidad() === '30' : est.c30);
  const rutaDe = X => (ligera() && X.f3) ? X.f3 : X.f;
  const trozosDe = X => (ligera() && X.f3) ? X.t3 : X.t;
  const bytesDe = X => (ligera() && X.f3) ? X.b3 : X.b;
  const UI_SON = ['a/ui_tecla.mp3', 'a/ui_rebobina.mp3', 'a/ui_avanza.mp3'];
  /* TODO lo de una bobina, para tenerlo en la memoria antes de empezar: el vídeo de cada tramo seguido (con su sonido; también
     los de los sitios del mapa), las colas de las libretas, lo de todas las estaciones (imágenes y sonidos) y los de la botonera */
  function recursosDe(n) {
    const B = G.bobinas[n], L = [], pesos = {}, trozos = {}, P = pasosDe(n);
    Object.keys(B.runs || {}).forEach(id => {
      const X = vidDe(n, id); if (!X) { console.warn('[MAG] falta el vídeo del tramo', id); return; }
      const r = rutaDe(X); L.push(r); pesos[r] = bytesDe(X) || 4e6; const t = trozosDe(X); if (t && t.length) trozos[r] = t;
      const R = B.runs[id]; if (R && R.cola) { L.push(R.cola.f); pesos[R.cola.f] = R.cola.bytes || 4e5; }
    });
    P.forEach(p => { if (p.t === 'v' && p.pieza) L.push('a/b3_pieza_ejemplo.mp3'); });
    B.pasos.filter(p => p.t === 'e').forEach(p => {
      const d = MAG.est[p.id]; if (!d) return;
      let r = d.recursos || []; if (typeof r === 'function') { try { r = r(); } catch (e) { r = []; } }
      r.forEach(x => { L.push(x); pesos[x] = pesos[x] || (/\.(jpe?g|png|webp)$/i.test(x) ? 260000 : 120000); });
      if (d.fondo) { L.push(d.fondo); pesos[d.fondo] = 260000; }
    });
    UI_SON.forEach(x => L.push(x));
    return { L: Array.from(new Set(L)), pesos, trozos };
  }
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
  /* algo que hace falta YA y no está (no debería pasar: todo se carga antes de empezar): «CARGANDO» en la ventanita */
  async function asegura(X) {
    const r = rutaDe(X); if (listo(r)) return true;
    MAG.botonera.rotulo('CARGANDO');
    let ok = true; try { await MAG.traeTrozos(r, trozosDe(X)); } catch (e) { console.warn('[MAG] no se pudo cargar', r, e && e.message); ok = false; }
    MAG.botonera.rotulo('');
    return ok;
  }

  // ───────────────── los dos vídeos: el que se ve y el que espera ya preparado (para cambiar en el mismo fotograma) ─────────────────
  function prepara(el, ruta) {
    return new Promise(ok => {
      const url = MAG.url(ruta);
      if (el.dataset.ruta === ruta && el.readyState >= 2) { try { el.pause(); } catch (e) {} ok(); return; }
      el.dataset.ruta = ruta;
      let hecho = false; const fin = () => { if (hecho) return; hecho = true; el.removeEventListener('loadeddata', fin); el.removeEventListener('error', fin); ok(); };
      el.addEventListener('loadeddata', fin); el.addEventListener('error', fin);
      el.src = url; el.load();
      setTimeout(fin, 6000);
    });
  }
  function buscaVid(el, t) {
    return new Promise(ok => {
      if (Math.abs(el.currentTime - t) < 0.01 && !el.seeking) { ok(); return; }
      let h = false; const f = () => { if (h) return; h = true; el.removeEventListener('seeked', f); ok(); };
      el.addEventListener('seeked', f); try { el.currentTime = t; } catch (e) { f(); } setTimeout(f, 2000);
    });
  }
  function muestra(el) { [vA, vB].forEach(v => v.classList.toggle('ve', v === el)); est.vid = el; est.otro = elOtro(el); }
  function elOtro(el) { return el === vA ? vB : vA; }
  const visible = () => [vA, vB].find(v => v.classList.contains('ve')) || null;
  /* el vídeo de un tramo seguido, en el elemento que NO se ve, parado en el segundo t (listo para enseñarlo de golpe) */
  async function enEspera(X, t) {
    const vis = visible(); const el = vis === vA ? vB : vA;
    await prepara(el, rutaDe(X));
    try { el.pause(); } catch (e) {}
    await buscaVid(el, Math.max(0, Math.min(t || 0, Math.max(0, (el.duration || X.dur || 0) - 0.02))));
    return el;
  }
  /* deja preparado (parado en su principio) el vídeo del siguiente tramo, mientras tanto */
  function adelanta(X) {
    if (!X || !listo(rutaDe(X))) return;
    const vis = visible(), el = vis === vA ? vB : vA, r = rutaDe(X);
    prepara(el, r).then(() => { if (visible() !== el && el.dataset.ruta === r) { try { el.pause(); } catch (e) {} if (el.currentTime > 0.01) buscaVid(el, 0); } });
  }

  // ───────────────── la cinta corriendo (◀◀ ▶▶): la capa, la botonera y el sonido ─────────────────
  let sRew = null;
  function fxDentro(dir) {
    $('#escenario').classList.add('fxCinta'); fxC.classList.toggle('atras', dir < 0); fxC.classList.add('ve');
    MAG.botonera.enclava(dir < 0 ? 'rew' : 'ff'); MAG.botonera.rotulo('');
    if (sRew) sRew.parar(0.04);
    sRew = MAG.suena(dir < 0 ? 'a/ui_rebobina.mp3' : 'a/ui_avanza.mp3', { db: -7 });
  }
  function fxFuera() {
    $('#escenario').classList.remove('fxCinta'); fxC.classList.remove('ve');
    if (sRew) { sRew.parar(0.06); sRew = null; }
  }

  // ───────────────── los mandos de la derecha: escondidos mientras corre el vídeo ─────────────────
  let tMandos = 0;
  function mandos() {
    const m = $('#mandos'); if (!m) return;
    const r = est.run, oculta = !!(r && r.vivo && !r.pausada && !r.salto && performance.now() > tMandos);
    if (m.classList.contains('escondidos') !== oculta) m.classList.toggle('escondidos', oculta);
  }
  window.addEventListener('pointermove', () => { tMandos = performance.now() + 2600; mandos(); }, { passive: true });
  window.addEventListener('pointerdown', () => { tMandos = performance.now() + 2600; mandos(); }, { passive: true, capture: true });

  // ───────────────── UN TRAMO SEGUIDO: un solo vídeo, con su sonido dentro ─────────────────
  /* o: { X (el vídeo: runs.js), R (del guion: hitos, cola, finPartes), partes: [{ rt0, dur, i?, pieza?, titulo?, etiqueta?, ruidos? }],
          desde (s del tramo seguido), lugar (un sitio del mapa), alMostrar (al enseñar el primer fotograma) }
     Las «partes» ya no son ficheros: son marcas dentro del vídeo (por dónde va la historia, y las ventanas de la bobina 3).
     Resuelve: 'fin' (llegó al final o ▶▶ hasta el final), 'atras' (◀◀ antes de su principio), 'salir', 'error'. */
  function corrida(o) {
    return new Promise(resuelve => {
      const R = o.R, P = o.partes, X = o.X;
      const fin = P.length ? P[P.length - 1].rt0 + P[P.length - 1].dur : 0;
      const run = { R, P, X, fin, k: -1, el: null, pausada: false, salto: false, objetivo: null, dir: 0, vivo: true, lugar: !!o.lugar, ov: null };
      est.run = run;
      if (R && R.cola) run.colaBuf = trae(R.cola.f).then(() => MAG.decodifica(R.cola.f)).catch(() => null);
      let acabado = false;
      const acaba = (r) => {
        if (acabado) return; acabado = true; run.vivo = false;
        cancelAnimationFrame(run.raf); clearTimeout(run.tSalto); fxFuera(); quitaOverlays();
        if (est.botonPlay) { est.botonPlay.remove(); est.botonPlay = null; }
        if (run.el) { est.vid = run.el; est.otro = elOtro(run.el); }
        if (est.run === run) est.run = null;
        mandos(); resuelve(r);
      };
      run.acabar = acaba;
      const reloj = () => (run.el ? run.el.currentTime : 0);
      const parteEn = T => { let k = 0; for (let j = 0; j < P.length; j++) if (P[j].rt0 <= T + 1e-4) k = j; return k; };
      const anota = () => { const q = P[run.k]; if (q && q.i != null) { est.paso = q.i; guardaProg(est.bobina, est.paso); } };
      /* la parte (la marca) por la que va: lo que se apunta y las ventanas de la bobina 3 */
      function enParte(k, forzar) {
        if (k === run.k && !forzar) return;
        run.k = k; montaOverlays(P[k], run); anota();
        if (!run.pausada && !run.salto && run.ov && run.el && !run.el.paused) run.ov.sonar();
      }
      function suena() {
        if (!run.vivo || run.pausada || run.salto || !run.el) return;
        est.desbloqueo = null; volVid(run.el, 1, 0.02);
        const otro = elOtro(run.el); if (!otro.paused && otro !== est.colaVid) { try { otro.pause(); } catch (e) {} }
        run.el.play().catch(e => { if (e && e.name === 'NotAllowedError') { console.warn('[MAG] play', e); muestraPlayManual(); } });
        if (run.ov) run.ov.sonar();
        MAG.botonera.enclava('play'); MAG.botonera.rotulo(''); mandos();
      }
      function calla() {
        if (run.el) { try { run.el.pause(); } catch (e) {} }
        if (run.ov) run.ov.parar();
      }
      run.pausa = (si) => {
        if (!run.vivo || run.salto) return;
        run.pausada = !!si;
        if (si) { calla(); MAG.botonera.enclava('pausa'); MAG.botonera.rotulo(''); }
        else suena();
        mandos();
      };

      // ◀◀ / ▶▶ por hitos (varias pulsaciones seguidas suman); la cinta corre 0,6 s y suena desde el hito
      run.salta = (dir) => {
        if (!run.vivo) return;
        const H = (R && R.hitos && R.hitos.length) ? R.hitos : P.map(q => q.rt0);
        const T = run.objetivo != null ? run.objetivo : reloj();
        let obj;
        if (dir < 0) {
          obj = null; for (let j = H.length - 1; j >= 0; j--) if (H[j] < T - 1.2) { obj = H[j]; break; }
          if (obj == null) obj = (T > 1.2 || run.lugar) ? 0 : -1;          // -1: antes de este tramo (la estación de antes)
          if (run.objetivo === -1) obj = -1;
        } else {
          obj = H.find(h => h > T + 0.3); if (obj == null) obj = fin;
        }
        run.objetivo = obj; run.dir = dir;
        if (!run.salto) { run.salto = true; calla(); fxDentro(dir); }
        else fxDentro(dir);
        clearTimeout(run.tSalto); run.tSalto = setTimeout(termina, 620);
        mandos();
      };
      async function termina() {
        const obj = run.objetivo;
        if (!run.vivo) return;
        if (obj === -1) { acaba('atras'); return; }
        if (obj >= fin - 0.05) { alFinal(true); return; }
        await buscaVid(run.el, obj);
        if (!run.vivo) return;
        if (run.objetivo !== obj) return;                     // otra pulsación mientras tanto: ya vendrá su termina()
        enParte(parteEn(obj), true);
        fxFuera(); run.salto = false; run.objetivo = null; run.pausada = false;
        suena();
      }
      /* el final del tramo: sin cola, el vídeo se queda parado en su último fotograma; con cola (una libreta), el vídeo sigue
         sonando lo que le queda (el principio de la cola; su imagen es el mismo último fotograma) y la cola entra encima */
      function alFinal(saltado) {
        const el = run.el;
        if (R && R.cola && !saltado && el && !el.paused && !el.ended) est.colaVid = el;
        else if (el) { try { el.pause(); } catch (e) {} if (saltado) { try { el.currentTime = Math.max(0, fin - 0.02); } catch (e) {} } }
        acaba('fin');
      }

      // el reloj: cada fotograma (solo mira por dónde va: el vídeo y su sonido van solos)
      function paso() {
        if (!run.vivo) return;
        run.raf = requestAnimationFrame(paso);
        mandos();
        if (run.pausada || run.salto || !run.el) return;
        const T = reloj();
        if (T >= fin - 0.025 || run.el.ended) { alFinal(false); return; }
        const k = parteEn(T); if (k !== run.k) enParte(k);
        if (run.ov) run.ov.mira(T - P[run.k].rt0);
      }

      // arranque
      (async () => {
        if (!X) { console.warn('[MAG] tramo sin vídeo'); acaba('error'); return; }
        if (!(await asegura(X)) || !run.vivo) { if (run.vivo) acaba('error'); return; }
        const T0 = Math.max(0, Math.min(o.desde || 0, Math.max(0, fin - 0.1)));
        const el = await enEspera(X, T0);
        if (!run.vivo) return;
        conecta(el);
        run.el = el; muestra(el);
        if (o.alMostrar) { const f = o.alMostrar; o.alMostrar = null; try { f(); } catch (e) { console.error(e); } }
        enParte(parteEn(T0), true);
        suena();
        run.raf = requestAnimationFrame(paso);
      })().catch(e => { console.error('[MAG] tramo', e); acaba('error'); });
    });
  }
  function muestraPlayManual() {
    if (est.botonPlay) return;
    const b = MAG.ui.boton('Reproducir', { clase: 'mbtn-prin', icono: MAG.ICO.play });
    Object.assign(b.style, { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: 40 });
    b.addEventListener('click', () => { b.remove(); est.botonPlay = null; if (est.run) { est.run.pausada = true; est.run.pausa(false); } });
    $('#capaTop').appendChild(b); est.botonPlay = b;
  }

  // ───────────────── lo especial de la bobina 3: la pieza del alumno y su título ─────────────────
  /* run.ov = { sonar(), parar(), mira(t) }: la pieza suena por Web Audio a la hora del vídeo; el título y la etiqueta, por t
     (segundos desde el principio de esa parte) */
  function montaOverlays(q, run) {
    quitaOverlays();
    const ov = { piezas: [], sonar() {}, parar() {}, mira() {} };
    run.ov = ov;
    const tParte = () => (run.el ? run.el.currentTime : 0) - q.rt0;
    if (q.pieza) {
      const o = { t: q.pieza.t, fuente: null, buf: null, deAlumno: false, g: null };
      const ejemplo = () => (MAG.R['a/b3_pieza_ejemplo.mp3'] && MAG.R['a/b3_pieza_ejemplo.mp3'].buf) || null;
      /* la pieza por la radio, con el mismo equilibrio que en la animática (allí: −8 dB y el filtro de radio): se iguala por
         SONORIDAD (−36 dB RMS antes del filtro), sin pasar de −3 dBFS de pico; la de ejemplo queda como en el vídeo */
      const ganancia = b => {
        let s = 0, n = 0, pk = 0;
        for (let c = 0; c < b.numberOfChannels; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i += 3) { const v = d[i]; s += v * v; n++; if (v > pk) pk = v; else if (-v > pk) pk = -v; } }
        const rms = 10 * Math.log10(s / Math.max(1, n) + 1e-12);
        return Math.max(-24, Math.min(8, Math.min(-36 - rms, -3 - 20 * Math.log10(pk + 1e-9))));
      };
      const para = () => { if (o.fuente) { try { o.fuente.stop(); } catch (e) {} try { o.g.disconnect(); } catch (e) {} o.fuente = null; } };
      const programa = () => {
        para(); if (!o.buf || !run.vivo || run.pausada || run.salto || P_k(run) !== q) return;
        const a = MAG.audio(), t = tParte();
        const dt = o.t - t, off = Math.max(0, -dt);
        if (off >= o.buf.duration - 0.05) return;
        const f = MAG.filtro('radio'), g = a.createGain(); g.gain.value = MAG.db(o.db);
        const s = a.createBufferSource(); s.buffer = o.buf; s.connect(f.entrada); f.salida.connect(g); g.connect(MAG.master);
        s.start(a.currentTime + Math.max(0, dt), off); o.fuente = s; o.g = g;
      };
      ov.sonar = () => { programa(); }; ov.parar = para;
      est.pieza = o;
      let pide = est.piezaPromesa || null;
      if (!pide) { try { pide = (typeof MAG.piezaAudio === 'function') ? MAG.piezaAudio() : null; } catch (e) { pide = null; } }
      Promise.resolve(pide).catch(() => null).then(b => {
        if (est.pieza !== o) return;
        o.deAlumno = !!b; o.buf = b || ejemplo(); o.db = o.buf ? ganancia(o.buf) : -6;
        window.__magPieza = o.deAlumno ? 'alumno' : (o.buf ? 'ejemplo' : 'ninguna');
        if (run.vivo && !run.pausada && !run.salto && run.el && !run.el.paused) programa();
      });
    }
    const vistas = [];
    if (q.titulo) {
      const tit = (MAG.datos && MAG.datos.titulo) || 'Estudio de los lápices';
      const c = MAG.el('div', { class: 'tit-radio' }, [MAG.el('div', { class: 'tr-arr', text: 'ESTA NOCHE, EN LA RADIO' }), MAG.el('div', { class: 'tr-tit', text: '«' + tit + '»' }),
        MAG.el('div', { class: 'tr-linea' }), MAG.el('div', { class: 'tr-abj', text: 'el estudio de un aprendiz · Concierto de ruidos' })]);
      $('#capaOver').appendChild(c); mide(c, () => ajustaTexto(c.querySelector('.tr-tit'), 1560, 64, 34));
      vistas.push({ c, t0: q.titulo.t0, t1: q.titulo.t1 });
    }
    if (q.etiqueta) {
      const tit = (MAG.datos && MAG.datos.titulo) || 'Estudio de los lápices';
      const c = MAG.el('div', { class: 'etq-peg' }, [MAG.el('div', { class: 'etq-tx', text: tit })]);
      $('#capaOver').appendChild(c);
      // la pegatina de P1h (b3v33.QUAD): sus cuatro esquinas, y el texto en un lienzo plano de 402×182 deformado encima
      c.style.transform = matriz3d([[0, 0], [402, 0], [402, 182], [0, 182]], [[464, 604], [865, 610], [865, 797], [464, 778]]);
      mide(c, () => ajustaTexto(c.querySelector('.etq-tx'), 358, 33, 14));
      vistas.push({ c, t0: q.etiqueta.t0, t1: q.etiqueta.t1 });
    }
    if (q.ruidos) montaRuidos(q, run, ov, vistas, tParte);
    if (vistas.length) ov.mira = (t) => vistas.forEach(v => { const h = !(t >= v.t0 && t < v.t1); if (v.c.hidden !== h) v.c.hidden = h; if (!h && v.pinta) v.pinta(t); });
  }
  /* (18-oct, N37 de Iago) «la mesa de montaje»: Odile escucha los cuatro ruidos de TU clase, uno tras otro. El sonido del tramo
     (limpio) no los trae: aquí suenan los de la clase (MAG.b3.sonidosClase(); si no hay, los de ejemplo) a su hora del vídeo, y
     encima del panel del vídeo va el mismo panel con SUS nombres y su onda, que se dibuja mientras suena (como en la animática:
     panel_lanes de b3v35.py, en (90, 100), 1120 × 734, un carril cada 156 px, 290 px por segundo).
     q.ruidos = { t: [4], d: [4], panel: [t0, t1] } (segundos desde el principio de esta parte). */
  const RUIDOS_EJ = [['LÁPIZ', 'a/b3_ej_lapiz.mp3'], ['SILLA', 'a/b3_ej_silla.mp3'], ['LIBRO', 'a/b3_ej_libro.mp3'], ['CREMALLERA', 'a/b3_ej_cremallera.mp3']];
  function montaRuidos(q, run, ov, vistas, tParte) {
    const R_ = q.ruidos, n = R_.t.length, PXS = 290;
    const c = MAG.el('div', { class: 'rd-panel' }, [MAG.el('div', { class: 'rd-tit', text: 'LOS RUIDOS DE TU CLASE' })]);
    const ets = [];
    for (let i = 0; i < n; i++) { const e = MAG.el('div', { class: 'rd-et', text: (i + 1) + ' · …' }); e.style.top = (125 + 156 * i) + 'px'; c.appendChild(e); ets.push(e); }
    const cv = document.createElement('canvas'); cv.width = 760; cv.height = 156 * n; cv.className = 'rd-lienzo'; c.appendChild(cv);
    $('#capaOver').appendChild(c); c.hidden = true;
    const o = { bufs: [], env: [], fuentes: [], ult: -1 };
    const para = () => { o.fuentes.forEach(s => { try { s.stop(); } catch (e) {} }); o.fuentes = []; };
    const recorta = (b) => {                                   // sin el silencio del principio (la grabación empieza al pulsar)
      const d = b.getChannelData(0); let pk = 0; for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > pk) pk = v; }
      let i0 = 0; const um = pk * 0.12; while (i0 < d.length && Math.abs(d[i0]) < um) i0++;
      return { off: Math.max(0, i0 / b.sampleRate - 0.05), pk };
    };
    const programa = () => {
      para(); if (!o.bufs.length || !run.vivo || run.pausada || run.salto || P_k(run) !== q) return;
      const a = MAG.audio(), now = tParte();
      o.bufs.forEach((x, i) => {
        if (!x) return;
        const t0 = R_.t[i], d = R_.d[i], dt = t0 - now, off = Math.max(0, -dt);
        if (off >= d - 0.03) return;
        const s = a.createBufferSource(), g = a.createGain(); s.buffer = x.buf;
        const k = MAG.db(-14) / Math.max(0.02, x.pk), T0 = a.currentTime + Math.max(0, dt), dur = d - off;
        g.gain.setValueAtTime(k, T0); g.gain.setValueAtTime(k, T0 + Math.max(0, dur - 0.3)); g.gain.linearRampToValueAtTime(0.0001, T0 + dur);
        s.connect(g); g.connect(MAG.master); s.start(T0, x.off + off, dur + 0.02); o.fuentes.push(s);
      });
    };
    const pinta = (t) => {
      const k = Math.round(t * 30); if (k === o.ult) return; o.ult = k;
      const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
      for (let i = 0; i < n; i++) {
        const y = 156 * i + 46, L = Math.round(R_.d[i] * PXS);
        g.fillStyle = 'rgb(196,178,146)'; g.fillRect(0, y - 1, 740, 2);
        const env = o.env[i]; if (!env) continue;
        const u = Math.max(0, Math.min(1, (t - R_.t[i]) / R_.d[i])), xc = Math.round(L * u);
        g.fillStyle = 'rgb(30,26,22)';
        for (let j = 0; j < env.length && j * 4 < xc; j++) { const h = Math.max(2, Math.round(env[j] * 44)); g.fillRect(j * 4 - 1, y - h, 3, 2 * h); }
        if (u > 0 && u < 1) { g.fillStyle = 'rgb(230,71,59)'; g.fillRect(xc, 156 * i, 3, 92); }
      }
    };
    vistas.push({ c, t0: R_.panel[0], t1: R_.panel[1], pinta });
    const sonarAntes = ov.sonar, pararAntes = ov.parar;
    ov.sonar = () => { sonarAntes(); programa(); }; ov.parar = () => { pararAntes(); para(); };
    est.ruidos = { para };
    const lista = (async () => {
      let cl = [];
      try { if (MAG.b3 && typeof MAG.b3.sonidosClase === 'function') cl = await MAG.b3.sonidosClase(); } catch (e) { cl = []; }
      if (cl.length >= n) return cl.slice(0, n).map(x => ({ nombre: x.nombre, buf: x.buf }));
      const ej = [];
      for (const [nom, r] of RUIDOS_EJ.slice(0, n)) { let b = null; try { b = await MAG.decodifica(r); } catch (e) {} ej.push({ nombre: nom, buf: b }); }
      return ej;
    })();
    lista.then(L => {
      if (!run.vivo) return;
      L.forEach((x, i) => {
        ets[i].textContent = (i + 1) + ' · ' + String(x.nombre || ('ruido ' + (i + 1))).toLocaleUpperCase('es');
        if (!x.buf) { o.bufs[i] = null; return; }
        const r = recorta(x.buf); o.bufs[i] = { buf: x.buf, off: r.off, pk: r.pk };
        const d = x.buf.getChannelData(0), sr = x.buf.sampleRate, L_ = Math.round(R_.d[i] * PXS), nb = Math.max(1, Math.floor(L_ / 4));
        const i0 = Math.floor(r.off * sr), seg = Math.max(1, Math.floor(R_.d[i] * sr / nb)); const env = [];
        for (let j = 0; j < nb; j++) { let m = 0; for (let s = i0 + j * seg; s < Math.min(d.length, i0 + (j + 1) * seg); s++) { const v = Math.abs(d[s]); if (v > m) m = v; } env.push(m); }
        const mx = Math.max(1e-6, ...env); o.env[i] = env.map(v => Math.pow(v / mx, 0.75));
      });
      window.__magRuidos = L.map(x => x.nombre).join(' | ');
      o.ult = -1; if (run.vivo && !run.pausada && !run.salto && run.el && !run.el.paused) programa();
    });
  }
  const P_k = run => run.P[run.k];
  function quitaOverlays() {
    if (est.run && est.run.ov) { try { est.run.ov.parar(); } catch (e) {} est.run.ov = null; }
    if (est.pieza) { const o = est.pieza; if (o.fuente) { try { o.fuente.stop(); } catch (e) {} o.fuente = null; } est.pieza = null; }
    if (est.ruidos) { try { est.ruidos.para(); } catch (e) {} est.ruidos = null; }
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
  const tecDefecto = () => ['rew'].concat(PROFE() ? ['ff'] : []);
  async function estacion(p) {
    const def = MAG.est[p.id];
    if (!def) { console.warn('[MAG] falta la estación', p.id); return 'falta'; }
    est.modo = 'estacion'; est.piezaPromesa = null;           // (si se rehace la pieza, se vuelve a mezclar)
    paraColaVid();
    MAG.botonera.enclava(null); MAG.botonera.rotulo(''); MAG.botonera.reposo('AHORA TÚ'); MAG.botonera.usables(tecDefecto());
    if (est.vid) { try { est.vid.pause(); } catch (e) {} }
    // (v3) el micro, abierto solo en las estaciones que graban (el permiso ya se pidió al pulsar la bobina)
    const conMicro = !!def.micro;
    if (conMicro) MAG.mic.abre();
    const fondo = $('#fondo');
    if (def.fondo) { fondo.src = MAG.url(def.fondo); fondo.classList.add('ve'); }
    const raiz = $('#capaEst'); raiz.innerHTML = '';
    const ctx = MAG.contexto(raiz, { profe: PROFE(), bobina: est.bobina });
    est.enEst = ctx;
    // el vídeo del tramo siguiente, ya preparado (parado en su principio) mientras tanto
    const sig = siguienteVideo(); if (sig) adelanta(vidDe(est.bobina, sig.run));
    let r = 'fin';
    try {
      r = await Promise.race([def.monta(ctx).then(() => 'fin'), new Promise(ok => { est.sigue = ok; })]);
    } catch (e) { console.error('[MAG] estación', p.id, e); r = 'error'; }
    est.sigue = null; ctx.limpia(); est.enEst = null;
    if (conMicro) MAG.mic.suelta();
    fondo.classList.remove('ve');
    $('#subs').innerHTML = ''; $('#capaTop').innerHTML = '';
    MAG.botonera.reposo('PLAY');
    est.modo = 'historia';
    return r;
  }
  function siguienteVideo() {
    for (let i = est.paso + 1; i < est.pasos.length; i++) { if (est.pasos[i].t === 'v') return est.pasos[i]; }
    return null;
  }

  // ───────────────── la historia: paso a paso ─────────────────
  /* el último hito de un tramo seguido (para volver a él con ◀◀ desde la estación o la libreta que vienen después) */
  function aUltimoHito(runId) {
    const R = runDe(runId), Ps = partesDeRun(runId); if (!Ps.length) return false;
    const fin = Ps[Ps.length - 1].rt0 + Ps[Ps.length - 1].dur;
    const H = (R && R.hitos && R.hitos.length) ? R.hitos.filter(h => h < fin - 0.8) : Ps.map(q => q.rt0);
    const h = H.length ? H[H.length - 1] : 0;
    const q = Ps.filter(x => x.rt0 <= h + 1e-4).pop() || Ps[0];
    est.paso = q.i; est.desdeT = h; return true;
  }
  async function corre(n, desde) {
    est.bobina = n; est.pasos = pasosDe(n); est.paso = desde || 0; est.modo = 'historia'; est.cancelado = false; est.piezaPromesa = null; est.desdeT = 0;
    MAG.videoHook = videoPorId;
    portada(false); $('#mandos').classList.add('enHistoria');
    MAG.botonera.raiz.classList.remove('bot-oculta'); MAG.botonera.reposo('PLAY');
    // si se continúa a mitad (en una estación), se enseña el último fotograma del tramo de antes
    if (est.paso > 0 && est.pasos[est.paso].t === 'e') {
      const ant = est.pasos.slice(0, est.paso).reverse().find(q => q.t === 'v');
      const X = ant && vidDe(n, ant.run);
      if (X && await asegura(X)) { const el = await enEspera(X, ant.rt0 + ant.dur - 0.02); muestra(el); }
    }
    while (est.paso < est.pasos.length && !est.cancelado) {
      const p = est.pasos[est.paso];
      guardaProg(n, est.paso);
      if (p.t === 'v') {
        // la pieza del alumno se mezcla (OfflineAudioContext) antes del tramo de la emisión, para que esté a tiempo
        if (!est.piezaPromesa && partesDeRun(p.run).some(q => q.pieza)) {
          try { est.piezaPromesa = Promise.resolve(typeof MAG.piezaAudio === 'function' ? MAG.piezaAudio() : null).catch(() => null); }
          catch (e) { est.piezaPromesa = Promise.resolve(null); }
        }
        est.modo = 'historia';
        MAG.botonera.usables(['rew', 'play', 'pausa', 'ff']); MAG.botonera.reposo('PLAY');
        const Ps = partesDeRun(p.run);
        const desdeT = est.desdeT || p.rt0; est.desdeT = 0;
        const r = await corrida({ X: vidDe(n, p.run), R: runDe(p.run), partes: Ps, desde: desdeT });
        if (est.cancelado || r === 'salir') break;
        if (r === 'atras') {                                   // ◀◀ antes del principio de este tramo
          const i0 = Ps[0].i;
          if (i0 === 0) { est.paso = 0; est.desdeT = 0; continue; }
          const prev = est.pasos[i0 - 1];
          if (prev.t === 'e') { est.paso = i0 - 1; continue; }
          if (!aUltimoHito(prev.run)) est.paso = i0;
          continue;
        }
        const ult = Ps[Ps.length - 1];
        est.paso = ult.i;
        if (ult.libreta && r !== 'error') {
          const r2 = await seguirTrasLibreta(p.run);
          if (est.cancelado) break;
          if (r2 === 'atras') continue;
        } else paraColaVid();
        est.paso = ult.i + 1;
      } else {
        const r = await estacion(p);
        if (est.cancelado) break;
        if (r === 'atras') {                                   // ◀◀ en la estación: el final del tramo de antes (su última frase)
          const ant = est.pasos.slice(0, est.paso).reverse().find(q => q.t === 'v');
          if (!ant || !aUltimoHito(ant.run)) est.paso = Math.max(0, est.paso - 1);
          continue;
        }
        est.paso++;
      }
    }
    if (!est.cancelado) finBobina(n);
  }
  /* la libreta a la vista: la música sigue (la cola, en bucle) hasta «Seguir con la historia» (o ▶ / ▶▶); ◀◀, su última frase */
  async function seguirTrasLibreta(runId) {
    est.modo = 'libreta';
    MAG.botonera.enclava('pausa'); MAG.botonera.rotulo(''); MAG.botonera.usables(['rew', 'play', 'ff']);
    const cola = await empiezaCola(runDe(runId));
    const sig = siguienteVideo(); if (sig) adelanta(vidDe(est.bobina, sig.run));
    return new Promise(ok => {
      const pr = MAG.ui.seguir($('#capaTop'), 'Seguir con la historia');
      const sal = (m) => { est.sigue = null; pr.cancela(); paraCola(cola); est.modo = 'historia'; ok(m); };
      est.sigue = (m) => { if (m === 'atras') aUltimoHito(runId); sal(m || 'salto'); };
      pr.then(() => sal('fin'));
    });
  }
  /* el vídeo de la libreta sigue sonando (su sonido dura 1,5 s más que la imagen: el principio de la cola); se calla con la cola */
  function paraColaVid(seg) {
    const el = est.colaVid; est.colaVid = null; if (!el) return;
    if (!seg) { try { el.pause(); } catch (e) {} return; }
    volVid(el, 0, seg);
    setTimeout(() => { if (est.run && est.run.el === el) return; try { el.pause(); } catch (e) {} volVid(el, 1, 0.01); }, seg * 1000 + 60);
  }
  async function empiezaCola(R) {
    const el = est.colaVid;
    if (!R || !R.cola) { paraColaVid(); return null; }
    let buf = null;
    try { buf = await trae(R.cola.f).then(() => MAG.decodifica(R.cola.f)); } catch (e) { buf = null; }
    if (!buf) { paraColaVid(); return null; }
    const a = MAG.audio(), t = a.currentTime;
    const sigue = el && !el.paused && !el.ended;
    const off = Math.max(0, Math.min(buf.duration - 0.2, sigue ? el.currentTime - (R.finPartes || 0) : 0));
    const s = a.createBufferSource(); s.buffer = buf; s.loop = true;
    if (R.cola.bucle) { s.loopStart = R.cola.bucle[0]; s.loopEnd = R.cola.bucle[1]; }
    const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + 0.2);
    s.connect(g); g.connect(MAG.master); s.start(t, off);
    // el vídeo (que ya suena con el principio de la cola) se va en esos mismos 0,2 s y se queda parado en su último fotograma
    paraColaVid(0.2);
    return { s, g };
  }
  function paraCola(c) {
    if (!c) return;
    try { const a = MAG.audio(), t = a.currentTime; c.g.gain.cancelScheduledValues(t); c.g.gain.setValueAtTime(c.g.gain.value, t); c.g.gain.linearRampToValueAtTime(0.0001, t + 0.35); c.s.stop(t + 0.4); } catch (e) {}
  }
  /* para b2_mapa: un tramo «suelto» (los sitios del mapa), por su id. op.alMostrar: se llama en el fotograma en que se enseña el
     vídeo (para esconder el mapa a la vez: nada de fotogramas raros) */
  async function videoPorId(id, op) {
    op = op || {};
    const B = G.bobinas[est.bobina]; const l = (B.lugares || {})[id];
    if (!l) { console.warn('[MAG] no hay tramo', id); if (op.alMostrar) op.alMostrar(); return; }
    const modoAntes = est.modo, sigueEst = est.sigue, usablesAntes = MAG.botonera.usadas;
    est.modo = 'lugar'; est.sigue = null;
    let rt = 0; const P = l.partes.map(q => { const x = Object.assign({}, q, { rt0: rt }); rt += q.dur; return x; });
    MAG.botonera.usables(['rew', 'play', 'pausa', 'ff']);
    await corrida({ X: vidDe(est.bobina, l.run || id), R: l.run && B.runs ? B.runs[l.run] : null, partes: P, desde: 0, lugar: true, alMostrar: op.alMostrar });
    paraColaVid();
    est.sigue = sigueEst;
    if (!est.cancelado) { est.modo = modoAntes; MAG.botonera.usables(usablesAntes); MAG.botonera.enclava(null); MAG.botonera.rotulo(''); }
  }

  // ───────────────── la botonera y el teclado ─────────────────
  MAG.pausaHistoria = () => { if (est.run) est.run.pausa(true); };
  MAG.botonera.on('play', () => {
    if (est.run) { if (est.run.pausada) est.run.pausa(false); return; }
    if (est.modo === 'libreta' && est.sigue) est.sigue('salto');
  });
  MAG.botonera.on('pausa', () => { if (est.run && !est.run.pausada) est.run.pausa(true); });
  MAG.botonera.on('ff', () => {
    if (est.run) { est.run.salta(+1); return; }
    if (est.modo === 'libreta' && est.sigue) est.sigue('salto');
    else if (est.modo === 'estacion' && PROFE() && est.sigue) est.sigue('salto');
  });
  MAG.botonera.on('rew', () => {
    if (est.run) { est.run.salta(-1); return; }
    if ((est.modo === 'libreta' || est.modo === 'estacion') && est.sigue) est.sigue('atras');
  });
  window.addEventListener('keydown', ev => {
    if (ev.defaultPrevented || ev.target && (/input|textarea|select/i.test(ev.target.tagName) || ev.target.isContentEditable)) return;
    if (est.modo === 'portada' || est.modo === 'cargando') return;
    if (ev.shiftKey && ev.key === 'ArrowRight') { ev.preventDefault(); MAG.botonera.pulsa('ff', true); return; }
    if (ev.shiftKey && ev.key === 'ArrowLeft') { ev.preventDefault(); MAG.botonera.pulsa('rew', true); return; }
    if ((ev.key === ' ' || ev.key === 'k' || ev.key === 'K') && est.run) { ev.preventDefault(); MAG.botonera.pulsa(est.run.pausada ? 'play' : 'pausa', true); return; }
  });
  [vA, vB].forEach(v => v.addEventListener('click', () => { if (est.run && !est.run.salto) MAG.botonera.pulsa(est.run.pausada ? 'play' : 'pausa', true); }));

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
      est.cancelado = true;
      if (est.run) est.run.acabar('salir');
      if (est.sigue) est.sigue('salir');
      est.colaVid = null; callaVideos(); fxFuera();
      [vA, vB].forEach(v => v.classList.remove('ve'));
      quitaOverlays(); $('#capaEst').innerHTML = ''; $('#subs').innerHTML = ''; $('#capaTop').innerHTML = ''; $('#fondo').classList.remove('ve');
      MAG.botonera.raiz.classList.add('bot-oculta'); $('#mandos').classList.remove('enHistoria', 'escondidos');
      $('#finBobina').hidden = true;
      MAG.mic.suelta();
      pintaBobinas(); est.modo = 'portada';
      if (MAG.ac) suenaPortada();
    } else callaPortada();
  }
  const ICO_BOB = '<svg viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="32" cy="32" r="6" fill="none" stroke="currentColor" stroke-width="3"/>' +
    [0, 120, 240].map(a => { const r = a * Math.PI / 180; const x = 32 + 17 * Math.sin(r), y = 32 - 17 * Math.cos(r); return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="7.5" fill="currentColor" opacity=".9"/>'; }).join('') + '</svg>';
  const ICO_CANDADO = '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="5" y="10.5" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  function pintaBobinas() {
    const caja = $('#pBobinas'); caja.innerHTML = '';
    const progs = progresos(), hechas = MAG.lee('hechas', []);
    [1, 2, 3].forEach(n => {
      const B = G.bobinas[n]; if (!B) return;
      const abierta = !window.MagHitos || window.MagHitos.abierto(n);
      const prog = progs[n], sigue = !!(prog && prog.paso > 0 && prog.v === G.version);
      let estado = abierta ? (sigue ? 'Continuar' : (hechas.indexOf(n) >= 0 ? 'Volver a verla' : 'Empezar')) : 'Se abre en clase';
      const b = MAG.el('button', { class: 'pBob' + (abierta ? '' : ' cerrada'), type: 'button' }, [
        MAG.el('span', { class: 'pBob-ic', html: ICO_BOB }),
        MAG.el('span', { class: 'pBob-tx' }, [MAG.el('span', { class: 'pBob-n', text: 'BOBINA ' + n }), MAG.el('span', { class: 'pBob-t', text: B.titulo }),
          MAG.el('span', { class: 'pBob-e', html: (abierta ? '' : ICO_CANDADO + ' ') + estado + (hechas.indexOf(n) >= 0 && abierta && !sigue ? ' <span class="pBob-v">✓</span>' : '') })])]);
      if (abierta) b.addEventListener('click', () => elige(n, sigue ? prog.paso : 0));
      caja.appendChild(b);
    });
  }
  /* ¿esta bobina graba con el micrófono? (las estaciones con «micro: true»: b1_grabar, b3_clase) */
  const usaMicro = n => (G.bobinas[n].pasos || []).some(p => p.t === 'e' && MAG.est[p.id] && MAG.est[p.id].micro);
  const MB = b => Math.round(b / 1e6);
  // (20-oct-2026, Iago) el progreso se guarda POR BOBINA: al volver a cualquiera de las tres, «Continuar» o «Empezar de nuevo».
  // «progreso» (la última) se sigue escribiendo igual; lo de antes de este cambio se recoge la primera vez.
  function progresos() {
    const m = MAG.lee('progresos', null) || {}, v = MAG.lee('progreso', null);
    if (v && v.bobina && !m[v.bobina] && !MAG.lee('progresosOK', false)) { m[v.bobina] = { paso: v.paso, v: v.v }; MAG.guarda('progresos', m); }
    MAG.guarda('progresosOK', true);
    return m;
  }
  function guardaProg(n, paso) { const m = progresos(); m[n] = { paso, v: G.version }; MAG.guarda('progresos', m); MAG.guarda('progreso', { bobina: n, paso, v: G.version }); }
  function borraProg(n) { const m = progresos(); delete m[n]; MAG.guarda('progresos', m); const v = MAG.lee('progreso', null); if (v && v.bobina === n) MAG.guarda('progreso', null); }
  async function elige(n, desde) {
    // (v3, nota de Iago) el permiso del micrófono, YA, con el toque en la bobina (y se suelta enseguida); mientras, se carga
    est.pm = usaMicro(n) ? MAG.mic.permiso() : null;
    let micPend = !!est.pm;
    MAG.audio(); est.modo = 'cargando'; est.c30 = calidad() === '30';
    const vista = $('#pCarga'); $('#pBobinas').hidden = true; vista.hidden = false;
    const tx = vista.querySelector('.pc-tx'), barra = vista.querySelector('.pc-barra i'), bot = vista.querySelector('.pc-bot');
    let ultTx = 'Cargando la bobina ' + n + ' · 0 %';
    const pinta = () => { tx.textContent = (micPend ? 'Dale permiso al micrófono (arriba, junto a la dirección) mientras se carga la bobina ' + n + '. ' : '') + ultTx; };
    bot.innerHTML = ''; bot.classList.remove('tres'); pinta(); barra.style.width = '0%';
    if (est.pm) est.pm.then(() => { micPend = false; pinta(); }, () => { micPend = false; pinta(); });
    // (20-oct-2026, Iago) el sorteo del voluntario aprovecha la PANTALLA DE CARGA: con la cuenta Protester y en hora de clase,
    // «Seleccionar voluntario» sale ya mientras se carga (tras contestar al permiso del micro, si se pidió). Alumnos, en casa
    // o fuera de hora: no sale nada y la carga es la de siempre. La bobina no empieza hasta que se ha cerrado.
    let sorteo = Promise.resolve(false);
    try { if (window.LMVoluntarios && typeof window.LMVoluntarios.ofrece === 'function') sorteo = Promise.resolve(window.LMVoluntarios.ofrece({ tras: est.pm || null, dia: n })).catch(() => false); } catch (e) {}
    const volver = MAG.ui.boton('', { clase: 'mbtn-sec pc-volver', icono: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>', titulo: 'Volver' });
    let anulado = false, tecla = null;
    volver.addEventListener('click', () => { anulado = true; if (tecla) window.removeEventListener('keydown', tecla, true); vista.hidden = true; $('#pBobinas').hidden = false; est.modo = 'portada'; });
    bot.appendChild(volver);
    est.bobina = n; est.pasos = pasosDe(n);
    const { L, pesos, trozos } = recursosDe(n);
    // fuera de la memoria, los vídeos de las otras bobinas (y los de la otra calidad); los <video> los sueltan antes
    const mios = new Set(L);
    [vA, vB].forEach(v => { if (v.dataset.ruta && !mios.has(v.dataset.ruta)) { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {} delete v.dataset.ruta; } });
    Object.keys(MAG.R).forEach(r => { if (/^(r3?|v7?|p)\//.test(r) && !mios.has(r)) suelta(r); });
    const fallos = await MAG.cargaTodo(L, (f, hecho, tot) => {
      const p = Math.round(f * 100); ultTx = 'Cargando la bobina ' + n + ' · ' + p + ' %' + (tot > 2e6 ? ' · ' + MB(hecho) + ' de ' + MB(tot) + ' MB' : '');
      pinta(); barra.style.width = p + '%';
    }, pesos, trozos);
    if (anulado) return;
    if (fallos.length) console.warn('[MAG] no se pudo cargar', fallos);
    ultTx = (desde ? 'La bobina ' + n + ' está lista: ¿sigues donde la dejaste o empiezas de nuevo?' : 'La bobina ' + n + ' está lista.') + (fallos.length ? ' (Falta algún archivo: puede saltarse algo.)' : '');
    pinta();
    barra.style.width = '100%';
    // (20-oct-2026, Iago) si esta bobina tiene algo hecho: «Continuar» (donde se dejó) o «Empezar de nuevo» (desde el principio)
    const emp = MAG.ui.boton(desde ? 'Continuar' : 'Empezar la bobina ' + n, { clase: 'mbtn-prin', icono: MAG.ICO.play });
    bot.insertBefore(emp, volver);
    let deNuevo = null;
    if (desde) {
      deNuevo = MAG.ui.boton('Empezar de nuevo', { clase: 'mbtn-sec', icono: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 12a7 7 0 1 0 2.05-4.95M5 4.5v4h4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' });
      bot.insertBefore(deNuevo, volver);
      bot.classList.add('tres');
      deNuevo.addEventListener('click', () => { desde = 0; borraProg(n); arranca(); });
    }
    const arranca = () => {
      window.removeEventListener('keydown', tecla, true); emp.disabled = true; if (deNuevo) deNuevo.disabled = true;
      // con el toque: los dos vídeos quedan «desbloqueados» para sonar (Safari) y conectados a Web Audio
      try {
        const p1 = est.pasos.slice(desde || 0).find(q => q.t === 'v'), X0 = p1 && vidDe(n, p1.run);
        if (X0 && listo(rutaDe(X0))) {
          const tok = {}; est.desbloqueo = tok;
          [vA, vB].forEach(v => {
            conecta(v); volVid(v, 0, 0.001);
            if (!v.getAttribute('src')) { v.dataset.ruta = rutaDe(X0); v.src = MAG.url(rutaDe(X0)); }
            const pr = v.play();
            if (pr) pr.then(() => { if (!(est.run && est.run.el === v)) { v.pause(); if (est.desbloqueo === tok) volVid(v, 1, 0.01); } }).catch(() => {});
          });
        }
      } catch (e) {}
      // (18-oct, V3 de Iago) con la cuenta Protester y en hora de clase, «Seleccionar voluntario» en el medio (tras el permiso del
      // micro, si se pidió); la bobina empieza al cerrarlo (o con «Ahora no»). Sin seleccionador (alumnos, o fuera de hora), empieza ya.
      // (20-oct) el sorteo ya salió durante la carga: si sigue abierto, la bobina empieza al cerrarlo
      let ya = false; const sigue = () => { if (ya || anulado) return; ya = true; vista.hidden = true; $('#pBobinas').hidden = false; corre(n, desde); };
      sorteo.then(sigue, sigue);
    };
    tecla = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); arranca(); } };
    window.addEventListener('keydown', tecla, true);
    emp.addEventListener('click', arranca);
  }
  function finBobina(n) {
    const hechas = MAG.lee('hechas', []); if (hechas.indexOf(n) < 0) { hechas.push(n); MAG.guarda('hechas', hechas); }
    borraProg(n);
    paraColaVid(); MAG.mic.suelta();
    est.modo = 'fin'; MAG.botonera.enclava(null); MAG.botonera.reposo('FIN'); MAG.botonera.usables([]);
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
    // (v3) 60 / 30: la versión ligera, por si un ordenador va justo (vale desde la próxima bobina que cargues). El id sigue siendo
    // «bCalidad» (el seleccionador de voluntarios pone su botón delante de él)
    const cal = MAG.el('button', { class: 'mnd txt', id: 'bCalidad', type: 'button', title: '60 fotogramas (normal) · 30: versión ligera, por si va a tirones (vale desde la próxima bobina que cargues)' });
    const pinta = () => { cal.textContent = calidad(); };
    cal.addEventListener('click', () => { MAG.guarda('calidad', calidad() === '30' ? '60' : '30'); pinta(); });
    pinta(); if (!hay30()) cal.hidden = true;
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
  UI_SON.forEach(r => MAG.trae(r).catch(() => {}));
  const primerToque = () => { window.removeEventListener('pointerdown', primerToque, true); window.removeEventListener('keydown', primerToque, true); MAG.audio(); if (est.modo === 'portada') { const t = setInterval(() => { if (MAG.R['a/portada_musica.mp3']) { clearInterval(t); if (est.modo === 'portada') suenaPortada(); } }, 200); } };
  window.addEventListener('pointerdown', primerToque, true); window.addEventListener('keydown', primerToque, true);
  // desde el aviso de la campana («&dia=N»): esa bobina, directamente
  try { const ir = window.MagHitos ? window.MagHitos.ir() : 0; if (ir && G.bobinas[ir] && (!window.MagHitos || window.MagHitos.abierto(ir))) setTimeout(() => elige(ir, 0), 300); } catch (e) {}
  window.__mag = est;
})();
