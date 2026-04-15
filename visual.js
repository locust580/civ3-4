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
    PHOSPHOR_GRN: '#40ff80',
    HEADER_BG:    '#1a1208',
  };

  const REGIONS = {
    NORDIC:   { x:0,   y:50,  w:350, h:300, bgColor:'#c8e4cc', name:'Northern Reach' },
    ATLANTIC: { x:0,   y:350, w:350, h:350, bgColor:'#9db8d0', name:'Atlantic Coast'  },
    EASTERN:  { x:350, y:50,  w:250, h:325, bgColor:'#d4c878', name:'Eastern Steppe'  },
    HIGHLAND: { x:350, y:375, w:250, h:325, bgColor:'#a8b890', name:'Highland Peaks'  },
    SOUTHERN: { x:600, y:225, w:220, h:475, bgColor:'#d4b078', name:'Southern Lands'  },
  };

  const TICK_RATE = 60;

  // ─── VISUAL STATE ─────────────────────────────────────────────────────────
  const VS = {
    tick: 0,
    // TV
    tvQueue: [],          // local copy, consumed front-to-back
    tvCurrent: null,
    tvTimer: 0,
    tvScrollX: 0,
    tvMode: 'nosignal',   // 'exceptional' | 'history' | 'nosignal'
    // News ticker — continuous scroll, never resets
    newsSegments: [],     // array of text segments queued for display
    newsX: 820,           // current right-edge position of leading text
    newsRendered: '',     // the full looped string currently scrolling
    newsLastProcessedId: -1,
    // hover
    hoverX: 0, hoverY: 0,
    tooltip: null,
    // bg caches
    bgCanvases: {},
    buildingCanvases: {},  // tech-level -> canvas per region
  };

  let _canvas = null, _ctx = null;

  // ─── SEEDED RNG ───────────────────────────────────────────────────────────
  function seededRNG(seed) {
    let s = seed >>> 0;
    return () => { s = (s*1664525+1013904223)&0xffffffff; return (s>>>0)/0xffffffff; };
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
  }

  function drawStar(ctx, x, y, r) {
    ctx.save(); ctx.translate(x,y); ctx.beginPath();
    for (let i=0;i<8;i++){const a=(i*Math.PI)/4,rd=i%2===0?r:r*0.4;
      if(i===0)ctx.moveTo(Math.cos(a)*rd,Math.sin(a)*rd);
      else ctx.lineTo(Math.cos(a)*rd,Math.sin(a)*rd);}
    ctx.closePath();ctx.fill();ctx.restore();
  }

  function drawHeart(ctx, x, y, size) {
    ctx.save();ctx.translate(x,y);ctx.beginPath();
    ctx.moveTo(0,size*0.3);
    ctx.bezierCurveTo(-size,-size*0.3,-size*1.5,size*0.8,0,size*1.5);
    ctx.bezierCurveTo(size*1.5,size*0.8,size,-size*0.3,0,size*0.3);
    ctx.closePath();ctx.fill();ctx.restore();
  }

  // ─── BACKGROUND BUILDING ──────────────────────────────────────────────────

  function buildRegionBg(key) {
    if (VS.bgCanvases[key]) return;
    const r = REGIONS[key];
    const oc = document.createElement('canvas'); oc.width=r.w; oc.height=r.h;
    const cx = oc.getContext('2d');
    cx.fillStyle = r.bgColor; cx.fillRect(0,0,r.w,r.h);

    if (key === 'NORDIC') {
      const sg=cx.createLinearGradient(0,0,0,r.h);
      sg.addColorStop(0,'rgba(240,248,255,0.35)');sg.addColorStop(1,'rgba(240,248,255,0)');
      cx.fillStyle=sg;cx.fillRect(0,0,r.w,r.h);
      const rng=seededRNG(1337);
      cx.fillStyle='#2a5a30';
      for(let i=0;i<38;i++){
        const tx=rng()*r.w, ty=r.h*0.25+rng()*r.h*0.65, h=10+rng()*8;
        cx.beginPath();cx.moveTo(tx,ty-h);cx.lineTo(tx-5,ty);cx.lineTo(tx+5,ty);cx.closePath();cx.fill();
        cx.fillStyle='rgba(230,245,255,0.7)';
        cx.beginPath();cx.moveTo(tx,ty-h);cx.lineTo(tx-2,ty-h*0.6);cx.lineTo(tx+2,ty-h*0.6);cx.closePath();cx.fill();
        cx.fillStyle='#2a5a30';
      }
    } else if (key === 'ATLANTIC') {
      cx.fillStyle='#7a9e78';
      cx.beginPath();cx.moveTo(0,r.h*0.55);
      cx.bezierCurveTo(r.w*0.2,r.h*0.38,r.w*0.4,r.h*0.62,r.w*0.6,r.h*0.45);
      cx.bezierCurveTo(r.w*0.8,r.h*0.28,r.w,r.h*0.5,r.w,r.h*0.55);
      cx.lineTo(r.w,r.h);cx.lineTo(0,r.h);cx.closePath();cx.fill();
      cx.strokeStyle='rgba(60,80,110,0.25)';cx.lineWidth=1.5;
      for(let wave=0;wave<5;wave++){const wy=r.h*0.78+wave*9;
        cx.beginPath();cx.moveTo(0,wy);
        for(let wx=0;wx<r.w;wx+=28){cx.quadraticCurveTo(wx+7,wy-5,wx+14,wy);cx.quadraticCurveTo(wx+21,wy+5,wx+28,wy);}
        cx.stroke();}
    } else if (key === 'EASTERN') {
      const sg=cx.createLinearGradient(0,0,0,r.h*0.5);
      sg.addColorStop(0,'rgba(200,165,60,0.3)');sg.addColorStop(1,'rgba(200,165,60,0)');
      cx.fillStyle=sg;cx.fillRect(0,0,r.w,r.h*0.5);
      cx.strokeStyle='rgba(160,130,30,0.22)';cx.lineWidth=1;
      for(let ly=Math.floor(r.h*0.42);ly<r.h;ly+=5){cx.beginPath();cx.moveTo(0,ly);cx.lineTo(r.w,ly);cx.stroke();}
      cx.fillStyle='rgba(80,110,50,0.18)';cx.fillRect(0,r.h*0.4,r.w,4);
    } else if (key === 'HIGHLAND') {
      const mg=cx.createLinearGradient(0,0,0,r.h*0.5);
      mg.addColorStop(0,'rgba(220,230,220,0.5)');mg.addColorStop(1,'rgba(220,230,220,0)');
      cx.fillStyle=mg;cx.fillRect(0,0,r.w,r.h*0.5);
      cx.fillStyle='#6a7860';cx.beginPath();cx.moveTo(0,r.h*0.5);
      for(const [px,py] of [[0,0.5],[0.07,0.25],[0.14,0.42],[0.22,0.1],[0.30,0.38],[0.38,0.15],[0.46,0.35],[0.55,0.08],[0.63,0.32],[0.72,0.18],[0.80,0.40],[0.88,0.22],[0.96,0.44],[1.0,0.5]])
        cx.lineTo(px*r.w,py*r.h);
      cx.lineTo(r.w,r.h);cx.lineTo(0,r.h);cx.closePath();cx.fill();
      cx.fillStyle='rgba(240,248,255,0.8)';
      for(const [px,py] of [[0.22,0.1],[0.38,0.15],[0.55,0.08],[0.72,0.18]]){
        const x0=px*r.w,y0=py*r.h;cx.beginPath();cx.moveTo(x0,y0);cx.lineTo(x0-8,y0+10);cx.lineTo(x0+8,y0+10);cx.closePath();cx.fill();}
    } else if (key === 'SOUTHERN') {
      const sg=cx.createLinearGradient(0,0,0,r.h*0.4);
      sg.addColorStop(0,'rgba(255,180,60,0.2)');sg.addColorStop(1,'rgba(255,180,60,0)');
      cx.fillStyle=sg;cx.fillRect(0,0,r.w,r.h*0.4);
      cx.fillStyle='#c49040';const rng=seededRNG(4242);
      for(let d=0;d<7;d++){const dx=rng()*r.w,dy=r.h*0.7+rng()*r.h*0.25,dw=30+rng()*40;
        cx.beginPath();cx.ellipse(dx,dy,dw,8+rng()*6,0,Math.PI,0);cx.fill();}
    }

    // Region label
    cx.font='italic 10px Georgia,serif';cx.fillStyle='rgba(42,26,10,0.4)';
    cx.textAlign='right';cx.textBaseline='bottom';
    cx.fillText(r.name,r.w-6,r.h-5);cx.textAlign='left';cx.textBaseline='alphabetic';

    VS.bgCanvases[key] = oc;
  }

  // ─── TECH BUILDINGS ───────────────────────────────────────────────────────
  // Drawn on top of bg, showing settlement evolution with tech level

  function drawBuildings(ctx, regionKey, regionDef, techLevel) {
    const r = regionDef;
    const rng = seededRNG(regionKey.charCodeAt(0) * 997);
    const numSites = 4 + Math.floor(rng() * 3);  // 4–6 building sites

    for (let i = 0; i < numSites; i++) {
      const bx = r.x + 15 + rng() * (r.w - 30);
      const by = r.y + 20 + rng() * (r.h - 40);
      // skip TV area
      if (bx >= 590 && bx <= 830 && by >= 50 && by <= 240) continue;

      drawOneBuilding(ctx, bx, by, techLevel, rng());
    }
  }

  function drawOneBuilding(ctx, bx, by, tech, variant) {
    ctx.save();

    if (tech < 1.5) {
      // Primitive hut: small thatched triangle + base
      const w = 10 + variant * 4, h = 8;
      ctx.fillStyle = 'rgba(100,70,30,0.65)';
      ctx.fillRect(bx - w/2, by - h, w, h);
      ctx.fillStyle = 'rgba(140,100,40,0.7)';
      ctx.beginPath(); ctx.moveTo(bx, by - h - 7); ctx.lineTo(bx - w/2 - 2, by - h); ctx.lineTo(bx + w/2 + 2, by - h); ctx.closePath(); ctx.fill();

    } else if (tech < 3.5) {
      // Timber cottage with pitched roof
      const w = 12 + variant * 5, h = 10;
      ctx.fillStyle = 'rgba(180,130,70,0.75)';
      ctx.fillRect(bx - w/2, by - h, w, h);
      // door
      ctx.fillStyle = 'rgba(80,45,15,0.8)';
      ctx.fillRect(bx - 2, by - 5, 4, 5);
      // window
      ctx.fillStyle = 'rgba(200,220,255,0.5)';
      ctx.fillRect(bx + 3, by - 8, 3, 3);
      // roof
      ctx.fillStyle = 'rgba(100,60,30,0.8)';
      ctx.beginPath(); ctx.moveTo(bx, by - h - 8); ctx.lineTo(bx - w/2 - 1, by - h); ctx.lineTo(bx + w/2 + 1, by - h); ctx.closePath(); ctx.fill();

    } else if (tech < 5.5) {
      // Stone house with chimney
      const w = 14 + variant * 5, h = 13;
      ctx.fillStyle = 'rgba(150,140,120,0.8)';
      ctx.fillRect(bx - w/2, by - h, w, h);
      ctx.fillStyle = 'rgba(80,45,15,0.9)'; ctx.fillRect(bx - 2, by - 6, 4, 6);
      ctx.fillStyle = 'rgba(200,220,255,0.55)'; ctx.fillRect(bx + 3, by - 10, 3, 3); ctx.fillRect(bx - 6, by - 10, 3, 3);
      // tiled roof
      ctx.fillStyle = 'rgba(160,60,40,0.85)';
      ctx.beginPath(); ctx.moveTo(bx, by - h - 9); ctx.lineTo(bx - w/2 - 2, by - h); ctx.lineTo(bx + w/2 + 2, by - h); ctx.closePath(); ctx.fill();
      // chimney
      ctx.fillStyle = 'rgba(120,100,80,0.9)';
      ctx.fillRect(bx + w/2 - 5, by - h - 12, 4, 8);
      // smoke
      ctx.strokeStyle = 'rgba(200,200,200,0.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bx + w/2 - 3, by - h - 12);
      ctx.quadraticCurveTo(bx + w/2, by - h - 18, bx + w/2 - 1, by - h - 24); ctx.stroke();

    } else if (tech < 7.5) {
      // Victorian townhouse — tall narrow brick
      const w = 13, h = 22;
      ctx.fillStyle = 'rgba(160,80,60,0.85)';
      ctx.fillRect(bx - w/2, by - h, w, h);
      // windows (2 floors)
      ctx.fillStyle = 'rgba(220,240,255,0.6)';
      for (let fl = 0; fl < 2; fl++) {
        const wy = by - h + 3 + fl * 9;
        ctx.fillRect(bx - 4, wy, 3, 4); ctx.fillRect(bx + 1, wy, 3, 4);
      }
      ctx.fillStyle = 'rgba(80,45,15,0.9)'; ctx.fillRect(bx - 2, by - 6, 4, 6);
      // flat parapet
      ctx.fillStyle = 'rgba(130,60,40,0.9)'; ctx.fillRect(bx - w/2 - 1, by - h - 2, w + 2, 3);

    } else if (tech < 9.0) {
      // Art-deco / early modern building
      const w = 16, h = 30;
      ctx.fillStyle = 'rgba(180,180,170,0.85)';
      ctx.fillRect(bx - w/2, by - h, w, h);
      // regular windows grid
      ctx.fillStyle = 'rgba(160,210,255,0.6)';
      for (let fl = 0; fl < 4; fl++) for (let col = 0; col < 2; col++) {
        ctx.fillRect(bx - w/2 + 2 + col * 7, by - h + 3 + fl * 7, 4, 4);
      }
      // setback top
      ctx.fillStyle = 'rgba(140,140,130,0.9)';
      ctx.fillRect(bx - w/4, by - h - 8, w/2, 8);
      ctx.fillRect(bx - w/8, by - h - 14, w/4, 6);

    } else {
      // Skyscraper
      const w = 14, h = 48;
      const glassGrad = ctx.createLinearGradient(bx - w/2, by - h, bx + w/2, by);
      glassGrad.addColorStop(0, 'rgba(100,160,220,0.9)');
      glassGrad.addColorStop(0.5, 'rgba(180,210,240,0.85)');
      glassGrad.addColorStop(1, 'rgba(80,120,180,0.9)');
      ctx.fillStyle = glassGrad; ctx.fillRect(bx - w/2, by - h, w, h);
      // glass grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 0.5;
      for (let fl = 0; fl < h; fl += 5) { ctx.beginPath(); ctx.moveTo(bx-w/2, by-fl); ctx.lineTo(bx+w/2, by-fl); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(bx, by-h); ctx.lineTo(bx, by); ctx.stroke();
      // antenna
      ctx.strokeStyle = 'rgba(200,200,200,0.9)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx, by - h); ctx.lineTo(bx, by - h - 14); ctx.stroke();
      // window lights at night (flicker with tick)
      if (VS.tick % 3 !== 0) {
        ctx.fillStyle = 'rgba(255,240,150,0.5)';
        const trng = seededRNG(Math.floor(VS.tick / 120) + bx * 13);
        for (let ww = 0; ww < 6; ww++) {
          if (trng() > 0.4) ctx.fillRect(bx - w/2 + 1 + (ww%2)*7, by - h + 2 + Math.floor(ww/2)*5, 4, 3);
        }
      }
    }

    ctx.restore();
  }

  // ─── MEEPLE ───────────────────────────────────────────────────────────────

  function drawMeeple(ctx, m, cx, cy, scale, opts) {
    scale = scale || 1; opts = opts || {};
    const tick   = VS.tick;
    const intel  = m.intelligence || 5;
    const weight = m.weight || 70;
    const height = m.height || 170;
    const str    = m.strength || 5;
    const age    = m.age || 0;
    const isFem  = (m.gender === 'F');
    const alive  = m.alive !== false;

    const bob = Math.sin(tick * 0.25 + (m.id || 0)) * 1.2 * scale;

    const headR  = (3 + (intel / 10) * 1.5) * scale;
    const bodyW  = (4 + (weight - 50) / 10) * scale;
    const bodyH  = (8 + (height - 160) / 5) * scale;
    const legLen = 6 * scale;
    const neckH  = 2 * scale;
    const bodyTop = -bodyH * 0.5;
    const headCY  = bodyTop - neckH - headR;
    const femMod  = isFem ? 0.88 : 1;

    const skinColor  = m.skinTone    || '#4060d0';
    const clothColor = m.clothesColor || '#4a6a8a';
    const hairColor  = m.hairColor   || '#553300';

    ctx.save();
    ctx.translate(cx, cy + bob);
    if (!alive) ctx.globalAlpha = (opts.alpha !== undefined ? opts.alpha : 0.3);

    // LEGS
    ctx.strokeStyle = clothColor; ctx.lineWidth = Math.max(1.5*scale,1); ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-bodyW*0.3, bodyH*0.5); ctx.lineTo(-bodyW*0.4, bodyH*0.5+legLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( bodyW*0.3, bodyH*0.5); ctx.lineTo( bodyW*0.4, bodyH*0.5+legLen); ctx.stroke();

    // BODY
    ctx.fillStyle = clothColor;
    roundRect(ctx, -bodyW*femMod*0.5, bodyTop, bodyW*femMod, bodyH, isFem?2*scale:1.5*scale);
    ctx.fill();

    // Strength bulge
    if (m.exceptionalTrait === 'strength') {
      ctx.fillStyle = clothColor;
      ctx.beginPath(); ctx.ellipse(-bodyW*0.7, 0, 3*scale, 2*scale, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse( bodyW*0.7, 0, 3*scale, 2*scale, 0, 0, Math.PI*2); ctx.fill();
    }

    // ARMS
    const armLen = (6 + str*0.5) * scale;
    ctx.strokeStyle = skinColor; ctx.lineWidth = Math.max(1.5*scale,1);
    ctx.beginPath(); ctx.moveTo(-bodyW*0.5, bodyTop+bodyH*0.2); ctx.lineTo(-bodyW*0.5-armLen, bodyTop+bodyH*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( bodyW*0.5, bodyTop+bodyH*0.2); ctx.lineTo( bodyW*0.5+armLen, bodyTop+bodyH*0.5); ctx.stroke();

    // NECK + HEAD
    ctx.fillStyle = skinColor; ctx.fillRect(-1.2*scale, bodyTop-neckH, 2.4*scale, neckH+1);
    ctx.beginPath(); ctx.arc(0, headCY, headR, 0, Math.PI*2);
    ctx.fillStyle = skinColor; ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=0.5; ctx.stroke();

    // HAIR
    ctx.fillStyle = hairColor;
    ctx.beginPath(); ctx.arc(0, headCY, headR, Math.PI, 0); ctx.fill();

    // EXCEPTIONAL OVERLAYS
    if (m.exceptionalTrait === 'intelligence') {
      ctx.beginPath(); ctx.arc(0, headCY, headR+3*scale, 0, Math.PI*2);
      ctx.strokeStyle='rgba(200,160,30,0.7)'; ctx.lineWidth=1.5*scale; ctx.stroke();
      ctx.fillStyle='rgba(200,100,120,0.8)';
      ctx.beginPath(); ctx.ellipse(0, headCY-headR+scale, headR*0.55, headR*0.4, 0, 0, Math.PI*2); ctx.fill();
    }
    if (m.exceptionalTrait === 'agility') {
      // Speed lines
      const al = 0.5+0.5*Math.sin(tick*0.3);
      ctx.strokeStyle=`rgba(80,220,255,${al})`; ctx.lineWidth=1*scale;
      for(let si=0;si<3;si++){
        ctx.beginPath();ctx.moveTo(-bodyW*1.5-si*3,bodyH*0.2+si*2);ctx.lineTo(-bodyW*0.5,bodyH*0.2+si*2);ctx.stroke();
      }
    }
    if (m.exceptionalTrait === 'criminal') {
      ctx.fillStyle='rgba(40,0,60,0.4)';
      ctx.beginPath(); ctx.ellipse(0, bodyH*0.5+legLen, bodyW*0.9, 3*scale, 0, 0, Math.PI*2); ctx.fill();
    }

    // Newborn sparkle
    if (age < 5*TICK_RATE) {
      const sp=(tick%30)/30; ctx.fillStyle=`rgba(255,220,100,${0.8-sp})`;
      for(let si=0;si<3;si++){
        const a=(si/3)*Math.PI*2+sp*Math.PI*2;
        drawStar(ctx, Math.cos(a)*headR*1.5, headCY+Math.sin(a)*headR*1.5, 2.5*scale);
      }
    }

    // Married heart (brief)
    if (m.married && m.marriedYear !== undefined && m.marriedYear !== null) {
      const yearsMarried = (VS.tick / TICK_RATE) - m.marriedYear * (VS.tick / TICK_RATE / Math.max(1, VS.tick / TICK_RATE));
      // Use tick-based approach: store marriedTick if available
      if (m.marriedTick !== undefined && (VS.tick - m.marriedTick) < 90) {
        const el = VS.tick - m.marriedTick;
        const hy = headCY - headR - 8*scale - el*0.06;
        const fa = Math.max(0, 1 - el/90);
        ctx.fillStyle = `rgba(220,40,80,${fa})`;
        drawHeart(ctx, 0, hy, 4*scale);
      }
    }

    ctx.restore();
  }

  // ─── TV ───────────────────────────────────────────────────────────────────

  function drawTV(ctx, state) {
    const TX=600, TY=55, TW=220, TH=175;
    const SX=TX+28, SY=TY+20, SW=152, SH=110;

    // Cabinet
    ctx.save();
    const wg=ctx.createLinearGradient(TX,TY,TX+TW,TY+TH);
    wg.addColorStop(0,'#a06030');wg.addColorStop(0.4,'#7a4a1a');wg.addColorStop(1,'#5a3010');
    ctx.fillStyle=wg; roundRect(ctx,TX,TY,TW,TH,10); ctx.fill();
    ctx.strokeStyle='rgba(40,15,5,0.18)';ctx.lineWidth=1;
    for(let gx=TX+6;gx<TX+TW-4;gx+=12){ctx.beginPath();ctx.moveTo(gx,TY+6);ctx.bezierCurveTo(gx+2,TY+TH*0.33,gx-2,TY+TH*0.66,gx,TY+TH-6);ctx.stroke();}
    ctx.fillStyle='#222'; roundRect(ctx,SX-6,SY-6,SW+12,SH+12,5); ctx.fill();
    ctx.fillStyle='#0a0f0a'; roundRect(ctx,SX,SY,SW,SH,3); ctx.fill();

    // Update local TV queue from engine state (append new ones)
    const engQueue = (state && state.exceptionalQueue) || [];
    for (const e of engQueue) {
      if (!VS.tvQueue.some(q => q.id === e.id)) VS.tvQueue.push(e);
    }

    // Advance TV state
    if (VS.tvTimer <= 0) {
      if (VS.tvQueue.length > 0) {
        VS.tvCurrent = VS.tvQueue.shift();
        VS.tvTimer = TICK_RATE * 7;
        VS.tvScrollX = SW;
        VS.tvMode = 'exceptional';
      } else {
        const hist = (state && state.traitHistory) || [];
        VS.tvMode = hist.length > 3 ? 'history' : 'nosignal';
        VS.tvCurrent = null;
      }
    } else { VS.tvTimer--; }

    ctx.save(); ctx.beginPath(); roundRect(ctx,SX,SY,SW,SH,3); ctx.clip();

    if (VS.tvMode === 'exceptional' && VS.tvCurrent) {
      drawTVExceptional(ctx, VS.tvCurrent, SX, SY, SW, SH);
    } else if (VS.tvMode === 'history') {
      drawTVHistory(ctx, (state && state.traitHistory)||[], SX, SY, SW, SH);
    } else {
      drawTVNoSignal(ctx, SX, SY, SW, SH);
    }
    ctx.restore();

    // Vignette
    const vg=ctx.createLinearGradient(SX,SY,SX,SY+SH);
    vg.addColorStop(0,'rgba(0,0,0,0.2)');vg.addColorStop(0.1,'rgba(0,0,0,0)');
    vg.addColorStop(0.9,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.2)');
    ctx.fillStyle=vg; ctx.fillRect(SX,SY,SW,SH);

    // Knobs
    ctx.fillStyle='#3a2a10';
    ctx.beginPath();ctx.arc(TX+TW-16,SY+20,5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(TX+TW-16,SY+40,5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#1a0a00';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(TX+TW-16,SY+20,5,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(TX+TW-16,SY+40,5,0,Math.PI*2);ctx.stroke();

    ctx.font='italic 9px Georgia,serif'; ctx.fillStyle='rgba(200,160,80,0.85)';
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText('THE EXCEPTIONAL', TX+TW*0.45, TY+TH+3);
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    ctx.restore();
  }

  function drawTVExceptional(ctx, exc, SX, SY, SW, SH) {
    const glow=ctx.createRadialGradient(SX+SW*0.5,SY+SH*0.45,10,SX+SW*0.5,SY+SH*0.45,SW*0.6);
    glow.addColorStop(0,'rgba(40,100,50,0.45)'); glow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=glow; ctx.fillRect(SX,SY,SW,SH);

    ctx.save();
    ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=0.82;
    drawMeeple(ctx, {
      ...exc,
      skinTone:'#50c870', clothesColor:'#208040', hairColor:'#005520',
      vx:0, vy:0, alive:true, marriedTick: undefined,
    }, SX+SW*0.5, SY+SH*0.42, 3.5, {});
    ctx.restore();

    // Ticker
    const TY2 = SY+SH-22;
    ctx.fillStyle='rgba(0,0,0,0.78)'; ctx.fillRect(SX,TY2,SW,22);
    const labels = {intelligence:'Extraordinary Mind',strength:'Prodigious Strength',
      agility:'Swift & Agile', criminal:'Dangerous Character', height:'Towering Stature'};
    const desc = labels[exc.exceptionalTrait||exc.trait] || 'Notable Citizen';
    const txt = `  ${exc.name||'Unknown'}: ${desc}  ·  Year ${exc.year||0}    `;
    ctx.font='bold 8px monospace'; ctx.fillStyle=C.PHOSPHOR_GRN; ctx.textBaseline='middle';
    const tw=ctx.measureText(txt).width;
    const off = VS.tvScrollX % (tw+SW);
    ctx.fillText(txt, SX+SW-off, TY2+11);
    if (SW-off+tw>0) ctx.fillText(txt, SX+SW-off+tw, TY2+11);
    VS.tvScrollX += 1.2;

    ctx.fillStyle='rgba(0,0,0,0.22)';
    for(let sl=SY;sl<SY+SH;sl+=3) ctx.fillRect(SX,sl,SW,1);
    ctx.textBaseline='alphabetic';
  }

  function drawTVHistory(ctx, hist, SX, SY, SW, SH) {
    ctx.fillStyle='#050a05'; ctx.fillRect(SX,SY,SW,SH);
    const PAD=10, GX=SX+PAD, GY=SY+PAD+14, GW=SW-PAD*2, GH=SH-PAD*2-18;
    ctx.font='bold 7px monospace'; ctx.fillStyle=C.PHOSPHOR_GRN;
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText('TRAIT EVOLUTION', SX+SW/2, SY+4); ctx.textAlign='left';

    const items = hist.length>GW ? hist.slice(-GW) : hist;
    const n=items.length; if(n<2) return;
    const toX=(i)=>GX+(i/(n-1))*GW;
    const toY=(v)=>GY+GH-((v/10)*GH);

    ctx.strokeStyle='rgba(64,255,128,0.1)'; ctx.lineWidth=0.5;
    for(let g=0;g<=4;g++){const gy=GY+(g/4)*GH;ctx.beginPath();ctx.moveTo(GX,gy);ctx.lineTo(GX+GW,gy);ctx.stroke();}

    const series=[
      {key:'intelligence',color:'#40c8ff',label:'INT'},
      {key:'strength',color:'#ff6040',label:'STR'},
      {key:'agility',color:'#40ffb0',label:'AGI'},
    ];
    for(const s of series){
      ctx.beginPath();ctx.strokeStyle=s.color;ctx.lineWidth=1.2;
      ctx.moveTo(toX(0),toY(items[0][s.key]||5));
      for(let i=1;i<n;i++) ctx.lineTo(toX(i),toY(items[i][s.key]||5));
      ctx.stroke();
    }
    // Tech dashed gold
    ctx.beginPath();ctx.strokeStyle='rgba(200,160,30,0.6)';ctx.lineWidth=1;ctx.setLineDash([2,3]);
    ctx.moveTo(toX(0),toY(items[0].techLevel||0));
    for(let i=1;i<n;i++) ctx.lineTo(toX(i),toY(items[i].techLevel||0));
    ctx.stroke(); ctx.setLineDash([]);

    ctx.font='6px monospace'; ctx.textBaseline='bottom';
    [{label:'INT',color:'#40c8ff',x:GX},{label:'STR',color:'#ff6040',x:GX+22},
     {label:'AGI',color:'#40ffb0',x:GX+44},{label:'TEC',color:'rgba(200,160,30,0.8)',x:GX+66}]
      .forEach(l=>{ctx.fillStyle=l.color;ctx.fillText(l.label,l.x,SY+SH-2);});

    ctx.fillStyle='rgba(64,255,128,0.4)'; ctx.textAlign='right';
    ctx.fillText('yr '+(items[n-1].year||'?'), SX+SW-PAD, SY+SH-2); ctx.textAlign='left';
    ctx.fillStyle='rgba(0,0,0,0.15)';
    for(let sl=SY;sl<SY+SH;sl+=3) ctx.fillRect(SX,sl,SW,1);
    ctx.textBaseline='alphabetic';
  }

  function drawTVNoSignal(ctx, SX, SY, SW, SH) {
    ctx.fillStyle='#333'; ctx.fillRect(SX,SY,SW,SH);
    const rng=seededRNG(VS.tick*7+13); ctx.fillStyle='rgba(80,80,80,0.25)';
    for(let i=0;i<300;i++) ctx.fillRect(SX+Math.floor(rng()*SW),SY+Math.floor(rng()*SH),2,1);
    ctx.font='bold 11px monospace'; ctx.fillStyle=C.PHOSPHOR_GRN;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('NO SIGNAL',SX+SW/2,SY+SH/2-8);
    ctx.font='7px monospace'; ctx.fillStyle='rgba(64,255,128,0.5)';
    ctx.fillText('awaiting remarkable citizens',SX+SW/2,SY+SH/2+8);
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  }

  // ─── NEWS TICKER (continuous scroll, never resets) ────────────────────────

  function updateNewsText(newsList) {
    if (!newsList || !newsList.length) return;
    // Append any new items we haven't seen yet (newsList is newest-first)
    const newItems = newsList.filter(n => n.id > VS.newsLastProcessedId);
    if (!newItems.length) return;

    // Sort ascending so oldest-new appears first in the appended text
    newItems.sort((a,b) => a.id - b.id);
    VS.newsLastProcessedId = newItems[newItems.length-1].id;

    for (const n of newItems) {
      const icon = n.type==='technology' ? '⚙' : n.type==='exceptional' ? '★' : '◆';
      VS.newsSegments.push(`   ${icon} [Yr ${n.year}] ${n.text}`);
    }

    // Keep at most 30 segments buffered (older ones scroll off anyway)
    if (VS.newsSegments.length > 30) VS.newsSegments.splice(0, VS.newsSegments.length - 30);
  }

  function drawNewsTicker(ctx, state) {
    const NY=28, NW=820, NH=20;

    updateNewsText(state && state.newsList);

    // Build scroll string from buffered segments — keep enough to always fill screen
    // We maintain newsRendered as a continuously appended string; trim head when it's
    // far off-screen to prevent unbounded growth.
    if (VS.newsSegments.length > 0) {
      while (VS.newsSegments.length > 0) {
        VS.newsRendered += VS.newsSegments.shift();
        VS.newsRendered += '    ·    ';
      }
    }

    // Measure and trim head (portions that have scrolled well past left edge)
    ctx.font = '9px Georgia,serif';
    const totalW = ctx.measureText(VS.newsRendered).width;
    // If leading edge has gone > 2×NW past origin, trim first quarter of string
    if (totalW > NW * 6 && VS.newsX < -(totalW * 0.25)) {
      VS.newsRendered = VS.newsRendered.slice(Math.floor(VS.newsRendered.length * 0.25));
      VS.newsX += totalW * 0.25;
    }

    // If newsRendered is empty, show placeholder
    const displayText = VS.newsRendered ||
      '   ◆ Simulation begins — the first meeps draw breath.    ·    ';

    // Background
    ctx.fillStyle='#0f0c06'; ctx.fillRect(0,NY,NW,NH);
    ctx.strokeStyle=C.GOLD; ctx.lineWidth=0.5;
    ctx.beginPath();ctx.moveTo(0,NY+NH);ctx.lineTo(NW,NY+NH);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,NY);ctx.lineTo(NW,NY);ctx.stroke();

    // Label badge
    ctx.fillStyle=C.GOLD; ctx.fillRect(0,NY,56,NH);
    ctx.font='bold 8px Georgia,serif'; ctx.fillStyle='#0f0c06';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('LATEST',28,NY+NH/2); ctx.textAlign='left';

    // Scrolling text
    ctx.save(); ctx.beginPath(); ctx.rect(60,NY,NW-60,NH); ctx.clip();
    ctx.font='9px Georgia,serif'; ctx.fillStyle='#d4c890'; ctx.textBaseline='middle';

    const tw = ctx.measureText(displayText).width;
    ctx.fillText(displayText, VS.newsX, NY+NH/2);
    // Draw a second copy seamlessly to the right for looping feel
    if (VS.newsX + tw < NW) ctx.fillText(displayText, VS.newsX + tw, NY+NH/2);

    VS.newsX -= 1.5;
    // When the end of the string has scrolled past left edge of ticker area,
    // reset offset so it loops — but only if newsRendered hasn't grown in the meantime
    if (VS.newsX + tw < 60) {
      VS.newsX = NW; // restart from right edge
    }

    ctx.restore();
    ctx.textBaseline='alphabetic';
  }

  // ─── STATS PANEL ──────────────────────────────────────────────────────────

  function drawStatsPanel(ctx, state) {
    const PX=820, PY=50, PW=380, PH=650;
    const stats = (state&&state.stats)||{};
    const avg   = stats.averageMeep||{};
    const history = (state&&state.history)||[];
    const selReg = stats.selectedRegionKey||null;
    const regStats = stats.selectedRegionStats||null;
    const tech = stats.techLevel||0;
    const disp = (selReg && regStats) ? regStats : avg;

    // BG
    const pg=ctx.createLinearGradient(PX,PY,PX+PW,PY+PH);
    pg.addColorStop(0,'#f5e8cc');pg.addColorStop(1,'#edd8a8');
    ctx.fillStyle=pg; ctx.fillRect(PX,PY,PW,PH);
    ctx.strokeStyle=C.DARK_INK; ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(PX,PY);ctx.lineTo(PX,PY+PH);ctx.stroke();
    ctx.lineWidth=1; ctx.beginPath();ctx.moveTo(PX+4,PY);ctx.lineTo(PX+4,PY+PH);ctx.stroke();

    // Title
    ctx.fillStyle=C.DARK_INK; ctx.font='bold 22px Georgia,serif'; ctx.textAlign='center';
    ctx.fillText("L'HOMME MOYEN", PX+PW/2, PY+38);
    ctx.font='italic 10px Georgia,serif'; ctx.fillStyle='#6a4a20';
    ctx.fillText('The Average Man · After Quetelet, 1835', PX+PW/2, PY+54);
    ctx.textAlign='left';
    ctx.strokeStyle=C.GOLD; ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(PX+20,PY+62);ctx.lineTo(PX+PW-20,PY+62);ctx.stroke();

    // Average figure
    const avgCX=PX+PW/2, avgCY=PY+175;
    ctx.save(); ctx.strokeStyle='rgba(100,80,40,0.18)'; ctx.lineWidth=1.5;
    for(let bc=0;bc<3;bc++){const sx=25+bc*18;
      ctx.beginPath();ctx.moveTo(avgCX-sx*2.5,avgCY+35);
      ctx.bezierCurveTo(avgCX-sx,avgCY-20-bc*8,avgCX+sx,avgCY-20-bc*8,avgCX+sx*2.5,avgCY+35);
      ctx.stroke();}
    ctx.restore();

    ctx.save(); ctx.globalAlpha=0.6;
    drawMeeple(ctx, {
      intelligence: disp.intelligence||5, weight: disp.weight||70,
      height: disp.height||170, strength: disp.strength||5, agility: disp.agility||5,
      gender:'M', skinTone: disp.skinTone||'#606080', clothesColor:'#888888',
      hairColor:'#555555', vx:0, vy:0, alive:true,
    }, avgCX, avgCY, 5.0, {});
    ctx.restore();

    ctx.font='10px Georgia,serif'; ctx.fillStyle=C.DARK_INK; ctx.textAlign='center';
    ctx.fillText(`Height: ${disp.height?disp.height.toFixed(1):'—'} cm   Weight: ${disp.weight?disp.weight.toFixed(1):'—'} kg`, avgCX, avgCY+55);
    ctx.font='italic 8px Georgia,serif'; ctx.fillStyle='#888';
    ctx.fillText(selReg ? 'Viewing: '+(REGIONS[selReg]?REGIONS[selReg].name:selReg) : '*This individual does not exist*', avgCX, avgCY+67);
    ctx.textAlign='left';

    // Tech bar
    const TY3=PY+260;
    ctx.font='italic 9px Georgia,serif'; ctx.fillStyle='#6a4a20'; ctx.textAlign='right';
    ctx.fillText('Technological Progress', PX+120, TY3+11); ctx.textAlign='left';
    const tbW=200;
    ctx.fillStyle='rgba(0,0,0,0.1)'; ctx.fillRect(PX+125,TY3,tbW,12);
    const tg=ctx.createLinearGradient(PX+125,0,PX+125+tbW,0);
    tg.addColorStop(0,'#aa7a20');tg.addColorStop(1,'#ffdf60');
    ctx.fillStyle=tg; ctx.fillRect(PX+125,TY3,(tech/10)*tbW,12);
    ctx.strokeStyle='rgba(42,26,10,0.3)'; ctx.lineWidth=0.5; ctx.strokeRect(PX+125,TY3,tbW,12);
    ctx.font='9px monospace'; ctx.fillStyle=C.DARK_INK; ctx.fillText(tech.toFixed(1),PX+330,TY3+10);

    // Trait gauges — replaced "Looks" with "Agility"
    const GAUGE_Y=PY+290;
    const gauges=[
      {label:'Intellect', key:'intelligence', color:'#4a7aaa'},
      {label:'Agility',   key:'agility',      color:'#3aaa70'},
      {label:'Strength',  key:'strength',     color:'#4a8a50'},
    ];
    ctx.font='10px Georgia,serif'; ctx.fillStyle=C.DARK_INK; ctx.textAlign='center';
    ctx.fillText('— Average Traits —', PX+PW/2, GAUGE_Y-6); ctx.textAlign='left';
    for(let gi=0;gi<gauges.length;gi++){
      const gy=GAUGE_Y+gi*30, g=gauges[gi], val=disp[g.key]||0, bW=200;
      ctx.font='10px Georgia,serif'; ctx.fillStyle=C.DARK_INK; ctx.textAlign='right';
      ctx.fillText(g.label, PX+95, gy+11); ctx.textAlign='left';
      ctx.fillStyle='rgba(0,0,0,0.1)'; ctx.fillRect(PX+100,gy+2,bW,14);
      const bg=ctx.createLinearGradient(PX+100,0,PX+100+bW,0);
      bg.addColorStop(0,g.color+'aa');bg.addColorStop(1,g.color);
      ctx.fillStyle=bg; ctx.fillRect(PX+100,gy+2,(val/10)*bW,14);
      ctx.strokeStyle='rgba(42,26,10,0.3)'; ctx.lineWidth=0.5; ctx.strokeRect(PX+100,gy+2,bW,14);
      ctx.font='10px monospace'; ctx.fillStyle=C.DARK_INK; ctx.fillText(val.toFixed(1),PX+306,gy+11);
    }

    // Vitals
    const VS_Y=PY+400;
    ctx.strokeStyle=C.GOLD; ctx.lineWidth=0.5;
    ctx.beginPath();ctx.moveTo(PX+20,VS_Y-10);ctx.lineTo(PX+PW-20,VS_Y-10);ctx.stroke();
    ctx.font='bold 10px Georgia,serif'; ctx.fillStyle=C.DARK_INK; ctx.textAlign='center';
    ctx.fillText('— Vital Statistics —', PX+PW/2, VS_Y+2);
    const vitals=[
      {label:'Marriage Rate', val: disp.marriageRate!=null?(disp.marriageRate*100):null, unit:'%'},
      {label:'Crime Rate',    val: disp.crimeRate!=null?(disp.crimeRate*100):null,    unit:'%'},
      {label:'Suicide Rate',  val: disp.suicideRate!=null?(disp.suicideRate*100):null,  unit:'%'},
      {label:'Life Expect.',  val: disp.lifeExpectancy!=null?disp.lifeExpectancy:null, unit:'yr'},
    ];
    const cW=(PW-40)/2;
    vitals.forEach((v,vi)=>{
      const col=vi%2, row=Math.floor(vi/2);
      const vx2=PX+20+col*cW, vy2=VS_Y+16+row*40;
      ctx.font='italic 8px Georgia,serif'; ctx.fillStyle='#6a4a20'; ctx.textAlign='center';
      ctx.fillText(v.label, vx2+cW/2, vy2);
      ctx.font='bold 15px Georgia,serif'; ctx.fillStyle=C.DARK_INK;
      ctx.fillText((v.val!=null?v.val.toFixed(1):'—')+' '+v.unit, vx2+cW/2, vy2+16);
    });
    ctx.textAlign='left';

    // Pop graph
    const GY=PY+505, GH=88, GW=PW-40;
    ctx.strokeStyle=C.GOLD; ctx.lineWidth=0.5;
    ctx.beginPath();ctx.moveTo(PX+20,GY-10);ctx.lineTo(PX+PW-20,GY-10);ctx.stroke();
    ctx.font='bold 10px Georgia,serif'; ctx.fillStyle=C.DARK_INK; ctx.textAlign='center';
    ctx.fillText('Population Over Time', PX+PW/2, GY+2); ctx.textAlign='left';
    ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.fillRect(PX+20,GY+10,GW,GH);
    ctx.strokeStyle='rgba(42,26,10,0.2)'; ctx.lineWidth=0.5; ctx.strokeRect(PX+20,GY+10,GW,GH);
    if(history.length>1){
      const mxP=Math.max(...history.map(h=>h.population||0),1);
      const toX=(i)=>PX+20+(i/(history.length-1))*GW;
      const toY=(v)=>GY+10+GH-(v/mxP)*GH;
      ctx.beginPath(); ctx.moveTo(toX(0),GY+10+GH);
      for(let i=0;i<history.length;i++) ctx.lineTo(toX(i),toY(history[i].population||0));
      ctx.lineTo(toX(history.length-1),GY+10+GH); ctx.closePath();
      ctx.fillStyle='rgba(26,74,42,0.2)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(toX(0),toY(history[0].population||0));
      for(let i=1;i<history.length;i++) ctx.lineTo(toX(i),toY(history[i].population||0));
      ctx.strokeStyle=C.DEEP_GREEN; ctx.lineWidth=1.5; ctx.stroke();
      ctx.font='8px monospace'; ctx.fillStyle=C.DEEP_GREEN;
      ctx.fillText('Pop: '+(history[history.length-1].population||0), PX+24, GY+20);
    }

    if(selReg&&REGIONS[selReg]){
      const rnY=PY+600;
      ctx.fillStyle='rgba(200,150,40,0.18)'; ctx.fillRect(PX+15,rnY-14,PW-30,18);
      ctx.font='italic bold 9px Georgia,serif'; ctx.fillStyle=C.DARK_INK; ctx.textAlign='center';
      ctx.fillText('Viewing: '+REGIONS[selReg].name, PX+PW/2, rnY); ctx.textAlign='left';
    }
  }

  // ─── WORLD REGIONS ────────────────────────────────────────────────────────

  function drawWorldRegions(ctx, state) {
    const selReg = (state&&state.stats&&state.stats.selectedRegionKey)||null;
    const tech   = (state&&state.stats&&state.stats.techLevel)||0;

    for(const key of Object.keys(REGIONS)){
      buildRegionBg(key);
      const r=REGIONS[key];
      ctx.drawImage(VS.bgCanvases[key], r.x, r.y);
      if(selReg===key){ctx.fillStyle='rgba(255,204,0,0.10)';ctx.fillRect(r.x,r.y,r.w,r.h);}
    }

    // Draw buildings on top of backgrounds
    for(const [key, r] of Object.entries(REGIONS)){
      drawBuildings(ctx, key, r, tech);
    }

    // Region borders
    ctx.strokeStyle='rgba(42,26,10,0.5)'; ctx.lineWidth=1;
    for(const r of Object.values(REGIONS)) ctx.strokeRect(r.x,r.y,r.w,r.h);
  }

  // ─── HEADER ───────────────────────────────────────────────────────────────

  function drawHeader(ctx, state) {
    ctx.fillStyle=C.HEADER_BG; ctx.fillRect(0,0,1200,50);
    ctx.strokeStyle=C.GOLD; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(0,49);ctx.lineTo(1200,49);ctx.stroke();
    ctx.lineWidth=0.5;
    ctx.beginPath();ctx.moveTo(0,27);ctx.lineTo(820,27);ctx.stroke();

    ctx.font='bold 15px Georgia,serif'; ctx.fillStyle=C.GOLD;
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText("QUETELET'S WORLD",18,14);
    ctx.font='italic 9px Georgia,serif'; ctx.fillStyle='rgba(200,160,80,0.7)';
    ctx.fillText("L'Homme Moyen · Statistical Atlas of the Living World",200,14);

    const year=(state&&state.year)||0;
    const pop=(state&&state.stats&&state.stats.population)||0;
    ctx.font='11px monospace'; ctx.fillStyle='rgba(200,160,80,0.9)'; ctx.textAlign='right';
    ctx.fillText(`Year ${year}  |  Pop: ${pop}`,810,14);
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  }

  // ─── TOOLTIP ──────────────────────────────────────────────────────────────

  function drawTooltip(ctx) {
    const tt=VS.tooltip; if(!tt) return;
    const m=tt.meeple;
    const tx=Math.min(tt.x+12,1140), ty=Math.min(tt.y-20,650);
    const lines=[
      m.name||'Citizen',
      `Region: ${m.region||'?'}`,
      `Age: ${Math.floor((m.age||0)/TICK_RATE)} yr`,
      `Int: ${(m.intelligence||0).toFixed(1)}  Str: ${(m.strength||0).toFixed(1)}  Agi: ${(m.agility||0).toFixed(1)}`,
    ];
    const pad=6, lH=14, bW=170, bH=lines.length*lH+pad*2;
    ctx.fillStyle='rgba(245,232,204,0.95)'; roundRect(ctx,tx,ty,bW,bH,4); ctx.fill();
    ctx.strokeStyle=C.GOLD; ctx.lineWidth=1; roundRect(ctx,tx,ty,bW,bH,4); ctx.stroke();
    ctx.fillStyle=C.DARK_INK;
    for(let li=0;li<lines.length;li++){
      ctx.font=li===0?'bold 10px Georgia,serif':'9px Georgia,serif';
      ctx.fillText(lines[li],tx+pad,ty+pad+(li+1)*lH-2);
    }
  }

  function updateTooltip(meeples) {
    if(!meeples){VS.tooltip=null;return;}
    const hx=VS.hoverX, hy=VS.hoverY;
    let found=null;
    for(const m of meeples){
      if(!m.alive) continue;
      const dx=(m.x||0)-hx, dy=(m.y||0)-hy;
      if(dx*dx+dy*dy<144){found=m;break;}
    }
    VS.tooltip=found?{meeple:found,x:hx,y:hy}:null;
  }

  // ─── MAIN RENDER ──────────────────────────────────────────────────────────

  function render(state) {
    if(!_ctx) return;
    const ctx=_ctx;
    VS.tick++;

    ctx.clearRect(0,0,1200,700);

    drawHeader(ctx, state);
    drawNewsTicker(ctx, state);
    drawWorldRegions(ctx, state);
    drawTV(ctx, state);

    const meeples=(state&&state.meeple)||[];
    updateTooltip(meeples);

    for(const m of meeples){
      if(!m.alive && (m.deathTick===undefined||VS.tick-m.deathTick>120)) continue;
      const mx=m.x||0, my=m.y||0;
      if(mx>=600&&mx<=820&&my>=55&&my<=230) continue;
      const alpha=m.alive?1:Math.max(0,1-(VS.tick-(m.deathTick||0))/120);
      ctx.save(); ctx.globalAlpha=alpha;
      drawMeeple(ctx,m,mx,my,1,{alpha});
      ctx.restore();
    }

    drawStatsPanel(ctx, state);
    drawTooltip(ctx);
  }

  // ─── PUBLIC API ───────────────────────────────────────────────────────────
  window.SimVisual = {
    TICK_RATE,
    init(canvas) {
      _canvas=canvas; _ctx=canvas.getContext('2d');
      // Reset visual state on reinit
      VS.tvQueue=[]; VS.tvCurrent=null; VS.tvTimer=0; VS.tvMode='nosignal';
      VS.newsSegments=[]; VS.newsX=820; VS.newsRendered=''; VS.newsLastProcessedId=-1;
      VS.bgCanvases={}; VS.buildingCanvases={};
    },
    render(state) { render(state); },
    setHover(x,y) { VS.hoverX=x; VS.hoverY=y; },
  };
})();
