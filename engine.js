// engine.js — Quetelet's Average Man Simulation Engine

(function () {
  'use strict';

  const TICK_RATE = 60;
  const MAX_POP   = 600;
  const TV_AREA   = { x: 600, y: 55, w: 220, h: 175 };

  const TECH_MILESTONES = [
    { level: 0.8,  text: 'Herbal remedies spread — injuries begin to heal.' },
    { level: 2.0,  text: 'Writing emerges — knowledge outlives the individual.' },
    { level: 3.2,  text: 'Agricultural surplus — the frail no longer starve first.' },
    { level: 4.2,  text: 'Spectacles invented — poor vision is no longer a death sentence.' },
    { level: 5.0,  text: 'Basic surgery practised — the weak-bodied find renewed hope.' },
    { level: 6.0,  text: 'Sanitation reforms — disease no longer culls only the frail.' },
    { level: 7.0,  text: 'Vaccination spreads — the sickly survive to pass on their traits.' },
    { level: 7.8,  text: 'Industry rises — raw strength yields to ingenuity.' },
    { level: 8.8,  text: 'Universal medicine — physical constitution no longer decides fate.' },
    { level: 9.5,  text: 'The average man begins to transcend his biology.' },
  ];

  // Skin tones: fantastical blues, reds, greens per region
  const REGIONS = {
    NORDIC: {
      name: 'Northern Reach', bgColor: '#c8e4cc',
      x: 0, y: 50, w: 350, h: 300,
      avgHeight: 179, heightSD: 7, avgWeight: 82, weightSD: 9,
      avgAgility: 5.5, agilitySD: 1.5, avgStrength: 6, strengthSD: 1.5,
      avgIntelligence: 6.5, intelligenceSD: 1.5, baseLifespanYears: 72,
      fertilityRate: 0.008, marriageRate: 0.025, crimeRate: 0.001, suicideRate: 0.002,
      skinToneBase: '#4060d0', hairColorBase: '#d4af37',  // blue
      _heightDrift: 0, _intelligenceDrift: 0, _strengthDrift: 0, _agilityDrift: 0, _crimeDrift: 0,
    },
    ATLANTIC: {
      name: 'Atlantic Coast', bgColor: '#9db8d0',
      x: 0, y: 350, w: 350, h: 350,
      avgHeight: 173, heightSD: 7, avgWeight: 76, weightSD: 9,
      avgAgility: 5.0, agilitySD: 1.8, avgStrength: 5.5, strengthSD: 1.5,
      avgIntelligence: 5.5, intelligenceSD: 1.5, baseLifespanYears: 68,
      fertilityRate: 0.010, marriageRate: 0.030, crimeRate: 0.003, suicideRate: 0.0015,
      skinToneBase: '#c03050', hairColorBase: '#7a3a10',  // crimson
      _heightDrift: 0, _intelligenceDrift: 0, _strengthDrift: 0, _agilityDrift: 0, _crimeDrift: 0,
    },
    EASTERN: {
      name: 'Eastern Steppe', bgColor: '#d4c878',
      x: 350, y: 50, w: 250, h: 325,
      avgHeight: 170, heightSD: 5, avgWeight: 68, weightSD: 7,
      avgAgility: 6.5, agilitySD: 1.5, avgStrength: 5.0, strengthSD: 1.5,
      avgIntelligence: 7.0, intelligenceSD: 1.5, baseLifespanYears: 74,
      fertilityRate: 0.012, marriageRate: 0.035, crimeRate: 0.0008, suicideRate: 0.001,
      skinToneBase: '#20a060', hairColorBase: '#1a1a1a',  // emerald
      _heightDrift: 0, _intelligenceDrift: 0, _strengthDrift: 0, _agilityDrift: 0, _crimeDrift: 0,
    },
    HIGHLAND: {
      name: 'Highland Peaks', bgColor: '#a8b890',
      x: 350, y: 375, w: 250, h: 325,
      avgHeight: 171, heightSD: 6, avgWeight: 78, weightSD: 8,
      avgAgility: 4.5, agilitySD: 1.5, avgStrength: 7.0, strengthSD: 1.5,
      avgIntelligence: 5.0, intelligenceSD: 1.5, baseLifespanYears: 70,
      fertilityRate: 0.009, marriageRate: 0.025, crimeRate: 0.001, suicideRate: 0.001,
      skinToneBase: '#8040c0', hairColorBase: '#3a2010',  // violet
      _heightDrift: 0, _intelligenceDrift: 0, _strengthDrift: 0, _agilityDrift: 0, _crimeDrift: 0,
    },
    SOUTHERN: {
      name: 'Southern Lands', bgColor: '#d4b078',
      x: 600, y: 225, w: 220, h: 475,
      avgHeight: 169, heightSD: 6, avgWeight: 70, weightSD: 8,
      avgAgility: 6.0, agilitySD: 1.8, avgStrength: 5.5, strengthSD: 1.5,
      avgIntelligence: 5.5, intelligenceSD: 1.5, baseLifespanYears: 65,
      fertilityRate: 0.015, marriageRate: 0.040, crimeRate: 0.005, suicideRate: 0.001,
      skinToneBase: '#c08020', hairColorBase: '#120800',  // amber
      _heightDrift: 0, _intelligenceDrift: 0, _strengthDrift: 0, _agilityDrift: 0, _crimeDrift: 0,
    },
  };

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

  function normalRandom(mean, sd) {
    let u, v;
    do { u = Math.random(); } while (u === 0);
    do { v = Math.random(); } while (v === 0);
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }

  function hexToRgb(hex) {
    return {
      r: parseInt(hex.slice(1,3),16),
      g: parseInt(hex.slice(3,5),16),
      b: parseInt(hex.slice(5,7),16),
    };
  }

  function blendHex(hex1, hex2, t) {
    const a = hexToRgb(hex1), b = hexToRgb(hex2);
    return '#' + [
      Math.round(a.r+(b.r-a.r)*t),
      Math.round(a.g+(b.g-a.g)*t),
      Math.round(a.b+(b.b-a.b)*t),
    ].map(x => x.toString(16).padStart(2,'0')).join('');
  }

  function randomName(gender, regionKey) {
    const pool = NAMES[regionKey][gender];
    return pool[Math.floor(Math.random() * pool.length)];
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
      x = r.x + PAD + Math.random() * (r.w - 2*PAD);
      y = r.y + PAD + Math.random() * (r.h - 2*PAD);
      attempts++;
    } while (inTVArea(x, y) && attempts < 20);
    return { x, y };
  }

  // Darwinian fitness: strength + agility
  function fitness(m) { return (m.strength + m.agility) / 2; }

  // ─── STATE ────────────────────────────────────────────────────────────────

  let _meeple = [], _nextId = 0, _tick = 0, _year = 0, _selectedRegion = null;
  let _yearBirths = 0, _yearDeaths = 0, _yearMarriages = 0, _yearCrimes = 0, _yearSuicides = 0;
  let _history = [], _exceptionalQueue = [], _averageMeep = null, _selectedRegionStats = null;
  let _techLevel = 0, _newsList = [], _newsIdCounter = 0;
  let _techMilestones = new Set(), _traitHistory = [], _popMilestones = new Set();

  function addNews(text, type) {
    _newsList.unshift({ id: _newsIdCounter++, text, type, year: _year });
    if (_newsList.length > 60) _newsList.length = 60;
  }

  // ─── MEEPLE FACTORY ───────────────────────────────────────────────────────

  function createMeeple(rKey, opts) {
    opts = opts || {};
    const r = REGIONS[rKey];
    const gender = Math.random() < 0.5 ? 'M' : 'F';
    const pos = (opts.x != null) ? { x: opts.x, y: opts.y } : randomPointInRegion(rKey);
    const age = opts.age != null ? opts.age : 0;

    const effAvgH = r.avgHeight + r._heightDrift;
    const effAvgI = r.avgIntelligence + r._intelligenceDrift;
    const effAvgS = r.avgStrength + r._strengthDrift;
    const effAvgA = r.avgAgility + r._agilityDrift;

    let height       = clamp(normalRandom(effAvgH, r.heightSD), 140, 220);
    let weight       = clamp(normalRandom(r.avgWeight, r.weightSD), 40, 160);
    let agility      = clamp(normalRandom(effAvgA, r.agilitySD), 0, 10);
    let strength     = clamp(normalRandom(effAvgS, r.strengthSD), 0, 10);
    let intelligence = clamp(normalRandom(effAvgI, r.intelligenceSD), 0, 10);

    if (opts.parentTraits) {
      const pt = opts.parentTraits;
      height       = clamp(normalRandom((pt.heightA+pt.heightB)/2, 0.4*r.heightSD), 140, 220);
      weight       = clamp(normalRandom((pt.weightA+pt.weightB)/2, 0.4*r.weightSD), 40, 160);
      agility      = clamp(normalRandom((pt.agilityA+pt.agilityB)/2, 0.4*r.agilitySD), 0, 10);
      strength     = clamp(normalRandom((pt.strengthA+pt.strengthB)/2, 0.4*r.strengthSD), 0, 10);
      intelligence = clamp(normalRandom((pt.intelligenceA+pt.intelligenceB)/2, 0.4*r.intelligenceSD), 0, 10);
    }

    // Stronger/faster meeps live longer (natural selection pre-tech)
    const fitnessBonus = (strength + agility - 10) * 0.4;
    const lifespanTicks = Math.round(normalRandom(r.baseLifespanYears + fitnessBonus, 8) * TICK_RATE);

    const skinNoise    = blendHex(r.skinToneBase, '#ffffff', Math.random() * 0.18);
    const hairNoise    = blendHex(r.hairColorBase, '#888888', Math.random() * 0.2);
    const clothesColor = blendHex(r.bgColor, '#'+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0'), 0.35);

    const m = {
      id: _nextId++,
      name: randomName(gender, rKey) + ' of ' + r.name,
      x: pos.x, y: pos.y, vx: 0, vy: 0,
      region: rKey, age, maxAge: Math.max(lifespanTicks, 20 * TICK_RATE),
      alive: true, deathCause: null,
      height, weight, agility, strength, intelligence,
      married: false, spouseId: null, children: [],
      parentIds: opts.parentIds || null,
      hasCrime: false, isSuicide: false,
      gender, skinTone: skinNoise, hairColor: hairNoise, clothesColor,
      isExceptional: false, exceptionalTrait: null, exceptionalMagnitude: 0,
      _legacyApplied: false,
      moveTarget: null, moveTimer: 0, socialTarget: null,
      speed: 0.4 + Math.random() * 0.4,
      marriedYear: null,
    };

    checkExceptional(m);
    return m;
  }

  function checkExceptional(m) {
    const r = REGIONS[m.region];
    const zScores = {
      intelligence: (m.intelligence - (r.avgIntelligence + r._intelligenceDrift)) / r.intelligenceSD,
      strength:     (m.strength     - (r.avgStrength     + r._strengthDrift))     / r.strengthSD,
      agility:      (m.agility      - (r.avgAgility      + r._agilityDrift))      / r.agilitySD,
      height:       (m.height       - (r.avgHeight       + r._heightDrift))       / r.heightSD,
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
    // Avoid duplicate entries for same meeple
    if (_exceptionalQueue.some(e => e.id === m.id)) return;

    const entry = {
      id: m.id, name: m.name, region: m.region,
      trait: m.exceptionalTrait, magnitude: m.exceptionalMagnitude,
      year: _year, tick: _tick,
      intelligence: m.intelligence, strength: m.strength,
      agility: m.agility, height: m.height, weight: m.weight,
      gender: m.gender, exceptionalTrait: m.exceptionalTrait,
      skinTone: m.skinTone, hairColor: m.hairColor, clothesColor: m.clothesColor,
    };
    _exceptionalQueue.push(entry);  // append to end; visual pops from front
    if (_exceptionalQueue.length > 20) _exceptionalQueue.shift();

    const labels = {
      intelligence: 'extraordinary mind',
      strength:     'prodigious strength',
      agility:      'exceptional agility',
      height:       'towering stature',
      criminal:     'dangerous character',
    };
    addNews(`Remarkable citizen — ${m.name} displays ${labels[m.exceptionalTrait] || 'notable gifts'}.`, 'exceptional');
  }

  function spawnInitialPopulation() {
    for (const rKey of Object.keys(REGIONS)) {
      const count = 14 + Math.floor(Math.random() * 5);
      for (let i = 0; i < count; i++) {
        const ageTicks = Math.floor(Math.random() * 50 * TICK_RATE);
        _meeple.push(createMeeple(rKey, { age: ageTicks }));
      }
    }
  }

  // ─── MOVEMENT ─────────────────────────────────────────────────────────────

  function pickNewTarget(m) {
    const r = REGIONS[m.region];
    if (m.age < 5*TICK_RATE && m.parentIds) {
      const parent = _meeple.find(p => p.id === m.parentIds[0] && p.alive);
      if (parent) {
        m.moveTarget = {
          x: clamp(parent.x + (Math.random()-0.5)*30, r.x+5, r.x+r.w-5),
          y: clamp(parent.y + (Math.random()-0.5)*30, r.y+5, r.y+r.h-5),
        };
        m.moveTimer = 30 + Math.floor(Math.random()*60);
        return;
      }
    }
    if (m.married && m.spouseId != null && Math.random() < 0.25) {
      const spouse = _meeple.find(p => p.id === m.spouseId && p.alive);
      if (spouse) {
        m.moveTarget = { x: spouse.x, y: spouse.y };
        m.socialTarget = spouse.id;
        m.moveTimer = 60 + Math.floor(Math.random()*60);
        return;
      }
    }
    m.socialTarget = null;
    m.moveTarget   = randomPointInRegion(m.region);
    m.moveTimer    = 90 + Math.floor(Math.random()*151);
  }

  function moveMeeple(m) {
    if (!m.alive) return;
    m.age++;
    m.moveTimer--;
    if (m.moveTimer <= 0 || !m.moveTarget) pickNewTarget(m);

    const dx = m.moveTarget.x - m.x;
    const dy = m.moveTarget.y - m.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 2) { m.moveTimer = 0; return; }

    const nx2 = m.x + (dx/dist) * m.speed;
    const ny2 = m.y + (dy/dist) * m.speed;
    m.vx = nx2 - m.x;
    m.vy = ny2 - m.y;

    if (inTVArea(nx2, ny2)) {
      m.moveTarget = randomPointInRegion(m.region);
      m.moveTimer  = 30;
      return;
    }
    const r = REGIONS[m.region];
    m.x = clamp(nx2, r.x+3, r.x+r.w-3);
    m.y = clamp(ny2, r.y+3, r.y+r.h-3);
  }

  // ─── LIFECYCLE ────────────────────────────────────────────────────────────

  function killMeeple(m, cause) {
    m.alive = false; m.deathCause = cause; _yearDeaths++;
    if (cause === 'suicide') { m.isSuicide = true; _yearSuicides++; }
    if (m.spouseId != null) {
      const sp = _meeple.find(p => p.id === m.spouseId);
      if (sp) { sp.married = false; sp.spouseId = null; }
    }
  }

  function processDeaths() {
    const techR = clamp(_techLevel / 10, 0, 1);
    for (const m of _meeple) {
      if (!m.alive) continue;
      if (m.age >= m.maxAge) { killMeeple(m, 'age'); continue; }

      // Accidents: agile/strong meeps dodge better; tech equalises
      const accRate = Math.max(0.00005,
        0.00015 - ((m.strength + m.agility - 10) * 0.000008) * (1 - techR * 0.6));
      if (Math.random() < accRate) { killMeeple(m, 'accident'); continue; }

      const r = REGIONS[m.region];
      // Suicide: very-high-intelligence risk; tech provides safety net
      let sRate = r.suicideRate * (1 - techR * 0.6);
      if (m.intelligence > 8.5) sRate *= (1.8 - techR);
      if (Math.random() < sRate / TICK_RATE) { killMeeple(m, 'suicide'); continue; }

      // Crime victim
      if (!m.hasCrime) {
        for (const other of _meeple) {
          if (!other.alive || !other.hasCrime) continue;
          const dx = other.x-m.x, dy = other.y-m.y;
          if (dx*dx+dy*dy < 900 && Math.random() < 0.00004) {
            killMeeple(m, 'crime_victim'); break;
          }
        }
      }
    }
  }

  function processCrime() {
    for (const m of _meeple) {
      if (!m.alive || m.hasCrime || m.age < 15*TICK_RATE) continue;
      const r = REGIONS[m.region];
      if (Math.random() < (r.crimeRate + r._crimeDrift) / TICK_RATE) {
        m.hasCrime = true;
        m.clothesColor = blendHex(m.clothesColor, '#222222', 0.4);
        _yearCrimes++;
        const crimeZ = (m.strength - (r.avgStrength+r._strengthDrift)) / r.strengthSD
                     - (m.intelligence - (r.avgIntelligence+r._intelligenceDrift)) / r.intelligenceSD;
        if (crimeZ > 2.5) {
          m.isExceptional = true; m.exceptionalTrait = 'criminal';
          m.exceptionalMagnitude = crimeZ; enqueueExceptional(m);
        }
      }
    }
  }

  function processMarriages() {
    const techR = clamp(_techLevel / 10, 0, 1);
    const candidates = _meeple.filter(m => m.alive && !m.married && m.age >= 18*TICK_RATE);
    const shuffled = candidates.sort(() => Math.random() - 0.5);

    for (const m of shuffled) {
      if (m.married) continue;
      const r = REGIONS[m.region];
      // Fit meeps court more actively (Darwinian selection through rate, not gate)
      const myFit = fitness(m);
      const rateMulti = 0.5 + (myFit / 10) * 1.0;  // 0.5–1.5×
      if (Math.random() > r.marriageRate * rateMulti) continue;

      const searchR = 60 + myFit * 6;  // 60–120px
      let best = null, bestDist = searchR;
      for (const other of _meeple) {
        if (!other.alive || other.married || other.id === m.id) continue;
        if (other.gender === m.gender || other.region !== m.region) continue;
        if (other.age < 16*TICK_RATE) continue;
        const dx = other.x-m.x, dy = other.y-m.y;
        const d = Math.sqrt(dx*dx+dy*dy);
        if (d < bestDist) { bestDist = d; best = other; }
      }

      if (best) {
        m.married = best.married = true;
        m.spouseId = best.id; best.spouseId = m.id;
        m.marriedYear = best.marriedYear = _year;
        _yearMarriages++;
        const mx = (m.x+best.x)/2, my = (m.y+best.y)/2;
        m.moveTarget = best.moveTarget = { x: mx, y: my };
        m.moveTimer = best.moveTimer = 60;
      }
    }
  }

  function processBirths() {
    const living = _meeple.filter(m => m.alive);
    if (living.length >= MAX_POP) return;

    for (const m of _meeple) {
      if (!m.alive || !m.married || m.gender !== 'F') continue;
      if (m.age < 16*TICK_RATE || m.age > 46*TICK_RATE || m.spouseId == null) continue;
      const spouse = _meeple.find(p => p.id === m.spouseId && p.alive);
      if (!spouse || spouse.age < 16*TICK_RATE) continue;

      const r = REGIONS[m.region];
      // Darwinian: fitter parents reproduce more (differential reproduction)
      const pFit = (fitness(m) + fitness(spouse)) / 2;
      const fertMulti = 0.6 + (pFit / 10) * 0.9;  // 0.6–1.5×
      if (Math.random() > r.fertilityRate * fertMulti) continue;

      const child = createMeeple(m.region, {
        x: m.x + (Math.random()-0.5)*20,
        y: m.y + (Math.random()-0.5)*20,
        age: 0, parentIds: [m.id, spouse.id],
        parentTraits: {
          heightA: m.height, heightB: spouse.height,
          weightA: m.weight, weightB: spouse.weight,
          agilityA: m.agility, agilityB: spouse.agility,
          strengthA: m.strength, strengthB: spouse.strength,
          intelligenceA: m.intelligence, intelligenceB: spouse.intelligence,
        },
      });
      m.children.push(child.id); spouse.children.push(child.id);
      _meeple.push(child); _yearBirths++;
      if (_meeple.filter(x => x.alive).length >= MAX_POP) break;
    }
  }

  function processExceptionalLegacy() {
    for (const m of _meeple) {
      if (!m.alive || !m.isExceptional || m._legacyApplied) continue;
      if (m.age < 0.7 * m.maxAge) continue;
      const r = REGIONS[m.region]; const MAX_DRIFT = 1.5;
      const drift = (dKey, avgKey, sdKey, val) => {
        const d = 0.025 * (val - (r[avgKey]+r[dKey]));
        r[dKey] = clamp(r[dKey]+d, -MAX_DRIFT*r[sdKey], MAX_DRIFT*r[sdKey]);
      };
      if (m.exceptionalTrait === 'intelligence') drift('_intelligenceDrift','avgIntelligence','intelligenceSD',m.intelligence);
      if (m.exceptionalTrait === 'strength')     drift('_strengthDrift',    'avgStrength',    'strengthSD',    m.strength);
      if (m.exceptionalTrait === 'agility')      drift('_agilityDrift',     'avgAgility',     'agilitySD',     m.agility);
      if (m.exceptionalTrait === 'criminal')
        r._crimeDrift = clamp(r._crimeDrift + 0.00005, -r.crimeRate*0.5, r.crimeRate*0.5);
      m._legacyApplied = true;
    }
  }

  // Prevent region extinction: if < 5 alive in a region, spawn immigrants
  function processImmigration() {
    if (_tick % (TICK_RATE * 5) !== 0) return; // check every 5 sim-years
    const living = _meeple.filter(m => m.alive);
    for (const rKey of Object.keys(REGIONS)) {
      const count = living.filter(m => m.region === rKey).length;
      if (count < 5) {
        const toSpawn = 5 - count;
        for (let i = 0; i < toSpawn; i++) {
          const newM = createMeeple(rKey, { age: Math.floor((18 + Math.random()*15) * TICK_RATE) });
          _meeple.push(newM);
        }
        if (count < 3) addNews(`Migration swells ${REGIONS[rKey].name} — newcomers arrive.`, 'population');
      }
    }
  }

  function processTech() {
    if (!_averageMeep) return;
    const intelBonus = (_averageMeep.intelligence - 5) * 0.003;
    _techLevel = Math.min(10, _techLevel + 0.03 + Math.max(0, intelBonus));
    for (const ms of TECH_MILESTONES) {
      if (_techLevel >= ms.level && !_techMilestones.has(ms.level)) {
        _techMilestones.add(ms.level); addNews(ms.text, 'technology');
      }
    }
  }

  function mean(arr) { return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }

  function computeAverageMeep(pop) {
    if (!pop.length) return null;
    const adults = pop.filter(m => m.age >= 18*TICK_RATE);
    const n = pop.length;
    let rSum=0, gSum=0, bSum=0;
    for (const m of pop) {
      const c = hexToRgb(m.skinTone);
      rSum+=c.r; gSum+=c.g; bSum+=c.b;
    }
    const avgSkin = '#'+[Math.round(rSum/n),Math.round(gSum/n),Math.round(bSum/n)]
      .map(x=>x.toString(16).padStart(2,'0')).join('');
    return {
      height:         mean(pop.map(m=>m.height)),
      weight:         mean(pop.map(m=>m.weight)),
      agility:        mean(pop.map(m=>m.agility)),
      strength:       mean(pop.map(m=>m.strength)),
      intelligence:   mean(pop.map(m=>m.intelligence)),
      lifeExpectancy: mean(pop.map(m=>m.maxAge/TICK_RATE)),
      marriageRate:   adults.length ? pop.filter(m=>m.married).length  / adults.length : 0,
      crimeRate:      adults.length ? pop.filter(m=>m.hasCrime).length / adults.length : 0,
      suicideRate:    n ? _yearSuicides / n : 0,
      skinTone:       avgSkin,
    };
  }

  function updateStats() {
    const living = _meeple.filter(m => m.alive);
    _averageMeep = computeAverageMeep(living);
    if (_selectedRegion) {
      const rp = living.filter(m => m.region === _selectedRegion);
      _selectedRegionStats = computeAverageMeep(rp);
    } else { _selectedRegionStats = null; }

    processTech();

    if (_averageMeep) {
      _traitHistory.push({
        year: _year,
        intelligence: _averageMeep.intelligence,
        strength:     _averageMeep.strength,
        agility:      _averageMeep.agility,
        techLevel:    _techLevel,
      });
      if (_traitHistory.length > 300) _traitHistory.shift();
    }

    const pop = living.length;
    for (const t of [50,100,200,300,400,500,600]) {
      if (pop >= t && !_popMilestones.has(t)) {
        _popMilestones.add(t); addNews(`The world reaches ${t} souls.`, 'population');
      }
    }
    if (_year > 0 && _year % 50 === 0) addNews(`Year ${_year}: ${pop} souls walk the earth.`, 'year');

    _history.push({ year: _year, population: pop,
      births: _yearBirths, deaths: _yearDeaths,
      marriages: _yearMarriages, crimes: _yearCrimes, suicides: _yearSuicides });

    _yearBirths = _yearDeaths = _yearMarriages = _yearCrimes = _yearSuicides = 0;
  }

  function step() {
    _tick++;
    for (const m of _meeple) { if (m.alive) moveMeeple(m); }
    processDeaths(); processCrime(); processMarriages();
    processBirths(); processExceptionalLegacy(); processImmigration();

    // Prune dead meeple (keep last 30 for fade-out)
    if (_meeple.length > MAX_POP + 60) {
      const dead = _meeple.filter(m => !m.alive);
      if (dead.length > 30) {
        const toRemove = new Set(dead.slice(30).map(m => m.id));
        _meeple = _meeple.filter(m => !toRemove.has(m.id));
      }
    }

    if (_tick % TICK_RATE === 0) { _year++; updateStats(); }
  }

  function resetRegionDrifts() {
    for (const r of Object.values(REGIONS)) {
      r._heightDrift = r._intelligenceDrift = r._strengthDrift = r._agilityDrift = r._crimeDrift = 0;
    }
  }

  function init() {
    _meeple=[]; _nextId=0; _tick=0; _year=0;
    _yearBirths=_yearDeaths=_yearMarriages=_yearCrimes=_yearSuicides=0;
    _history=[]; _exceptionalQueue=[]; _averageMeep=null; _selectedRegionStats=null;
    _techLevel=0; _newsList=[]; _newsIdCounter=0;
    _techMilestones=new Set(); _traitHistory=[]; _popMilestones=new Set();
    resetRegionDrifts();
    spawnInitialPopulation();
    updateStats();
    addNews('Simulation begins. The first meeps draw breath.', 'year');
  }

  function getState() {
    const living = _meeple.filter(m => m.alive);
    return {
      meeple: _meeple, year: _year, tick: _tick,
      stats: {
        population:          living.length,
        yearBirths:          _yearBirths,
        yearDeaths:          _yearDeaths,
        yearMarriages:       _yearMarriages,
        averageMeep:         _averageMeep,
        selectedRegionKey:   _selectedRegion,
        selectedRegionStats: _selectedRegionStats,
        selectedRegionPop:   _selectedRegion ? living.filter(m=>m.region===_selectedRegion).length : 0,
        techLevel:           _techLevel,
      },
      history: _history, exceptionalQueue: _exceptionalQueue,
      newsList: _newsList, traitHistory: _traitHistory,
    };
  }

  function setSelectedRegion(key) {
    _selectedRegion = key || null;
    if (_selectedRegion) {
      const rp = _meeple.filter(m => m.alive && m.region === _selectedRegion);
      _selectedRegionStats = computeAverageMeep(rp);
    } else { _selectedRegionStats = null; }
  }

  window.SimEngine = { TICK_RATE, REGIONS, TV_AREA, init, step, getState, setSelectedRegion, reset: init };
})();
