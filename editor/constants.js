'use strict';
'use strict';
// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════
const CICONS = { tool: '🛠', plant: '🌿', building: '🏚', creature: '🐝', hidden_object: '🔍', portal: '🚪', decoration: '🪨', hazard: '⚠', minigame: '🎮' };
const SEASONS = [{ id: 1, label: '🌱 Spring' }, { id: 2, label: '☀ Summer' }, { id: 3, label: '🍂 Autumn' }, { id: 4, label: '❄ Winter' }];
const EFFECTS = ['speeds_growth', 'slows_blight', 'restores_soil', 'attracts_creatures', 'provides_shelter', 'reveals_hidden', 'blocks_hazard', 'generates_seeds'];
const TRIGGERS = ['click', 'play', 'inspect', 'water', 'harvest', 'plant', 'collect'];
const ACTIONS = ['collect', 'grow', 'reveal', 'unlock', 'reward', 'transform', 'plant', 'harvest', 'combine', 'dialog', 'play_minigame'];
const ANIMS = ['none', 'sway', 'jitter', 'pop', 'float', 'glow'];
const MASK_TYPES = {
  no_plant: { label: 'No Plant Zone', color: 'rgba(220,60,60,.28)', stroke: '#e05050' },
  no_walk: { label: 'No Walk Zone', color: 'rgba(60,60,220,.28)', stroke: '#5050e0' },
  interact_only: { label: 'Interact Only', color: 'rgba(220,160,40,.28)', stroke: '#e0a030' },
  plant_only: { label: 'Plant Only', color: 'rgba(60,160,60,.28)', stroke: '#40b040' },
  water: { label: 'Water Surface', color: 'rgba(40,160,220,.28)', stroke: '#30a0e0' }
};

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
let world = { meta: { title: 'New World', version: '0.3', created: new Date().toISOString() }, assets: {}, maps: [], entities: [], dialogs: [] };
let activeMapId = null, activeEntityId = null, selectedObjId = null, selectedMaskId = null;
let activeTool = 'select', maskPts = [], maskVisible = true, catFilter = 'all';
let _ezones = [], _eseasons = [], _dlgDrag = null, activeDlgId = null, activeDlgNodeId = null;
let _toastT, _dragState = null, _pendX = 0, _pendY = 0, _newMapZone = 6;


// ── FILE PICKER HELPER ──────────────────────────────
// Creates a fresh <input type=file> each call — no shared IDs, no conflicts.
// All file upload buttons use this instead of getElementById on a static input.
function pickFile(accept, callback) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = accept;
  inp.style.display = 'none';
  inp.onchange = e => { if (e.target.files[0]) callback(e.target.files[0]); inp.remove(); };
  document.body.appendChild(inp);
  inp.click();
}
