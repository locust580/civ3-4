/**
 * visual.js — Quetelet's Average Man: Visual Rendering System
 */

(function () {
  'use strict';

  const C = {
    PARCHMENT:    '#f5e8cc',
    DARK_INK:     '#2a1a0a',
    GOLD:         '#c8962a',
    DEEP_GREEN:   '#1a4a2a',
    MUTED_RED:    '#8a2a2a',
    PHOSPHOR_GRN: '#40ff80',
    WOOD_BROWN:   '#7a4a1a',
    PANEL_BG:     '#f0ddb8',
    HEADER_BG:    '#1a1208',
  };

  const REGIONS = {
    NORDIC:   { x:0,   y:50,  w:350, h:300, bgColor:'#c8e4cc', name:'Northern Reach' },
    ATLANTIC: { x:0,   y:350, w:350, h:350, bgColor:'#9db8d0', name:'Atlantic Coast'  },
    EASTERN:  { x:350, y:50,  w:250, h:325, bgColor:'#d4c878', name:'Eastern Steppe'  },
    HIGHLAND: { x:350, y:375, w:250, h:325, bgColor:'#a8b890', name:'Highland Peaks'  },
    SOUTHERN: { x:600, y:225, w:220, h:475, bgColor:'#d4b078', name:'Southern Lands'  },
  };

  const visualState = {
    tick: 0,
    tvScrollOffset: 0,
    tvCurrentExceptional: null,
    tvDisplayTimer: 0,
    tvMode: 'signal',        // 'signal' | 'exceptional' | 'history'
    tvHistoryMode: false,
    tvHistoryTimer: 0,
    hoverX: 0,
    hoverY: 0,
    tooltip: null,
    bgCanvases: {},
    // News ticker
    newsScrollOffset: 0,
    newsLastId: -1,
    newsText: '',
  };

  let _canvas = null;
  let _ctx    = null;

  const TICK_RATE = 60;

  // ─── OFFSCREEN BG RENDERING ────────────────────────────────────────────────

  function seededRNG(seed) {
    let s = seed;
    return function () {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  function buildNordicBg(r) {
    const oc = document.createElement('canvas');
    oc.width = r.w; oc.height = r.h;
    const cx = oc.getContext('2d');
    cx.fillStyle = r.bgColor;
    cx.fillRect(0, 0, r.w, r.h);
    const sg = cx.createLinearGradient(0, 0, 0, r.h);
    sg.addColorStop(0, 'rgba(240,248,255,0.35)');
    sg.addColorStop(1, 'rgba(240,248,255,0)');
    cx.fillStyle = sg;
    cx.fillRect(0, 0, r.w, r.h);
    cx.fillStyle = '#2a5a30';
    const treePositions = [];
    const rng = seededRNG(1337);
    for (let i = 0; i < 38; i++) {
      treePositions.push({ tx: rng() * r.w, ty: r.h * 0.25 + rng() * r.h * 0.65 });
    }
    for (const { tx, ty } of treePositions) {
      const h = 10 + rng() * 8;
      cx.beginPath(); cx.moveTo(tx, ty - h); cx.lineTo(tx - 5, ty); cx.lineTo(tx + 5, ty); cx.closePath(); cx.fill();
      cx.fillStyle = 'rgba(230,245,255,0.7)';
      cx.beginPath(); cx.moveTo(tx, ty - h); cx.lineTo(tx - 2, ty - h * 0.6); cx.lineTo(tx + 2, ty - h * 0.6); cx.closePath(); cx.fill();
      cx.fillStyle = '#2a5a30';
    }
    drawRegionLabel(cx, r, 'Northern Reach');
    return oc;
  }

  function buildAtlanticBg(r) {
    const oc = document.createElement('canvas');
    oc.width = r.w; oc.height = r.h;
    const cx = oc.getContext('2d');
    cx.fillStyle = r.bgColor; cx.fillRect(0, 0, r.w, r.h);
    cx.fillStyle = '#7a9e78';
    cx.beginPath(); cx.moveTo(0, r.h * 0.55);
    cx.bezierCurveTo(r.w * 0.2, r.h * 0.38, r.w * 0.4, r.h * 0.62, r.w * 0.6, r.h * 0.45);
    cx.bezierCurveTo(r.w * 0.8, r.h * 0.28, r.w, r.h * 0.5, r.w, r.h * 0.55);
    cx.lineTo(r.w, r.h); cx.lineTo(0, r.h); cx.closePath(); cx.fill();
    cx.strokeStyle = 'rgba(60,80,110,0.25)'; cx.lineWidth = 1.5;
    for (let wave = 0; wave < 5; wave++) {
      const wy = r.h * 0.78 + wave * 9;
      cx.beginPath(); cx.moveTo(0, wy);
      for (let wx = 0; wx < r.w; wx += 28) {
        cx.quadraticCurveTo(wx + 7, wy - 5, wx + 14, wy);
        cx.quadraticCurveTo(wx + 21, wy + 5, wx + 28, wy);
      }
      cx.stroke();
    }
    drawRegionLabel(cx, r, 'Atlantic Coast');
    return oc;
  }

  function buildEasternBg(r) {
    const oc = document.createElement('canvas');
    oc.width = r.w; oc.height = r.h;
    const cx = oc.getContext('2d');
    cx.fillStyle = r.bgColor; cx.fillRect(0, 0, r.w, r.h);
    const skyG = cx.createLinearGradient(0, 0, 0, r.h * 0.5);
    skyG.addColorStop(0, 'rgba(200,165,60,0.3)'); skyG.addColorStop(1, 'rgba(200,165,60,0)');
    cx.fillStyle = skyG; cx.fillRect(0, 0, r.w, r.h * 0.5);
    cx.strokeStyle = 'rgba(160,130,30,0.22)'; cx.lineWidth = 1;
    for (let ly = Math.floor(r.h * 0.42); ly < r.h; ly += 5) {
      cx.beginPath(); cx.moveTo(0, ly); cx.lineTo(r.w, ly); cx.stroke();
    }
    cx.fillStyle = 'rgba(80,110,50,0.18)';
    cx.fillRect(0, r.h * 0.4, r.w, 4);
    drawRegionLabel(cx, r, 'Eastern Steppe');
    return oc;
  }

  function buildHighlandBg(r) {
    const oc = document.createElement('canvas');
    oc.width = r.w; oc.height = r.h;
    const cx = oc.getContext('2d');
    cx.fillStyle = r.bgColor; cx.fillRect(0, 0, r.w, r.h);
    const mistG = cx.createLinearGradient(0, 0, 0, r.h * 0.5);
    mistG.addColorStop(0, 'rgba(220,230,220,0.5)'); mistG.addColorStop(1, 'rgba(220,230,220,0)');
    cx.fillStyle = mistG; cx.fillRect(0, 0, r.w, r.h * 0.5);
    cx.fillStyle = '#6a7860';
    cx.beginPath(); cx.moveTo(0, r.h * 0.5);
    const peaks = [
      [0,0.5],[0.07,0.25],[0.14,0.42],[0.22,0.1],[0.30,0.38],
      [0.38,0.15],[0.46,0.35],[0.55,0.08],[0.63,0.32],[0.72,0.18],
      [0.80,0.40],[0.88,0.22],[0.96,0.44],[1.0,0.5]
    ];
    for (const [px, py] of peaks) cx.lineTo(px * r.w, py * r.h);
    cx.lineTo(r.w, r.h); cx.lineTo(0, r.h); cx.closePath(); cx.fill();
    cx.fillStyle = 'rgba(240,248,255,0.8)';
    for (const [px, py] of [[0.22,0.1],[0.38,0.15],[0.55,0.08],[0.72,0.18]]) {
      const x0 = px * r.w, y0 = py * r.h;
      cx.beginPath(); cx.moveTo(x0, y0); cx.lineTo(x0-8, y0+10); cx.lineTo(x0+8, y0+10); cx.closePath(); cx.fill();
    }
    drawRegionLabel(cx, r, 'Highland Peaks');
    return oc;
  }

  function buildSouthernBg(r) {
    const oc = document.createElement('canvas');
    oc.width = r.w; oc.height = r.h;
    const cx = oc.getContext('2d');
    cx.fillStyle = r.bgColor; cx.fillRect(0, 0, r.w, r.h);
    const sunG = cx.createLinearGradient(0, 0, 0, r.h * 0.4);
    sunG.addColorStop(0, 'rgba(255,180,60,0.2)'); sunG.addColorStop(1, 'rgba(255,180,60,0)');
    cx.fillStyle = sunG; cx.fillRect(0, 0, r.w, r.h * 0.4);
    cx.fillStyle = '#c49040';
    const rng = seededRNG(4242);
    for (let d = 0; d < 7; d++) {
      const dx = rng() * r.w, dy = r.h * 0.7 + rng() * r.h * 0.25, dw = 30 + rng() * 40;
      cx.beginPath(); cx.ellipse(dx, dy, dw, 8 + rng() * 6, 0, Math.PI, 0); cx.fill();
    }
    cx.strokeStyle = '#5a3a10'; cx.lineWidth = 2;
    const palmRNG = seededRNG(9999);
    for (let p = 0; p < 5; p++) {
      const px2 = 15 + palmRNG() * (r.w - 30);
      const py2 = r.h * 0.35 + palmRNG() * r.h * 0.35;
      cx.beginPath(); cx.moveTo(px2, py2); cx.lineTo(px2, py2 - 22); cx.stroke();
      cx.strokeStyle = '#3a7a20'; cx.lineWidth = 1.5;
      for (let frond = 0; frond < 5; frond++) {
        const angle = -Math.PI * 0.6 + frond * (Math.PI * 0.3);
        cx.beginPath(); cx.moveTo(px2, py2 - 22);
        cx.quadraticCurveTo(px2 + Math.cos(angle) * 8, py2 - 22 + Math.sin(angle) * 4,
          px2 + Math.cos(angle) * 14, py2 - 22 + Math.sin(angle) * 10);
        cx.stroke();
      }
      cx.strokeStyle = '#5a3a10'; cx.lineWidth = 2;
    }
    drawRegionLabel(cx, r, 'Southern Lands');
    return oc;
  }

  function drawRegionLabel(cx, r, name) {
    cx.font = 'italic 10px Georgia, serif';
    cx.fillStyle = 'rgba(42,26,10,0.45)';
    cx.textAlign = 'right'; cx.textBaseline = 'bottom';
    cx.fillText(name, r.w - 6, r.h - 5);
    cx.textAlign = 'left'; cx.textBaseline = 'alphabetic';
  }

  function getBgCanvas(key) {
    if (!visualState.bgCanvases[key]) {
      const r = REGIONS[key];
      switch (key) {
        case 'NORDIC':   visualState.bgCanvases[key] = buildNordicBg(r);   break;
        case 'ATLANTIC': visualState.bgCanvases[key] = buildAtlanticBg(r); break;
        case 'EASTERN':  visualState.bgCanvases[key] = buildEasternBg(r);  break;
        case 'HIGHLAND': visualState.bgCanvases[key] = buildHighlandBg(r); break;
        case 'SOUTHERN': visualState.bgCanvases[key] = buildSouthernBg(r); break;
      }
    }
    return visualState.bgCanvases[key];
  }

  // ─── MEEPLE DRAWING ────────────────────────────────────────────────────────

  function drawMeeple(ctx, meeple, cx, cy, scale, options) {
    scale   = scale || 1;
    options = options || {};
    const tick  = visualState.tick;
    const TRATE = TICK_RATE;

    const intel  = meeple.intelligence || 5;
    const weight = meeple.weight || 70;
    const height = meeple.height || 170;
    const str    = meeple.strength || 5;
    const isFem  = (meeple.gender === 'F');
    const alive  = meeple.alive !== false;
    const age    = meeple.age || 0;

    const bob = Math.sin(tick * 0.25 + (meeple.id || 0)) * 1.2 * scale;
    const facing = ((meeple.vx || 0) < 0) ? -1 : 1;

    const headR  = (3 + (intel / 10) * 1.5) * scale;
    const bodyW  = (4 + (weight - 50) / 10) * scale;
    const bodyH  = (8 + (height - 160) / 5) * scale;
    const femMod = isFem ? 0.88 : 1;

    const skinColor  = meeple.skinTone    || '#e8b890';
    const clothColor = meeple.clothesColor || '#4a6a8a';
    const hairColor  = meeple.hairColor   || '#3a2010';

    ctx.save();
    ctx.translate(cx, cy + bob);
    if (facing === -1) ctx.scale(-1, 1);

    const neckH  = 2 * scale;
    const bodyTop = -bodyH * 0.5;
    const headCY  = bodyTop - neckH - headR;

    if (!alive) ctx.globalAlpha = (options.alpha !== undefined ? options.alpha : 0.3);

    // LEGS
    ctx.strokeStyle = clothColor;
    ctx.lineWidth = Math.max(1.5 * scale, 1);
    ctx.lineCap = 'round';
    const legLen = 6 * scale;
    ctx.beginPath(); ctx.moveTo(-bodyW * 0.3, bodyH * 0.5); ctx.lineTo(-bodyW * 0.4, bodyH * 0.5 + legLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( bodyW * 0.3, bodyH * 0.5); ctx.lineTo( bodyW * 0.4, bodyH * 0.5 + legLen); ctx.stroke();

    // BODY
    ctx.fillStyle = clothColor;
    roundRect(ctx, -bodyW * femMod * 0.5, bodyTop, bodyW * femMod, bodyH, isFem ? 2 * scale : 1.5 * scale);
    ctx.fill();

    if (meeple.exceptionalTrait === 'strength') {
      ctx.fillStyle = clothColor;
      ctx.beginPath(); ctx.ellipse(-bodyW * 0.7, 0, 3 * scale, 2 * scale, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse( bodyW * 0.7, 0, 3 * scale, 2 * scale, 0, 0, Math.PI * 2); ctx.fill();
    }

    // ARMS
    ctx.strokeStyle = skinColor;
    ctx.lineWidth = Math.max(1.5 * scale, 1);
    const armLen = (6 + str * 0.5) * scale;
    ctx.beginPath(); ctx.moveTo(-bodyW * 0.5, bodyTop + bodyH * 0.2); ctx.lineTo(-bodyW * 0.5 - armLen, bodyTop + bodyH * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( bodyW * 0.5, bodyTop + bodyH * 0.2); ctx.lineTo( bodyW * 0.5 + armLen, bodyTop + bodyH * 0.5); ctx.stroke();

    // NECK + HEAD
    ctx.fillStyle = skinColor;
    ctx.fillRect(-1.2 * scale, bodyTop - neckH, 2.4 * scale, neckH + 1);
    ctx.beginPath(); ctx.arc(0, headCY, headR, 0, Math.PI * 2);
    ctx.fillStyle = skinColor; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 0.5; ctx.stroke();

    // HAIR
    ctx.fillStyle = hairColor;
    ctx.beginPath(); ctx.arc(0, headCY, headR, Math.PI, 0, false); ctx.fill();

    // EXCEPTIONAL OVERLAYS
    if (meeple.exceptionalTrait === 'intelligence') {
      ctx.beginPath(); ctx.arc(0, headCY, headR + 3 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200,160,30,0.7)'; ctx.lineWidth = 1.5 * scale; ctx.stroke();
      ctx.fillStyle = 'rgba(200,100,120,0.8)';
      ctx.beginPath(); ctx.ellipse(0, headCY - headR + 1 * scale, headR * 0.55, headR * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (meeple.exceptionalTrait === 'looks') {
      const sparkAlpha = 0.6 + 0.4 * Math.sin(tick * 0.2);
      ctx.fillStyle = `rgba(255,180,200,${sparkAlpha})`;
      for (let si = 0; si < 4; si++) {
        const angle = (si / 4) * Math.PI * 2 + tick * 0.04;
        drawStar(ctx, Math.cos(angle) * headR * 1.8, headCY + Math.sin(angle) * headR * 1.8, 2 * scale);
      }
    }
    if (meeple.exceptionalTrait === 'criminal') {
      ctx.fillStyle = 'rgba(40,0,60,0.4)';
      ctx.beginPath(); ctx.ellipse(0, bodyH * 0.5 + legLen, bodyW * 0.9, 3 * scale, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Newborn sparkle
    if (age < 5 * TRATE) {
      const sparkPhase = (tick % 30) / 30;
      ctx.fillStyle = `rgba(255,220,100,${0.8 - sparkPhase})`;
      for (let si = 0; si < 3; si++) {
        const a = (si / 3) * Math.PI * 2 + sparkPhase * Math.PI * 2;
        drawStar(ctx, Math.cos(a) * headR * 1.5, headCY + Math.sin(a) * headR * 1.5, 2.5 * scale);
      }
    }

    // Just-married heart
    if (meeple.married && meeple.marriedTick !== undefined &&
        (tick - meeple.marriedTick) < 60) {
      const elapsed = tick - meeple.marriedTick;
      const heartY  = headCY - headR - 8 * scale - elapsed * 0.05;
      const fa      = Math.max(0, 1 - elapsed / 60);
      ctx.fillStyle = `rgba(220,40,80,${fa})`;
      drawHeart(ctx, 0, heartY, 4 * scale);
    }

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function drawStar(ctx, x, y, r) {
    ctx.save(); ctx.translate(x, y); ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const rd = i % 2 === 0 ? r : r * 0.4;
      if (i === 0) ctx.moveTo(Math.cos(a) * rd, Math.sin(a) * rd);
      else ctx.lineTo(Math.cos(a) * rd, Math.sin(a) * rd);
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function drawHeart(ctx, x, y, size) {
    ctx.save(); ctx.translate(x, y); ctx.beginPath();
    ctx.moveTo(0, size * 0.3);
    ctx.bezierCurveTo(-size, -size * 0.3, -size * 1.5, size * 0.8, 0, size * 1.5);
    ctx.bezierCurveTo(size * 1.5, size * 0.8, size, -size * 0.3, 0, size * 0.3);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  // ─── TV SCREEN ─────────────────────────────────────────────────────────────

  function drawTV(ctx, state) {
    const TX = 600, TY = 55, TW = 220, TH = 175;
    const SCREEN_X = TX + 28, SCREEN_Y = TY + 20;
    const SCREEN_W = 152, SCREEN_H = 110;

    // Wooden cabinet
    ctx.save();
    const woodGrad = ctx.createLinearGradient(TX, TY, TX + TW, TY + TH);
    woodGrad.addColorStop(0, '#a06030'); woodGrad.addColorStop(0.4, '#7a4a1a'); woodGrad.addColorStop(1, '#5a3010');
    ctx.fillStyle = woodGrad;
    roundRect(ctx, TX, TY, TW, TH, 10); ctx.fill();

    ctx.strokeStyle = 'rgba(40,15,5,0.18)'; ctx.lineWidth = 1;
    for (let gx = TX + 6; gx < TX + TW - 4; gx += 12) {
      ctx.beginPath(); ctx.moveTo(gx, TY + 6);
      ctx.bezierCurveTo(gx + 2, TY + TH * 0.33, gx - 2, TY + TH * 0.66, gx, TY + TH - 6); ctx.stroke();
    }

    ctx.fillStyle = '#222';
    roundRect(ctx, SCREEN_X - 6, SCREEN_Y - 6, SCREEN_W + 12, SCREEN_H + 12, 5); ctx.fill();
    ctx.fillStyle = '#0a0f0a';
    roundRect(ctx, SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H, 3); ctx.fill();

    // Manage TV queue
    const excQueue = (state && state.exceptionalQueue) || [];
    if (excQueue.length > 0 && visualState.tvDisplayTimer <= 0) {
      visualState.tvCurrentExceptional = excQueue[0];
      visualState.tvDisplayTimer = TICK_RATE * 6;
      visualState.tvScrollOffset = 0;
      visualState.tvMode = 'exceptional';
    }
    if (visualState.tvDisplayTimer > 0) {
      visualState.tvDisplayTimer--;
    } else {
      visualState.tvMode = (state && state.traitHistory && state.traitHistory.length > 2)
        ? 'history' : 'nosignal';
    }

    ctx.save();
    ctx.beginPath(); roundRect(ctx, SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H, 3); ctx.clip();

    if (visualState.tvMode === 'exceptional' && visualState.tvCurrentExceptional) {
      drawTVExceptional(ctx, visualState.tvCurrentExceptional, SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H);
    } else if (visualState.tvMode === 'history' && state && state.traitHistory && state.traitHistory.length > 2) {
      drawTVHistory(ctx, state.traitHistory, SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H);
    } else {
      drawTVNoSignal(ctx, SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H);
    }

    ctx.restore(); // clip

    // Vignette
    const vigG = ctx.createLinearGradient(SCREEN_X, SCREEN_Y, SCREEN_X, SCREEN_Y + SCREEN_H);
    vigG.addColorStop(0, 'rgba(0,0,0,0.2)'); vigG.addColorStop(0.1, 'rgba(0,0,0,0)');
    vigG.addColorStop(0.9, 'rgba(0,0,0,0)'); vigG.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = vigG; ctx.fillRect(SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H);

    // Knobs
    ctx.fillStyle = '#3a2a10';
    ctx.beginPath(); ctx.arc(TX + TW - 16, SCREEN_Y + 20, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(TX + TW - 16, SCREEN_Y + 40, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a0a00'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(TX + TW - 16, SCREEN_Y + 20, 5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(TX + TW - 16, SCREEN_Y + 40, 5, 0, Math.PI * 2); ctx.stroke();

    ctx.font = 'italic 9px Georgia, serif';
    ctx.fillStyle = 'rgba(200,160,80,0.85)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('THE EXCEPTIONAL', TX + TW * 0.45, TY + TH + 3);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

    ctx.restore();
  }

  function drawTVExceptional(ctx, exc, SX, SY, SW, SH) {
    // CRT glow
    const glow = ctx.createRadialGradient(SX + SW * 0.5, SY + SH * 0.45, 10, SX + SW * 0.5, SY + SH * 0.45, SW * 0.6);
    glow.addColorStop(0, 'rgba(40,100,50,0.45)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(SX, SY, SW, SH);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.82;
    drawMeeple(ctx, {
      ...exc,
      intelligence: exc.intelligence || 5,
      weight: exc.weight || 70,
      height: exc.height || 170,
      strength: exc.strength || 5,
      looks: exc.looks || 5,
      skinTone: '#50c870',
      clothesColor: '#208040',
      hairColor: '#005520',
      vx: 0, vy: 0,
      alive: true,
    }, SX + SW * 0.5, SY + SH * 0.42, 3.5, {});
    ctx.restore();

    // Ticker strip
    const tickerY = SY + SH - 22;
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(SX, tickerY, SW, 22);

    const traitLabels = {
      intelligence: 'Extraordinary Mind',
      strength:     'Prodigious Strength',
      looks:        'Remarkable Beauty',
      criminal:     'Dangerous Character',
      height:       'Towering Stature',
    };
    const traitDesc = traitLabels[exc.exceptionalTrait || exc.trait] || 'Notable Citizen';
    const tickerText = `  ${exc.name || 'Unknown'}: ${traitDesc}   `;

    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = C.PHOSPHOR_GRN;
    ctx.textBaseline = 'middle';
    const textWidth = ctx.measureText(tickerText).width;
    const offset = visualState.tvScrollOffset % (textWidth + SW);
    ctx.fillText(tickerText, SX + SW - offset, tickerY + 11);
    if (SW - offset + textWidth > 0)
      ctx.fillText(tickerText, SX + SW - offset + textWidth, tickerY + 11);
    visualState.tvScrollOffset += 1.2;

    // Scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let sl = SY; sl < SY + SH; sl += 3) ctx.fillRect(SX, sl, SW, 1);
  }

  function drawTVHistory(ctx, traitHistory, SX, SY, SW, SH) {
    // Background
    ctx.fillStyle = '#050a05'; ctx.fillRect(SX, SY, SW, SH);

    const PAD = 10;
    const GX = SX + PAD, GY = SY + PAD + 14;
    const GW = SW - PAD * 2, GH = SH - PAD * 2 - 18;

    // Title
    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = C.PHOSPHOR_GRN;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('TRAIT EVOLUTION OVER TIME', SX + SW / 2, SY + 4);
    ctx.textAlign = 'left';

    const items = traitHistory.length > GW ? traitHistory.slice(-GW) : traitHistory;
    const n = items.length;
    if (n < 2) return;

    const toX = (i) => GX + (i / (n - 1)) * GW;
    const toY = (v) => GY + GH - ((v / 10) * GH);

    // Grid
    ctx.strokeStyle = 'rgba(64,255,128,0.1)'; ctx.lineWidth = 0.5;
    for (let g = 0; g <= 4; g++) {
      const gy2 = GY + (g / 4) * GH;
      ctx.beginPath(); ctx.moveTo(GX, gy2); ctx.lineTo(GX + GW, gy2); ctx.stroke();
    }

    // Lines: intelligence (blue-green), strength (red), looks (pink)
    const series = [
      { key: 'intelligence', color: '#40c8ff', label: 'INT' },
      { key: 'strength',     color: '#ff6040', label: 'STR' },
      { key: 'looks',        color: '#ff80c0', label: 'LKS' },
    ];

    for (const s of series) {
      ctx.beginPath();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.2;
      ctx.moveTo(toX(0), toY(items[0][s.key] || 5));
      for (let i = 1; i < n; i++) {
        ctx.lineTo(toX(i), toY(items[i][s.key] || 5));
      }
      ctx.stroke();
    }

    // Tech level overlay (gold dashed)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(200,160,30,0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.moveTo(toX(0), toY((items[0].techLevel || 0)));
    for (let i = 1; i < n; i++) {
      ctx.lineTo(toX(i), toY(items[i].techLevel || 0));
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Legend
    ctx.font = '6px monospace';
    ctx.textBaseline = 'bottom';
    const legends = [
      { label: 'INT', color: '#40c8ff', x: GX },
      { label: 'STR', color: '#ff6040', x: GX + 22 },
      { label: 'LKS', color: '#ff80c0', x: GX + 44 },
      { label: 'TEC', color: 'rgba(200,160,30,0.8)', x: GX + 66 },
    ];
    for (const l of legends) {
      ctx.fillStyle = l.color;
      ctx.fillText(l.label, l.x, SY + SH - 2);
    }

    // Year range
    ctx.fillStyle = 'rgba(64,255,128,0.4)';
    ctx.textAlign = 'right';
    ctx.fillText('yr ' + (items[n-1].year || '?'), SX + SW - PAD, SY + SH - 2);
    ctx.textAlign = 'left';

    // Scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let sl = SY; sl < SY + SH; sl += 3) ctx.fillRect(SX, sl, SW, 1);
  }

  function drawTVNoSignal(ctx, SX, SY, SW, SH) {
    ctx.fillStyle = '#333'; ctx.fillRect(SX, SY, SW, SH);
    const nrng = seededRNG(visualState.tick * 7 + 13);
    ctx.fillStyle = 'rgba(80,80,80,0.25)';
    for (let ni = 0; ni < 300; ni++) {
      ctx.fillRect(SX + Math.floor(nrng() * SW), SY + Math.floor(nrng() * SH), 2, 1);
    }
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = C.PHOSPHOR_GRN;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('NO SIGNAL', SX + SW / 2, SY + SH / 2 - 8);
    ctx.font = '7px monospace';
    ctx.fillStyle = 'rgba(64,255,128,0.5)';
    ctx.fillText('awaiting remarkable citizens', SX + SW / 2, SY + SH / 2 + 8);
    ctx.textAlign = 'left';
  }

  // ─── STATS PANEL ───────────────────────────────────────────────────────────

  function drawStatsPanel(ctx, state) {
    const PX = 820, PY = 50, PW = 380, PH = 650;

    // Pull data from the actual state shape
    const stats        = (state && state.stats)          || {};
    const avg          = stats.averageMeep               || {};
    const history      = (state && state.history)        || [];
    const selectedRegion = stats.selectedRegionKey       || null;
    const regionStats  = stats.selectedRegionStats       || null;
    const techLevel    = stats.techLevel                 || 0;

    // If a region is selected, show its stats in the gauges
    const displayAvg = (selectedRegion && regionStats) ? regionStats : avg;

    // Background
    const panelGrad = ctx.createLinearGradient(PX, PY, PX + PW, PY + PH);
    panelGrad.addColorStop(0, '#f5e8cc'); panelGrad.addColorStop(1, '#edd8a8');
    ctx.fillStyle = panelGrad; ctx.fillRect(PX, PY, PW, PH);

    // Double border
    ctx.strokeStyle = C.DARK_INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(PX, PY); ctx.lineTo(PX, PY + PH); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PX + 4, PY); ctx.lineTo(PX + 4, PY + PH); ctx.stroke();

    // ── 1. TITLE ──
    ctx.fillStyle = C.DARK_INK;
    ctx.font = 'bold 22px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText("L'HOMME MOYEN", PX + PW / 2, PY + 38);
    ctx.font = 'italic 10px Georgia, serif';
    ctx.fillStyle = '#6a4a20';
    ctx.fillText('The Average Man · After Quetelet, 1835', PX + PW / 2, PY + 54);
    ctx.textAlign = 'left';

    ctx.strokeStyle = C.GOLD; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PX + 20, PY + 62); ctx.lineTo(PX + PW - 20, PY + 62); ctx.stroke();

    // ── 2. AVERAGE MEEP FIGURE ──
    const avgCX = PX + PW / 2;
    const avgCY = PY + 175;

    ctx.save();
    ctx.strokeStyle = 'rgba(100,80,40,0.18)'; ctx.lineWidth = 1.5;
    for (let bc = 0; bc < 3; bc++) {
      const spreadX = 25 + bc * 18;
      ctx.beginPath();
      ctx.moveTo(avgCX - spreadX * 2.5, avgCY + 35);
      ctx.bezierCurveTo(avgCX - spreadX, avgCY - 20 - bc * 8, avgCX + spreadX, avgCY - 20 - bc * 8, avgCX + spreadX * 2.5, avgCY + 35);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.6;
    const avgMeeple = {
      intelligence:  displayAvg.intelligence  || 5,
      weight:        displayAvg.weight        || 70,
      height:        displayAvg.height        || 170,
      strength:      displayAvg.strength      || 5,
      looks:         displayAvg.looks         || 5,
      gender:        'M',
      skinTone:      displayAvg.skinTone      || '#888888',
      clothesColor:  '#888888',
      hairColor:     '#555555',
      vx: 0, vy: 0,
      alive: true,
    };
    drawMeeple(ctx, avgMeeple, avgCX, avgCY, 5.0, {});
    ctx.restore();

    ctx.font = '10px Georgia, serif';
    ctx.fillStyle = C.DARK_INK; ctx.textAlign = 'center';
    const h = displayAvg.height ? displayAvg.height.toFixed(1) : '—';
    const w = displayAvg.weight ? displayAvg.weight.toFixed(1) : '—';
    ctx.fillText(`Height: ${h} cm   Weight: ${w} kg`, avgCX, avgCY + 55);
    ctx.font = 'italic 8px Georgia, serif'; ctx.fillStyle = '#888';
    ctx.fillText(selectedRegion ? `Viewing: ${REGIONS[selectedRegion] ? REGIONS[selectedRegion].name : selectedRegion}` : '*This individual does not exist*', avgCX, avgCY + 67);
    ctx.textAlign = 'left';

    // ── 3. TECH LEVEL BAR ──
    const TECH_Y = PY + 260;
    ctx.font = 'italic 9px Georgia, serif'; ctx.fillStyle = '#6a4a20';
    ctx.textAlign = 'right';
    ctx.fillText('Technological Progress', PX + 120, TECH_Y + 11);
    ctx.textAlign = 'left';
    const techBarW = 200;
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(PX + 125, TECH_Y, techBarW, 12);
    const techGrad = ctx.createLinearGradient(PX + 125, 0, PX + 125 + techBarW, 0);
    techGrad.addColorStop(0, '#aa7a20'); techGrad.addColorStop(1, '#ffdf60');
    ctx.fillStyle = techGrad; ctx.fillRect(PX + 125, TECH_Y, (techLevel / 10) * techBarW, 12);
    ctx.strokeStyle = 'rgba(42,26,10,0.3)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(PX + 125, TECH_Y, techBarW, 12);
    ctx.font = '9px monospace'; ctx.fillStyle = C.DARK_INK;
    ctx.fillText(techLevel.toFixed(1), PX + 330, TECH_Y + 10);

    // ── 4. TRAIT GAUGES ──
    const GAUGE_Y = PY + 290;
    const gauges = [
      { label: 'Intellect', key: 'intelligence', color: '#4a7aaa' },
      { label: 'Looks',     key: 'looks',        color: '#c06080' },
      { label: 'Strength',  key: 'strength',     color: '#4a8a50' },
    ];

    ctx.font = '10px Georgia, serif'; ctx.fillStyle = C.DARK_INK;
    ctx.textAlign = 'center';
    ctx.fillText('— Average Traits —', PX + PW / 2, GAUGE_Y - 6);

    for (let gi = 0; gi < gauges.length; gi++) {
      const gy = GAUGE_Y + gi * 30;
      const g  = gauges[gi];
      const val = displayAvg[g.key] || 0;
      const barW = 200;
      const fillW = (val / 10) * barW;

      ctx.font = '10px Georgia, serif'; ctx.fillStyle = C.DARK_INK;
      ctx.textAlign = 'right';
      ctx.fillText(g.label, PX + 95, gy + 11);
      ctx.textAlign = 'left';

      ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(PX + 100, gy + 2, barW, 14);
      const barGrad = ctx.createLinearGradient(PX + 100, 0, PX + 100 + barW, 0);
      barGrad.addColorStop(0, g.color + 'aa'); barGrad.addColorStop(1, g.color);
      ctx.fillStyle = barGrad; ctx.fillRect(PX + 100, gy + 2, fillW, 14);
      ctx.strokeStyle = 'rgba(42,26,10,0.3)'; ctx.lineWidth = 0.5;
      ctx.strokeRect(PX + 100, gy + 2, barW, 14);
      ctx.font = '10px monospace'; ctx.fillStyle = C.DARK_INK;
      ctx.fillText(val.toFixed(1), PX + 306, gy + 11);
    }

    // ── 5. VITAL STATISTICS ──
    const VS_Y = PY + 400;
    ctx.strokeStyle = C.GOLD; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(PX + 20, VS_Y - 10); ctx.lineTo(PX + PW - 20, VS_Y - 10); ctx.stroke();
    ctx.font = 'bold 10px Georgia, serif'; ctx.fillStyle = C.DARK_INK; ctx.textAlign = 'center';
    ctx.fillText('— Vital Statistics —', PX + PW / 2, VS_Y + 2);

    const vitals = [
      { label: 'Marriage Rate',  val: displayAvg.marriageRate   != null ? (displayAvg.marriageRate * 100)  : null, unit: '%' },
      { label: 'Crime Rate',     val: displayAvg.crimeRate      != null ? (displayAvg.crimeRate * 100)     : null, unit: '%' },
      { label: 'Suicide Rate',   val: displayAvg.suicideRate    != null ? (displayAvg.suicideRate * 100)   : null, unit: '%' },
      { label: 'Life Expect.',   val: displayAvg.lifeExpectancy != null ? displayAvg.lifeExpectancy        : null, unit: 'yr' },
    ];
    const grid = [[0,0],[1,0],[0,1],[1,1]];
    const cellW = (PW - 40) / 2;
    for (let vi = 0; vi < vitals.length; vi++) {
      const [col, row] = grid[vi];
      const vx2 = PX + 20 + col * cellW;
      const vy2 = VS_Y + 16 + row * 40;
      const v   = vitals[vi];
      ctx.font = 'italic 8px Georgia, serif'; ctx.fillStyle = '#6a4a20'; ctx.textAlign = 'center';
      ctx.fillText(v.label, vx2 + cellW / 2, vy2);
      ctx.font = 'bold 15px Georgia, serif'; ctx.fillStyle = C.DARK_INK;
      const valStr = (v.val !== undefined && v.val !== null) ? v.val.toFixed(1) : '—';
      ctx.fillText(valStr + ' ' + v.unit, vx2 + cellW / 2, vy2 + 16);
    }
    ctx.textAlign = 'left';

    // ── 6. POPULATION GRAPH ──
    const GRAPH_Y = PY + 505;
    const GRAPH_H = 88;
    const GRAPH_W = PW - 40;

    ctx.strokeStyle = C.GOLD; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(PX + 20, GRAPH_Y - 10); ctx.lineTo(PX + PW - 20, GRAPH_Y - 10); ctx.stroke();
    ctx.font = 'bold 10px Georgia, serif'; ctx.fillStyle = C.DARK_INK; ctx.textAlign = 'center';
    ctx.fillText('Population Over Time', PX + PW / 2, GRAPH_Y + 2);
    ctx.textAlign = 'left';

    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(PX + 20, GRAPH_Y + 10, GRAPH_W, GRAPH_H);
    ctx.strokeStyle = 'rgba(42,26,10,0.2)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(PX + 20, GRAPH_Y + 10, GRAPH_W, GRAPH_H);

    if (history.length > 1) {
      const maxPop = Math.max(...history.map(h => h.population || 0), 1);
      const toX = (i) => PX + 20 + (i / (history.length - 1)) * GRAPH_W;
      const toY = (v) => GRAPH_Y + 10 + GRAPH_H - (v / maxPop) * GRAPH_H;

      ctx.beginPath();
      ctx.moveTo(toX(0), GRAPH_Y + 10 + GRAPH_H);
      for (let i = 0; i < history.length; i++) ctx.lineTo(toX(i), toY(history[i].population || 0));
      ctx.lineTo(toX(history.length - 1), GRAPH_Y + 10 + GRAPH_H);
      ctx.closePath();
      ctx.fillStyle = 'rgba(26,74,42,0.2)'; ctx.fill();

      ctx.beginPath();
      ctx.moveTo(toX(0), toY(history[0].population || 0));
      for (let i = 1; i < history.length; i++) ctx.lineTo(toX(i), toY(history[i].population || 0));
      ctx.strokeStyle = C.DEEP_GREEN; ctx.lineWidth = 1.5; ctx.stroke();

      ctx.font = '8px monospace'; ctx.fillStyle = C.DEEP_GREEN;
      ctx.fillText('Pop: ' + (history[history.length - 1].population || 0), PX + 24, GRAPH_Y + 20);
    }

    // ── 7. REGION NOTE ──
    if (selectedRegion && REGIONS[selectedRegion]) {
      const rnY = PY + 600;
      ctx.fillStyle = 'rgba(200,150,40,0.18)';
      ctx.fillRect(PX + 15, rnY - 14, PW - 30, 18);
      ctx.font = 'italic bold 9px Georgia, serif'; ctx.fillStyle = C.DARK_INK; ctx.textAlign = 'center';
      ctx.fillText('Viewing: ' + REGIONS[selectedRegion].name, PX + PW / 2, rnY);
      ctx.textAlign = 'left';
    }
  }

  // ─── WORLD REGIONS ─────────────────────────────────────────────────────────

  function drawWorldRegions(ctx, state) {
    const selectedRegion = (state && state.stats && state.stats.selectedRegionKey) || null;
    for (const key of Object.keys(REGIONS)) {
      const r = REGIONS[key];
      const bg = getBgCanvas(key);
      if (bg) ctx.drawImage(bg, r.x, r.y);
      if (selectedRegion === key) {
        ctx.fillStyle = 'rgba(255,204,0,0.10)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }
    }
    ctx.strokeStyle = 'rgba(42,26,10,0.5)'; ctx.lineWidth = 1;
    for (const r of Object.values(REGIONS)) ctx.strokeRect(r.x, r.y, r.w, r.h);
  }

  // ─── NEWS TICKER ───────────────────────────────────────────────────────────

  function drawNewsTicker(ctx, state) {
    const NY = 28, NW = 820, NH = 20;
    const newsList = (state && state.newsList) || [];

    // Rebuild ticker text when news changes
    if (newsList.length > 0 && newsList[0].id !== visualState.newsLastId) {
      visualState.newsLastId = newsList[0].id;
      // Build a looping string of the last 8 news items
      const items = newsList.slice(0, 8);
      visualState.newsText = items.map(n => {
        const prefix = n.type === 'technology' ? '⚙ ' : n.type === 'exceptional' ? '★ ' : '◆ ';
        return `${prefix}[Yr ${n.year}] ${n.text}`;
      }).join('    ·    ') + '    ';
      visualState.newsScrollOffset = NW; // start off-screen right
    }

    // Background
    ctx.fillStyle = '#0f0c06';
    ctx.fillRect(0, NY, NW, NH);

    ctx.strokeStyle = C.GOLD; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, NY + NH); ctx.lineTo(NW, NY + NH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, NY); ctx.lineTo(NW, NY); ctx.stroke();

    // "LATEST:" label
    ctx.fillStyle = C.GOLD;
    ctx.fillRect(0, NY, 58, NH);
    ctx.font = 'bold 8px Georgia, serif';
    ctx.fillStyle = '#0f0c06';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('LATEST', 29, NY + NH / 2);
    ctx.textAlign = 'left';

    if (visualState.newsText) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(62, NY, NW - 62, NH);
      ctx.clip();

      ctx.font = '9px Georgia, serif';
      ctx.fillStyle = '#d4c890';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(visualState.newsText).width;
      ctx.fillText(visualState.newsText, visualState.newsScrollOffset, NY + NH / 2);
      // loop
      if (visualState.newsScrollOffset + tw < NW) {
        ctx.fillText(visualState.newsText, visualState.newsScrollOffset + tw, NY + NH / 2);
      }
      visualState.newsScrollOffset -= 1.5;
      if (visualState.newsScrollOffset < -tw) visualState.newsScrollOffset = NW;

      ctx.restore();
    } else {
      ctx.font = 'italic 9px Georgia, serif';
      ctx.fillStyle = 'rgba(212,200,144,0.35)';
      ctx.textBaseline = 'middle';
      ctx.fillText('Awaiting events...', 70, NY + NH / 2);
    }

    ctx.textBaseline = 'alphabetic';
  }

  // ─── HEADER BAR ────────────────────────────────────────────────────────────

  function drawHeader(ctx, state) {
    ctx.fillStyle = C.HEADER_BG;
    ctx.fillRect(0, 0, 1200, 50);
    ctx.strokeStyle = C.GOLD; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 49); ctx.lineTo(1200, 49); ctx.stroke();
    // Thin rule to separate title row from ticker row
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, 27); ctx.lineTo(820, 27); ctx.stroke();

    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillStyle = C.GOLD; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText("QUETELET'S WORLD", 18, 14);

    ctx.font = 'italic 9px Georgia, serif';
    ctx.fillStyle = 'rgba(200,160,80,0.7)';
    ctx.fillText("L'Homme Moyen · Statistical Atlas of the Living World", 200, 14);

    const year = (state && state.year) || 0;
    const pop  = (state && state.stats && state.stats.population) || 0;
    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(200,160,80,0.9)'; ctx.textAlign = 'right';
    ctx.fillText(`Year ${year}  |  Pop: ${pop}`, 810, 14);

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // ─── TOOLTIP ───────────────────────────────────────────────────────────────

  function drawTooltip(ctx) {
    const tt = visualState.tooltip;
    if (!tt) return;
    const m  = tt.meeple;
    const tx = Math.min(tt.x + 12, 1140);
    const ty = Math.min(tt.y - 20, 650);
    const lines = [
      m.name || 'Citizen',
      `Region: ${m.region || '?'}`,
      `Age: ${Math.floor((m.age || 0) / TICK_RATE)} yr`,
      `Int: ${(m.intelligence||0).toFixed(1)}  Str: ${(m.strength||0).toFixed(1)}  Looks: ${(m.looks||0).toFixed(1)}`,
    ];
    const pad = 6, lineH = 14, boxW = 160, boxH = lines.length * lineH + pad * 2;

    ctx.fillStyle = 'rgba(245,232,204,0.95)';
    roundRect(ctx, tx, ty, boxW, boxH, 4); ctx.fill();
    ctx.strokeStyle = C.GOLD; ctx.lineWidth = 1;
    roundRect(ctx, tx, ty, boxW, boxH, 4); ctx.stroke();

    ctx.fillStyle = C.DARK_INK;
    for (let li = 0; li < lines.length; li++) {
      ctx.font = li === 0 ? 'bold 10px Georgia, serif' : '9px Georgia, serif';
      ctx.fillText(lines[li], tx + pad, ty + pad + (li + 1) * lineH - 2);
    }
  }

  // ─── HOVER DETECTION ───────────────────────────────────────────────────────

  function updateTooltip(meeples) {
    if (!meeples) { visualState.tooltip = null; return; }
    const hx = visualState.hoverX, hy = visualState.hoverY;
    let found = null;
    for (const m of meeples) {
      if (!m.alive) continue;
      const dx = (m.x || 0) - hx, dy = (m.y || 0) - hy;
      if (dx * dx + dy * dy < 144) { found = m; break; }
    }
    visualState.tooltip = found ? { meeple: found, x: hx, y: hy } : null;
  }

  // ─── MAIN RENDER ───────────────────────────────────────────────────────────

  function render(state) {
    if (!_ctx) return;
    const ctx = _ctx;
    visualState.tick++;

    ctx.clearRect(0, 0, 1200, 700);

    // Header (dark bar with title/year/pop) — draws from y=0 to y=50
    // Ticker strip sits in lower half of header (y=28..48)
    drawHeader(ctx, state);
    drawNewsTicker(ctx, state);

    // World regions
    drawWorldRegions(ctx, state);

    // TV
    drawTV(ctx, state);

    // Meeple
    const meeples = (state && state.meeple) || [];
    updateTooltip(meeples);

    for (const m of meeples) {
      if (!m.alive && (m.deathTick === undefined || visualState.tick - m.deathTick > 120)) continue;
      const mx = m.x || 0, my = m.y || 0;
      if (mx >= 600 && mx <= 820 && my >= 55 && my <= 230) continue;
      const alpha = m.alive ? 1 : Math.max(0, 1 - (visualState.tick - (m.deathTick || 0)) / 120);
      ctx.save();
      ctx.globalAlpha = alpha;
      drawMeeple(ctx, m, mx, my, 1, { alpha });
      ctx.restore();
    }

    // Stats panel
    drawStatsPanel(ctx, state);

    // Tooltip
    drawTooltip(ctx);
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  window.SimVisual = {
    TICK_RATE,
    init(canvas) {
      _canvas = canvas;
      _ctx = canvas.getContext('2d');
      for (const key of Object.keys(REGIONS)) getBgCanvas(key);
    },
    render(state) { render(state); },
    setHover(x, y) { visualState.hoverX = x; visualState.hoverY = y; },
  };

})();
