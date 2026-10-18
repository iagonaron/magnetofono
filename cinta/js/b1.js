/* Magnetófono · versión interactiva · LAS ESTACIONES DE LA BOBINA 1 (Claude para Iago, 17-oct-2026, noche)
   b1_disco · b1_palanca · b1_enhebrar · b1_grabar · b1_reproducir · b1_borrar · b1_tarjetas
   Todo en el sistema del vídeo (1920×1080) y con los dibujos de la animática (b1v34.py, b1v34b.py, lupa3.py), para que el paso
   del vídeo a la estación y de la estación al vídeo no se note. Nada de fundidos: los cambios, de golpe.
   Todas se juegan con ratón o dedo y con teclado (→ / ↓ / Espacio / Intro en las de arrastrar, R para grabar, ← → en las
   tarjetas), y las de micro siguen sin micro (frase de muestra). La frase grabada: IndexedDB 'b1_frase' (el audio, si es del
   micro), MAG.datos.b1_frase = { dur, muestra, v (su huella en la cinta) } y, en esta sesión, MAG.b1.frase = { buf, rec, muestra }.
   Los recursos se rehacen con los guiones de interactiva/b1gen/ (gen_disco.py, gen_lupa.py, gen_tarjetas.py, exporta.py). */
(function () {
  'use strict';
  const D2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  /* un canvas colgado de la estación, en coordenadas del vídeo */
  function lienzo(ctx, x, y, w, h, z) {
    const c = ctx.el('canvas', { width: w, height: h, class: 'b1-lienzo' });
    Object.assign(c.style, { position: 'absolute', left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', zIndex: z || 1 });
    return c;
  }
  /* una imagen suelta en su sitio (rótulos, recortes) */
  function img(ctx, ruta, x, y, op) {
    const e = ctx.el('img', { src: MAG.url(ruta), alt: '', draggable: 'false', class: 'b1-img' });
    Object.assign(e.style, { position: 'absolute', left: x + 'px', top: y + 'px', pointerEvents: 'none', zIndex: (op && op.z) || 2 });
    if (op && op.w) e.style.width = op.w + 'px';
    return e;
  }
  const IM = r => (MAG.R[r] && MAG.R[r].img) || null;
  /* estilos propios de la bobina 1 (los rótulos «pill» de la animática y poco más) */
  (function () {
    if (document.getElementById('b1-estilos')) return;
    const st = document.createElement('style'); st.id = 'b1-estilos';
    st.textContent = '.b1-pill{position:absolute;box-sizing:border-box;padding:12px 18px 11px;border-radius:7px;background:rgb(239,229,207);color:rgb(30,26,22);'
      + 'border:2px solid rgb(150,128,96);font:700 26px/1 var(--maq);letter-spacing:.06em;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.45);z-index:4;pointer-events:none}'
      + '.b1-pill-rojo{background:rgb(242,84,70);color:rgb(255,248,236);border-color:rgb(120,30,20)}';
    document.head.appendChild(st);
  }());

  // ═══════════════════════════ 1 · b1_disco: un disco no se deja cortar ═══════════════════════════
  /* La animática (b1v34.py, anim_problema / anim_nocorta): el disco en CX 640, CY 440 (R 400), el brazo con su pivote en
     (1200, 140) y la aguja en el radio 380 (ángulo -0,62). Fondos dibujados con las mismas funciones (gen_disco.py):
     b1_disco_fondo (el problema: aros encendidos y rótulos, SIN brazo: el brazo se arrastra), b1_disco_liso (el disco liso
     con su brazo, como mientras corta el cúter) y b1_disco_roto (el disco partido, igual que el primer fotograma del tramo
     siguiente, el del «¿Ves? Un disco no se puede cortar.»). */
  const DISCO = {
    cx: 640, cy: 440, rout: 400, rin: 150, piv: { x: 1200, y: 140 }, rr0: 380, ang: -0.62,
    grieta: [[268.0, 290.0], [283.9, 299.0], [298.7, 310.0], [313.9, 320.2], [331.1, 326.6], [348.9, 332.0], [365.9, 338.9], [382.8, 346.0], [396.2, 359.6], [410.7, 371.1], [427.4, 378.6], [444.7, 384.9], [462.0, 391.1], [477.0, 401.8], [493.1, 410.4], [507.5, 422.2], [522.6, 432.5], [540.7, 437.4], [557.9, 443.9], [573.3, 453.7], [588.7, 463.6], [605.8, 470.2], [623.7, 475.4], [640.0, 483.6], [655.4, 493.6], [671.4, 502.1], [687.3, 511.1], [702.5, 521.5], [718.1, 530.9], [735.3, 537.5], [750.6, 547.5], [768.0, 553.6], [785.2, 560.0], [800.6, 570.0], [815.6, 580.6], [830.9, 590.7], [847.0, 599.1], [863.2, 607.6], [878.1, 618.4], [894.4, 626.5], [910.9, 634.3], [927.2, 642.5], [942.7, 652.2], [960.1, 658.3], [974.3, 670.5], [992.0, 676.0]]
  };
  function brazo(g, N) {
    const P = DISCO.piv, E = { x: N.x + 40, y: N.y - 52 };
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = 'rgb(199,194,184)'; g.lineWidth = 9; g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(E.x, E.y); g.stroke();
    g.strokeStyle = 'rgb(179,173,163)'; g.lineWidth = 7; g.beginPath(); g.moveTo(E.x, E.y); g.lineTo(N.x, N.y); g.stroke();
    g.fillStyle = 'rgb(107,102,97)'; g.beginPath(); g.arc(P.x, P.y, 34, 0, 7); g.fill();
    g.strokeStyle = 'rgb(217,212,199)'; g.lineWidth = 2; g.beginPath(); g.arc(P.x, P.y, 34, 0, 7); g.stroke();
    g.fillStyle = 'rgb(242,237,224)'; g.beginPath(); g.arc(N.x, N.y, 7, 0, 7); g.fill();
  }
  function cuter(g, P, d) {
    const im = IM('i/b1_disco_cuter.png'); if (!im) return;
    g.save(); g.translate(P.x, P.y); g.rotate(Math.atan2(d.y, d.x)); g.drawImage(im, -300, -60); g.restore();
  }
  function cercaDeSegmento(p, a, d, largo) {
    const b = { x: a.x - d.x * largo, y: a.y - d.y * largo }, l2 = largo * largo;
    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2; t = Math.max(0, Math.min(1, t));
    return D2(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
  }
  MAG.registra('b1_disco', {
    titulo: 'El disco que no se deja cortar',
    fondo: 'i/b1_disco_fondo.jpg',
    recursos: ['i/b1_disco_fondo.jpg', 'i/b1_disco_liso.jpg', 'i/b1_disco_roto.jpg', 'i/b1_disco_cuter.png', 'i/b1_disco_p_cuter.png',
      'i/b1_disco_p_aguja.png', 'i/b1_disco_p_raya.png', 'a/b1_disco_crepita.mp3', 'a/b1_disco_frenazo.mp3', 'a/b1_disco_pitido.mp3',
      'a/b1_disco_cuter.mp3', 'a/b1_disco_raja.mp3', 'a/b1_disco_raya.mp3'],
    async monta(ctx) {
      ctx.fondo('i/b1_disco_fondo.jpg');
      ctx.bucle('a/b1_disco_crepita.mp3', { db: -6, entra: 0.8 });
      const W = 1300, H = 1080, cv = lienzo(ctx, 0, 0, W, H, 1), g = cv.getContext('2d');
      cv.style.touchAction = 'none';
      const tagCuter = img(ctx, 'i/b1_disco_p_cuter.png', 592, 962), tagAguja = img(ctx, 'i/b1_disco_p_aguja.png', 1246, 112);
      const raya = img(ctx, 'i/b1_disco_p_raya.png', 1110, 605); raya.style.display = 'none';
      const oir = ctx.boton('', { clase: 'mbtn-sec', icono: MAG.ICO.play, titulo: 'Escuchar el disco' });
      Object.assign(oir.style, { position: 'absolute', left: '1110px', top: '612px', zIndex: 3 });
      const tj = ctx.tarjeta({ titulo: 'AHORA TÚ', texto: 'Junta el frenazo y el pitido.<br>Tienes el cúter de Odile… o&nbsp;la&nbsp;aguja.', x: 1110, y: 702, w: 740 });
      tj.style.zIndex = 3; tj.querySelector('.tj-txt').style.font = '400 33px/45px var(--maq)';
      const N0 = { x: DISCO.cx + DISCO.rr0 * Math.cos(DISCO.ang), y: DISCO.cy + DISCO.rr0 * Math.sin(DISCO.ang) };
      const REPOSO = { p: { x: 568, y: 990 }, d: (function () { const v = { x: 1, y: -0.12 }, n = Math.hypot(v.x, v.y); return { x: v.x / n, y: v.y / n }; }()) };
      const GR = DISCO.grieta, TA = { x: GR[0][0], y: GR[0][1] }, TB = { x: GR[GR.length - 1][0], y: GR[GR.length - 1][1] };
      const LT = D2(TA, TB), DIR = { x: (TB.x - TA.x) / LT, y: (TB.y - TA.y) / LT };
      let fase = 'problema', aguja = { x: N0.x, y: N0.y }, rayas = [], rayaLen = 0, nRaya = 0;
      let arrastra = null, cut = { p: { x: REPOSO.p.x, y: REPOSO.p.y }, d: REPOSO.d }, u = 0, ultimo = null, sonando = false, esq = null, tEsq = 0, porTeclado = false;
      let terminar; const fin = new Promise(r => { terminar = r; });

      function pinta(t) {
        g.clearRect(0, 0, W, H);
        if ((fase === 'problema' && arrastra === 'cuter') || fase === 'corte') {            // por dónde corta el cúter (discreto)
          const n = GR.length, k0 = fase === 'corte' ? Math.max(0, Math.round(n * u) - 1) : 0;
          g.save(); g.setLineDash([10, 12]); g.strokeStyle = 'rgba(247,245,237,0.32)'; g.lineWidth = 2; g.beginPath();
          for (let i = k0; i < n; i++) { const q = GR[i]; if (i === k0) g.moveTo(q[0], q[1]); else g.lineTo(q[0], q[1]); } g.stroke(); g.restore();
        }
        if (fase === 'problema') {
          g.lineCap = 'round';
          rayas.forEach(r => {
            if (r.length < 2) return;
            g.strokeStyle = 'rgba(8,8,8,0.92)'; g.lineWidth = 5; g.beginPath(); r.forEach((p, i) => { if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); }); g.stroke();
            g.strokeStyle = 'rgba(240,234,218,0.85)'; g.lineWidth = 2.2; g.beginPath(); r.forEach((p, i) => { if (i) g.lineTo(p.x + 1, p.y - 1); else g.moveTo(p.x + 1, p.y - 1); }); g.stroke();
          });
          brazo(g, aguja);
          cuter(g, cut.p, cut.d);
        } else if (fase === 'corte') {
          const n = GR.length, k = Math.max(2, Math.round(n * u));
          g.strokeStyle = 'rgba(247,245,237,0.95)'; g.lineWidth = 3; g.lineJoin = 'round'; g.lineCap = 'round';
          g.beginPath(); for (let i = 0; i < k; i++) { const p = GR[i]; if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); } g.stroke();
          if (arrastra === 'cuter' || porTeclado) {
            const a = GR[Math.max(0, k - 3)], b = GR[Math.min(n - 1, k - 1)];
            const d = { x: b[0] - a[0], y: b[1] - a[1] }, m = Math.hypot(d.x, d.y) || 1;
            cuter(g, { x: b[0], y: b[1] }, m > 1 ? { x: d.x / m, y: d.y / m } : DIR);
          } else cuter(g, REPOSO.p, REPOSO.d);
        } else if (fase === 'roto' && esq) {
          const dt = (t - tEsq) / 1000;
          if (dt < 0.7) esq.forEach(e => {
            const p = { x: e.p.x + e.v.x * dt * (1 - 0.5 * dt), y: e.p.y + e.v.y * dt * (1 - 0.5 * dt) }, s = e.s;
            g.fillStyle = 'rgba(20,20,22,' + (1 - dt / 0.7).toFixed(3) + ')';
            g.beginPath(); g.moveTo(p.x + s, p.y); g.lineTo(p.x - s * 0.6, p.y + s * 0.8); g.lineTo(p.x - s * 0.4, p.y - s); g.closePath(); g.fill();
          });
        }
      }
      let sucio = true; const marca = () => { sucio = true; };
      ctx.cada(t => { if (sucio || (fase === 'roto' && esq && t - tEsq < 800) || sonando) { pinta(t); sucio = false; } });

      const enDisco = p => Math.hypot(p.x - DISCO.cx, p.y - DISCO.cy) < DISCO.rout + 10;
      function empiezaCorte() {
        fase = 'corte'; ctx.fondo('i/b1_disco_liso.jpg');
        [tagCuter, tagAguja, raya, oir, tj].forEach(e => { e.style.display = 'none'; });
        ctx.suena('a/b1_disco_cuter.mp3', { db: -1 });
      }
      function rompe() {
        fase = 'roto'; arrastra = null; ctx.fondo('i/b1_disco_roto.jpg');
        ctx.suena('a/b1_disco_raja.mp3', { db: 0 }); ctx.suena('a/b1_disco_raya.mp3', { db: -10 });
        let x = 21; const rnd = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
        esq = Array.from({ length: 9 }, () => {
          const q = GR[5 + Math.floor(rnd() * (GR.length - 10))]; const a = rnd() * 6.283, sp = 120 + rnd() * 140;
          return { p: { x: q[0], y: q[1] }, v: { x: Math.cos(a) * sp, y: Math.sin(a) * sp }, s: 3 + rnd() * 4 };
        });
        tEsq = performance.now(); marca();
        setTimeout(() => terminar(), 1200);
      }
      function abajo(ev) {
        if (fase === 'roto' || sonando) return;
        const p = MAG.punto(ev);
        if (fase === 'problema' && D2(p, aguja) < 46) { arrastra = 'aguja'; rayas.push([]); }
        else if (cercaDeSegmento(p, cut.p, cut.d, 215) < 34 || (fase === 'corte' && enDisco(p))) arrastra = 'cuter';
        else return;
        ultimo = p; if (cv.setPointerCapture) { try { cv.setPointerCapture(ev.pointerId); } catch (e) {} } ev.preventDefault(); marca();
      }
      function mueve(ev) {
        const p = MAG.punto(ev);
        if (!arrastra) { cv.style.cursor = (fase !== 'roto' && ((D2(p, aguja) < 46 && fase === 'problema') || cercaDeSegmento(p, REPOSO.p, REPOSO.d, 215) < 34)) ? 'grab' : 'default'; return; }
        cv.style.cursor = 'grabbing';
        if (arrastra === 'aguja') {
          const r = Math.hypot(p.x - DISCO.cx, p.y - DISCO.cy), lim = DISCO.rout + 6;
          const q = r > lim ? { x: DISCO.cx + (p.x - DISCO.cx) * lim / r, y: DISCO.cy + (p.y - DISCO.cy) * lim / r } : p;
          const enSurcos = r > DISCO.rin + 24 && r < DISCO.rout;
          if (enSurcos) {
            const tr = rayas[rayas.length - 1]; if (tr.length) rayaLen += D2(tr[tr.length - 1], q); tr.push({ x: q.x, y: q.y });
            if (rayaLen > 60 + nRaya * 150 && nRaya < 4) { ctx.suena('a/b1_disco_raya.mp3', { db: -3, rate: 0.9 + 0.2 * Math.random() }); nRaya++; }
            if (rayaLen > 140 && raya.style.display === 'none') {
              raya.style.display = ''; oir.style.display = 'none';
              tj.querySelector('.tj-txt').innerHTML = 'La aguja raya el disco…<br>¿Y con el cúter?';
            }
          } else if (rayas[rayas.length - 1].length) rayas.push([]);
          aguja = { x: q.x, y: q.y };
        } else if (arrastra === 'cuter') {
          if (fase === 'problema') { cut = { p, d: cut.d }; if (enDisco(p)) empiezaCorte(); }
          if (fase === 'corte' && enDisco(p) && ultimo) {
            const dx = p.x - ultimo.x, dy = p.y - ultimo.y;
            u = Math.min(1, u + Math.abs(dx * DIR.x + dy * DIR.y) / LT * 1.3);
            if (u >= 1) { rompe(); return; }
          }
        }
        ultimo = p; marca();
      }
      function arriba() {
        if (arrastra === 'cuter' && fase === 'problema') cut = { p: { x: REPOSO.p.x, y: REPOSO.p.y }, d: REPOSO.d };
        arrastra = null; ultimo = null; marca();
      }
      ctx.on(cv, 'pointerdown', abajo); ctx.on(window, 'pointermove', mueve); ctx.on(window, 'pointerup', arriba);
      ctx.on(window, 'keydown', ev => {                         // con el teclado: → (o Espacio, o Intro) corta un trozo cada vez
        if (fase === 'roto' || sonando || arrastra || ev.repeat) return;
        if (ev.key !== 'ArrowRight' && ev.key !== ' ' && ev.key !== 'Enter') return;
        ev.preventDefault(); porTeclado = true;
        if (fase === 'problema') empiezaCorte();
        u = Math.min(1, u + 0.2); if (u >= 1) rompe(); else marca();
      });
      // escuchar el disco tal cual: frenazo (fuera)… mucho hueco… pitido (dentro), con la aguja que va hacia dentro
      oir.addEventListener('click', () => {
        if (sonando || fase !== 'problema') return;
        sonando = true; oir.disabled = true; const t0 = performance.now(), DUR = 4300, a0 = { x: aguja.x, y: aguja.y };
        const r0 = Math.hypot(a0.x - DISCO.cx, a0.y - DISCO.cy), an0 = Math.atan2(a0.y - DISCO.cy, a0.x - DISCO.cx);
        ctx.suena('a/b1_disco_frenazo.mp3', { db: 0 });
        setTimeout(() => { if (ctx.vivo()) ctx.suena('a/b1_disco_pitido.mp3', { db: 0 }); }, 3150);
        const paso = () => {
          if (!ctx.vivo()) return;
          const k = Math.min(1, (performance.now() - t0) / DUR), r = r0 + (DISCO.rin + 62 - r0) * k, an = an0 + 0.05 * k;
          aguja = { x: DISCO.cx + r * Math.cos(an), y: DISCO.cy + r * Math.sin(an) }; marca();
          if (k < 1) requestAnimationFrame(paso); else { sonando = false; oir.disabled = false; aguja = { x: N0.x, y: N0.y }; marca(); }
        };
        requestAnimationFrame(paso);
      });
      await fin;
    }
  });

  // ═══════════════════════════ 2 · b1_palanca: abrir la caja de Alemania ═══════════════════════════
  /* Kessler junto a la caja cerrada (el fotograma del vídeo). La palanca, metida bajo el canto de la tapa (a la derecha), se
     empuja hacia abajo: firme, pero sin pasarse de fuerza (el reloj de FUERZA lo enseña). Si se tira de golpe, la madera
     cruje y la tapa vuelve a su sitio. Al llegar abajo, chirrían los clavos y se ve la caja abierta, de golpe (el primer
     fotograma del tramo siguiente, sin subtítulo: b1_palanca_abierta, sacado del propio renderizador). */
  MAG.registra('b1_palanca', {
    titulo: 'Abrir la caja',
    recursos: ['i/b1_palanca_abierta.jpg', 'a/b1_palanca_cruje.mp3', 'a/b1_palanca_clavos.mp3', 'a/b1_palanca_virutas.mp3'],
    async monta(ctx) {
      const X0 = 1040, Y0 = 120, W = 880, H = 620, cv = lienzo(ctx, X0, Y0, W, H, 1), g = cv.getContext('2d');
      cv.style.touchAction = 'none';
      const P = { x: 1386, y: 545 }, L = 250, T0 = -58 * Math.PI / 180, T1 = 8 * Math.PI / 180;
      const GA = { x: 1790, y: 250, r: 62 };
      const tj = ctx.tarjeta({ titulo: 'AHORA TÚ', texto: 'Haz palanca para abrir la caja: firme, pero sin pasarte de fuerza.', x: 640, y: 104, w: 610 });
      tj.querySelector('.tj-txt').style.font = '400 33px/45px var(--maq)';
      const aviso = ctx.el('div', { class: 'b1-pill b1-pill-rojo', text: '¡Demasiada fuerza!' });
      Object.assign(aviso.style, { left: '1440px', top: '392px', display: 'none' });
      let th = T0, fuerza = 0, agarra = false, ultimo = null, abierta = false, quitaAviso = null, pasos = { a: false, b: false };
      let terminar; const fin = new Promise(r => { terminar = r; });
      const H_ = () => ({ x: P.x + L * Math.cos(th), y: P.y + L * Math.sin(th) });
      const prog = () => Math.max(0, Math.min(1, (th - T0) / (T1 - T0)));
      function caja(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }
      function pinta() {
        g.clearRect(0, 0, W, H); g.save(); g.translate(-X0, -Y0);
        // la holgura de la tapa: una rendija oscura que se abre por la derecha
        const q = prog(), gap = 10 * q;
        if (gap > 0.6) { g.fillStyle = 'rgba(14,9,5,0.92)'; g.beginPath(); g.moveTo(1085, 541); g.lineTo(1414, 539); g.lineTo(1414, 539 + gap); g.lineTo(1085, 541 + gap * 0.35); g.closePath(); g.fill(); }
        // la palanca (hierro, con la uña bajo la tapa y el puño de goma)
        const Hh = H_(), d = { x: Math.cos(th), y: Math.sin(th) }, n = { x: -d.y, y: d.x };
        g.lineCap = 'round';
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 16; g.beginPath(); g.moveTo(P.x + 4, P.y + 6); g.lineTo(Hh.x + 4, Hh.y + 6); g.stroke();
        g.strokeStyle = 'rgb(44,42,40)'; g.lineWidth = 13; g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(Hh.x, Hh.y); g.stroke();
        g.strokeStyle = 'rgba(160,156,148,0.85)'; g.lineWidth = 3; g.beginPath(); g.moveTo(P.x + n.x * 3, P.y + n.y * 3); g.lineTo(Hh.x + n.x * 3 - d.x * 60, Hh.y + n.y * 3 - d.y * 60); g.stroke();
        g.strokeStyle = 'rgb(44,42,40)'; g.lineWidth = 10; g.beginPath();                     // la uña, curvada hacia dentro de la caja
        g.moveTo(P.x, P.y); g.quadraticCurveTo(P.x - d.x * 18 + n.x * 10, P.y - d.y * 18 + n.y * 10, P.x - d.x * 10 + n.x * 22, P.y - d.y * 10 + n.y * 22); g.stroke();
        const G0 = { x: Hh.x - d.x * 70, y: Hh.y - d.y * 70 };
        g.strokeStyle = 'rgb(118,34,26)'; g.lineWidth = 20; g.beginPath(); g.moveTo(G0.x, G0.y); g.lineTo(Hh.x, Hh.y); g.stroke();
        g.strokeStyle = 'rgba(255,190,170,0.25)'; g.lineWidth = 4; g.beginPath(); g.moveTo(G0.x + n.x * 5, G0.y + n.y * 5); g.lineTo(Hh.x + n.x * 5, Hh.y + n.y * 5); g.stroke();
        if (!agarra && !abierta) { g.strokeStyle = 'rgba(239,229,207,0.85)'; g.lineWidth = 2.5; g.beginPath(); g.arc(Hh.x, Hh.y, 30, 0, 7); g.stroke(); }
        // el reloj de FUERZA
        g.fillStyle = 'rgba(18,15,12,0.82)'; g.strokeStyle = 'rgb(205,190,160)'; g.lineWidth = 2;
        caja(GA.x - GA.r - 18, GA.y - GA.r - 16, GA.r * 2 + 36, GA.r + 64, 10); g.fill(); g.stroke();
        const zona = (a, b, c) => { g.strokeStyle = c; g.lineWidth = 10; g.lineCap = 'butt'; g.beginPath(); g.arc(GA.x, GA.y, GA.r - 8, Math.PI + a * Math.PI, Math.PI + b * Math.PI); g.stroke(); };
        zona(0, 0.6, 'rgb(64,140,80)'); zona(0.6, 0.8, 'rgb(222,150,36)'); zona(0.8, 1, 'rgb(200,58,44)');
        const fa = Math.PI + Math.min(1, fuerza) * Math.PI;
        g.lineCap = 'round'; g.strokeStyle = 'rgb(239,229,207)'; g.lineWidth = 4; g.beginPath(); g.moveTo(GA.x, GA.y); g.lineTo(GA.x + (GA.r - 4) * Math.cos(fa), GA.y + (GA.r - 4) * Math.sin(fa)); g.stroke();
        g.fillStyle = 'rgb(239,229,207)'; g.beginPath(); g.arc(GA.x, GA.y, 6, 0, 7); g.fill();
        g.font = '700 19px "Courier Prime", monospace'; g.textAlign = 'center'; g.fillText('FUERZA', GA.x, GA.y + 34);
        g.restore();
      }
      let sucio = true; const marca = () => { sucio = true; };
      ctx.cada(() => {
        if (!agarra && fuerza > 0.01) { fuerza *= 0.86; marca(); }
        else if (agarra && ultimo && performance.now() - ultimo.t > 90 && fuerza > 0.01) { fuerza *= 0.9; marca(); }
        if (sucio) { pinta(); sucio = false; }
      });
      function cruje() {
        ctx.suena('a/b1_palanca_cruje.mp3', { db: 0 }); th = T0; fuerza = 0; agarra = false; pasos = { a: false, b: false }; marca();
        aviso.style.display = ''; if (quitaAviso) clearTimeout(quitaAviso); quitaAviso = setTimeout(() => { aviso.style.display = 'none'; }, 1700);
      }
      function abre() {
        abierta = true; agarra = false;
        ctx.suena('a/b1_palanca_clavos.mp3', { db: 0 }); setTimeout(() => { if (ctx.vivo()) ctx.suena('a/b1_palanca_virutas.mp3', { db: -2 }); }, 240);
        ctx.fondo('i/b1_palanca_abierta.jpg'); cv.style.display = 'none'; tj.style.display = 'none'; aviso.style.display = 'none';
        setTimeout(() => terminar(), 1300);
      }
      ctx.on(cv, 'pointerdown', ev => {
        if (abierta) return; const p = MAG.punto(ev), Hh = H_();
        if (D2(p, Hh) < 70 || D2(p, { x: (P.x + Hh.x) / 2, y: (P.y + Hh.y) / 2 }) < 40) {
          agarra = true; ultimo = { t: performance.now(), th }; if (cv.setPointerCapture) { try { cv.setPointerCapture(ev.pointerId); } catch (e) {} } ev.preventDefault(); marca();
        }
      });
      ctx.on(window, 'pointermove', ev => {
        const p = MAG.punto(ev);
        if (!agarra) { cv.style.cursor = !abierta && D2(p, H_()) < 70 ? 'grab' : 'default'; return; }
        cv.style.cursor = 'grabbing';
        let a = Math.atan2(p.y - P.y, p.x - P.x); a = Math.max(T0, Math.min(T1, a));
        const now = performance.now(), dt = Math.max(8, now - ultimo.t) / 1000, w = Math.abs(a - ultimo.th) / dt;
        fuerza = fuerza * 0.6 + Math.min(1.4, w / 5.2) * 0.4; ultimo = { t: now, th: a };
        th = Math.max(th, a);                                     // la tapa no baja sola mientras empujas
        const q = prog();
        if (fuerza > 0.82) { cruje(); return; }
        if (q > 0.35 && !pasos.a) { pasos.a = true; ctx.suena('a/b1_palanca_cruje.mp3', { db: -17, dur: 0.5 }); }
        if (q > 0.7 && !pasos.b) { pasos.b = true; ctx.suena('a/b1_palanca_clavos.mp3', { db: -14, dur: 0.45 }); }
        if (q >= 0.995) { abre(); return; }
        marca();
      });
      ctx.on(window, 'keydown', ev => {                         // con el teclado: ↓ (o →, Espacio, Intro) empuja un poco cada vez, firme
        if (abierta || agarra || !['ArrowDown', 'ArrowRight', ' ', 'Enter'].includes(ev.key)) return;
        ev.preventDefault(); fuerza = Math.max(fuerza, 0.42); th = Math.min(T1, th + (T1 - T0) * 0.08);
        const q = prog();
        if (q > 0.35 && !pasos.a) { pasos.a = true; ctx.suena('a/b1_palanca_cruje.mp3', { db: -17, dur: 0.5 }); }
        if (q > 0.7 && !pasos.b) { pasos.b = true; ctx.suena('a/b1_palanca_clavos.mp3', { db: -14, dur: 0.45 }); }
        if (q >= 0.995) { abre(); return; }
        marca();
      });
      ctx.on(window, 'pointerup', () => {
        if (!agarra) return; agarra = false;
        if (!abierta) { th = T0; fuerza = 0; pasos = { a: false, b: false }; ctx.suena('a/b1_palanca_clavos.mp3', { db: -18, dur: 0.25 }); }
        marca();
      });
      await fin;
    }
  });

  // ═══════════════════════════ 3 · b1_enhebrar: la cinta por los tres cabezales ═══════════════════════════
  /* La lámina 08 (el magnetófono desde arriba) con sus rótulos 1 · BORRAR, 2 · GRABAR y 3 · ESCUCHAR (el fotograma del vídeo).
     Se arrastra la punta de la cinta desde la bobina llena: rodillo de guía → borrar → grabar → escuchar → cabrestante y
     rodillo de presión → guía de la derecha → bobina vacía. Cada punto engancha con su clic; si se salta el orden, no engancha
     y se marca el que toca. Al final, el motor y la luz verde (el ojo mágico), y la cinta corre un momento. */
  const ENH = {
    ini: { x: 646, y: 586 },                                   // donde sale la cinta de la bobina llena (con su punta)
    puntos: [
      { x: 690, y: 716, r: 52, n: 'la guía de entrada' },        // el rodillo de guía de la izquierda (la cinta lo rodea)
      { x: 825, y: 716, r: 50, n: '1 · BORRAR', cab: true },
      { x: 939, y: 716, r: 50, n: '2 · GRABAR', cab: true },
      { x: 1060, y: 716, r: 50, n: '3 · ESCUCHAR', cab: true },
      { x: 1236, y: 722, r: 56, n: 'el rodillo' },                // entre el rodillo de goma (el de presión) y el cabrestante
      { x: 1486, y: 708, r: 48, n: 'la guía' },
      { x: 1418, y: 386, r: 62, n: 'la bobina vacía', fin: true }
    ],
    ojo: { x: 1263, y: 870 }
  };
  MAG.registra('b1_enhebrar', {
    titulo: 'Enhebrar la cinta',
    recursos: ['i/b1_enhebrar_ojo.png', 'a/b1_clic.mp3', 'a/b1_motor.mp3', 'a/b1_roce.mp3'],
    async monta(ctx) {
      const ojo = img(ctx, 'i/b1_enhebrar_ojo.png', 1203, 810, { z: 1 });          // el ojo mágico, apagado hasta que la cinta está puesta
      const EX = 560, EY = 320, cv = lienzo(ctx, EX, EY, 1020, 650, 2), g = cv.getContext('2d'); cv.style.touchAction = 'none';   // solo la zona de la cinta y del ojo
      const tj = ctx.tarjeta({ titulo: 'AHORA TÚ', texto: 'Enhebra la cinta: de la bobina llena, por los tres cabezales y el rodillo, hasta la vacía.', x: 34, y: 790, w: 660 });
      tj.querySelector('.tj-txt').style.font = '400 31px/42px var(--maq)';
      let hechos = [], arrastra = false, P = null, aviso = null, avisoHasta = 0, corre = 0, terminado = false, roce = null;
      let terminar; const fin = new Promise(r => { terminar = r; });
      const siguiente = () => ENH.puntos[hechos.length];
      function camino(conPuntero) {
        const c = [ENH.ini]; hechos.forEach(i => c.push(ENH.puntos[i]));
        if (conPuntero && P) c.push(P);
        return c;
      }
      function pinta(t) {
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 1020, 650); g.setTransform(1, 0, 0, 1, -EX, -EY);
        const c = camino(arrastra);
        if (c.length > 1 || arrastra) {
          g.lineCap = 'round'; g.lineJoin = 'round';
          g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 12; g.beginPath(); c.forEach((p, i) => { if (i) g.lineTo(p.x + 3, p.y + 4); else g.moveTo(p.x + 3, p.y + 4); }); g.stroke();
          g.strokeStyle = 'rgb(96,54,34)'; g.lineWidth = 9; g.beginPath(); c.forEach((p, i) => { if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); }); g.stroke();
          g.strokeStyle = 'rgba(200,140,100,0.55)'; g.lineWidth = 2; g.beginPath(); c.forEach((p, i) => { if (i) g.lineTo(p.x, p.y - 2); else g.moveTo(p.x, p.y - 2); }); g.stroke();
          if (corre) {                                             // la cinta corre: unas marcas que avanzan
            g.save(); g.setLineDash([3, 26]); g.lineDashOffset = -((t - corre) / 1000) * 260; g.strokeStyle = 'rgba(255,225,190,0.75)'; g.lineWidth = 4;
            g.beginPath(); c.forEach((p, i) => { if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); }); g.stroke(); g.restore();
          }
        }
        // la punta de la cinta (donde se coge)
        const pt = arrastra && P ? P : (hechos.length ? ENH.puntos[hechos[hechos.length - 1]] : ENH.ini);
        if (pt && !terminado) {
          g.fillStyle = 'rgb(245,240,226)'; g.save(); g.translate(pt.x, pt.y); g.rotate(0.6); g.fillRect(-6, -8, 22, 16); g.restore();
          if (!arrastra) { g.strokeStyle = 'rgba(239,229,207,0.9)'; g.lineWidth = 2.5; g.beginPath(); g.arc(pt.x, pt.y, 26, 0, 7); g.stroke(); }
        }
        // el punto que toca (aro crema) y, si se ha saltado el orden, el aviso en rojo
        const s = siguiente();
        if (s && arrastra && !terminado) { g.strokeStyle = 'rgba(239,229,207,0.9)'; g.lineWidth = 3; g.setLineDash([8, 7]); g.beginPath(); g.arc(s.x, s.y, s.r - 14, 0, 7); g.stroke(); g.setLineDash([]); }
        if (aviso && t < avisoHasta) { g.strokeStyle = 'rgba(242,84,70,0.95)'; g.lineWidth = 4; g.beginPath(); g.arc(aviso.x, aviso.y, aviso.r - 10, 0, 7); g.stroke(); }
        if (terminado) {                                           // el ojo mágico, encendido
          const gr = g.createRadialGradient(ENH.ojo.x, ENH.ojo.y, 4, ENH.ojo.x, ENH.ojo.y, 92);
          gr.addColorStop(0, 'rgba(170,255,150,0.75)'); gr.addColorStop(0.45, 'rgba(90,230,90,0.35)'); gr.addColorStop(1, 'rgba(60,200,60,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(ENH.ojo.x, ENH.ojo.y, 92, 0, 7); g.fill();
        }
      }
      let sucio = true; const marca = () => { sucio = true; };
      let tUlt = 0;
      ctx.cada(t => { if (sucio || ((corre || (aviso && t < avisoHasta + 50)) && t - tUlt > 33)) { pinta(t); sucio = false; tUlt = t; } });
      ctx.on(cv, 'pointerdown', ev => {
        if (terminado) return; const p = MAG.punto(ev);
        const punta = hechos.length ? ENH.puntos[hechos[hechos.length - 1]] : ENH.ini;
        if (D2(p, punta) < 60 || (hechos.length && D2(p, punta) < 80)) {
          arrastra = true; P = p; if (cv.setPointerCapture) { try { cv.setPointerCapture(ev.pointerId); } catch (e) {} }
          roce = ctx.suena('a/b1_roce.mp3', { db: -10, bucle: true, entra: 0.15 }); ev.preventDefault(); marca();
        }
      });
      ctx.on(window, 'pointermove', ev => {
        const p = MAG.punto(ev);
        if (!arrastra) {
          const punta = hechos.length ? ENH.puntos[hechos[hechos.length - 1]] : ENH.ini;
          cv.style.cursor = !terminado && D2(p, punta) < 60 ? 'grab' : 'default'; return;
        }
        P = p; cv.style.cursor = 'grabbing';
        const s = siguiente();
        if (s && D2(p, s) < s.r) {
          hechos.push(ENH.puntos.indexOf(s)); ctx.suena('a/b1_clic.mp3', { db: s.cab ? -2 : -6 });
          if (s.fin) acaba();
        } else {
          const otro = ENH.puntos.find((q, i) => i > hechos.length && q.cab && D2(p, q) < q.r - 8);
          if (otro && (!aviso || performance.now() > avisoHasta)) { aviso = s; avisoHasta = performance.now() + 900; ctx.suena('a/b1_clic.mp3', { db: -16, rate: 0.7 }); }
        }
        marca();
      });
      ctx.on(window, 'pointerup', () => { if (!arrastra) return; arrastra = false; P = null; if (roce) { roce.parar(0.1); roce = null; } marca(); });
      ctx.on(window, 'keydown', ev => {                         // con el teclado: → (o Espacio, o Intro) engancha el punto siguiente
        if (terminado || arrastra || ev.repeat || !['ArrowRight', ' ', 'Enter'].includes(ev.key)) return;
        ev.preventDefault(); const s = siguiente(); if (!s) return;
        hechos.push(ENH.puntos.indexOf(s)); ctx.suena('a/b1_clic.mp3', { db: s.cab ? -2 : -6 }); marca();
        if (s.fin) acaba();
      });
      function acaba() {
        terminado = true; arrastra = false; P = null; if (roce) { roce.parar(0.1); roce = null; }
        tj.style.display = 'none'; ojo.style.display = 'none';
        ctx.suena('a/b1_clic.mp3', { db: 0 }); ctx.suena('a/b1_motor.mp3', { db: -4 });
        corre = performance.now(); marca();
        setTimeout(() => { corre = 0; marca(); }, 2300);
        setTimeout(() => terminar(), 2500);
      }
      await fin;
    }
  });

  // ═══════════════════════════ 4–6 · la lupa magnética: b1_grabar · b1_reproducir · b1_borrar ═══════════════════════════
  /* Las mismas piezas que la animación de Kessler (lupa3.py, dentro de b1v34b.py): el fondo oscurecido de la lámina 08, la
     cinta de verdad (K1), los cabezales en rayos X con su anillo y su bobina, el micro y el altavoz, y las brújulas en cuatro
     filas (cada 24 px; blanco y rosa sueltas, blanco y rojo grabadas: apuntan a un lado o al otro según la onda). Los fondos
     salen del propio guion (gen_lupa.py) con todo lo quieto; aquí se dibuja lo que se mueve: la cinta y sus brújulas (un
     canvas de 1920×182 solo mientras corre, a 30 imágenes por segundo), la onda del cable y el campo de la ranura.
     La cinta corre de izquierda a derecha (borrar 820 → grabar 1180 → escuchar 1560), a 90 px/s como en el vídeo. */
  const LU = { XR: 1180, XP: 1560, XE: 820, YC: 455, RO: 112, YT0: 588, YT1: 706, FILAS: [604, 633, 662, 691], PASO: 24, V: 90, CY0: 530, PX: 2 };
  const BLANCO = 'rgb(236,242,255)', ROJO_L = 'rgb(242,84,70)', ROSA = 'rgb(238,120,110)';
  const B1M = { buf: null, rec: null, muestra: false };          // la frase grabada (en memoria) y su huella en la cinta
  MAG.b1 = Object.assign(MAG.b1 || {}, { frase: B1M });          // a mano de las otras bobinas (la frase del alumno, en esta sesión)
  const az = (j, r, s) => ((((j * 73856093) ^ ((r + 7 * (s || 0)) * 19349663)) & 0xFFFFFF) / 0xFFFFFF) * 2 * Math.PI;
  const portadora = t => 0.72 * Math.sin(2 * Math.PI * 0.85 * t) + 0.28 * Math.sin(2 * Math.PI * 2.3 * t + 1.1);   // la onda «lenta» del vídeo
  /* la cinta: X = cuánto ha corrido (x en pantalla = u + X) · rec = la huella grabada (v[k] en u = -k·PX; u = 0, donde empezó) */
  function laCinta(ctx, X0) {
    const cv = lienzo(ctx, 0, LU.CY0, 1920, 182, 1), g = cv.getContext('2d'), banda = IM('i/b1_lupa_cinta.jpg');
    const C = { X: X0, v: 0, vObj: 0, rec: null, borrado: null, campo: null, sucio: true, ultimo: 0 };
    C.valor = u => {
      const R = C.rec; if (!R || u > 0.5) return null;
      const k = -u / LU.PX; if (k > R.n - 1) return null;
      const i = Math.floor(k), f = k - i, a = R.v[i], b = R.v[Math.min(R.n - 1, i + 1)];
      return a + (b - a) * f;
    };
    C.pinta = () => {
      g.clearRect(0, 0, 1920, 182);
      const off = ((Math.round(C.X) % 1920) + 1920) % 1920;
      if (banda) { g.drawImage(banda, off, LU.YT0 - LU.CY0); if (off > 0) g.drawImage(banda, off - 1920, LU.YT0 - LU.CY0); }
      const X = C.X, j0 = Math.floor((-20 - X) / LU.PASO) - 1, j1 = Math.ceil((1940 - X) / LU.PASO) + 1, B = C.borrado;
      const pB = new Path2D(), pR = new Path2D(), pS = new Path2D();
      for (let r = 0; r < 4; r++) {
        const yy = LU.FILAS[r] - LU.CY0;
        for (let j = j0; j < j1; j++) {
          const xi = j * LU.PASO + ((((j * 7 + r * 11) % 9) + 9) % 9 - 4), xx = xi + X;
          if (xx < -12 || xx > 1932) continue;
          let an, fz = 0;
          if (B && xi >= B[0] && xi <= B[1]) an = az(j, r, 1);
          else { const s = C.valor(xi); if (s == null) an = az(j, r, 0); else { an = s > 0 ? 0 : Math.PI; fz = Math.min(1, Math.abs(s)); } }
          const ln = 9 + 4 * fz, dx = ln * Math.cos(an), dy = ln * Math.sin(an);
          pB.moveTo(xx - dx, yy - dy); pB.lineTo(xx, yy);
          const p = fz >= 0.15 ? pR : pS; p.moveTo(xx, yy); p.lineTo(xx + dx, yy + dy);
        }
      }
      g.lineCap = 'round';
      g.strokeStyle = BLANCO; g.lineWidth = 2; g.stroke(pB);
      g.strokeStyle = ROSA; g.lineWidth = 3; g.stroke(pS);
      g.strokeStyle = ROJO_L; g.lineWidth = 3; g.stroke(pR);
      if (C.campo) {                                               // el campo en la ranura: crece, mengua y cambia de sentido
        const { x, v } = C.campo, y0 = LU.YT0 + 2 - LU.CY0, a = Math.abs(v);
        g.strokeStyle = ROJO_L; g.lineWidth = 2;
        for (let k = 1; k < 4; k++) { const rr = Math.round(8 + 12 * k * a); if (rr > 6) { g.beginPath(); g.ellipse(x, y0, rr + 6, rr, 0, 0, Math.PI); g.stroke(); } }
        const sg = v > 0 ? 1 : -1, ya = LU.YT0 - 14 - LU.CY0; g.lineWidth = 3; g.beginPath();
        g.moveTo(x - 20 * sg, ya); g.lineTo(x + 20 * sg, ya); g.moveTo(x + 20 * sg, ya); g.lineTo(x + 12 * sg, ya - 6); g.moveTo(x + 20 * sg, ya); g.lineTo(x + 12 * sg, ya + 6); g.stroke();
      }
    };
    /* un paso del motor de la cinta (acelera y frena como en el vídeo: unos 0,8 s hasta 90 px/s) */
    C.paso = (dt) => { const k = Math.min(1, dt / 0.25); C.v += (C.vObj - C.v) * k; if (Math.abs(C.v) < 0.5 && C.vObj === 0) C.v = 0; C.X += C.v * dt; if (C.v) C.sucio = true; };
    C.quieta = () => C.v === 0 && C.vObj === 0;
    C.lienzo = cv;
    return C;
  }
  /* el que graba: va escribiendo la huella bajo un cabezal (x) según la cinta corre; s = la onda (con signo) en ese momento */
  function grabador(C, x, max) {
    const R = { v: new Float32Array(Math.ceil((max * LU.V + 60) / LU.PX) + 2), n: 0, ultS: 0 };
    C.rec = R;
    R.escribe = s => {
      const u = x - C.X, k = Math.floor(-u / LU.PX);
      if (k < 0) return;
      const hasta = Math.min(R.v.length - 1, k);
      for (let i = R.n; i <= hasta; i++) { const f = hasta > R.n ? (i - R.n) / (hasta - R.n) : 1; R.v[i] = R.ultS + (s - R.ultS) * f; }
      if (hasta >= R.n) R.n = hasta + 1; R.ultS = s;
    };
    return R;
  }
  /* la envolvente de un buffer (RMS cada 20 ms, normalizada) para dibujar su huella */
  function envolvente(buf) {
    const c = buf.getChannelData(0), sr = buf.sampleRate, w = Math.floor(sr * 0.02), n = Math.floor(c.length / w), e = new Float32Array(n);
    let mx = 1e-6;
    for (let i = 0; i < n; i++) { let s = 0; for (let j = i * w; j < (i + 1) * w; j++) s += c[j] * c[j]; e[i] = Math.sqrt(s / w); if (e[i] > mx) mx = e[i]; }
    for (let i = 0; i < n; i++) e[i] = e[i] < mx * 0.04 ? 0 : Math.pow(e[i] / mx, 0.8);
    return t => { const k = t / 0.02, i = Math.floor(k); if (i < 0 || i >= n - 1) return 0; return e[i] + (e[i + 1] - e[i]) * (k - i); };
  }
  /* la huella de un buffer, como si se grabara ahora mismo (para la muestra, o si falta la del alumno) */
  function huellaDe(buf) {
    const C = { X: 0, v: 0, vObj: LU.V }, env = envolvente(buf), dur = buf.duration, R = grabador(C, 0, dur + 0.5);
    for (let t = 0; t <= dur + 0.4; t += 1 / 60) {
      const k = Math.min(1, (1 / 60) / 0.25); C.v += (C.vObj - C.v) * k; C.X += C.v / 60;
      R.escribe(Math.max(-1, Math.min(1, 1.3 * env(t) * portadora(t))));
    }
    return { v: R.v, n: R.n };
  }
  function normaliza(b) {
    const c = b.getChannelData(0); let p = 0; for (let i = 0; i < c.length; i++) p = Math.max(p, Math.abs(c[i]));
    if (p > 0.001) { const k = 0.89 / p; for (let i = 0; i < c.length; i++) c[i] *= k; }
    return b;
  }
  /* la frase del alumno (memoria → IndexedDB → la muestra) y su huella (memoria → MAG.datos → calculada) */
  async function laFrase() {
    let buf = B1M.buf, muestra = B1M.muestra;
    if (!buf) { try { const o = await Promise.race([MAG.idbLee('b1_frase'), new Promise(r => setTimeout(() => r(null), 900))]); if (o) { buf = MAG.objABuf(o); muestra = !!(MAG.datos.b1_frase && MAG.datos.b1_frase.muestra); } } catch (e) {} }
    if (!buf) { buf = MAG.R['a/b1_frase_muestra.mp3'] && MAG.R['a/b1_frase_muestra.mp3'].buf; muestra = true; }
    let rec = B1M.rec;
    if (!rec && MAG.datos.b1_frase && MAG.datos.b1_frase.v && B1M.buf == null && !muestra) rec = { v: Float32Array.from(MAG.datos.b1_frase.v), n: MAG.datos.b1_frase.v.length };
    if (!rec && buf) rec = huellaDe(buf);
    return { buf, rec, muestra };
  }
  /* la onda del cable (micro → bobina, o bobina → altavoz): la historia de la señal, a 60 por segundo */
  function onda(ctx, x0, x1, y, caja) {
    const cv = lienzo(ctx, caja[0], caja[1], caja[2], caja[3], 2), g = cv.getContext('2d');
    const O = { h: new Float32Array(1200), n: 0, t0: 0, viva: false, arcos: 0 };
    O.pon = (t, s) => { const k = Math.floor((t - O.t0) * 60); for (let i = Math.max(0, O.n); i <= Math.min(1199, k); i++) O.h[i] = s; O.n = Math.max(O.n, Math.min(1199, k) + 1); };
    O.en = t => { const k = Math.floor((t - O.t0) * 60); return k < 0 || k >= O.n ? 0 : O.h[k]; };
    O.pinta = (t, conArcos) => {
      g.clearRect(0, 0, caja[2], caja[3]); g.lineCap = 'round'; g.lineJoin = 'round';
      const yy = y - caja[1], xa = x0 - caja[0], xb = x1 - caja[0];
      if (!O.viva) { g.strokeStyle = BLANCO; g.lineWidth = 2; g.beginPath(); g.moveTo(xa, yy); g.lineTo(xb, yy); g.stroke(); return; }
      const dir = x1 > x0 ? 1 : -1;
      g.strokeStyle = ROJO_L; g.lineWidth = 3; g.beginPath();
      for (let x = 0; x <= Math.abs(xb - xa); x += 3) { const v = O.en(t - x / 260); const px = xa + dir * x; if (x) g.lineTo(px, yy - 40 * v); else g.moveTo(px, yy - 40 * v); }
      g.stroke();
      if (conArcos) {                                             // el altavoz suena: tres arcos que salen
        const a = Math.abs(O.en(t)), sx = 1790 + 20 - caja[0], sy = 196 - caja[1];
        if (a > 0.15) { g.strokeStyle = ROJO_L; g.lineWidth = 3; g.globalAlpha = Math.min(1, a);
          for (let k = 0; k < 3; k++) { const rr = 40 + 22 * k + Math.floor(10 * ((t * 2) % 1)); g.beginPath(); g.arc(sx, sy, rr, -40 * Math.PI / 180, 40 * Math.PI / 180); g.stroke(); }
          g.globalAlpha = 1; }
      }
    };
    return O;
  }
  /* la tarjeta y los botones de la lupa, arriba a la izquierda (donde el vídeo no tiene nada) */
  function mesaLupa(ctx, texto, w) {
    const tj = ctx.tarjeta({ titulo: 'AHORA TÚ', texto, x: 60, y: 136, w: w || 640 });
    tj.style.zIndex = 6; tj.querySelector('.tj-txt').style.font = '400 31px/42px var(--maq)';
    const fila = ctx.el('div', { class: 'b1-fila' }); Object.assign(fila.style, { position: 'absolute', left: '60px', top: '430px', display: 'flex', gap: '18px', zIndex: 6 });
    return { tj, fila, txt: h => { tj.querySelector('.tj-txt').innerHTML = h; } };
  }
  const RECURSOS_LUPA = ['i/b1_lupa_cinta.jpg', 'a/b1_lupa_amb.mp3', 'a/b1_tecla.mp3', 'i/b1_lupa_k05.png'];
  /* Kessler, pequeño, abajo a la izquierda, ESCUCHANDO (K05): como en el vídeo (b1v35b, figura_peq: cabeza de 150 px).
     Mientras el alumno graba, escucha o borra, él no habla: la pose de escucha (nota de Iago, 17-oct 22.27). */
  const KESSLER_ESCUCHA = (ctx) => { ctx.figura('i/b1_lupa_k05.png', { caja: [30, 597, 400, 483] }).el.style.zIndex = 3; };
  /* ayudas locales: un bucle sin el hueco del mp3 (se salta el relleno del principio y del final) y «al salir» (lo que hay
     que soltar si el motor quita la estación a medias, p. ej. el micro: ctx.limpia() llama a removeEventListener de lo de ctx.on) */
  function bucleLimpio(ctx, ruta, db) {
    const b = MAG.R[ruta] && MAG.R[ruta].buf, d = b ? b.duration : 0;
    return ctx.bucle(ruta, Object.assign({ db, entra: 0.6 }, d > 0.4 ? { bucleDesde: 0.05, bucleHasta: d - 0.05, desde: 0.05 } : {}));
  }
  function alSalir(ctx, fn) { ctx.on({ addEventListener() {}, removeEventListener() { try { fn(); } catch (e) {} } }, 'b1-salir', () => {}); }

  // ── 4 · b1_grabar ──
  MAG.registra('b1_grabar', {
    titulo: 'Grabar una frase',
    fondo: 'i/b1_grabar_fondo.jpg',
    recursos: RECURSOS_LUPA.concat(['i/b1_grabar_fondo.jpg', 'i/b1_lupa_bob_grabar.png', 'i/b1_lupa_o13.png', 'a/b1_tic.mp3', 'a/b1_frase_muestra.mp3']),
    async monta(ctx) {
      ctx.fondo('i/b1_grabar_fondo.jpg');
      bucleLimpio(ctx, 'a/b1_lupa_amb.mp3', -6);
      const C = laCinta(ctx, LU.XR), mic = onda(ctx, 945, 1144, 190, [936, 140, 216, 102]);
      const bob = img(ctx, 'i/b1_lupa_bob_grabar.png', LU.XR - 56, 326, { z: 2 }); bob.style.display = 'none';
      ctx.figura('i/b1_lupa_o13.png', { caja: [1385, 597, 498, 483] }).el.style.zIndex = 3;     // Odile escucha con los auriculares
      KESSLER_ESCUCHA(ctx);
      const M = mesaLupa(ctx, 'Graba una frase con el micro y mira cómo se ordenan las partículas.');
      const bRec = ctx.boton('Grabar', { clase: 'mbtn-prin', icono: MAG.ICO.rec, padre: M.fila }); bRec.querySelector('.mbtn-ic').style.color = 'var(--rojo)';
      const bMuestra = ctx.boton('Usar una frase de muestra', { clase: 'mbtn-prin', icono: MAG.ICO.play, padre: M.fila }); bMuestra.style.display = 'none';
      const bOtra = ctx.boton('', { clase: 'mbtn-sec', icono: MAG.ICO.otra, titulo: 'Grabar otra vez', padre: M.fila }); bOtra.style.display = 'none';
      const cuenta = ctx.el('div', { class: 'b1-cuenta' });
      Object.assign(cuenta.style, { position: 'absolute', left: '830px', top: '318px', width: '150px', textAlign: 'center', font: '900 150px/1 var(--tit)', color: 'var(--crema)', textShadow: '0 6px 24px rgba(0,0,0,.6)', zIndex: 6, display: 'none', pointerEvents: 'none' });
      let estado = 'listo', g = null, t0 = 0, env = null, pk = 0.02, nivel = 0, fuenteMuestra = null, seguir = null, rec = null, tAnt = 0;
      const ahora = () => performance.now() / 1000;
      ctx.cada(tms => {
        const t = tms / 1000, dt = Math.min(0.05, t - (tAnt || t)); tAnt = t;
        C.paso(dt);
        if (estado === 'grabando') {
          const tt = ahora() - t0; let e = 0;
          if (env) e = env(tt); else { pk = Math.max(pk * 0.997, nivel, 0.02); e = nivel < 0.004 ? 0 : Math.pow(Math.min(1, nivel / pk), 0.8); }
          const s = Math.max(-1, Math.min(1, 1.3 * e * portadora(tt)));
          rec.escribe(s); mic.pon(ahora(), s); C.campo = { x: LU.XR, v: s };
          if (tt > 8) para();
        }
        if (C.sucio && t - C.ultimo > 0.03) { C.pinta(); C.sucio = false; C.ultimo = t; }
        if (estado === 'grabando' || mic.viva) mic.pinta(ahora(), false);
      });
      C.pinta(); mic.pinta(0);
      function empieza(conMuestra) {
        estado = 'grabando'; bRec.querySelector('.mbtn-tx').textContent = 'Parar'; bRec.querySelector('.mbtn-ic').innerHTML = MAG.ICO.stop;
        bRec.style.display = ''; bMuestra.style.display = 'none'; bOtra.style.display = 'none';
        C.X = LU.XR; C.borrado = null; rec = grabador(C, LU.XR, 8.4); C.vObj = LU.V; bob.style.display = '';
        mic.t0 = ahora(); mic.n = 0; mic.viva = true; t0 = ahora();
        MAG.botonera.enclava('rec'); MAG.botonera.rotulo('GRABANDO');
        if (conMuestra) {
          const b = MAG.R['a/b1_frase_muestra.mp3'] && MAG.R['a/b1_frase_muestra.mp3'].buf;
          env = b ? envolvente(b) : (() => 0); B1M.buf = b; B1M.muestra = true;
          fuenteMuestra = ctx.suena('a/b1_frase_muestra.mp3', { db: 0 });
          fuenteMuestra.fin.then(() => { if (ctx.vivo() && estado === 'grabando') setTimeout(() => { if (estado === 'grabando') para(); }, 350); });
        } else env = null;
      }
      async function para() {
        if (estado !== 'grabando') return;
        estado = 'parando'; C.vObj = 0; C.campo = null; if (fuenteMuestra) { fuenteMuestra.parar(0.06); fuenteMuestra = null; } bob.style.display = 'none'; mic.viva = false; mic.pinta(0);
        MAG.botonera.enclava(null); MAG.botonera.rotulo(''); ctx.suena('a/b1_tecla.mp3', { db: -6 });
        bRec.style.display = 'none';
        let buf = null;
        if (g) { try { buf = await g.para(); } catch (e) { buf = null; } g = null; }
        if (buf) { B1M.buf = normaliza(buf); B1M.muestra = false; }
        else if (!B1M.buf) { B1M.buf = MAG.R['a/b1_frase_muestra.mp3'] && MAG.R['a/b1_frase_muestra.mp3'].buf; B1M.muestra = true; }
        B1M.rec = { v: rec.v.slice(0, rec.n), n: rec.n };
        MAG.datos.b1_frase = { dur: B1M.buf ? +B1M.buf.duration.toFixed(2) : 0, muestra: B1M.muestra, v: Array.from(B1M.rec.v, x => Math.round(x * 100) / 100) };
        try { MAG.guardaDatos(); } catch (e) {}
        if (B1M.buf && !B1M.muestra) MAG.idbPon('b1_frase', MAG.bufAObj(B1M.buf)).catch(() => {});
        if (!ctx.vivo()) return;
        estado = 'hecho'; bOtra.style.display = ''; M.txt('Graba una frase con el micro y mira cómo se ordenan las partículas.');
        if (!seguir) { seguir = ctx.seguir(); seguir.then(() => terminar()); }
      }
      let terminar; const fin = new Promise(r => { terminar = r; });
      async function pulsaRec(deBotonera) {
        if (estado === 'grabando') { para(); return; }
        if (estado !== 'listo' && estado !== 'hecho' && estado !== 'sinmicro') return;
        if (!deBotonera) ctx.suena('a/b1_tecla.mp3', { db: -4 });
        estado = 'abriendo'; bRec.disabled = true; bOtra.style.display = 'none';
        const avisa = setTimeout(() => { if (estado === 'abriendo') { bMuestra.style.display = ''; } }, 5000);
        const st = await MAG.mic.abre(); clearTimeout(avisa);
        if (!ctx.vivo() || estado !== 'abriendo') return;
        bRec.disabled = false;
        if (!st) { estado = 'sinmicro'; M.txt('No encuentro el micrófono. Puedes grabar una frase de muestra.'); bRec.style.display = 'none'; bMuestra.style.display = ''; return; }
        estado = 'cuenta'; bRec.style.display = 'none'; bMuestra.style.display = 'none';
        C.X = LU.XR; C.rec = null; C.sucio = true;                // la cinta, en blanco otra vez
        for (const n of ['3', '2', '1']) { cuenta.textContent = n; cuenta.style.display = ''; ctx.suena('a/b1_tic.mp3', { db: -4 }); await MAG.espera(800); if (!ctx.vivo()) return; }
        cuenta.style.display = 'none';
        g = await MAG.mic.graba({ max: 8.6, recorta: false, alNivel: r => { nivel = r; } });
        if (!ctx.vivo()) { if (g) g.para(); return; }
        if (g.error) { g = null; estado = 'sinmicro'; M.txt('No encuentro el micrófono. Puedes grabar una frase de muestra.'); bMuestra.style.display = ''; return; }
        ctx.suena('a/b1_tecla.mp3', { db: -6 }); empieza(false);
      }
      bRec.addEventListener('click', () => pulsaRec(false));
      ctx.botonera('rec', () => pulsaRec(true));
      bOtra.addEventListener('click', () => { if (estado === 'hecho') { C.rec = null; C.X = LU.XR; C.sucio = true; bRec.querySelector('.mbtn-tx').textContent = 'Grabar'; bRec.querySelector('.mbtn-ic').innerHTML = MAG.ICO.rec; bRec.style.display = ''; pulsaRec(false); } });
      bMuestra.addEventListener('click', async () => {
        if (estado === 'grabando' || estado === 'cuenta') return;
        estado = 'cuenta'; bMuestra.style.display = 'none'; bRec.style.display = 'none'; ctx.suena('a/b1_tecla.mp3', { db: -4 });
        C.X = LU.XR; C.rec = null; C.sucio = true;
        await MAG.espera(250); if (!ctx.vivo()) return; empieza(true);
      });
      ctx.on(window, 'keydown', ev => { if ((ev.key === 'r' || ev.key === 'R') && !ev.repeat) { ev.preventDefault(); pulsaRec(false); } });
      alSalir(ctx, () => { if (g) { try { g.para(); } catch (e) {} g = null; } });
      await fin;
    }
  });

  /* un conmutador de dos posiciones (como los del vídeo: crema la elegida, cristal oscuro la otra) */
  (function () {
    if (document.getElementById('b1-estilos-lupa')) return;
    const st = document.createElement('style'); st.id = 'b1-estilos-lupa';
    st.textContent = '.b1-conm{position:absolute;display:flex;border:2px solid rgba(205,190,160,.85);border-radius:12px;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,.45);z-index:6}'
      + '.b1-conm button{height:60px;padding:0 24px;border:0;margin:0;font:700 25px/1 var(--maq);letter-spacing:.02em;cursor:pointer;outline:none;background:rgba(18,15,12,.82);color:var(--crema);display:flex;align-items:center;gap:10px}'
      + '.b1-conm button+button{border-left:2px solid rgba(205,190,160,.6)}'
      + '.b1-conm button.on{background:var(--crema);color:var(--tinta)}'
      + '.b1-conm button[disabled]{cursor:default}'
      + '.b1-conm .b1-ok{display:none;width:22px;height:22px}.b1-conm button.oido .b1-ok{display:inline-block}';
    document.head.appendChild(st);
  }());
  const OK_SVG = '<svg class="b1-ok" viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // ── 5 · b1_reproducir ──
  MAG.registra('b1_reproducir', {
    titulo: 'Reproducir y comparar',
    fondo: 'i/b1_reproducir_fondo.jpg',
    recursos: RECURSOS_LUPA.concat(['i/b1_reproducir_fondo.jpg', 'i/b1_lupa_bob_escuchar.png', 'i/b1_lupa_r_play.png', 'i/b1_lupa_r_rebobina.png',
      'a/b1_frase_muestra.mp3', 'a/b1_rebobina.mp3', 'a/b1_disco_crepita.mp3']),
    async monta(ctx) {
      ctx.fondo('i/b1_reproducir_fondo.jpg');
      bucleLimpio(ctx, 'a/b1_lupa_amb.mp3', -6);
      const F = await laFrase(); if (!ctx.vivo()) return;
      const X0 = LU.XP - 90, C = laCinta(ctx, X0); C.rec = F.rec;
      const alt = onda(ctx, 1596, 1746, 190, [1588, 128, 328, 140]);
      const bob = img(ctx, 'i/b1_lupa_bob_escuchar.png', LU.XP - 56, 326, { z: 2 }); bob.style.display = 'none';
      const rPlay = img(ctx, 'i/b1_lupa_r_play.png', 300, 544, { z: 2 }), rRew = img(ctx, 'i/b1_lupa_r_rebobina.png', 300, 544, { z: 2 });
      rPlay.style.display = rRew.style.display = 'none';
      KESSLER_ESCUCHA(ctx);
      const M = mesaLupa(ctx, 'Reprodúcela y compárala con el fonógrafo.');
      const conm = MAG.el('div', { class: 'b1-conm' }); conm.style.position = 'relative'; M.fila.appendChild(conm);
      const modos = [['fono', 'Como en el fonógrafo'], ['cinta', 'En cinta']].map(([k, t]) => {
        const b = MAG.el('button', { type: 'button', html: '<span>' + t + '</span>' + OK_SVG }); b.dataset.k = k; conm.appendChild(b); return b;
      });
      const bPlay = ctx.boton('Escuchar', { clase: 'mbtn-prin', icono: MAG.ICO.play, padre: M.fila });
      let modo = 'cinta', estado = 'listo', oido = { fono: false, cinta: false }, sonido = null, crepita = null, filtro = null, tAnt = 0, seguir = null;
      const pon = k => { modo = k; modos.forEach(b => b.classList.toggle('on', b.dataset.k === k)); };
      pon('cinta');
      modos.forEach(b => b.addEventListener('click', () => { if (estado === 'listo') { pon(b.dataset.k); ctx.suena('a/b1_tecla.mp3', { db: -10 }); } }));
      let terminar; const fin = new Promise(r => { terminar = r; });
      const ahora = () => performance.now() / 1000;
      ctx.cada(tms => {
        const t = tms / 1000, dt = Math.min(0.05, t - (tAnt || t)); tAnt = t;
        if (estado === 'rebobina') { C.X += (X0 - C.X) * Math.min(1, dt * 7); C.sucio = true; if (Math.abs(C.X - X0) < 1) { C.X = X0; listo(); } }
        else C.paso(dt);
        if (estado === 'suena' || estado === 'arranca') {
          const s = C.valor(LU.XP - C.X); const v = s == null ? 0 : s;
          alt.pon(ahora(), v); bob.style.display = Math.abs(v) > 0.05 ? '' : 'none';
          if (estado === 'arranca' && C.X - X0 >= 90) { estado = 'suena'; arrancaSonido(); }
        }
        if (C.sucio && t - C.ultimo > 0.03) { C.pinta(); C.sucio = false; C.ultimo = t; }
        if (alt.viva) alt.pinta(ahora(), true);
      });
      C.pinta(); alt.pinta(0, true);
      function arrancaSonido() {
        if (!F.buf) { setTimeout(acaba, 1500); return; }
        if (modo === 'fono') {
          filtro = MAG.filtro('fonografo'); filtro.salida.connect(MAG.master);
          sonido = ctx.suena(F.buf, { db: -1, destino: filtro.entrada });
          crepita = ctx.suena('a/b1_disco_crepita.mp3', { db: -9, bucle: true, entra: 0.05 });
        } else sonido = ctx.suena(F.buf, { db: 0 });
        sonido.fin.then(() => { if (ctx.vivo() && estado === 'suena') acaba(); });
      }
      function play(deBotonera) {
        if (estado !== 'listo') return;
        if (deBotonera !== true) ctx.suena('a/b1_tecla.mp3', { db: -4 });
        estado = 'arranca'; C.vObj = LU.V; alt.t0 = ahora(); alt.n = 0; alt.viva = true;
        bPlay.disabled = true; modos.forEach(b => { b.disabled = true; });
        rPlay.style.display = ''; MAG.botonera.enclava('play'); MAG.botonera.rotulo('PLAY');
      }
      function acaba() {
        if (estado !== 'suena') return;
        oido[modo] = true; modos.forEach(b => b.classList.toggle('oido', oido[b.dataset.k]));
        if (crepita) { crepita.parar(0.2); crepita = null; }
        if (filtro) { const f_ = filtro; filtro = null; setTimeout(() => { try { f_.salida.disconnect(); } catch (e) {} }, 400); }
        estado = 'frena'; C.vObj = 0; bob.style.display = 'none'; alt.viva = false; alt.pinta(0, true);
        rPlay.style.display = 'none'; MAG.botonera.enclava(null); MAG.botonera.rotulo('');
        setTimeout(() => {
          if (!ctx.vivo()) return;
          estado = 'rebobina'; C.v = 0; rRew.style.display = ''; MAG.botonera.enclava('rew'); MAG.botonera.rotulo('REBOBINANDO');
          ctx.suena('a/b1_rebobina.mp3', { db: -8, dur: 0.9 });
        }, 450);
      }
      function listo() {
        estado = 'listo'; rRew.style.display = 'none'; MAG.botonera.enclava(null); MAG.botonera.rotulo('');
        bPlay.disabled = false; modos.forEach(b => { b.disabled = false; });
        if (!oido.fono) pon('fono'); else if (!oido.cinta) pon('cinta');
        if (oido.fono && oido.cinta && !seguir) { seguir = ctx.seguir(); seguir.then(() => terminar()); }
      }
      bPlay.addEventListener('click', () => play(false));
      ctx.botonera('play', () => play(true));
      await fin;
    }
  });

  // ── 6 · b1_borrar ──
  MAG.registra('b1_borrar', {
    titulo: 'Borrar la cinta',
    fondo: 'i/b1_borrar_fondo.jpg',
    recursos: RECURSOS_LUPA.concat(['i/b1_borrar_fondo.jpg', 'i/b1_lupa_bob_borrar.png', 'i/b1_lupa_r_blanco.png', 'i/b1_lupa_r_play.png',
      'a/b1_frase_muestra.mp3', 'a/b1_soplido.mp3']),
    async monta(ctx) {
      ctx.fondo('i/b1_borrar_fondo.jpg');
      bucleLimpio(ctx, 'a/b1_lupa_amb.mp3', -6);
      const F = await laFrase(); if (!ctx.vivo()) return;
      const X0 = LU.XE - 60, C = laCinta(ctx, X0); C.rec = F.rec;
      const L = (F.rec ? F.rec.n : 100) * LU.PX;                 // lo que ocupa la frase en la cinta
      const alt = onda(ctx, 1596, 1746, 190, [1588, 128, 328, 140]);
      const bob = img(ctx, 'i/b1_lupa_bob_borrar.png', LU.XE - 56, 326, { z: 2 }); bob.style.display = 'none';
      const rBlanco = img(ctx, 'i/b1_lupa_r_blanco.png', 280, 544, { z: 2 }), rPlay = img(ctx, 'i/b1_lupa_r_play.png', 300, 544, { z: 2 });
      rBlanco.style.display = rPlay.style.display = 'none';
      KESSLER_ESCUCHA(ctx);
      const M = mesaLupa(ctx, 'Bórrala: pasa la cinta por el cabezal de borrar… y luego escúchala.', 620);
      const bBorra = ctx.boton('Borrar', { clase: 'mbtn-prin', padre: M.fila });
      const bPlay = ctx.boton('Escuchar', { clase: 'mbtn-prin', icono: MAG.ICO.play, padre: M.fila }); bPlay.style.display = 'none';
      let estado = 'listo', tAnt = 0, sopl = null, xFin = 0, seguir = null;
      let terminar; const fin = new Promise(r => { terminar = r; });
      const ahora = () => performance.now() / 1000;
      ctx.cada(tms => {
        const t = tms / 1000, dt = Math.min(0.05, t - (tAnt || t)); tAnt = t;
        C.paso(dt);
        if (estado === 'borra') {
          const uE = LU.XE - C.X; C.borrado = [uE, LU.XE - X0 + 1];
          C.campo = { x: LU.XE, v: Math.sin(2 * Math.PI * 5.5 * t) };   // un campo que cambia de sentido muy deprisa
          if (uE < -L - 30) {
            estado = 'frena'; C.vObj = 0; C.campo = null; bob.style.display = 'none'; MAG.botonera.enclava(null); MAG.botonera.rotulo('');
            if (sopl) { sopl.parar(0.3); sopl = null; }
            setTimeout(() => { if (!ctx.vivo()) return; estado = 'borrada'; rBlanco.style.display = ''; bBorra.style.display = 'none'; bPlay.style.display = ''; }, 500);
          }
          C.sucio = true;
        }
        if (estado === 'suena') {
          alt.pon(ahora(), 0.035 * Math.sin(t * 61) * Math.sin(t * 17.3));
          if (C.X >= xFin) {
            estado = 'fin'; C.vObj = 0; alt.viva = false; alt.pinta(0, true); rPlay.style.display = 'none'; bPlay.style.display = 'none';
            MAG.botonera.enclava(null); MAG.botonera.rotulo(''); if (sopl) { sopl.parar(0.25); sopl = null; }
            if (!seguir) { seguir = ctx.seguir(); seguir.then(() => terminar()); }
          }
        }
        if (C.sucio && t - C.ultimo > 0.03) { C.pinta(); C.sucio = false; C.ultimo = t; }
        if (alt.viva) alt.pinta(ahora(), false);
      });
      C.pinta(); alt.pinta(0, false);
      function borra(deBotonera) {
        if (estado !== 'listo') return;
        if (deBotonera !== true) ctx.suena('a/b1_tecla.mp3', { db: -4 });
        estado = 'borra'; C.vObj = 130; bob.style.display = ''; bBorra.disabled = true;
        MAG.botonera.enclava('rec'); MAG.botonera.rotulo('BORRANDO');
        sopl = ctx.suena('a/b1_soplido.mp3', { db: -10, bucle: true, entra: 0.2, desde: 0.05, bucleDesde: 0.05 });
      }
      function play(deBotonera) {
        if (estado !== 'borrada') return;
        if (deBotonera !== true) ctx.suena('a/b1_tecla.mp3', { db: -4 });
        estado = 'suena'; C.vObj = LU.V; bPlay.disabled = true; rBlanco.style.display = 'none'; rPlay.style.display = '';
        xFin = C.X + Math.min(330, L + 60);                         // unos segundos: lo justo para oír que no queda nada
        alt.t0 = ahora(); alt.n = 0; alt.viva = true; MAG.botonera.enclava('play'); MAG.botonera.rotulo('PLAY');
        sopl = ctx.suena('a/b1_soplido.mp3', { db: -4, bucle: true, entra: 0.15, desde: 0.05, bucleDesde: 0.05 });
      }
      bBorra.addEventListener('click', () => borra(false)); bPlay.addEventListener('click', () => play(false));
      ctx.botonera('rec', () => borra(true)); ctx.botonera('play', () => play(true));
      await fin;
    }
  });

  // ═══════════════════════════ 7 · b1_tarjetas: lo del fonógrafo a un lado y lo del magnetófono al otro ═══════════════════════════
  /* El estudio de día, limpio (el fotograma del vídeo sin el subtítulo del narrador) y Odile a la derecha, del tamaño y en el
     sitio en que la pinta el vídeo en ese plano (figura() de b1v34b: cabeza de 285 px, con su sombra). Doce tarjetas: seis
     parejas (cada fila, lo mismo en el fonógrafo y en el magnetófono). La tarjeta de abajo se arrastra a su columna (o se pulsa
     la columna, o ← →). Si acierta, se queda en su fila, de golpe, con un «ding» y Odile asiente («Bien.»); si no, vuelve abajo
     y Odile: «Non, non. Otra vez.» Al final, «Lo que suma el magnetófono» (las cuatro cosas que solo hace la cinta). */
  const TJ = {
    pares: [
      ['El sonido, tallado en un surco', 'El sonido, escrito en imanes'],
      ['En un cilindro de cera', 'En una cinta con polvo de hierro'],
      ['El surco se ve', 'Es invisible: no se ve nada'],
      ['Lo lee una aguja', 'Lo lee un cabezal'],
      ['Suena lejano, como en una lata', 'Graves y agudos de verdad'],
      ['Unos dos minutos', 'Más de veinte minutos']
    ],
    suma: [['SE BORRA', 'y la cinta se vuelve a usar'], ['SE OYE CIEN VECES', 'y casi no se gasta'],
      ['VIAJA EN SU CAJA', 'sin miedo a que se rompa, como la cera'], ['SE COPIA DE CINTA A CINTA', 'sin volver a tocar nada']],
    orden: [7, 0, 9, 4, 2, 11, 1, 6, 10, 3, 8, 5],            // el mazo (par·2 + lado), barajado a mano para que no se adivine
    odile: { caja: [917, 0, 954, 1080] }
  };
  (function () {
    if (document.getElementById('b1-estilos-tj')) return;
    const st = document.createElement('style'); st.id = 'b1-estilos-tj';
    st.textContent = '.b1-col{position:absolute;top:388px;width:452px;height:476px;box-sizing:border-box;border-radius:14px;background:rgba(18,15,12,.82);border:2px solid rgba(205,190,160,.85);box-shadow:0 8px 24px rgba(0,0,0,.5);padding:14px 14px 0;cursor:pointer;z-index:4}'
      + '.b1-col.mal{border-color:rgb(242,84,70);box-shadow:0 0 0 3px rgba(242,84,70,.55),0 8px 24px rgba(0,0,0,.5)}'
      + '.b1-col.sobre{border-color:var(--crema);box-shadow:0 0 0 3px rgba(239,229,207,.45),0 8px 24px rgba(0,0,0,.5)}'
      + '.b1-col-t{font:900 29px/1 var(--tit);letter-spacing:3px;color:var(--crema);text-align:center;margin:2px 0 12px}'
      + '.b1-hueco{height:60px;box-sizing:border-box;margin-bottom:8px;border-radius:9px;border:2px dashed rgba(205,190,160,.35);display:flex;align-items:center;padding:0 14px;font:400 22px/25px var(--maq);color:transparent}'
      + '.b1-hueco.lleno{border:2px solid var(--borde2);background:var(--crema2);color:var(--tinta)}'
      + '.b1-carta{position:absolute;box-sizing:border-box;width:560px;min-height:92px;padding:12px 24px;border-radius:12px;background:var(--crema);color:var(--tinta);border:3px solid var(--borde);'
      + 'box-shadow:0 10px 26px rgba(0,0,0,.55);font:400 27px/34px var(--maq);display:flex;align-items:center;justify-content:center;text-align:center;cursor:grab;touch-action:none;z-index:7}'
      + '.b1-carta.coge{cursor:grabbing;box-shadow:0 16px 34px rgba(0,0,0,.6)}'
      + '.b1-suma{position:absolute;left:40px;top:112px;width:920px;box-sizing:border-box;z-index:4;padding:26px 30px 14px;border-radius:14px;background:rgba(18,15,12,.84);border:2px solid rgba(205,190,160,.85);box-shadow:0 8px 24px rgba(0,0,0,.5)}'
      + '.b1-suma-t{font:900 38px/1 var(--tit);letter-spacing:3px;color:var(--crema);margin:0 0 22px 2px}'
      + '.b1-ficha{position:relative;box-sizing:border-box;height:118px;margin-bottom:16px;background:rgba(34,24,16,.92);border:3px solid var(--crema);padding:16px 22px 0 50px;box-shadow:0 8px 22px rgba(0,0,0,.5)}'
      + '.b1-ficha::before{content:"";position:absolute;left:0;top:0;bottom:0;width:22px;background:rgb(242,84,70)}'
      + '.b1-ficha b{display:block;font:700 33px/40px var(--maq);color:var(--crema)}.b1-ficha i{display:block;font:italic 400 26px/34px var(--maq);color:rgb(214,200,176)}';
    document.head.appendChild(st);
  }());
  MAG.registra('b1_tarjetas', {
    titulo: 'Ordenar las tarjetas',
    fondo: 'i/b1_tarjetas_fondo.jpg',
    recursos: ['i/b1_tarjetas_fondo.jpg', 'i/b1_tj_o06.png', 'i/b1_tj_o11.png', 'i/b1_tj_o12.png', 'a/b1_O13.mp3', 'a/b1_O14.mp3', 'a/b1_ding.mp3', 'a/b1_tuc.mp3'],
    async monta(ctx) {
      ctx.fondo('i/b1_tarjetas_fondo.jpg');
      const od = ctx.figura('i/b1_tj_o06.png', { caja: TJ.odile.caja }); od.el.style.zIndex = 2;
      const tj = ctx.tarjeta({ titulo: 'AHORA TÚ', texto: 'Ordena las tarjetas: lo del fonógrafo a un lado y lo del magnetófono al otro.', x: 40, y: 112, w: 920 });
      tj.style.zIndex = 5; tj.style.padding = '18px 36px 20px'; tj.querySelector('.tj-tit').style.marginBottom = '8px';
      tj.querySelector('.tj-txt').style.font = '400 27px/35px var(--maq)';
      const cols = [0, 1].map(l => {
        const c = ctx.el('div', { class: 'b1-col' }); c.style.left = (l ? 508 : 40) + 'px';
        c.appendChild(MAG.el('div', { class: 'b1-col-t', text: l ? 'EL MAGNETÓFONO' : 'MI FONÓGRAFO' }));
        const huecos = TJ.pares.map(() => { const h = MAG.el('div', { class: 'b1-hueco' }); c.appendChild(h); return h; });
        return { el: c, huecos };
      });
      const carta = ctx.el('div', { class: 'b1-carta' });
      const C0 = { x: 220, y: 280 }; Object.assign(carta.style, { left: C0.x + 'px', top: C0.y + 'px' });
      const bIzq = ctx.boton('', { clase: 'mbtn-sec', icono: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>', titulo: 'Al fonógrafo' });
      const bDer = ctx.boton('', { clase: 'mbtn-sec', icono: MAG.ICO.sigue, titulo: 'Al magnetófono' });
      Object.assign(bIzq.style, { position: 'absolute', left: '138px', top: '294px', width: '68px', padding: '0', zIndex: 6 });
      Object.assign(bDer.style, { position: 'absolute', left: '794px', top: '294px', width: '68px', padding: '0', zIndex: 6 });
      let k = 0, voz = null, sub = null, ocupado = false, terminar;
      const fin = new Promise(r => { terminar = r; });
      const actual = () => { const n = TJ.orden[k]; return { par: n >> 1, lado: n & 1, txt: TJ.pares[n >> 1][n & 1] }; };
      function muestra() {
        if (k >= TJ.orden.length) { carta.style.display = bIzq.style.display = bDer.style.display = 'none'; return; }
        carta.textContent = actual().txt; Object.assign(carta.style, { left: C0.x + 'px', top: C0.y + 'px' });
      }
      function habla(pose, ruta, texto, luego) {                 // la pose cambia justo cuando empieza su frase
        if (voz) voz.parar(0.04); if (sub) sub.quita();
        od.cambia(pose); sub = ctx.sub('ODILE', texto); const m = voz = ctx.suena(ruta, { db: 0 });
        m.fin.then(() => setTimeout(() => { if (voz !== m || !ctx.vivo()) return; sub.quita(); sub = null; voz = null; if (luego) luego(); }, 320));
      }
      function coloca(lado) {
        if (k >= TJ.orden.length || ocupado) return;
        const a = actual();
        if (lado === a.lado) {
          const h = cols[lado].huecos[a.par]; h.textContent = a.txt; h.classList.add('lleno');
          ctx.suena('a/b1_ding.mp3', { db: -7 });
          k++; muestra();
          if (k >= TJ.orden.length) { ocupado = true; habla('i/b1_tj_o11.png', 'a/b1_O13.mp3', 'Bien.', suma); }
          else habla('i/b1_tj_o11.png', 'a/b1_O13.mp3', 'Bien.', () => od.cambia('i/b1_tj_o06.png'));
        } else {
          ctx.suena('a/b1_tuc.mp3', { db: -6 });
          Object.assign(carta.style, { left: C0.x + 'px', top: C0.y + 'px' });
          const c = cols[lado].el; c.classList.add('mal'); setTimeout(() => c.classList.remove('mal'), 700);
          habla('i/b1_tj_o12.png', 'a/b1_O14.mp3', 'Non, non. Otra vez.', () => od.cambia('i/b1_tj_o06.png'));
        }
      }
      function suma() {                                          // lo que suma el magnetófono: las cuatro que solo hace la cinta
        if (!ctx.vivo()) return;
        cols.forEach(c => { c.el.style.display = 'none'; });
        tj.style.display = 'none';
        const p = ctx.el('div', { class: 'b1-suma' });
        p.appendChild(MAG.el('div', { class: 'b1-suma-t', text: 'Lo que suma el magnetófono' }));
        TJ.suma.forEach(([t, s]) => p.appendChild(MAG.el('div', { class: 'b1-ficha', html: '<b>' + t + '</b><i>' + s + '</i>' })));
        ctx.seguir().then(() => terminar());
      }
      // arrastrar la tarjeta a su columna (o pulsar la columna, o ← →)
      let arr = null;
      ctx.on(carta, 'pointerdown', ev => {
        if (k >= TJ.orden.length) return; const p = MAG.punto(ev);
        arr = { dx: p.x - C0.x, dy: p.y - C0.y, x0: p.x, y0: p.y, movida: false };
        try { carta.setPointerCapture(ev.pointerId); } catch (e) {} carta.classList.add('coge'); ev.preventDefault();
      });
      const bajo = p => (p.y > 380 && p.y < 870) ? (p.x >= 40 && p.x < 494 ? 0 : (p.x >= 508 && p.x < 962 ? 1 : -1)) : -1;
      ctx.on(window, 'pointermove', ev => {
        if (!arr) return; const p = MAG.punto(ev);
        if (Math.hypot(p.x - arr.x0, p.y - arr.y0) > 6) arr.movida = true;
        Object.assign(carta.style, { left: (p.x - arr.dx) + 'px', top: (p.y - arr.dy) + 'px' });
        const b = bajo(p); cols.forEach((c, i) => c.el.classList.toggle('sobre', i === b));
      });
      ctx.on(window, 'pointerup', ev => {
        if (!arr) return; const p = MAG.punto(ev), b = bajo(p); arr = null; carta.classList.remove('coge');
        cols.forEach(c => c.el.classList.remove('sobre'));
        if (b >= 0) coloca(b); else Object.assign(carta.style, { left: C0.x + 'px', top: C0.y + 'px' });
      });
      cols.forEach((c, i) => c.el.addEventListener('click', () => coloca(i)));
      bIzq.addEventListener('click', () => coloca(0)); bDer.addEventListener('click', () => coloca(1));
      ctx.on(window, 'keydown', ev => {
        if (ev.repeat || k >= TJ.orden.length) return;
        if (ev.key === 'ArrowLeft') { ev.preventDefault(); coloca(0); } else if (ev.key === 'ArrowRight') { ev.preventDefault(); coloca(1); }
      });
      muestra();
      await fin;
    }
  });

  // ═══ (aquí van las siguientes estaciones) ═══
}());
