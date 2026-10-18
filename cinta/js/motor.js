/* Magnetófono · versión interactiva (prueba) · EL MOTOR (Claude para Iago, 18-oct-2026)
   La portada, la carga de cada bobina, los tramos de vídeo, las estaciones entre tramo y tramo, la botonera del magnetófono
   (◀◀ ▶ ‖ ▶▶ ●), «Seguir con la historia» después de cada libreta, «Salir» y «Continuar», y lo especial de la bobina 3:
   la emisión suena con la pieza del alumno (filtro de radio) y su título sale en pantalla y en la etiqueta de la bobina.
   v2 (18-oct, con las notas de Iago de esa mañana):
   · N4 / N24 · el SONIDO de cada tramo seguido (de una estación a la siguiente, aunque el vídeo vaya en varias partes y aunque
     pase del prólogo a la bobina 1) es UNA pista continua (cinta/p/*.m4a) que manda el reloj. Los vídeos van MUDOS y la siguen
     (cambian de parte a su hora y corrigen la deriva con la velocidad), así que la música ya no se corta al cambiar de locutor
     ni de plano.
   · N2b / N3 · ◀◀ y ▶▶ van por HITOS (cada frase o cada plano), con la cinta corriendo en pantalla y su sonido. ◀◀ al principio
     de un tramo vuelve a la estación de antes (o al final del tramo anterior).
   · N12 · tras la libreta, la música SIGUE (la «cola», en bucle) hasta «Seguir con la historia» (o ▶).
   · N2 / N7 / N8 · la botonera siempre a la vista (comun.js); ▶ hundida mientras suena; las teclas que no sirven, apagadas.
   · N6 · los mandos de arriba a la derecha se esconden mientras corre el vídeo (vuelven al mover el ratón o en pausa).
   · N17 · el permiso del micrófono se pide al empezar la bobina que lo usa.
   · N29 · ir a un sitio del mapa: todo cambia en el mismo fotograma (ctx.video con alMostrar).
   Reglas: nada de fundidos de imagen (todo cambia de golpe), carga ligera (lo justo para empezar y el resto por detrás, siempre
   por delante de lo que se ve), nada de animaciones de interfaz en bucle. */
(function () {
  'use strict';
  const MAG = window.MAG, $ = MAG.$;
  const G = MAG.GUION;
  const PROFE = () => !!MAG.lee('profe', false);
  const est = { modo: 'portada', bobina: 0, paso: 0, pasos: [], vid: null, otro: null, enEst: null, sigue: null, run: null, desdeT: 0 };
  MAG.motor = est;
  const vA = $('#vA'), vB = $('#vB');
  [vA, vB].forEach(v => { v.muted = true; v.defaultMuted = true; v.setAttribute('muted', ''); v.playsInline = true; v.preload = 'auto'; v.disablePictureInPicture = true; });
  // la cinta corriendo (◀◀ ▶▶): una capa encima del vídeo
  const fxC = MAG.el('div', { id: 'fxCinta' }, [MAG.el('i')]);
  $('#escenario').insertBefore(fxC, $('#capaOver'));

  // ───────────────── la PISTA: un solo <audio> para toda la sesión, por Web Audio ─────────────────
  /* Uno solo: en Safari, el primero que suena con un toque queda «desbloqueado» para los demás tramos. */
  const pista = new Audio(); pista.preload = 'auto';
  let pistaG = null, pistaRuta = '';
  function conectaPista() {
    if (pistaG) return;
    try { const a = MAG.audio(); const s = a.createMediaElementSource(pista); pistaG = a.createGain(); s.connect(pistaG); pistaG.connect(MAG.master); }
    catch (e) { console.warn('[MAG] la pista suena sin Web Audio', e); pistaG = { gain: null }; }
  }
  function volPista(v, t) {
    if (pistaG && pistaG.gain) { const a = MAG.audio(), n = a.currentTime; pistaG.gain.cancelScheduledValues(n); pistaG.gain.setValueAtTime(pistaG.gain.value, n); pistaG.gain.linearRampToValueAtTime(v, n + (t || 0.01)); }
    else { try { pista.volume = Math.max(0, Math.min(1, v)); } catch (e) {} }
  }
  function cargaPista(ruta) {
    return new Promise(ok => {
      if (pistaRuta === ruta && pista.readyState >= 1) { ok(true); return; }
      pistaRuta = ruta; let hecho = false;
      const fin = (b) => { if (hecho) return; hecho = true; pista.removeEventListener('loadedmetadata', si); pista.removeEventListener('error', no); ok(b); };
      const si = () => fin(true), no = () => fin(false);
      pista.addEventListener('loadedmetadata', si); pista.addEventListener('error', no);
      pista.src = MAG.url(ruta); pista.load();
      setTimeout(() => fin(pista.readyState >= 1), 8000);
    });
  }
  function buscaPista(t) {
    return new Promise(ok => {
      if (Math.abs(pista.currentTime - t) < 0.01) { ok(); return; }
      let h = false; const f = () => { if (h) return; h = true; pista.removeEventListener('seeked', f); ok(); };
      pista.addEventListener('seeked', f); try { pista.currentTime = t; } catch (e) { f(); } setTimeout(f, 2000);
    });
  }
  const paraPista = () => { try { pista.pause(); } catch (e) {} };

  // ───────────────── los pasos de una bobina (cada tramo, en sus partes) ─────────────────
  function pasosDe(n) {
    const B = G.bobinas[n], out = [];
    B.pasos.forEach(p => {
      if (p.t === 'v') {
        let rt = p.rt0 || 0;
        p.partes.forEach((q, i) => {
          out.push({ t: 'v', id: p.id, parte: i, nPartes: p.partes.length, f: q.f, dur: q.dur, bytes: q.bytes, b7: q.b7, nombre: p.nombre,
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
  const es720 = () => MAG.lee('calidad', '1080') === '720' && !!G.v7;
  /* la calidad se fija al cargar cada bobina (lo precargado es lo que se ve); el botón vale para la próxima carga */
  function rutaVideo(f) { return (est.c720 == null ? es720() : est.c720) ? f.replace(/^v\//, 'v7/') : f; }
  const peso = q => ((est.c720 == null ? es720() : est.c720) && q.b7) || q.bytes || 3e6;
  const UI_SON = ['a/ui_tecla.mp3', 'a/ui_rebobina.mp3', 'a/ui_avanza.mp3'];
  /* lo que hay que tener ANTES de empezar: lo de todas las estaciones (imágenes y sonidos: pocos MB), los sitios del mapa y los
     primeros tramos con sus pistas (unos 20 MB desde donde se empieza). El resto se va cargando por detrás, siempre por delante
     de lo que se ve (rueda). */
  const PRIMERO = 20e6, DELANTE = 70e6, DETRAS = 3;
  function porTraer(n, P) {               // en orden: la pista (y su cola) de cada tramo seguido, y luego sus partes de vídeo
    const L = [], vistos = {};
    P.forEach(p => {
      if (p.t !== 'v') return;
      if (p.run && !vistos[p.run]) {
        vistos[p.run] = 1; const R = (G.bobinas[n].runs || {})[p.run];
        if (R && R.f) { L.push({ i: p.i, r: R.f, b: R.bytes || 2e6 }); if (R.cola) L.push({ i: p.i, r: R.cola.f, b: R.cola.bytes || 1e6 }); }
      }
      L.push({ i: p.i, r: rutaVideo(p.f), b: peso(p) });
    });
    return L;
  }
  function recursosDe(n, desde) {
    const B = G.bobinas[n], L = [], pesos = {}, P = pasosDe(n);
    P.forEach(p => { if (p.t === 'v' && p.pieza) L.push('a/b3_pieza_ejemplo.mp3'); });
    Object.values(B.lugares || {}).forEach(l => {
      const R = l.run && B.runs ? B.runs[l.run] : null; if (R && R.f) { L.push(R.f); pesos[R.f] = R.bytes || 4e5; }
      l.partes.forEach(q => { const r = rutaVideo(q.f); L.push(r); pesos[r] = peso(q); });
    });
    B.pasos.filter(p => p.t === 'e').forEach(p => {
      const d = MAG.est[p.id]; if (!d) return;
      let r = d.recursos || []; if (typeof r === 'function') { try { r = r(); } catch (e) { r = []; } }
      r.forEach(x => { L.push(x); pesos[x] = pesos[x] || (/\.(jpe?g|png|webp)$/i.test(x) ? 260000 : 120000); });
      if (d.fondo) { L.push(d.fondo); pesos[d.fondo] = 260000; }
    });
    UI_SON.forEach(x => L.push(x));
    desde = desde || 0;
    // si se continúa en una estación, el tramo de antes (su último fotograma es el fondo)
    if (P[desde] && P[desde].t === 'e') { const ant = P.slice(0, desde).reverse().find(q => q.t === 'v'); if (ant) { const r = rutaVideo(ant.f); L.push(r); pesos[r] = peso(ant); } }
    let ac = 0;
    for (const x of porTraer(n, P).filter(x => x.i >= desde)) { if (ac >= PRIMERO) break; L.push(x.r); pesos[x.r] = x.b; ac += x.b; }
    // si se empieza a mitad de un tramo seguido: su pista
    if (P[desde] && P[desde].t === 'v' && P[desde].run) { const R = (B.runs || {})[P[desde].run]; if (R && R.f) { L.push(R.f); pesos[R.f] = R.bytes || 2e6; } }
    return { L: Array.from(new Set(L)), pesos };
  }
  // ── la rueda: una cosa cada vez, en orden, hasta ~70 MB por delante; y suelta (de la memoria) los vídeos que quedan atrás ──
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
      const L = porTraer(n, est.pasos);
      const k = L.findIndex(v => v.i >= est.paso);
      L.forEach((v, j) => { if (k >= 0 && j < k - DETRAS * 2 && /^v7?\//.test(v.r) && L.slice(j + 1).every(w => w.r !== v.r)) suelta(v.r); });
      let delante = 0, sig = null;
      for (let j = Math.max(0, k); j < L.length && k >= 0; j++) { if (listo(L[j].r)) delante += L[j].b; else { sig = L[j]; break; } }
      if (sig && delante < DELANTE) { const ok = await trae(sig.r); if (!ok) await MAG.espera(4000); }
      else await MAG.espera(1500);
    }
  }
  /* algo que hace falta YA (si aún no está: «CARGANDO» en la ventanita, sin más) */
  async function asegura(r) {
    if (listo(r)) return true;
    MAG.botonera.rotulo('CARGANDO');
    const ok = await trae(r);
    MAG.botonera.rotulo('');
    return ok;
  }

  // ───────────────── los dos vídeos (mudos: el sonido es la pista) ─────────────────
  function prepara(el, ruta) {
    return new Promise(ok => {
      const url = MAG.url(ruta);
      if (el.dataset.ruta === ruta && el.readyState >= 2) { try { el.pause(); } catch (e) {} ok(); return; }
      el.dataset.ruta = ruta; el.dataset.listo = '';
      let hecho = false; const fin = () => { if (hecho) return; hecho = true; el.removeEventListener('loadeddata', fin); el.removeEventListener('error', fin); ok(); };
      el.addEventListener('loadeddata', fin); el.addEventListener('error', fin);
      el.src = url; el.load();
      setTimeout(fin, 6000);
    });
  }
  function buscaVid(el, t) {
    return new Promise(ok => {
      if (Math.abs(el.currentTime - t) < 0.02) { ok(); return; }
      let h = false; const f = () => { if (h) return; h = true; el.removeEventListener('seeked', f); ok(); };
      el.addEventListener('seeked', f); try { el.currentTime = t; } catch (e) { f(); } setTimeout(f, 2000);
    });
  }
  function muestra(el) { [vA, vB].forEach(v => v.classList.toggle('ve', v === el)); est.vid = el; est.otro = elOtro(el); }
  function elOtro(el) { return el === vA ? vB : vA; }
  const visible = () => [vA, vB].find(v => v.classList.contains('ve')) || null;
  function ultimoFotograma(el) { try { el.pause(); if (el.duration && el.currentTime < el.duration - 0.06) el.currentTime = Math.max(0, el.duration - 0.04); } catch (e) {} }

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

  // ───────────────── UN TRAMO SEGUIDO: la pista manda y los vídeos (mudos) la siguen ─────────────────
  /* o: { R (la pista: f, dur, hitos, cola), partes: [{ f, dur, rt0, i?, pieza?, titulo?, etiqueta? }], desde (s del tramo seguido),
          lugar (un sitio del mapa), alMostrar (al enseñar el primer fotograma) }
     Resuelve: 'fin' (llegó al final o ▶▶ hasta el final), 'atras' (◀◀ antes de su principio), 'salir', 'error'. */
  function corrida(o) {
    return new Promise(resuelve => {
      const R = o.R, P = o.partes;
      const fin = P.length ? P[P.length - 1].rt0 + P[P.length - 1].dur : 0;
      const run = { R, P, fin, k: -1, el: null, pausada: false, salto: false, objetivo: null, dir: 0, vivo: true, lugar: !!o.lugar, ov: null, sig: null };
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
      const reloj = () => run.maestro === 'pista' ? pista.currentTime : ((run.el ? run.el.currentTime : 0) + (run.k >= 0 ? P[run.k].rt0 : 0));
      const parteEn = T => { let k = 0; for (let j = 0; j < P.length; j++) if (P[j].rt0 <= T + 1e-4) k = j; return k; };
      const anota = () => { const q = P[run.k]; if (q && q.i != null) { est.paso = q.i; MAG.guarda('progreso', { bobina: est.bobina, paso: est.paso, v: G.version }); } };

      /* pone la parte k en el elemento que no se ve, en el segundo «off», y lo deja listo (sin enseñarlo) */
      async function enParte(k, off) {
        const q = P[k], ruta = rutaVideo(q.f);
        if (!listo(ruta)) { await asegura(ruta); if (!run.vivo) return null; }
        const vis = visible();
        let el = (run.sig && run.sig.k === k && run.sig.el !== vis) ? run.sig.el : (vis === vA ? vB : vA);
        if (vis === el) el = elOtro(el);
        await prepara(el, ruta);
        if (!run.vivo) return null;
        if (off > 0.03) await buscaVid(el, Math.min(off, Math.max(0, (el.duration || q.dur) - 0.05)));
        else if (el.currentTime > 0.03) await buscaVid(el, 0);
        el.muted = run.maestro !== 'video';
        return el;
      }
      function enseña(k, el) {
        const ant = run.el;
        run.k = k; run.el = el; muestra(el);
        if (ant && ant !== el) { try { ant.pause(); } catch (e) {} ant.muted = true; }
        if (o.alMostrar) { const f = o.alMostrar; o.alMostrar = null; try { f(); } catch (e) { console.error(e); } }
        montaOverlays(P[k], run);
        anota();
        run.sig = null;
      }
      function suena() {
        if (!run.vivo || run.pausada || run.salto) return;
        if (run.maestro === 'pista') { est.desbloqueo = null; volPista(1, 0.02); pista.play().catch(e => { if (e && e.name === 'NotAllowedError') { console.warn('[MAG] play', e); muestraPlayManual(); } }); }
        if (run.el) { run.el.play().catch(e => { if (run.maestro === 'video' && e && e.name === 'NotAllowedError') { console.warn('[MAG] play', e); muestraPlayManual(); } }); }
        if (run.ov) run.ov.sonar();
        MAG.botonera.enclava('play'); MAG.botonera.rotulo(''); mandos();
      }
      function calla() {
        if (run.maestro === 'pista') paraPista();
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
        if (obj >= fin - 0.05) { if (run.el) ultimoFotograma(run.el); acaba('fin'); return; }
        const k = parteEn(obj);
        const el = await enParte(k, obj - P[k].rt0);
        if (!run.vivo || !el) return;
        if (run.maestro === 'pista') await buscaPista(obj);
        if (!run.vivo) return;
        if (run.objetivo !== obj) return;                     // otra pulsación mientras tanto: ya vendrá su termina()
        enseña(k, el);
        fxFuera(); run.salto = false; run.objetivo = null; run.pausada = false;
        suena();
      }

      // el reloj: cada fotograma
      function paso() {
        if (!run.vivo) return;
        run.raf = requestAnimationFrame(paso);
        mandos();
        if (run.pausada || run.salto || run.cambiando) return;
        const T = reloj(), k = run.k, q = P[k], el = run.el;
        if (run.maestro === 'pista' && (T >= fin - 0.025 || pista.ended)) { if (el) ultimoFotograma(el); acaba('fin'); return; }
        if (run.maestro === 'video' && k === P.length - 1 && el && el.ended) { acaba('fin'); return; }
        // la parte siguiente, a su hora (con la pista) o al acabar la anterior (sin pista)
        if (k + 1 < P.length && (run.maestro === 'pista' ? T >= P[k + 1].rt0 : (el && el.ended))) {
          if (run.sig && run.sig.k === k + 1 && run.sig.listo) {
            const e2 = run.sig.el; enseña(k + 1, e2);
            if (run.maestro === 'video') e2.muted = false;
            e2.play().catch(() => {});
            if (run.ov) run.ov.sonar();
          } else {                                             // aún no está preparada: se espera (CARGANDO) con todo parado
            run.cambiando = true; calla();
            enParte(k + 1, Math.max(0, T - P[k + 1].rt0)).then(e2 => {
              run.cambiando = false; if (!run.vivo || !e2) return;
              enseña(k + 1, e2); if (!run.pausada && !run.salto) suena();
            });
          }
          return;
        }
        // preparar la siguiente en el otro elemento, en cuanto esté cargada
        if (k + 1 < P.length && !run.sig && listo(rutaVideo(P[k + 1].f))) {
          const e2 = elOtro(el); const sg = { k: k + 1, el: e2, listo: false }; run.sig = sg;
          prepara(e2, rutaVideo(P[k + 1].f)).then(() => { if (run.sig === sg && e2.currentTime > 0.03) return buscaVid(e2, 0); }).then(() => { if (run.sig === sg) { e2.muted = run.maestro !== 'video'; sg.listo = true; } });
        }
        // la deriva: el vídeo sigue a la pista
        if (run.maestro === 'pista' && el && !el.seeking) {
          const exp = T - q.rt0, d = el.currentTime - exp, dur = el.duration || q.dur;
          if (exp < dur - 0.04) {
            if (Math.abs(d) > 0.3) { try { el.currentTime = Math.max(0, exp); } catch (e) {} }
            else { const r = Math.max(0.94, Math.min(1.06, 1 - d * 0.6)); if (Math.abs(el.playbackRate - r) > 0.004) el.playbackRate = r; }
            if (el.paused && !pista.paused) el.play().catch(() => {});
          }
        }
        if (run.ov) run.ov.mira(T - q.rt0);
      }

      // arranque
      (async () => {
        run.maestro = (R && R.f) ? 'pista' : 'video';
        if (run.maestro === 'pista') {
          const ok = (await asegura(R.f)) && (await cargaPista(R.f));
          if (!run.vivo) return;
          if (!ok) { console.warn('[MAG] sin pista, con el sonido de cada vídeo', R.f); run.maestro = 'video'; }
        }
        const T0 = Math.max(0, Math.min(o.desde || 0, Math.max(0, fin - 0.1)));
        const k = parteEn(T0);
        const el = await enParte(k, T0 - P[k].rt0);
        if (!run.vivo || !el) { if (!el) acaba('error'); return; }
        if (run.maestro === 'pista') { conectaPista(); await buscaPista(T0); }
        if (!run.vivo) return;
        enseña(k, el);
        if (run.maestro === 'video') el.muted = false;
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
  /* run.ov = { sonar(), parar(), mira(t) }: la pieza suena por Web Audio a la hora de la pista; el título y la etiqueta, por t
     (segundos desde el principio de esa parte) */
  function montaOverlays(q, run) {
    quitaOverlays();
    const ov = { piezas: [], sonar() {}, parar() {}, mira() {} };
    run.ov = ov;
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
        const a = MAG.audio(), t = run.maestro === 'pista' ? pista.currentTime - q.rt0 : (run.el ? run.el.currentTime : 0);
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
        if (run.vivo && !run.pausada && !run.salto) programa();
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
    if (q.ruidos) montaRuidos(q, run, ov, vistas);
    if (vistas.length) ov.mira = (t) => vistas.forEach(v => { const h = !(t >= v.t0 && t < v.t1); if (v.c.hidden !== h) v.c.hidden = h; if (!h && v.pinta) v.pinta(t); });
  }
  /* (18-oct, N37 de Iago) «la mesa de montaje»: Odile escucha los cuatro ruidos de TU clase, uno tras otro. El sonido del tramo
     (limpio) no los trae: aquí suenan los de la clase (MAG.b3.sonidosClase(); si no hay, los de ejemplo) a su hora de la pista, y
     encima del panel del vídeo va el mismo panel con SUS nombres y su onda, que se dibuja mientras suena (como en la animática:
     panel_lanes de b3v35.py, en (90, 100), 1120 × 734, un carril cada 156 px, 290 px por segundo).
     q.ruidos = { t: [4], d: [4], panel: [t0, t1] } (segundos desde el principio de esta parte). */
  const RUIDOS_EJ = [['LÁPIZ', 'a/b3_ej_lapiz.mp3'], ['SILLA', 'a/b3_ej_silla.mp3'], ['LIBRO', 'a/b3_ej_libro.mp3'], ['CREMALLERA', 'a/b3_ej_cremallera.mp3']];
  function montaRuidos(q, run, ov, vistas) {
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
      const a = MAG.audio(), now = run.maestro === 'pista' ? pista.currentTime - q.rt0 : (run.el ? run.el.currentTime : 0);
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
      o.ult = -1; if (run.vivo && !run.pausada && !run.salto) programa();
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
    paraPista();
    MAG.botonera.enclava(null); MAG.botonera.rotulo(''); MAG.botonera.reposo('AHORA TÚ'); MAG.botonera.usables(tecDefecto());
    if (est.vid) { try { est.vid.pause(); } catch (e) {} }
    const fondo = $('#fondo');
    if (def.fondo) { fondo.src = MAG.url(def.fondo); fondo.classList.add('ve'); }
    const raiz = $('#capaEst'); raiz.innerHTML = '';
    const ctx = MAG.contexto(raiz, { profe: PROFE(), bobina: est.bobina });
    est.enEst = ctx;
    // la siguiente parte de vídeo, ya preparada mientras tanto
    const sig = siguienteVideo(); if (sig && listo(rutaVideo(sig.f))) { const otro = est.vid ? elOtro(est.vid) : vA; prepara(otro, rutaVideo(sig.f)); }
    let r = 'fin';
    try {
      r = await Promise.race([def.monta(ctx).then(() => 'fin'), new Promise(ok => { est.sigue = ok; })]);
    } catch (e) { console.error('[MAG] estación', p.id, e); r = 'error'; }
    est.sigue = null; ctx.limpia(); est.enEst = null;
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
    const ficha = {}; est.rueda = ficha; rueda(n, ficha);
    MAG.videoHook = videoPorId;
    portada(false); $('#mandos').classList.add('enHistoria');
    MAG.botonera.raiz.classList.remove('bot-oculta'); MAG.botonera.reposo('PLAY');
    // si se continúa a mitad (en una estación), se enseña el último fotograma del tramo de antes
    if (est.paso > 0 && est.pasos[est.paso].t === 'e') {
      const ant = est.pasos.slice(0, est.paso).reverse().find(q => q.t === 'v');
      if (ant) { const el = vA; await asegura(rutaVideo(ant.f)); await prepara(el, rutaVideo(ant.f)); try { el.currentTime = Math.max(0, el.duration - 0.05); } catch (e) {} muestra(el); }
    }
    while (est.paso < est.pasos.length && !est.cancelado) {
      const p = est.pasos[est.paso];
      MAG.guarda('progreso', { bobina: n, paso: est.paso, v: G.version });
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
        const r = await corrida({ R: runDe(p.run), partes: Ps, desde: desdeT });
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
        } else paraPista();
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
    return new Promise(ok => {
      const pr = MAG.ui.seguir($('#capaTop'), 'Seguir con la historia');
      const sal = (m) => { est.sigue = null; pr.cancela(); paraCola(cola); est.modo = 'historia'; ok(m); };
      est.sigue = (m) => { if (m === 'atras') aUltimoHito(runId); sal(m || 'salto'); };
      pr.then(() => sal('fin'));
    });
  }
  async function empiezaCola(R) {
    if (!R || !R.cola) { paraPista(); return null; }
    let buf = null;
    try { buf = await trae(R.cola.f).then(() => MAG.decodifica(R.cola.f)); } catch (e) { buf = null; }
    if (!buf) { paraPista(); return null; }
    const a = MAG.audio(), t = a.currentTime;
    const off = Math.max(0, Math.min(buf.duration - 0.2, pista.paused ? 0 : pista.currentTime - (R.finPartes || 0)));
    const s = a.createBufferSource(); s.buffer = buf; s.loop = true;
    if (R.cola.bucle) { s.loopStart = R.cola.bucle[0]; s.loopEnd = R.cola.bucle[1]; }
    const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + 0.2);
    s.connect(g); g.connect(MAG.master); s.start(t, off);
    // la pista (que ya suena con el principio de la cola) se va en esos mismos 0,2 s
    volPista(0, 0.2); setTimeout(() => { paraPista(); volPista(1, 0.01); }, 260);
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
    await corrida({ R: l.run && B.runs ? B.runs[l.run] : null, partes: P, desde: 0, lugar: true, alMostrar: op.alMostrar });
    paraPista();
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
      paraPista(); fxFuera();
      [vA, vB].forEach(v => { try { v.pause(); } catch (e) {} v.classList.remove('ve'); });
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
  /* ¿esta bobina graba con el micrófono? (las estaciones con «micro: true»: b1_grabar, b3_clase) */
  const usaMicro = n => (G.bobinas[n].pasos || []).some(p => p.t === 'e' && MAG.est[p.id] && MAG.est[p.id].micro);
  async function elige(n, desde) {
    MAG.audio(); est.modo = 'cargando'; est.c720 = es720();
    const vista = $('#pCarga'); $('#pBobinas').hidden = true; vista.hidden = false;
    const tx = vista.querySelector('.pc-tx'), barra = vista.querySelector('.pc-barra i'), bot = vista.querySelector('.pc-bot');
    bot.innerHTML = ''; tx.textContent = 'Cargando la bobina ' + n + ' · 0 %'; barra.style.width = '0%';
    const volver = MAG.ui.boton('', { clase: 'mbtn-sec pc-volver', icono: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>', titulo: 'Volver' });
    let anulado = false, tecla = null;
    volver.addEventListener('click', () => { anulado = true; if (tecla) window.removeEventListener('keydown', tecla, true); vista.hidden = true; $('#pBobinas').hidden = false; est.modo = 'portada'; });
    bot.appendChild(volver);
    est.bobina = n; est.pasos = pasosDe(n);
    const { L, pesos } = recursosDe(n, desde);
    const mios = new Set(porTraer(n, est.pasos).map(x => x.r).concat(L));
    Object.keys(MAG.R).forEach(r => { if (/^(v7?|p)\//.test(r) && !mios.has(r)) suelta(r); });
    const fallos = await MAG.cargaTodo(L, f => { const p = Math.round(f * 100); tx.textContent = 'Cargando la bobina ' + n + ' · ' + p + ' %'; barra.style.width = p + '%'; }, pesos);
    if (anulado) return;
    if (fallos.length) console.warn('[MAG] no se pudo cargar', fallos);
    const micro = usaMicro(n);
    tx.textContent = (desde ? 'La bobina ' + n + ' está lista: sigue donde la dejaste.' : 'La bobina ' + n + ' está lista.') + (micro ? ' Te pedirá el micrófono: dale permiso.' : '');
    barra.style.width = '100%';
    const emp = MAG.ui.boton(desde ? 'Continuar la bobina ' + n : 'Empezar la bobina ' + n, { clase: 'mbtn-prin', icono: MAG.ICO.play });
    bot.insertBefore(emp, volver);
    const arranca = () => {
      window.removeEventListener('keydown', tecla, true); vista.hidden = true; $('#pBobinas').hidden = false;
      // con el toque: la pista queda «desbloqueada» (Safari) y se pide el micro (una vez, para toda la bobina)
      try {
        conectaPista(); const R0 = est.pasos[desde || 0] && runDe(est.pasos[desde || 0].run);
        if (R0 && R0.f && listo(R0.f)) {
          const tok = {}; est.desbloqueo = tok; volPista(0, 0.001); pistaRuta = R0.f; pista.src = MAG.url(R0.f);
          const pr = pista.play(); if (pr) pr.then(() => { if (est.desbloqueo === tok) { pista.pause(); volPista(1, 0.01); } }).catch(() => {});
        }
      } catch (e) {}
      const pm = micro ? MAG.mic.abre() : null;
      // (18-oct, V3 de Iago) con la cuenta Protester y en hora de clase, tras el micro, «Seleccionar voluntario» en el medio;
      // la bobina empieza al cerrarlo (o con «Ahora no»). Sin seleccionador (alumnos, o fuera de hora), empieza ya.
      let ya = false; const sigue = () => { if (ya) return; ya = true; corre(n, desde); };
      try { if (window.LMVoluntarios && typeof window.LMVoluntarios.ofrece === 'function') { window.LMVoluntarios.ofrece({ tras: pm, dia: n }).then(sigue, sigue); return; } } catch (e) {}
      sigue();
    };
    tecla = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); arranca(); } };
    window.addEventListener('keydown', tecla, true);
    emp.addEventListener('click', arranca);
  }
  function finBobina(n) {
    const hechas = MAG.lee('hechas', []); if (hechas.indexOf(n) < 0) { hechas.push(n); MAG.guarda('hechas', hechas); }
    MAG.guarda('progreso', null);
    paraPista(); MAG.mic.suelta();
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
  UI_SON.forEach(r => MAG.trae(r).catch(() => {}));
  const primerToque = () => { window.removeEventListener('pointerdown', primerToque, true); window.removeEventListener('keydown', primerToque, true); MAG.audio(); if (est.modo === 'portada') { const t = setInterval(() => { if (MAG.R['a/portada_musica.mp3']) { clearInterval(t); if (est.modo === 'portada') suenaPortada(); } }, 200); } };
  window.addEventListener('pointerdown', primerToque, true); window.addEventListener('keydown', primerToque, true);
  // desde el aviso de la campana («&dia=N»): esa bobina, directamente
  try { const ir = window.MagHitos ? window.MagHitos.ir() : 0; if (ir && G.bobinas[ir] && (!window.MagHitos || window.MagHitos.abierto(ir))) setTimeout(() => elige(ir, 0), 300); } catch (e) {}
  window.__mag = est;
  est._pista = pista;                                                     // (para las pruebas)
})();
