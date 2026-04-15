// engine.js — Quetelet's Average Man Simulation Engine
// "From the chaos of individual lives, the statistical ghost emerges."

(function () {
  'use strict';

  // ─── CONSTANTS ────────────────────────────────────────────────────────────

  const TICK_RATE = 60;
  const MAX_POP   = 300;
  const TV_AREA   = { x: 600, y: 55, w: 220, h: 175 };

  const REGIONS = {
    NORDIC: {
      name: 'Northern Reach', bgColor: '#c8e4cc',
      x: 0, y: 50, w: 350, h: 300,
      avgHeight: 179, heightSD: 7, avgWeight: 82, weightSD: 9,
      avgLooks: 5.5, looksSD: 1.5, avgStrength: 6, strengthSD: 1.5,
      avgIntelligence: 6.5, intelligenceSD: 1.5, baseLifespanYears: 72,
      fertilityRate: 0.0008, marriageRate: 0.003, crimeRate: 0.001, suicideRate: 0.002,
      skinToneBase: '#f8d9c4', hairColorBase: '#d4af37',
      // runtime drift accumulators (will be initialized)
      _heightDrift: 0, _intelligenceDrift: 0, _strengthDrift: 0, _looksDrift: 0, _crimeDrift: 0,
    },
    ATLANTIC: {
      name: 'Atlantic Coast', bgColor: '#9db8d0',
      x: 0, y: 350, w: 350, h: 350,
      avgHeight: 173, heightSD: 7, avgWeight: 76, weightSD: 9,
      avgLooks: 5.0, looksSD: 1.8, avgStrength: 5.5, strengthSD: 1.5,
      avgIntelligence: 5.5, intelligenceSD: 1.5, baseLifespanYears: 68,
      fertilityRate: 0.001, marriageRate: 0.004, crimeRate: 0.003, suicideRate: 0.0015,
      skinToneBase: '#e8c4a0', hairColorBase: '#7a3a10',
      _heightDrift: 0, _intelligenceDrift: 0, _strengthDrift: 0, _looksDrift: 0, _crimeDrift: 0,
    },
    EASTERN: {
      name: 'Eastern Steppe', bgColor: '#d4c878',
      x: 350, y: 50, w: 250, h: 325,
      avgHeight: 170, heightSD: 5, avgWeight: 68, weightSD: 7,
      avgLooks: 5.5, looksSD: 1.5, avgStrength: 5.0, strengthSD: 1.5,
      avgIntelligence: 7.0, intelligenceSD: 1.5, baseLifespanYears: 74,
      fertilityRate: 0.0012, marriageRate: 0.005, crimeRate: 0.0008, suicideRate: 0.001,
      skinToneBase: '#e8c880', hairColorBase: '#1a1a1a',
      _heightDrift: 0, _intelligenceDrift: 0, _strengthDrift: 0, _looksDrift: 0, _crimeDrift: 0,
    },
    HIGHLAND: {
      name: 'Highland Peaks', bgColor: '#a8b890',
      x: 350, y: 375, w: 250, h: 325,
      avgHeight: 171, heightSD: 6, avgWeight: 78, weightSD: 8,
      avgLooks: 4.5, looksSD: 1.5, avgStrength: 7.0, strengthSD: 1.5,
      avgIntelligence: 5.0, intelligenceSD: 1.5, baseLifespanYears: 70,
      fertilityRate: 0.0009, marriageRate: 0.003, crimeRate: 0.001, suicideRate: 0.001,
      skinToneBase: '#f0d0b0', hairColorBase: '#3a2010',
      _heightDrift: 0, _intelligenceDrift: 0, _strengthDrift: 0, _looksDrift: 0, _crimeDrift: 0,
    },
    SOUTHERN: {
      name: 'Southern Lands', bgColor: '#d4b078',
      x: 600, y: 225, w: 220, h: 475,
      avgHeight: 169, heightSD: 6, avgWeight: 70, weightSD: 8,
      avgLooks: 6.0, looksSD: 1.8, avgStrength: 5.5, strengthSD: 1.5,
      avgIntelligence: 5.5, intelligenceSD: 1.5, baseLifespanYears: 65,
      fertilityRate: 0.0015, marriageRate: 0.006, crimeRate: 0.005, suicideRate: 0.001,
      skinToneBase: '#c07840', hairColorBase: '#120800',
      _heightDrift: 0, _intelligenceDrift: 0, _strengthDrift: 0, _looksDrift: 0, _crimeDrift: 0,
    },
  };

  // ─── NAME BANKS ───────────────────────────────────────────────────────────

  const NAMES = {
    NORDIC:   { M: ['Erik','Bjorn','Leif','Gunnar','Sven','Ragnar','Halvard','Torsten','Ivar','Ulf'],
                F: ['Astrid','Sigrid','Ingrid','Freya','Helga','Ragnhild','Solveig','Thyra','Gudrun','Eira'] },
    ATLANTIC: { M: ['Cormac','Declan','Finnian','Seamus','Padraig','Brendan','Cathal','Diarmuid','Oisin','Ruairi'],
                F: ['Siobhan','Aoife','Niamh','Brigid','Fionnuala','Deirdre','Caoimhe','Saoirse','Orla','Roisin'] },
    EASTERN:  { M: ['Chen','Arash','Dmitri','Yusuf','Tariq','Bogdan','Mirza','Ilya','Reza','Timur'],
                F: ['Mei','Nasrin','Anya','Fateh','Zara','Mila','Layla','Sura','Irina','Nadia'] },
    HIGHLAND: { M: ['Hamish','Angus','Callum','Dougal','Fergus','Lachlan','Murdoch','Rory','Tavish','Alasdair'],
                F: ['Fiona','Morag','Catriona','Isla','Mairi','Rhona','Sheena','Iona','Kirsty','Eilidh'] },
    SOUTHERN: { M: ['Omar','Dario','Hassan','Matteo','Karim','Luca','Tariq','Amr','Samir','Idris'],
                F: ['Fatima','Leila','Sofia','Amina','Giulia','Nour','Samira','Yasmine','Rania','Chiara'] },
  };

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  function normalRandom(mean, sd) {
    // Box-Muller transform
    let u, v;
    do { u = Math.random(); } while (u === 0);
    do { v = Math.random(); } while (v === 0);
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + sd * z;
  }

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }

  function blendHex(hex1, hex2, t) {
    const a = hexToRgb(hex1), b = hexToRgb(hex2);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return '#' + [r, g, bl].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  function randomName(gender, regionKey) {
    const pool = NAMES[regionKey][gender];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function regionOf(x, y) {
    for (const [key, r] of Object.entries(REGIONS)) {
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return key;
    }
    return null;
  }

  function inTVArea(x, y) {
    return x >= TV_AREA.x && x < TV_AREA.x + TV_AREA.w &&
           y >= TV_AREA.y && y < TV_AREA.y + TV_AREA.h;
  }

  function randomPointInRegion(rKey) {
    const r = REGIONS[rKey];
    const PAD = 10;
    let x, y, attempts = 0;
    do {
      x = r.x + PAD + Math.random() * (r.w - 2 * PAD);
      y = r.y + PAD + Math.random() * (r.h - 2 * PAD);
      attempts++;
    } while (inTVArea(x, y) && attempts < 20);
    return { x, y };
  }

  // ─── STATE ────────────────────────────────────────────────────────────────

  let _meeple       = [];
  let _nextId       = 0;
  let _tick         = 0;
  let _year         = 0;
  let _selectedRegion = null;

  let _yearBirths    = 0;
  let _yearDeaths    = 0;
  let _yearMarriages = 0;
  let _yearCrimes    = 0;
  let _yearSuicides  = 0;

  let _history         = [];
  let _exceptionalQueue = [];
  let _averageMeep     = null;
  let _selectedRegionStats = null;

  // ─── MEEPLE FACTORY ───────────────────────────────────────────────────────

  function createMeeple(rKey, opts = {}) {
    const r = REGIONS[rKey];
    const gender = Math.random() < 0.5 ? 'M' : 'F';
    const pos = opts.x != null ? { x: opts.x, y: opts.y } : randomPointInRegion(rKey);
    const age = opts.age != null ? opts.age : 0;

    // Traits — drift shifts the effective regional mean over time
    const effAvgH = r.avgHeight + r._heightDrift;
    const effAvgI = r.avgIntelligence + r._intelligenceDrift;
    const effAvgS = r.avgStrength + r._strengthDrift;
    const effAvgL = r.avgLooks + r._looksDrift;

    let height      = clamp(normalRandom(effAvgH, r.heightSD), 140, 220);
    let weight      = clamp(normalRandom(r.avgWeight, r.weightSD), 40, 160);
    let looks       = clamp(normalRandom(effAvgL, r.looksSD), 0, 10);
    let strength    = clamp(normalRandom(effAvgS, r.strengthSD), 0, 10);
    let intelligence = clamp(normalRandom(effAvgI, r.intelligenceSD), 0, 10);

    // Hereditary blending
    if (opts.parentTraits) {
      const pt = opts.parentTraits;
      const blend = (pVal, rAvg, rSD) => {
        const mid = (pt[pVal + 'A'] + pt[pVal + 'B']) / 2;
        return clamp(normalRandom(mid, 0.3 * rSD), 0, 300);
      };
      height      = clamp(normalRandom((pt.heightA + pt.heightB) / 2, 0.3 * r.heightSD), 140, 220);
      weight      = clamp(normalRandom((pt.weightA + pt.weightB) / 2, 0.3 * r.weightSD), 40, 160);
      looks       = clamp(normalRandom((pt.looksA + pt.looksB) / 2, 0.3 * r.looksSD), 0, 10);
      strength    = clamp(normalRandom((pt.strengthA + pt.strengthB) / 2, 0.3 * r.strengthSD), 0, 10);
      intelligence = clamp(normalRandom((pt.intelligenceA + pt.intelligenceB) / 2, 0.3 * r.intelligenceSD), 0, 10);
    }

    // Lifespan with some variance
    const lifespanTicks = Math.round(normalRandom(r.baseLifespanYears, 8) * TICK_RATE);

    // Looks-based suicide risk modifier (applied in step)
    const skinNoise = blendHex(r.skinToneBase, '#ffffff', Math.random() * 0.15);
    const hairNoise = blendHex(r.hairColorBase, '#888888', Math.random() * 0.2);

    // Clothes colour: regional hue with personal variation
    const clothesColor = blendHex(r.bgColor, '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'), 0.35);

    const m = {
      id:      _nextId++,
      name:    randomName(gender, rKey) + ' of ' + r.name,
      x:       pos.x,
      y:       pos.y,
      vx:      0,
      vy:      0,
      region:  rKey,
      age:     age,
      maxAge:  lifespanTicks,
      alive:   true,
      deathCause: null,

      height, weight, looks, strength, intelligence,

      married:    false,
      spouseId:   null,
      children:   [],
      parentIds:  opts.parentIds || null,
      hasCrime:   false,
      isSuicide:  false,

      gender,
      skinTone:     skinNoise,
      hairColor:    hairNoise,
      clothesColor: clothesColor,

      isExceptional:        false,
      exceptionalTrait:     null,
      exceptionalMagnitude: 0,
      _legacyApplied:       false,

      moveTarget:   null,
      moveTimer:    0,
      socialTarget: null,
      speed:        0.4 + Math.random() * 0.4,
    };

    checkExceptional(m);
    return m;
  }

  function checkExceptional(m) {
    const r = REGIONS[m.region];
    const zScores = {
      intelligence: (m.intelligence - (r.avgIntelligence + r._intelligenceDrift)) / r.intelligenceSD,
      strength:     (m.strength     - (r.avgStrength     + r._strengthDrift))     / r.strengthSD,
      looks:        (m.looks        - (r.avgLooks        + r._looksDrift))         / r.looksSD,
      height:       (m.height       - (r.avgHeight       + r._heightDrift))        / r.heightSD,
    };
    let best = null, bestZ = 0;
    for (const [trait, z] of Object.entries(zScores)) {
      if (z > bestZ) { bestZ = z; best = trait; }
    }
    if (bestZ > 2.5) {
      m.isExceptional        = true;
      m.exceptionalTrait     = best;
      m.exceptionalMagnitude = bestZ;
      enqueueExceptional(m);
    }
  }

  function enqueueExceptional(m) {
    _exceptionalQueue.unshift({
      id:        m.id,
      name:      m.name,
      region:    m.region,
      trait:     m.exceptionalTrait,
      magnitude: m.exceptionalMagnitude,
      year:      _year,
      tick:      _tick,
    });
    if (_exceptionalQueue.length > 10) _exceptionalQueue.length = 10;
  }

  // ─── INITIAL POPULATION ───────────────────────────────────────────────────

  function spawnInitialPopulation() {
    for (const rKey of Object.keys(REGIONS)) {
      const count = 12 + Math.floor(Math.random() * 4); // 12–15
      for (let i = 0; i < count; i++) {
        const ageTicks = Math.floor(Math.random() * 50 * TICK_RATE);
        _meeple.push(createMeeple(rKey, { age: ageTicks }));
      }
    }
  }

  // ─── MOVEMENT ─────────────────────────────────────────────────────────────

  function pickNewTarget(m) {
    const r = REGIONS[m.region];

    // Young child: stay near parent
    if (m.age < 5 * TICK_RATE && m.parentIds) {
      const parent = _meeple.find(p => p.id === m.parentIds[0] && p.alive);
      if (parent) {
        m.moveTarget = {
          x: clamp(parent.x + (Math.random() - 0.5) * 30, r.x + 5, r.x + r.w - 5),
          y: clamp(parent.y + (Math.random() - 0.5) * 30, r.y + 5, r.y + r.h - 5),
        };
        m.moveTimer = 30 + Math.floor(Math.random() * 60);
        return;
      }
    }

    // Married: 30% chance walk toward spouse
    if (m.married && m.spouseId != null && Math.random() < 0.30) {
      const spouse = _meeple.find(p => p.id === m.spouseId && p.alive);
      if (spouse) {
        m.moveTarget  = { x: spouse.x, y: spouse.y };
        m.socialTarget = spouse.id;
        m.moveTimer   = 60 + Math.floor(Math.random() * 60);
        return;
      }
    }

    m.socialTarget = null;
    m.moveTarget   = randomPointInRegion(m.region);
    m.moveTimer    = 90 + Math.floor(Math.random() * 151);
  }

  function moveMeeple(m) {
    if (!m.alive) return;
    m.age++;
    m.moveTimer--;

    if (m.moveTimer <= 0 || m.moveTarget == null) {
      pickNewTarget(m);
    }

    const dx = m.moveTarget.x - m.x;
    const dy = m.moveTarget.y - m.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      m.moveTimer = 0; // pick new target next tick
      return;
    }

    const nx = dx / dist;
    const ny = dy / dist;
    let nx2 = m.x + nx * m.speed;
    let ny2 = m.y + ny * m.speed;

    // Bounce out of TV area
    if (inTVArea(nx2, ny2)) {
      m.moveTarget = randomPointInRegion(m.region);
      m.moveTimer  = 30;
      return;
    }

    // Stay in region bounds
    const r = REGIONS[m.region];
    m.x = clamp(nx2, r.x + 3, r.x + r.w - 3);
    m.y = clamp(ny2, r.y + 3, r.y + r.h - 3);
  }

  // ─── LIFECYCLE EVENTS ─────────────────────────────────────────────────────

  function killMeeple(m, cause) {
    m.alive = false;
    m.deathCause = cause;
    _yearDeaths++;
    if (cause === 'suicide') { m.isSuicide = true; _yearSuicides++; }
    // Widow/widower
    if (m.spouseId != null) {
      const sp = _meeple.find(p => p.id === m.spouseId);
      if (sp) { sp.married = false; sp.spouseId = null; }
    }
  }

  function processDeaths() {
    for (const m of _meeple) {
      if (!m.alive) continue;

      // Natural death
      if (m.age >= m.maxAge) { killMeeple(m, 'age'); continue; }

      // Accident
      if (Math.random() < 0.0001) { killMeeple(m, 'accident'); continue; }

      const r = REGIONS[m.region];

      // Suicide — higher risk at extremes
      let suicideRate = r.suicideRate;
      if (m.looks < 3)          suicideRate *= 2.0;
      if (m.intelligence > 8)   suicideRate *= 1.6;
      if (Math.random() < suicideRate / TICK_RATE) {
        killMeeple(m, 'suicide');
        continue;
      }

      // Crime victim: nearby criminals
      if (!m.hasCrime) {
        for (const other of _meeple) {
          if (!other.alive || !other.hasCrime) continue;
          const dx = other.x - m.x, dy = other.y - m.y;
          if (dx * dx + dy * dy < 900 && Math.random() < 0.00005) {
            killMeeple(m, 'crime_victim');
            break;
          }
        }
      }
    }
  }

  function processCrime() {
    for (const m of _meeple) {
      if (!m.alive || m.hasCrime) continue;
      if (m.age < 15 * TICK_RATE) continue;
      const r = REGIONS[m.region];
      const effectiveCrimeRate = r.crimeRate + r._crimeDrift;
      if (Math.random() < effectiveCrimeRate / TICK_RATE) {
        m.hasCrime = true;
        m.clothesColor = blendHex(m.clothesColor, '#222222', 0.4); // darken clothes
        _yearCrimes++;
        // Check if criminal is exceptional in crime (high strength, low intelligence)
        const crimeZ = (m.strength - (r.avgStrength + r._strengthDrift)) / r.strengthSD
                     - (m.intelligence - (r.avgIntelligence + r._intelligenceDrift)) / r.intelligenceSD;
        if (crimeZ > 2.5) {
          m.isExceptional       = true;
          m.exceptionalTrait    = 'criminal';
          m.exceptionalMagnitude = crimeZ;
          enqueueExceptional(m);
        }
      }
    }
  }

  function processMarriages() {
    const candidates = _meeple.filter(m =>
      m.alive && !m.married && m.age >= 18 * TICK_RATE
    );
    const shuffled = candidates.sort(() => Math.random() - 0.5);

    for (const m of shuffled) {
      if (m.married) continue; // might have been married this tick
      const r = REGIONS[m.region];
      if (Math.random() > r.marriageRate) continue;

      // Find nearest unmarried adult of opposite gender in same region within 80px
      let best = null, bestDist = 80;
      for (const other of _meeple) {
        if (!other.alive || other.married || other.id === m.id) continue;
        if (other.gender === m.gender || other.region !== m.region) continue;
        if (other.age < 18 * TICK_RATE) continue;
        const dx = other.x - m.x, dy = other.y - m.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestDist) { bestDist = d; best = other; }
      }

      if (best) {
        m.married    = true; m.spouseId    = best.id;
        best.married = true; best.spouseId = m.id;
        _yearMarriages++;
        // Move them slightly together — the social act of union
        m.moveTarget    = { x: (m.x + best.x) / 2, y: (m.y + best.y) / 2 };
        best.moveTarget = { x: (m.x + best.x) / 2, y: (m.y + best.y) / 2 };
        m.moveTimer     = 60;
        best.moveTimer  = 60;
      }
    }
  }

  function processBirths() {
    if (_meeple.filter(m => m.alive).length >= MAX_POP) return;

    for (const m of _meeple) {
      if (!m.alive || !m.married || m.gender !== 'F') continue;
      if (m.age < 15 * TICK_RATE || m.age > 45 * TICK_RATE) continue;
      if (m.spouseId == null) continue;

      const spouse = _meeple.find(p => p.id === m.spouseId && p.alive);
      if (!spouse || spouse.age < 15 * TICK_RATE) continue;

      const r = REGIONS[m.region];
      if (Math.random() > r.fertilityRate) continue;

      // Hereditary traits
      const parentTraits = {
        heightA: m.height,      heightB: spouse.height,
        weightA: m.weight,      weightB: spouse.weight,
        looksA:  m.looks,       looksB:  spouse.looks,
        strengthA: m.strength,  strengthB: spouse.strength,
        intelligenceA: m.intelligence, intelligenceB: spouse.intelligence,
      };

      const child = createMeeple(m.region, {
        x: m.x + (Math.random() - 0.5) * 20,
        y: m.y + (Math.random() - 0.5) * 20,
        age: 0,
        parentIds: [m.id, spouse.id],
        parentTraits,
      });

      m.children.push(child.id);
      spouse.children.push(child.id);
      _meeple.push(child);
      _yearBirths++;

      if (_meeple.filter(x => x.alive).length >= MAX_POP) break;
    }
  }

  function processExceptionalLegacy() {
    for (const m of _meeple) {
      if (!m.alive || !m.isExceptional || m._legacyApplied) continue;
      if (m.age < 0.7 * m.maxAge) continue;

      const r = REGIONS[m.region];
      const MAX_DRIFT = 1.5; // SD units cap over all time

      const applyDrift = (driftKey, baseAvgKey, sd, traitVal) => {
        const potential = 0.02 * (traitVal - (r[baseAvgKey] + r[driftKey]));
        const currentDrift = r[driftKey];
        const cap = MAX_DRIFT * r[sd];
        const newDrift = clamp(currentDrift + potential, -cap, cap);
        r[driftKey] = newDrift;
      };

      if (m.exceptionalTrait === 'intelligence') applyDrift('_intelligenceDrift', 'avgIntelligence', 'intelligenceSD', m.intelligence);
      if (m.exceptionalTrait === 'strength')     applyDrift('_strengthDrift',     'avgStrength',     'strengthSD',     m.strength);
      if (m.exceptionalTrait === 'looks')        applyDrift('_looksDrift',        'avgLooks',        'looksSD',        m.looks);
      if (m.exceptionalTrait === 'criminal') {
        const cap = r.crimeRate * 0.5;
        r._crimeDrift = clamp(r._crimeDrift + 0.00005, -cap, cap);
      }

      m._legacyApplied = true;
    }
  }

  // ─── STATISTICS ───────────────────────────────────────────────────────────

  function mean(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function computeAverageMeep(pop) {
    if (!pop.length) return null;

    const heights      = pop.map(m => m.height);
    const weights      = pop.map(m => m.weight);
    const looks        = pop.map(m => m.looks);
    const strengths    = pop.map(m => m.strength);
    const intelligences = pop.map(m => m.intelligence);
    const maxAges      = pop.map(m => m.maxAge / TICK_RATE);

    const adults = pop.filter(m => m.age >= 18 * TICK_RATE);
    const marriedCount  = pop.filter(m => m.married).length;
    const criminalCount = pop.filter(m => m.hasCrime).length;

    // Weighted average skin tone
    let rSum = 0, gSum = 0, bSum = 0;
    for (const m of pop) {
      const c = hexToRgb(m.skinTone);
      rSum += c.r; gSum += c.g; bSum += c.b;
    }
    const n = pop.length;
    const avgSkin = '#' + [Math.round(rSum/n), Math.round(gSum/n), Math.round(bSum/n)]
      .map(x => x.toString(16).padStart(2, '0')).join('');

    return {
      height:          mean(heights),
      weight:          mean(weights),
      looks:           mean(looks),
      strength:        mean(strengths),
      intelligence:    mean(intelligences),
      lifeExpectancy:  mean(maxAges),
      marriageRate:    adults.length ? marriedCount / adults.length : 0,
      crimeRate:       adults.length ? criminalCount / adults.length : 0,
      suicideRate:     n ? _yearSuicides / n : 0,
      skinTone:        avgSkin,
    };
  }

  function updateStats() {
    const living = _meeple.filter(m => m.alive);
    _averageMeep = computeAverageMeep(living);

    if (_selectedRegion) {
      const regionPop = living.filter(m => m.region === _selectedRegion);
      _selectedRegionStats = computeAverageMeep(regionPop);
    } else {
      _selectedRegionStats = null;
    }

    _history.push({
      year:      _year,
      population: living.length,
      births:    _yearBirths,
      deaths:    _yearDeaths,
      marriages: _yearMarriages,
      crimes:    _yearCrimes,
      suicides:  _yearSuicides,
    });

    _yearBirths    = 0;
    _yearDeaths    = 0;
    _yearMarriages = 0;
    _yearCrimes    = 0;
    _yearSuicides  = 0;
  }

  // ─── CORE STEP ────────────────────────────────────────────────────────────

  function step() {
    _tick++;

    // Move all living meeple
    for (const m of _meeple) {
      if (m.alive) moveMeeple(m);
    }

    // Lifecycle events
    processDeaths();
    processCrime();
    processMarriages();
    processBirths();
    processExceptionalLegacy();

    // Year boundary
    if (_tick % TICK_RATE === 0) {
      _year++;
      updateStats();
    }
  }

  // ─── INIT / RESET ─────────────────────────────────────────────────────────

  function resetRegionDrifts() {
    for (const r of Object.values(REGIONS)) {
      r._heightDrift      = 0;
      r._intelligenceDrift = 0;
      r._strengthDrift    = 0;
      r._looksDrift       = 0;
      r._crimeDrift       = 0;
    }
  }

  function init(canvasW, canvasH) {
    _meeple            = [];
    _nextId            = 0;
    _tick              = 0;
    _year              = 0;
    _yearBirths        = 0;
    _yearDeaths        = 0;
    _yearMarriages     = 0;
    _yearCrimes        = 0;
    _yearSuicides      = 0;
    _history           = [];
    _exceptionalQueue  = [];
    _averageMeep       = null;
    _selectedRegionStats = null;
    resetRegionDrifts();
    spawnInitialPopulation();
    updateStats(); // initial snapshot
  }

  function reset() {
    init();
  }

  function getState() {
    const living = _meeple.filter(m => m.alive);
    const adults  = living.filter(m => m.age >= 18 * TICK_RATE);
    const regionPop = _selectedRegion
      ? living.filter(m => m.region === _selectedRegion).length
      : 0;

    return {
      meeple:  _meeple,
      year:    _year,
      tick:    _tick,
      stats: {
        population:           living.length,
        yearBirths:           _yearBirths,
        yearDeaths:           _yearDeaths,
        yearMarriages:        _yearMarriages,
        yearCrimes:           _yearCrimes,
        yearSuicides:         _yearSuicides,
        averageMeep:          _averageMeep,
        selectedRegionKey:    _selectedRegion,
        selectedRegionStats:  _selectedRegionStats,
        selectedRegionPop:    regionPop,
      },
      history:          _history,
      exceptionalQueue: _exceptionalQueue,
    };
  }

  function setSelectedRegion(key) {
    _selectedRegion = key || null;
    if (_selectedRegion) {
      const living = _meeple.filter(m => m.alive && m.region === _selectedRegion);
      _selectedRegionStats = computeAverageMeep(living);
    } else {
      _selectedRegionStats = null;
    }
  }

  // ─── PUBLIC API ───────────────────────────────────────────────────────────

  window.SimEngine = {
    TICK_RATE,
    REGIONS,
    TV_AREA,
    init,
    step,
    getState,
    setSelectedRegion,
    reset,
  };

})();
