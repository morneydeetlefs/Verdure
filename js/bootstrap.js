
function defaultPlayer() {
  return {
    name: '', hasSetup: false,
    level: 1, xp: 0,
    energy: MAX_ENERGY, last_regen: Date.now(),
    coins: 0,         // Player currency
    gems: { ruby: 0, sapphire: 0 },
    inventory: [],      // [{entity_id, quantity}]
    map_states: {},     // {map_id: {obj_id: {state, collected, planted_at, respawn_at, revealed}}}
    visited_maps: [],
    active_map: null
  };
}

function savePlayer() { localStorage.setItem('verdure_player', JSON.stringify(player)); }
function saveWorld() { if (!world) return; localStorage.setItem('verdure_world', JSON.stringify(world)); }
function loadWorld() {
  try {
    const s = localStorage.getItem('verdure_world');
    if (s) {
      const w = JSON.parse(s);
      if (w?.maps && w?.entities) {
        world = w;
        if (!world.assets) world.assets = {};
        if (!world.dialogs) world.dialogs = [];
      }
    }
  } catch {
    world = null;
  }
}

// Resolve an asset key or URL to its actual value
function resolveAsset(keyOrUrl) {
  if (!keyOrUrl) return '';
  if (keyOrUrl.startsWith('data:') || keyOrUrl.startsWith('http') || keyOrUrl.startsWith('/') || keyOrUrl.startsWith('.')) return keyOrUrl;
  return world.assets?.[keyOrUrl] || '';
}

function loadPlayer() {
  try {
    const s = localStorage.getItem('verdure_player');
    player = s ? { ...defaultPlayer(), ...JSON.parse(s) } : defaultPlayer();
  } catch { player = defaultPlayer(); }
}


// BOOTSTRAP
// ═══════════════════════════════════════════════════════════════
async function init() {
  setLoad(10, 'Loading player…');
  loadPlayer();
  setLoad(30, 'Loading world…');
  loadWorld();

  if (world) {
    setLoad(80, 'Building world…');
    startGame();
    return;
  }

  // file:// blocks fetch — go straight to picker
  if (location.protocol === 'file:') {
    showPicker(); return;
  }
  for (const p of ['../data/world.json', 'world.json', 'data/world.json']) {
    try {
      const r = await fetch(p);
      if (r.ok) { world = await r.json(); saveWorld(); setLoad(80, 'Building world…'); startGame(); return; }
    } catch { }
  }
  showPicker();
}

function showPicker() {
  setLoad(100, 'Ready');
  setTimeout(() => {
    hide('loadScreen'); show('worldPickWrap');
  }, 300);
}

function setLoad(pct, msg) {
  document.getElementById('loadBar').style.width = pct + '%';
  document.getElementById('loadMsg').textContent = msg;
}

function loadWorldFile(e) {
  const file = e.target.files[0]; if (!file) return;
  const fr = new FileReader();
  fr.onload = ev => {
    try {
      world = JSON.parse(ev.target.result);
      hide('worldPickWrap'); show('loadScreen');
      setLoad(80, 'Building world…'); startGame();
    } catch (err) { alert('Invalid world.json: ' + err.message); }
  };
  fr.readAsText(file);
}

// ═══════════════════════════════════════════════════════════════
// GAME START
// ═══════════════════════════════════════════════════════════════
function startGame() {
  if (!world?.maps?.length) { alert('No maps in world.json'); return; }
  if (!player.hasSetup) { showSetup(); return; }
  setLoad(95, 'Entering world…');
  setTimeout(() => {
    hide('loadScreen');
    document.getElementById('gameWrap').style.display = 'flex';
    resizeStage();
    const mapId = player.active_map && world.maps.find(m => m.id === player.active_map)
      ? player.active_map : world.maps[0].id;
    enterMap(mapId, false);
    updateHUD();
    startGrowTimer();
  }, 400);
}

function showSetup() {
  hide('loadScreen');
  document.getElementById('playerSetupWrap').style.display = 'flex';
  setTimeout(() => document.getElementById('playerNameInput').focus(), 100);
}

function confirmPlayerSetup() {
  const name = document.getElementById('playerNameInput').value.trim();
  if (!name) { showToast('Enter your name first', 'error'); return; }
  player.name = name; player.hasSetup = true;
  player.energy = MAX_ENERGY; player.last_regen = Date.now();
  player.coins = player.coins || 0; // Ensure coins are initialized
  player.gems = player.gems || { ruby: 0, sapphire: 0 };
  savePlayer();
  document.getElementById('playerSetupWrap').style.display = 'none';
  show('loadScreen'); setLoad(80, 'Building world…');
  startGame();
}

// ═══════════════════════════════════════════════════════════════
