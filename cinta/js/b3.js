/* Magnetófono · versión interactiva · LAS ESTACIONES DE LA BOBINA 3 (Claude para Iago, 18-oct-2026, madrugada)
   b3_clase · b3_repaso · b3_fonogeno · b3_titulo   (la de montar la pieza, b3p_*, es aparte)
   Todo en el sistema del vídeo (1920×1080) y con los dibujos de la animática (b3v33.py): mismos fondos, mismas poses en el mismo
   sitio, la misma cuenta atrás y la misma tarjeta del título, para que el paso del vídeo a la estación no se note. Nada de
   fundidos: los cambios, de golpe. Se juegan con ratón o dedo y con teclado, y la de micro sigue sin micro (ruidos de ejemplo).
   Lo que guardan: MAG.datos.clase = [{ id, nombre, tipo, clave, ruta }] (los cuatro ruidos; el audio, en IndexedDB `clave`, o
   el fichero de ejemplo `ruta`), MAG.datos.titulo; en esta sesión, MAG.b3.mem[id] = AudioBuffer.
   Para otras estaciones (la pieza): `await MAG.b3.sonidosClase()` → [{ id, nombre, tipo, buf }] y
   `await MAG.b3.sonidosBobina()` → los de París (MAG.datos.paris) y los de la clase, con su buffer.
   Los recursos se rehacen con interactiva/b3gen/gen_b3.py (fondos y personajes) y exporta_b3.sh (sonidos). */
(function () {
  'use strict';
  const B3 = MAG.b3 = MAG.b3 || {};
  B3.mem = B3.mem || {};

  // ───────────────────────── estilos propios ─────────────────────────
  (function () {
    if (document.getElementById('b3-estilos')) return;
    const st = document.createElement('style'); st.id = 'b3-estilos';
    st.textContent = `
.b3-panel{position:absolute;box-sizing:border-box;background:rgba(239,229,207,.985);color:var(--tinta);border:3px solid var(--borde);border-radius:14px;box-shadow:0 10px 28px rgba(0,0,0,.55)}
.b3-tit{font:900 38px/1.1 var(--tit);letter-spacing:4px;color:var(--rojo);white-space:nowrap}
.b3-txt{font:400 30px/40px var(--maq);color:var(--tinta)}
.b3-ranuras{position:absolute;display:flex;gap:22px}
.b3-ranura{position:relative;width:360px;height:318px;box-sizing:border-box;background:var(--crema2);border:2px solid var(--borde2);border-radius:10px;padding:16px 18px 14px}
.b3-ranura.activa{border:3px solid var(--rojo);padding:15px 17px 13px}
.b3-ranura.graba{border:3px solid rgb(206,48,38);background:rgb(250,238,232);padding:15px 17px 13px}
.b3-rq{display:flex;align-items:center;justify-content:space-between;height:34px;font:700 22px/1 var(--maq);letter-spacing:3px;color:var(--rojo)}
.b3-tipo{font:700 17px/1 var(--maq);letter-spacing:2px;padding:6px 9px 5px;border-radius:5px;border:2px solid var(--borde2);background:rgb(236,226,204);color:var(--tinta2);cursor:pointer}
.b3-tipo.largo{background:rgb(52,44,37);color:var(--crema);border-color:rgb(52,44,37)}
.b3-tipo[hidden]{display:none}
.b3-cinta{display:block;margin:12px 0 10px;width:324px;height:104px;border-radius:6px;background:rgb(74,48,33)}
.b3-nombre{display:block;width:100%;box-sizing:border-box;border:0;border-bottom:2px solid var(--borde);background:transparent;font:700 30px/1.2 var(--maq);color:var(--tinta);padding:4px 2px 6px;outline:none}
.b3-nombre::placeholder{color:rgb(160,142,114);font-weight:400}
.b3-nombre:focus{border-bottom-color:var(--rojo)}
.b3-mandos{display:flex;align-items:center;gap:12px;margin-top:14px}
.b3-rec{width:64px;height:64px;border-radius:50%;border:3px solid rgb(120,30,20);background:rgb(206,48,38);box-shadow:inset 0 -4px 0 rgba(0,0,0,.25);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;outline:none}
.b3-rec span{display:block;width:22px;height:22px;border-radius:50%;background:rgb(255,236,228)}
.b3-rec.para span{border-radius:3px}
.b3-rec:active{transform:translateY(2px)}
.b3-ico{width:56px;height:56px;padding:0;border-radius:10px;border:2px solid var(--borde);background:var(--crema);color:var(--tinta);display:flex;align-items:center;justify-content:center;cursor:pointer;outline:none}
.b3-ico:active{transform:translateY(2px)}
.b3-ico[disabled]{opacity:.35;cursor:default}
.b3-dur{font:400 22px/1 var(--maq);color:var(--nota);margin-left:auto}
.b3-fila{position:absolute;left:50px;right:50px;top:484px;height:52px;display:flex;align-items:center;gap:14px}
.b3-aviso{flex:1 1 auto;font:italic 400 26px/34px var(--maq);color:rgb(170,50,38)}
.b3-peq{height:52px;padding:0 22px;font-size:22px}
.b3-cuenta{position:absolute;left:850px;top:50px;width:220px;height:220px;border-radius:50%;box-sizing:border-box;background:rgba(206,48,38,.94);border:6px solid rgb(255,210,200);
  color:rgb(255,248,240);font:900 150px/1 var(--tit);display:flex;align-items:center;justify-content:center;z-index:30;padding-bottom:10px}
.b3-grupo{display:flex;align-items:center;gap:10px;font:700 20px/1 var(--maq);letter-spacing:2px;color:var(--tinta2)}
.b3-chip{height:44px;padding:0 14px;border-radius:8px;border:2px solid var(--borde2);background:var(--crema2);font:700 22px/1 var(--maq);color:var(--tinta);cursor:pointer;outline:none}
.b3-chip.on{background:rgb(52,44,37);color:var(--crema);border-color:rgb(52,44,37)}
/* el fonógeno */
.b3-tecla{position:absolute;cursor:pointer;touch-action:none}
.b3-tecla.blanca{z-index:2}
.b3-tecla.negra{z-index:3}
.b3-luz{position:absolute;left:0;right:0;bottom:0;pointer-events:none;border-radius:0 0 6px 6px}
.b3-tecla.on .b3-luz{background:rgba(255,128,104,.5);mix-blend-mode:multiply;box-shadow:inset 0 8px 0 rgba(0,0,0,.18)}
.b3-tecla.negra.on .b3-luz{background:rgba(255,96,78,.6);mix-blend-mode:screen;box-shadow:none}
.b3-tecla.guia .b3-luz{box-shadow:inset 0 0 0 5px rgba(229,72,59,.92)}
.b3-tecla.guia.on .b3-luz{box-shadow:inset 0 8px 0 rgba(0,0,0,.18),inset 0 0 0 5px rgba(229,72,59,.92)}
.b3-letra{position:absolute;left:0;right:0;bottom:40px;text-align:center;font:700 18px/1 var(--maq);color:rgba(52,44,37,.42);pointer-events:none}
.b3-tecla.negra .b3-letra{bottom:12px;font-size:16px;color:rgba(239,229,207,.5)}
.b3-nota{position:absolute;width:72px;height:40px;margin-left:-36px;box-sizing:border-box;border-radius:8px;background:rgba(24,18,13,.86);border:2px solid rgba(239,229,207,.55);
  color:var(--crema);font:700 22px/36px var(--maq);text-align:center;z-index:4;pointer-events:none}
.b3-nota.on{background:rgb(229,72,59);border-color:rgb(255,214,204)}
.b3-mel{position:absolute;box-sizing:border-box;padding:10px 22px 12px;background:rgba(239,229,207,.97);border:3px solid var(--borde);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.5);color:var(--tinta)}
.b3-mel-cab{display:flex;align-items:center;gap:16px;height:42px}
.b3-mel-tit{font:900 24px/1 var(--tit);letter-spacing:4px;color:var(--rojo)}
.b3-mel-cuenta{font:700 20px/1 var(--maq);color:var(--nota);margin-left:auto}
.b3-mel-fila{display:flex;align-items:center;gap:4px;margin-top:6px}
.b3-n{min-width:40px;height:36px;padding:0 3px;box-sizing:border-box;border-radius:6px;border:2px solid transparent;font:700 21px/32px var(--maq);text-align:center;color:rgb(150,132,104)}
.b3-n.larga{min-width:54px}
.b3-n.hecha{color:var(--tinta)}
.b3-n.sig{border-color:var(--rojo);color:var(--rojo);background:rgb(252,240,232)}
.b3-sep{width:22px}
.b3-sonidos{position:absolute;box-sizing:border-box;padding:16px 16px 18px;background:rgba(18,15,12,.84);border:2px solid rgba(205,190,160,.85);border-radius:12px;color:var(--crema)}
.b3-sonidos-tit{font:700 20px/1 var(--maq);letter-spacing:3px;color:var(--lino);margin:2px 4px 12px}
.b3-son{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;height:40px;margin-top:6px;padding:0 10px 0 12px;box-sizing:border-box;border-radius:7px;
  border:2px solid rgba(205,190,160,.35);background:transparent;color:var(--crema);font:400 19px/1 var(--maq);cursor:pointer;text-align:left;outline:none;white-space:nowrap;overflow:hidden}
.b3-son:hover{background:rgba(239,229,207,.08)}
.b3-son.on{background:var(--crema);color:var(--tinta);border-color:var(--crema);font-weight:700}
.b3-son small{font:700 13px/1 var(--maq);letter-spacing:1px;opacity:.7}
/* el título */
.b3-etq{position:absolute;box-sizing:border-box;background:rgba(239,229,207,.98);border:3px solid var(--borde);border-radius:14px;box-shadow:0 10px 28px rgba(0,0,0,.55);color:var(--tinta);text-align:center}
.b3-etq-arriba{font:700 24px/1 var(--maq);letter-spacing:3px;color:var(--rojo);margin-top:30px}
.b3-etq-fila{display:flex;align-items:center;justify-content:center;height:74px;margin:26px 50px 0;font:900 64px/74px var(--tit);white-space:nowrap}
.b3-etq-txt{display:inline-block;min-width:40px;outline:none;white-space:pre;caret-color:var(--rojo)}
.b3-etq-txt:empty::before{content:attr(data-ph);color:rgb(190,172,144)}
.b3-etq-linea{height:2px;background:rgb(150,60,50);margin:16px 70px 0}
.b3-etq-abajo{font:italic 400 25px/1 var(--maq);color:var(--nota);margin-top:20px}
.b3-etq-abajo.mal{color:rgb(190,52,40)}
.b3-b[hidden]{display:none!important}
`;
    document.head.appendChild(st);
  }());

  // ───────────────────────── ayudas ─────────────────────────
  const IM = r => (MAG.R[r] && MAG.R[r].img) || null;
  const BUF = r => (MAG.R[r] && MAG.R[r].buf) || null;
  /* un ambiente en bucle sin el hueco del mp3 (el codificador mete silencio al principio y al final) */
  function bucleLimpio(ctx, ruta, db) {
    const b = BUF(ruta); if (!b) return null;
    const c = b.getChannelData(0); let a = 0, z = c.length - 1;
    while (a < c.length * 0.1 && Math.abs(c[a]) < 1e-4) a++;
    while (z > c.length * 0.9 && Math.abs(c[z]) < 1e-4) z--;
    const sr = b.sampleRate;
    return ctx.bucle(ruta, { db, entra: 0.5, desde: a / sr, bucleDesde: a / sr, bucleHasta: (z + 1) / sr });
  }
  /* una función que se ejecuta cuando el motor limpia la estación (como en b1.js) */
  function alSalir(ctx, fn) { ctx.on({ addEventListener() {}, removeEventListener() { try { fn(); } catch (e) {} } }, 'b3-salir', () => {}); }
  /* un buffer de una ruta (cargándolo si hace falta) */
  async function bufDe(ruta) {
    if (!ruta) return null;
    if (BUF(ruta)) return BUF(ruta);
    try { await MAG.trae(ruta); } catch (e) { console.warn('[b3] no se pudo cargar', ruta); }
    return BUF(ruta);
  }
  /* pinta la onda de un buffer en un canvas (la cinta marrón y la onda crema, como las pistas de la animática) */
  function pintaOnda(cv, buf, col) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.fillStyle = 'rgb(74,48,33)'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, 6, W, 2); g.fillRect(0, H - 8, W, 2);
    if (!buf) { g.fillStyle = 'rgba(239,229,207,.18)'; g.fillRect(0, H / 2 - 1, W, 2); return; }
    const n = Math.floor(W / 3), p = MAG.picos(buf, n); let mx = 0.0001; for (const v of p) mx = Math.max(mx, v);
    g.fillStyle = col || 'rgb(232,214,180)';
    for (let i = 0; i < n; i++) { const h = Math.max(2, (p[i] / mx) * (H - 22)); g.fillRect(i * 3, (H - h) / 2, 2, h); }
  }
  /* pitidos de la cuenta atrás (los de la animática: W:bip / W:bipalto, fabricados) */
  function bip(alto) {
    try {
      const a = MAG.audio(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
      o.type = 'sine'; o.frequency.value = alto ? 1320 : 880;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(alto ? 0.22 : 0.16, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, t + (alto ? 0.42 : 0.16));
      o.connect(g); g.connect(MAG.master); o.start(t); o.stop(t + 0.5);
    } catch (e) {}
  }
  const esProfe = ctx => !!(ctx.op.profe || MAG.lee('profe', false));
  const LAPIZ = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 20l1.2-4.6L16.6 4a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M14.5 6.2l3.3 3.3" stroke="currentColor" stroke-width="2.2"/></svg>';

  // ── los ruidos de ejemplo (los de la animática) ──
  const EJEMPLOS = [
    { nombre: 'lápices', tipo: 'CORTO', ruta: 'a/b3_ej_lapiz.mp3' },
    { nombre: 'las sillas', tipo: 'CORTO', ruta: 'a/b3_ej_silla.mp3' },
    { nombre: 'la cremallera', tipo: 'CORTO', ruta: 'a/b3_ej_cremallera.mp3' },
    { nombre: 'el libro', tipo: 'CORTO', ruta: 'a/b3_ej_libro.mp3' }];

  /* los cuatro ruidos de la clase, con su buffer (para la pieza y el fonógeno) */
  B3.sonidosClase = async function () {
    const out = [];
    for (const [i, c] of (MAG.datos.clase || []).entries()) {
      const id = c.id || ('clase_' + (i + 1)); let buf = B3.mem[id] || null;
      if (!buf && c.clave) { const o = await MAG.idbLee(c.clave); if (o && o.ch) { try { buf = MAG.objABuf(o); } catch (e) {} } }
      if (!buf && c.ruta) buf = await bufDe(c.ruta);
      if (buf) { B3.mem[id] = buf; out.push({ id, nombre: c.nombre || ('ruido ' + (i + 1)), tipo: c.tipo || 'CORTO', buf, clase: true }); }
    }
    return out;
  };
  /* nombres cortos de los sonidos de París (los de la animática; los mismos que usa la pieza) */
  const CORTO_DE = { estacion_0: 'el silbato', estacion_1: 'la locomotora', estacion_2: 'el vapor', estacion_3: 'el tren que pasa', estacion_4: '«¡Al tren!»',
    mercado_0: '«¡Qué manzanas!»', mercado_1: 'la balanza', mercado_2: 'las monedas', mercado_3: 'las gallinas', mercado_4: 'el cuchillo',
    cafe_0: 'la cafetera', cafe_1: 'la cucharilla', cafe_2: 'el periódico', cafe_3: '«¿Un cafecito?»', cafe_4: 'el café lleno',
    muelles_0: 'el barco', muelles_1: 'la campana del barco', muelles_2: 'las palomas', muelles_3: 'el libro viejo', muelles_4: 'pasar una página', muelles_5: '«Attention, on passe !»' };
  /* todos los sonidos de la bobina del alumno: los ocho de París (bobina 2: MAG.bobinaParis() de sonidos_paris.js, que completa
     con los del vídeo lo que falte) y los cuatro de la clase */
  B3.sonidosBobina = async function () {
    if (typeof MAG.bobinaParis !== 'function') await new Promise(ok => { const s = document.createElement('script'); s.src = MAG.base + 'js/sonidos_paris.js'; s.onload = ok; s.onerror = ok; document.head.appendChild(s); });
    let paris = [];
    try { paris = typeof MAG.bobinaParis === 'function' ? MAG.bobinaParis() : (MAG.datos.paris || []).filter(p => p && p.ruta); } catch (e) { paris = []; }
    const out = [];
    for (const p of paris) {
      if (!p || !p.ruta) continue;
      const buf = await bufDe(p.ruta);
      if (buf) out.push({ id: p.id, nombre: CORTO_DE[p.id] || p.nombre || p.id, tipo: p.tipo || 'CORTO', buf });
    }
    return out.concat(await B3.sonidosClase());
  };

  // ═══════════════════════════ 1 · b3_clase: la clase graba cuatro ruidos ═══════════════════════════
  /* PARADA del vídeo en 0:13.04 (hasta 21.24); el tramo siguiente empieza en 0:21.64 («Listo. A ver qué dice Odile de esto…»).
     Fondo: el último fotograma del tramo (el cuarto de hoy, P1m). Cuatro ranuras como etiquetas de bobina: ● → 3, 2, 1 (la
     misma cuenta de la animática) → GRABANDO hasta ■ PARAR (máx. 12 s) → su onda, su nombre a máquina y LARGO / CORTO.
     En el ordenador del aula (cuenta Protester) se guardan por grupo, para la clase siguiente; en casa, en el dispositivo. */
  MAG.registra('b3_clase', {
    titulo: 'Los cuatro ruidos de tu clase',
    recursos: ['a/b3_reloj.mp3', 'a/b3_ej_lapiz.mp3', 'a/b3_ej_silla.mp3', 'a/b3_ej_cremallera.mp3', 'a/b3_ej_libro.mp3', 'a/ui_tecla.mp3'],
    async monta(ctx) {
      const profe = esProfe(ctx);
      const reloj = bucleLimpio(ctx, 'a/b3_reloj.mp3', -8);
      const panel = ctx.el('div', { class: 'b3-panel' }); Object.assign(panel.style, { left: '156px', top: '290px', width: '1608px', height: '566px' });
      panel.appendChild(MAG.el('div', { class: 'b3-tit', text: 'LA CLASE GRABA CUATRO RUIDOS', style: { position: 'absolute', left: '50px', top: '32px' } }));
      panel.appendChild(MAG.el('div', { class: 'b3-txt', html: 'Pulsa <b style="color:rgb(206,48,38)">●</b>, espera al 3, 2, 1… y haz el ruido. Para con <b>■</b> y escríbele su nombre.', style: { position: 'absolute', left: '50px', top: '88px' } }));
      // la fila de arriba a la derecha: el grupo (en el aula) y los de ejemplo
      const der = MAG.el('div', { style: { position: 'absolute', right: '40px', top: '26px', display: 'flex', alignItems: 'center', gap: '14px' } });
      const fila = MAG.el('div', { class: 'b3-fila' });
      panel.appendChild(der); panel.appendChild(fila);
      let grupo = 'casa';
      const chips = {};
      if (profe) {
        grupo = MAG.grupoAhora() || MAG.lee('b3_grupo', '2GpC');
        const caja = MAG.el('div', { class: 'b3-grupo' }, ['GRUPO']);
        ['2GpC', '2GpF'].forEach(gk => {
          const c = MAG.el('button', { class: 'b3-chip' + (gk === grupo ? ' on' : ''), type: 'button', text: gk });
          c.addEventListener('click', () => { grupo = gk; MAG.guarda('b3_grupo', gk); Object.keys(chips).forEach(k => chips[k].classList.toggle('on', k === gk)); guardaTodo(); miraUltima(); });
          chips[gk] = c; caja.appendChild(c);
        });
        der.appendChild(caja);
      }
      const aviso = MAG.el('div', { class: 'b3-aviso' }); fila.appendChild(aviso);
      const bUltima = ctx.boton(profe ? 'Los de la última clase' : 'Los que ya grabaste', { clase: 'mbtn-sec b3-b b3-peq', icono: MAG.ICO.otra, padre: fila });
      bUltima.hidden = true;
      const bEjemplo = ctx.boton('Usar los de ejemplo', { clase: 'mbtn-sec b3-b b3-peq', padre: fila });
      const ranuras = MAG.el('div', { class: 'b3-ranuras', style: { left: '50px', top: '146px' } });
      panel.appendChild(ranuras);

      // ── las cuatro ranuras ──
      const R = [];
      for (let i = 0; i < 4; i++) {
        const el = MAG.el('div', { class: 'b3-ranura' });
        const tipo = MAG.el('button', { class: 'b3-tipo', type: 'button', text: 'CORTO', title: 'Cambiar: corto o largo', hidden: true });
        const cab = MAG.el('div', { class: 'b3-rq' }, ['RUIDO ' + (i + 1), tipo]);
        const cv = MAG.el('canvas', { class: 'b3-cinta', width: 324, height: 104 });
        const nombre = MAG.el('input', { class: 'b3-nombre', type: 'text', maxlength: '28', placeholder: '¿qué ruido es?', spellcheck: 'false', autocomplete: 'off' });
        const rec = MAG.el('button', { class: 'b3-rec', type: 'button', title: 'Grabar' }, [MAG.el('span')]);
        const oir = MAG.el('button', { class: 'b3-ico', type: 'button', title: 'Escuchar', html: MAG.ICO.play, disabled: true });
        const dur = MAG.el('div', { class: 'b3-dur' });
        el.appendChild(cab); el.appendChild(cv); el.appendChild(nombre); el.appendChild(MAG.el('div', { class: 'b3-mandos' }, [rec, oir, dur]));
        ranuras.appendChild(el);
        const r = { i, el, tipo, cv, nombre, rec, oir, dur, buf: null, ruta: null, t: 'CORTO', tipoTocado: false };
        pintaOnda(cv, null);
        rec.addEventListener('click', () => { if (estado === 'graba' && activa === i) para(); else if (estado === 'libre') graba(i); });
        oir.addEventListener('click', () => escucha(r));
        tipo.addEventListener('click', () => { r.t = r.t === 'LARGO' ? 'CORTO' : 'LARGO'; r.tipoTocado = true; pintaTipo(r); guardaTodo(); });
        nombre.addEventListener('focus', () => { activa = i; marca(); });
        nombre.addEventListener('input', () => { guardaTodo(); comprueba(); });
        nombre.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') { nombre.blur(); const sig = R.find(x => !x.buf); if (sig) { activa = sig.i; marca(); } } });
        R.push(r);
      }
      let activa = 0, estado = 'libre', seguirP = null, sonando = null;
      const pintaTipo = r => { r.tipo.hidden = !r.buf; r.tipo.textContent = r.t; r.tipo.classList.toggle('largo', r.t === 'LARGO'); };
      const marca = () => R.forEach(r => { r.el.classList.toggle('activa', r.i === activa && estado !== 'graba'); r.el.classList.toggle('graba', r.i === activa && estado === 'graba'); });
      marca();
      const fmt = s => (Math.round(s * 10) / 10).toFixed(1).replace('.', ',') + ' s';
      function pon(r, buf, nombre, tipo, ruta) {
        r.buf = buf; r.ruta = ruta || null; B3.mem['clase_' + (r.i + 1)] = buf;
        pintaOnda(r.cv, buf); r.oir.disabled = !buf; r.dur.textContent = buf ? fmt(buf.duration) : '';
        if (tipo) { r.t = tipo; r.tipoTocado = !!ruta; } else if (!r.tipoTocado) r.t = buf && buf.duration >= 2.5 ? 'LARGO' : 'CORTO';
        if (nombre != null) r.nombre.value = nombre;
        pintaTipo(r);
      }
      function escucha(r) {
        if (!r.buf) return;
        if (sonando) sonando.parar(0.05);
        sonando = ctx.suena(r.buf, { db: -2 });
      }
      // ── guardar: en IndexedDB (por grupo en el aula; «casa» en el dispositivo) y en MAG.datos.clase ──
      let tGuarda = null;
      function guardaTodo() {
        if (tGuarda) clearTimeout(tGuarda);
        tGuarda = setTimeout(async () => {
          tGuarda = null;
          const lista = [];
          for (const r of R) {
            const clave = 'clase_' + grupo + '_' + (r.i + 1), nom = r.nombre.value.trim();
            if (r.buf) {
              const o = r.ruta ? { nombre: nom, tipo: r.t, ruta: r.ruta, fecha: new Date().toISOString() } : Object.assign(MAG.bufAObj(r.buf), { nombre: nom, tipo: r.t, fecha: new Date().toISOString() });
              await MAG.idbPon(clave, o);
            }
            lista.push({ id: 'clase_' + (r.i + 1), nombre: nom, tipo: r.t, clave: r.buf && !r.ruta ? clave : null, ruta: r.ruta });
          }
          MAG.datos.clase = lista.filter(x => x.clave || x.ruta); MAG.guardaDatos();
        }, 250);
      }
      alSalir(ctx, () => { if (tGuarda) { clearTimeout(tGuarda); tGuarda = null; } });
      // ── los de la última clase (o los que ya grabaste en casa) ──
      let guardados = null;
      async function miraUltima() {
        guardados = [];
        for (let i = 0; i < 4; i++) guardados.push(await MAG.idbLee('clase_' + grupo + '_' + (i + 1)));
        const hay = guardados.filter(Boolean);
        if (hay.length && R.every(r => !r.buf)) {
          const f = hay.map(o => o.fecha).filter(Boolean).sort().pop();
          let txt = profe ? 'Los de la última clase' : 'Los que ya grabaste';
          if (f) { const d = new Date(f); txt += ' · ' + d.getDate() + '/' + (d.getMonth() + 1); }
          bUltima.querySelector('.mbtn-tx').textContent = txt; bUltima.hidden = false;
        } else bUltima.hidden = true;
      }
      bUltima.addEventListener('click', async () => {
        if (!guardados) return;
        for (let i = 0; i < 4; i++) {
          const o = guardados[i]; if (!o) continue;
          let buf = null;
          if (o.ch) { try { buf = MAG.objABuf(o); } catch (e) {} } else if (o.ruta) buf = await bufDe(o.ruta);
          if (buf) pon(R[i], buf, o.nombre || '', o.tipo, o.ruta || null);
        }
        bUltima.hidden = true; guardaTodo(); comprueba();
      });
      bEjemplo.addEventListener('click', async () => {
        if (estado === 'abre') { intento++; estado = 'libre'; marca(); }      // el permiso del micro sin contestar: no bloquea
        if (estado !== 'libre') return;
        for (let i = 0; i < 4; i++) { const e = EJEMPLOS[i]; pon(R[i], await bufDe(e.ruta), e.nombre, e.tipo, e.ruta); }
        aviso.textContent = ''; bUltima.hidden = true; guardaTodo(); comprueba();
      });
      miraUltima();

      // ── grabar: 3, 2, 1 y GRABANDO hasta ■ (máx. 12 s) ──
      let g = null, tRec = 0, raf = null, intento = 0;
      async function graba(i) {
        if (estado !== 'libre') return;
        activa = i; estado = 'abre'; marca(); aviso.textContent = '';
        if (seguirP) { seguirP.cancela(); seguirP = null; }
        if (sonando) { sonando.parar(0.05); sonando = null; }
        const mio = ++intento;
        const st = await MAG.mic.abre();
        if (!ctx.vivo() || mio !== intento) return;
        if (!st) { estado = 'libre'; marca(); aviso.textContent = 'No hay micrófono: usa los de ejemplo.'; bEjemplo.classList.add('mbtn-prin'); bEjemplo.classList.remove('mbtn-sec'); return; }
        if (reloj) reloj.volumen(-80, 0.15);
        estado = 'cuenta';
        const cu = ctx.el('div', { class: 'b3-cuenta' });
        for (const n of [3, 2, 1]) { cu.textContent = String(n); bip(false); await MAG.espera(600); if (!ctx.vivo()) return; }
        cu.remove();
        bip(true);
        estado = 'graba'; marca();
        R[i].rec.classList.add('para'); R[i].rec.title = 'Parar';
        MAG.botonera.enclava('rec'); MAG.botonera.rotulo('GRABANDO');
        const cv = R[i].cv, gg = cv.getContext('2d'); const W = cv.width, H = cv.height;
        gg.fillStyle = 'rgb(74,48,33)'; gg.fillRect(0, 0, W, H);
        let x = 0, nivel = 0;
        g = await MAG.mic.graba({ max: 12, alNivel: rms => { nivel = Math.max(nivel * 0.6, rms); } });
        if (!ctx.vivo()) { try { await g.para(); } catch (e) {} return; }
        tRec = performance.now();
        const paso = () => {
          if (!ctx.vivo() || estado !== 'graba') return;
          const s = (performance.now() - tRec) / 1000;
          const nx = Math.min(W, Math.floor(s / 12 * W));
          gg.fillStyle = 'rgb(232,214,180)';
          for (; x < nx; x += 3) { const h = Math.max(2, Math.min(1, nivel * 5) * (H - 22)); gg.fillRect(x, (H - h) / 2, 2, h); }
          R[i].dur.textContent = fmt(s);
          if (s >= 12) { para(); return; }
          raf = requestAnimationFrame(paso);
        };
        raf = requestAnimationFrame(paso);
      }
      async function para() {
        if (estado !== 'graba' || !g) return;
        estado = 'para'; if (raf) cancelAnimationFrame(raf);
        const r = R[activa];
        const buf = await g.para(); g = null;
        if (!ctx.vivo()) return;
        r.rec.classList.remove('para'); r.rec.title = 'Grabar otra vez';
        MAG.botonera.enclava(null); MAG.botonera.rotulo('');
        if (reloj) reloj.volumen(-8, 0.6);
        estado = 'libre';
        if (buf) { r.tipoTocado = false; pon(r, buf, null, null, null); }
        else pon(r, r.buf, null, r.t, r.ruta);
        marca(); r.nombre.focus(); r.nombre.select();
        guardaTodo(); comprueba();
      }
      alSalir(ctx, () => {
        if (raf) cancelAnimationFrame(raf); if (g) { try { g.para(); } catch (e) {} g = null; }
        MAG.botonera.enclava(null); MAG.botonera.rotulo('');
        // suelta el micro (que el navegador deje de marcarlo como en uso); otra estación lo vuelve a abrir sin preguntar
        try { if (MAG.mic.stream) { MAG.mic.stream.getTracks().forEach(t => t.stop()); MAG.mic.stream = null; } } catch (e) {}
      });
      // la botonera: ● graba en la ranura activa (o la siguiente vacía) o para; ‖ también para
      ctx.botonera('rec', () => { if (estado === 'graba') para(); else if (estado === 'libre') { const v = R[activa].buf ? (R.find(x => !x.buf) || R[activa]) : R[activa]; graba(v.i); } });
      ctx.botonera('pausa', () => { if (estado === 'graba') para(); });
      /* escribiendo un nombre, el espacio y → son del texto, no de «Seguir» (que escucha en la captura de window: este oyente
         se apunta antes, así que va primero; no impide que se escriba el espacio) */
      ctx.on(window, 'keydown', ev => {
        if (ev.target && ev.target.classList && ev.target.classList.contains('b3-nombre') && (ev.key === ' ' || ev.key === 'ArrowRight')) ev.stopImmediatePropagation();
      }, true);
      ctx.on(window, 'keydown', ev => {
        if (ev.target && ev.target.tagName === 'INPUT') return;
        if (ev.key === 'r' || ev.key === 'R') { ev.preventDefault(); MAG.botonera.pulsa('rec', true); }
        else if ((ev.key === 's' || ev.key === 'S' || ev.key === 'Escape') && estado === 'graba') { ev.preventDefault(); para(); }
      });
      // ── cuando están los cuatro, con nombre: «Seguir con la historia» ──
      let acabar;
      const fin = new Promise(ok => { acabar = ok; });
      function comprueba() {
        const listos = R.every(r => r.buf && r.nombre.value.trim().length > 0);
        if (listos && !seguirP && estado === 'libre') { seguirP = ctx.seguir(); seguirP.then(() => { seguirP = null; acabar(); }); }
        if (!listos && seguirP) { seguirP.cancela(); seguirP = null; }
      }
      await fin;
      if (tGuarda) { clearTimeout(tGuarda); tGuarda = null; }
      // el guardado final, sin esperar al temporizador
      MAG.datos.clase = R.map(r => ({ id: 'clase_' + (r.i + 1), nombre: r.nombre.value.trim(), tipo: r.t, clave: r.buf && !r.ruta ? 'clase_' + grupo + '_' + (r.i + 1) : null, ruta: r.ruta }));
      MAG.guardaDatos();
      // (y en IndexedDB, sin esperar: la historia sigue mientras se escribe)
      R.forEach(r => { if (r.buf && !r.ruta) MAG.idbPon('clase_' + grupo + '_' + (r.i + 1), Object.assign(MAG.bufAObj(r.buf), { nombre: r.nombre.value.trim(), tipo: r.t, fecha: new Date().toISOString() })); });
    }
  });

  // ═══════════════════════════ 2 · b3_repaso: dos preguntas de Odile ═══════════════════════════
  /* En 0:47.43 (justo después de «…Pero antes, dos preguntas, aprendiz.»); el tramo siguiente empieza en 1:11.64 (el narrador:
     «El sonido está escrito en la cinta…»). Fondo: el estudio de día del repaso (EST) sin Odile; Odile, en su sitio, con las
     poses del vídeo: O06 (espera), O11 (bien) y O12 (non, non). Ella LEE cada pregunta (OP1, OP2); las respuestas, con tu voz. */
  MAG.registra('b3_repaso', {
    titulo: 'Dos preguntas de Odile',
    fondo: 'i/b3_repaso_fondo.jpg',
    recursos: ['i/b3_repaso_fondo.jpg', 'i/b3_rp_o06.png', 'i/b3_rp_o11.png', 'i/b3_rp_o12.png', 'a/b3_OP1.mp3', 'a/b3_OP2.mp3',
      'a/b3_Y35.mp3', 'a/b3_Y36.mp3', 'a/b3_Y37.mp3', 'a/b3_Y38.mp3', 'a/b3_Y39.mp3', 'a/b3_Y40.mp3', 'a/b3_O13.mp3', 'a/b3_O14.mp3', 'a/b3_reloj.mp3', 'a/ui_tecla.mp3'],
    async monta(ctx) {
      ctx.fondo('i/b3_repaso_fondo.jpg');
      bucleLimpio(ctx, 'a/b3_reloj.mp3', -10);
      await MAG.quiz(ctx, {
        preguntas: [
          { q: '¿Por qué se puede volver a usar una cinta?', voz: 'a/b3_OP1.mp3', fijo: true, ops: [
            { txt: 'Porque la cinta se seca y se borra sola.', voz: 'a/b3_Y36.mp3' },
            { txt: 'Porque el cabezal de borrar desordena las partículas y queda en blanco.', voz: 'a/b3_Y35.mp3', bien: true },
            { txt: 'Porque se lava con agua.', voz: 'a/b3_Y37.mp3' }] },
          { q: '¿Por qué se llama música concreta?', voz: 'a/b3_OP2.mp3', fijo: true, ops: [
            { txt: 'Porque las obras son cortas y van al grano.', voz: 'a/b3_Y39.mp3' },
            { txt: 'Porque se toca con instrumentos de piedra.', voz: 'a/b3_Y40.mp3' },
            { txt: 'Porque parte de sonidos reales grabados, no de una partitura.', voz: 'a/b3_Y38.mp3', bien: true }] }],
        odile: { idle: 'i/b3_rp_o06.png', bien: 'i/b3_rp_o11.png', mal: 'i/b3_rp_o12.png', vozBien: 'a/b3_O13.mp3', vozMal: 'a/b3_O14.mp3', txtBien: 'Bien.', txtMal: 'Non, non. Otra vez.' },
        caja: { x: 100, y: 180, w: 1060 }
      });
    }
  });

  // ═══════════════════════════ 3 · b3_fonogeno: «Frère Jacques» en el fonógeno ═══════════════════════════
  /* PARADA del vídeo en 3:20.72 (hasta 3:24.92); el tramo siguiente empieza en 3:39.32 con Lucien: «¿Lo ves? Doble de
     velocidad…». Fondo (v3.4, 18-oct): el TALLER nuevo (lámina B3u: el cuarto de Lucien con el fonógeno encima de la mesa), sin
     Lucien; Lucien a la izquierda, escuchando (L03, la pose del vídeo en la PARADA), del mismo tamaño que en el vídeo (cabeza de
     285 px). Las teclas son las de la propia foto: una octava, de do a do' (8 blancas; 5 negras agrupadas 2 + 3), medidas sobre
     el fotograma (las blancas, de unos 80 px de ancho: se tocan bien en la foto). Cada tecla toca el sonido elegido a otra velocidad: rate = 2^(semitonos/12),
     con do = tal cual. Ratón o dedo, y teclado: A S D F G H J K (blancas) · W E T Y U (negras). */
  const BLANCAS = [[925, 1004], [1007, 1085], [1088, 1166], [1169, 1247], [1250, 1331], [1334, 1418], [1421, 1506], [1509, 1608]];
  const NEGRAS = [[1001, 1043, 1], [1082, 1123, 3], [1220, 1264, 6], [1311, 1349, 8], [1400, 1436, 10]];     // [x0, x1, semitonos]
  const SEMI_B = [0, 2, 4, 5, 7, 9, 11, 12], NOMBRE_B = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si', "do'"];
  const LETRA_B = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K'], LETRA_N = ['W', 'E', 'T', 'Y', 'U'];
  const KY0 = 731, KY1 = 831, KYB = 717, KYN = 774;           // blancas: de 731 a 831 · negras: de 717 a 774 (medidas en la foto B3u)
  /* «Frère Jacques» (FRERE de b3v33.py): grado de la escala (0 = do … 7 = do') y duración en partes; «din, dan, don» = do' sol do' */
  const FRERE = [[0, 1], [1, 1], [2, 1], [0, 1], [0, 1], [1, 1], [2, 1], [0, 1], [2, 1], [3, 1], [4, 2], [2, 1], [3, 1], [4, 2],
    [4, .5], [5, .5], [4, .5], [3, .5], [2, 1], [0, 1], [4, .5], [5, .5], [4, .5], [3, .5], [2, 1], [0, 1],
    [7, 1], [4, 1], [7, 2], [7, 1], [4, 1], [7, 2]];
  const FRASES_FJ = [[0, 4], [4, 8], [8, 11], [11, 14], [14, 20], [20, 26], [26, 29], [29, 32]];        // para leerla por trozos
  MAG.registra('b3_fonogeno', {
    titulo: 'Frère Jacques en el fonógeno',
    fondo: 'i/b3_fonogeno_fondo.jpg',
    recursos: ['i/b3_fonogeno_fondo.jpg', 'i/b3_fn_l03.png', 'a/b3_campana.mp3', 'a/b3_motor.mp3', 'a/ui_tecla.mp3'],
    async monta(ctx) {
      ctx.fondo('i/b3_fonogeno_fondo.jpg');
      bucleLimpio(ctx, 'a/b3_motor.mp3', -12);
      const luc = ctx.figura('i/b3_fn_l03.png', { caja: [33, 142, 842, 938] });
      luc.el.style.zIndex = 5;
      // ── los sonidos: la campana del estudio y los de tu bobina (París + clase) ──
      const lista = [{ id: 'campana', nombre: 'la campana', tipo: 'CORTO', buf: BUF('a/b3_campana.mp3') }];
      let elegido = lista[0];
      const panel = ctx.el('div', { class: 'b3-sonidos' }); Object.assign(panel.style, { left: '1634px', top: '128px', width: '272px' });     // a la derecha del fonógeno, sin tapar el do'
      panel.appendChild(MAG.el('div', { class: 'b3-sonidos-tit', text: 'TU SONIDO' }));
      const botones = new Map();
      function ponLista() {
        panel.querySelectorAll('.b3-son').forEach(b => b.remove()); botones.clear();
        lista.forEach(s => {
          const b = MAG.el('button', { class: 'b3-son' + (s === elegido ? ' on' : ''), type: 'button', title: s.nombre }, [MAG.el('span', { text: s.nombre, style: { overflow: 'hidden', textOverflow: 'ellipsis' } }), MAG.el('small', { text: s.tipo })]);
          b.addEventListener('click', () => { elegido = s; botones.forEach((bb, ss) => bb.classList.toggle('on', ss === s)); const m = toca(0); if (m && m.largo) setTimeout(() => suelta(m), 1200); });
          botones.set(s, b); panel.appendChild(b);
        });
      }
      ponLista();
      B3.sonidosBobina().then(otros => {
        if (!ctx.vivo() || !otros.length) return;
        otros.slice(0, 12).forEach(s => lista.push(s)); ponLista();
      });
      // ── las teclas (sobre las de la foto) y sus notas ──
      const teclas = [];
      BLANCAS.forEach(([x0, x1], i) => {
        const k = ctx.el('div', { class: 'b3-tecla blanca', title: NOMBRE_B[i] }); Object.assign(k.style, { left: x0 + 'px', top: KY0 + 'px', width: (x1 - x0) + 'px', height: (KY1 - KY0) + 'px' });
        k.appendChild(MAG.el('div', { class: 'b3-luz', style: { top: (KYN - KY0 + 2) + 'px' } })); k.appendChild(MAG.el('div', { class: 'b3-letra', text: LETRA_B[i] }));
        const n = ctx.el('div', { class: 'b3-nota', text: NOMBRE_B[i] }); Object.assign(n.style, { left: ((x0 + x1) / 2) + 'px', top: (KY1 + 12) + 'px' });
        teclas.push({ el: k, nota: n, semi: SEMI_B[i], grado: i });
      });
      NEGRAS.forEach(([x0, x1, s], j) => {
        const k = ctx.el('div', { class: 'b3-tecla negra', title: ['do♯', 're♯', 'fa♯', 'sol♯', 'la♯'][j] }); Object.assign(k.style, { left: x0 + 'px', top: KYB + 'px', width: (x1 - x0) + 'px', height: (KYN - KYB) + 'px' });
        k.appendChild(MAG.el('div', { class: 'b3-luz', style: { top: '0' } })); k.appendChild(MAG.el('div', { class: 'b3-letra', text: LETRA_N[j] }));
        teclas.push({ el: k, nota: null, semi: s, grado: null });
      });
      // ── la melodía, a la vista ──
      const mel = ctx.el('div', { class: 'b3-mel' }); Object.assign(mel.style, { left: '946px', top: '146px', width: '600px' });     // el atril, encima del fonógeno
      const cuenta = MAG.el('div', { class: 'b3-mel-cuenta' });
      const bOir = MAG.ui.boton('', { clase: 'mbtn-sec', icono: MAG.ICO.play, titulo: 'Escuchar la melodía' });
      Object.assign(bOir.style, { width: '42px', height: '42px', padding: '0' });
      mel.appendChild(MAG.el('div', { class: 'b3-mel-cab' }, [MAG.el('div', { class: 'b3-mel-tit', text: 'FRÈRE JACQUES' }), cuenta, bOir]));
      const notasEl = [];
      const filas = [0, 1, 2, 3].map(() => MAG.el('div', { class: 'b3-mel-fila' }));       // cuatro líneas: cada frase y su repetición
      FRASES_FJ.forEach(([a, b], f) => {
        const fila = filas[f >> 1];
        if (f % 2) fila.appendChild(MAG.el('div', { class: 'b3-sep' }));
        for (let i = a; i < b; i++) { const e = MAG.el('div', { class: 'b3-n' + (FRERE[i][1] >= 2 ? ' larga' : ''), text: NOMBRE_B[FRERE[i][0]] }); fila.appendChild(e); notasEl.push(e); }
      });
      filas.forEach(fl => mel.appendChild(fl));
      let pos = 0, tocadas = 0, demo = false, acabada = false;
      function pintaMel() {
        notasEl.forEach((e, i) => { e.classList.toggle('hecha', i < pos); e.classList.toggle('sig', i === pos && !acabada); });
        teclas.forEach(t => t.el.classList.toggle('guia', !acabada && t.grado != null && pos < FRERE.length && t.grado === FRERE[pos][0]));
        cuenta.textContent = pos + ' / ' + FRERE.length;
      }
      pintaMel();
      // ── tocar: rate = 2^(semitonos/12). CORTO: el golpe entero (hasta 1,7 s); LARGO: suena mientras se mantiene la tecla ──
      const vivas = [];
      function toca(semi) {
        const s = elegido, b = s && s.buf; if (!b) return null;
        const rate = Math.pow(2, semi / 12), largo = s.tipo === 'LARGO' && b.duration > 1;
        const o = { rate, db: s.clase ? -3 : -2 };
        if (largo) Object.assign(o, { bucle: true, bucleDesde: b.duration * 0.12, bucleHasta: b.duration * 0.86, entra: 0.03 });
        const m = ctx.suena(b, o); m.largo = largo;
        if (!largo) { const dur = Math.min(b.duration, 1.7); if (b.duration > dur + 0.05) setTimeout(() => m.parar(0.15), Math.max(0, (dur / rate - 0.15) * 1000)); }
        else setTimeout(() => m.parar(0.3), 6000);                       // nunca más de 6 s aunque se quede pulsada
        vivas.push(m); while (vivas.length > 6) vivas.shift().parar(0.08);
        return m;
      }
      const suelta = m => { if (m && m.largo) m.parar(0.25); };
      function enciende(t) { t.el.classList.add('on'); if (t.nota) t.nota.classList.add('on'); }
      function apaga(t) { t.el.classList.remove('on'); if (t.nota) t.nota.classList.remove('on'); suelta(t.m); t.m = null; }
      let acabar; const fin = new Promise(ok => { acabar = ok; });
      let seguirP = null;
      function pulsa(t) {
        if (demo) return;
        suelta(t.m); t.m = toca(t.semi);
        tocadas++;
        if (!acabada && t.grado != null && pos < FRERE.length && t.grado === FRERE[pos][0]) {
          pos++;
          if (pos >= FRERE.length) {
            acabada = true; pintaMel();
            // Lucien se queda escuchando (no habla: cambiará de pose al empezar su frase, ya en el vídeo)
            if (seguirP) { seguirP.cancela(); seguirP = null; }
            setTimeout(() => acabar(), 1300);
            return;
          }
        }
        pintaMel();
        if (tocadas >= 8 && !seguirP && !acabada) { seguirP = ctx.seguir(); seguirP.then(() => acabar()); }
      }
      teclas.forEach(t => {
        t.el.addEventListener('pointerdown', ev => { ev.preventDefault(); if (demo) return; try { t.el.setPointerCapture(ev.pointerId); } catch (e) {} enciende(t); pulsa(t); });
        const fuera = () => { if (t.el.classList.contains('on')) apaga(t); };
        t.el.addEventListener('pointerup', fuera); t.el.addEventListener('pointercancel', fuera); t.el.addEventListener('pointerleave', fuera);
      });
      const MAPA = {};
      LETRA_B.forEach((l, i) => { MAPA[l.toLowerCase()] = teclas[i]; });
      LETRA_N.forEach((l, j) => { MAPA[l.toLowerCase()] = teclas[8 + j]; });
      ctx.on(window, 'keydown', ev => {
        const t = MAPA[String(ev.key).toLowerCase()];
        if (!t || ev.repeat || ev.metaKey || ev.ctrlKey || ev.altKey) return;
        ev.preventDefault(); if (demo) return; enciende(t); pulsa(t);
      });
      ctx.on(window, 'keyup', ev => { const t = MAPA[String(ev.key).toLowerCase()]; if (t && !demo) apaga(t); });
      // ── escuchar la melodía entera (ayuda: no cuenta como tocada) ──
      bOir.addEventListener('click', async () => {
        if (demo) return; demo = true; bOir.disabled = true;
        const BEAT = 400;
        for (let i = 0; i < FRERE.length && ctx.vivo(); i++) {
          const [gr, d] = FRERE[i]; const t = teclas[gr];
          t.m = toca(SEMI_B[gr]); enciende(t);
          await MAG.espera(d * BEAT * 0.85); apaga(t); await MAG.espera(d * BEAT * 0.15);
        }
        demo = false; bOir.disabled = false;
      });
      await fin;
    }
  });

  // ═══════════════════════════ 4 · b3_titulo: el título de tu estudio ═══════════════════════════
  /* Justo cuando el narrador acaba «…¿Cómo vas a llamar al tuyo?» (N33: 5:18.26–5:23.96); el tramo siguiente empieza en 5:27.86
     (la libreta). Fondo: el plano 15c en el corte, limpio (el último fotograma del vídeo lleva aún el subtítulo del narrador).
     La tarjeta es la de la animática (tarjeta_titulo, modo «etiqueta»: «TU ESTUDIO SE LLAMA», el título en Bodoni y la raya
     roja), pero aquí se escribe: cada tecla suena a máquina; con Intro (3 letras como mínimo) suena la campanilla, se queda
     escrito y sale «Seguir». */
  MAG.registra('b3_titulo', {
    titulo: 'El título de tu estudio',
    fondo: 'i/b3_titulo_fondo.jpg',
    recursos: ['i/b3_titulo_fondo.jpg', 'a/b3_tecla.mp3', 'a/b3_campana.mp3', 'a/b3_motor.mp3'],
    async monta(ctx) {
      ctx.fondo('i/b3_titulo_fondo.jpg');
      bucleLimpio(ctx, 'a/b3_motor.mp3', -16);
      const W0 = 1180;
      const etq = ctx.el('div', { class: 'b3-etq' }); Object.assign(etq.style, { left: ((1920 - W0) / 2) + 'px', top: '280px', width: W0 + 'px', height: '262px' });
      const txt = MAG.el('span', { class: 'b3-etq-txt', contenteditable: 'true', spellcheck: 'false', 'data-ph': 'Estudio de…' });
      const abajo = MAG.el('div', { class: 'b3-etq-abajo', text: 'Escribe el título y pulsa Intro' });
      etq.appendChild(MAG.el('div', { class: 'b3-etq-arriba', text: 'TU ESTUDIO SE LLAMA' }));
      etq.appendChild(MAG.el('div', { class: 'b3-etq-fila' }, [MAG.el('span', { text: '«' }), txt, MAG.el('span', { text: '»' })]));
      etq.appendChild(MAG.el('div', { class: 'b3-etq-linea' }));
      etq.appendChild(abajo);
      if (MAG.datos.titulo) txt.textContent = MAG.datos.titulo;
      const fila = etq.querySelector('.b3-etq-fila');
      const ajusta = () => { let s = 64; fila.style.fontSize = s + 'px'; while (s > 34 && fila.scrollWidth > W0 - 100) { s -= 2; fila.style.fontSize = s + 'px'; } };
      const limpia = s => s.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').slice(0, 40);
      const foco = () => { txt.focus(); const r = document.createRange(); r.selectNodeContents(txt); r.collapse(false); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); };
      setTimeout(foco, 60);
      let listo = false, seguirP = null, acabar;
      const fin = new Promise(ok => { acabar = ok; });
      const bCambiar = ctx.boton('', { clase: 'mbtn-sec b3-b', icono: LAPIZ, titulo: 'Cambiar el título' });
      Object.assign(bCambiar.style, { position: 'absolute', left: ((1920 + W0) / 2 + 22) + 'px', top: '378px', width: '64px', padding: '0' });
      bCambiar.hidden = true;
      function confirma() {
        const t = limpia(txt.textContent).trim();
        if (t.replace(/[^\p{L}\p{N}]/gu, '').length < 3) { abajo.textContent = 'Escribe al menos tres letras'; abajo.classList.add('mal'); foco(); return; }
        txt.textContent = t; ajusta();
        MAG.datos.titulo = t; MAG.guardaDatos();
        listo = true; txt.setAttribute('contenteditable', 'false'); txt.blur();
        abajo.textContent = 'Así se llamará en la radio'; abajo.classList.remove('mal');
        ctx.suena('a/b3_campana.mp3', { db: -9, dur: 1.4 });
        bCambiar.hidden = false;
        seguirP = ctx.seguir(); seguirP.then(() => acabar());
      }
      const cambia = () => {
        if (!listo) return; listo = false; bCambiar.hidden = true;
        if (seguirP) { seguirP.cancela(); seguirP = null; }
        txt.setAttribute('contenteditable', 'true'); abajo.textContent = 'Escribe el título y pulsa Intro'; foco();
      };
      bCambiar.addEventListener('click', cambia);
      ctx.on(txt, 'click', () => { if (listo) cambia(); });
      ctx.on(txt, 'keydown', ev => {
        ev.stopPropagation();
        if (ev.key === 'Enter') { ev.preventDefault(); confirma(); return; }
        if (ev.key.length === 1 || ev.key === 'Backspace' || ev.key === 'Delete') {
          if (ev.key.length === 1 && limpia(txt.textContent).length >= 40) { ev.preventDefault(); return; }
          const r = ev.key === ' ' ? 0.86 : (ev.key === 'Backspace' || ev.key === 'Delete' ? 1.18 : 0.94 + Math.random() * 0.12);
          ctx.suena('a/b3_tecla.mp3', { db: -7, rate: r });
          if (abajo.classList.contains('mal')) { abajo.classList.remove('mal'); abajo.textContent = 'Escribe el título y pulsa Intro'; }
        }
      });
      ctx.on(txt, 'input', () => { const t = limpia(txt.textContent); if (t !== txt.textContent) { txt.textContent = t; foco(); } ajusta(); });
      ctx.on(txt, 'paste', ev => { ev.preventDefault(); const t = (ev.clipboardData || window.clipboardData).getData('text') || ''; document.execCommand('insertText', false, limpia(t)); });
      ctx.on(etq, 'pointerdown', ev => { if (!listo && ev.target !== txt) { ev.preventDefault(); foco(); } });
      ajusta();
      await fin;
    }
  });
})();
