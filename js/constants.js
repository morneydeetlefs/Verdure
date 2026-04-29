'use strict';
// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const XP_PER_LEVEL   = 100;
const MAX_ENERGY     = 20;
const ENERGY_REGEN_MS = 3 * 60 * 1000; // 1 pip per 3 min
const ENERGY_COST    = { collect:1, clear_hazard:1, water:1, inspect:1, plant:2, harvest:2 };
const XP_REWARD      = { collect:10, clear_hazard:12, grow:5, harvest:15, dialog:8, plant:10, reveal:15 };
const CAT_ICON       = { tool:'🛠', plant:'🌿', building:'🏚', creature:'🐝', hidden_object:'🔍', portal:'🚪', decoration:'🪨', hazard:'⚠' };
const MASK_COLOR     = { no_plant:'rgba(220,60,60,.22)', no_walk:'rgba(60,60,220,.22)', interact_only:'rgba(220,160,40,.22)', plant_only:'rgba(60,160,60,.22)', water:'rgba(40,160,220,.22)' };
const ANIM_CLASSES   = new Set(['sway','jitter','pop','float','glow']);

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════
let world         = null;   // loaded world.json
let player        = null;   // player object (persisted to localStorage)
let currentMapId  = null;
let showLabels    = true;
let showMasks     = false;
let masterVolume  = 0.7;
let ambientAudio  = null;
let plantModeId   = null;   // entity id currently in plant mode, or null
let growInterval  = null;
let toastTimer    = null;

// ═══════════════════════════════════════════════════════════════
// PLAYER PERSISTENCE
// ═══════════════════════════════════════════════════════════════// ═══════════════════════════════════════════════════════════════
