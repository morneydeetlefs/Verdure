// STAGE SIZING — contentArea stays strict 16:9
// ═══════════════════════════════════════════════════════════════
function resizeStage() {
  const outer = document.getElementById('stageOuter');
  const stage = document.getElementById('mapStage');
  const area  = document.getElementById('contentArea');
  if (!outer||!stage||!area) return;
  const ow = outer.clientWidth, oh = outer.clientHeight, AR = 16/9;
  const w = ow/oh > AR ? Math.round(oh*AR) : ow;
  const h = ow/oh > AR ? oh : Math.round(ow/AR);
  stage.style.width = area.style.width  = w+'px';
  stage.style.height= area.style.height = h+'px';
  const map = world?.maps?.find(m=>m.id===currentMapId);
  if (map) renderMaskOverlay(map);
}
window.addEventListener('resize', resizeStage);

// ═══════════════════════════════════════════════════════════════
// MAP NAVIGATION
// ═══════════════════════════════════════════════════════════════
function enterMap(mapId, animate=true) {
  const map = world.maps.find(m=>m.id===mapId);
  if (!map) { showToast('Map not found','error'); return; }
  if (!animate) { doEnterMap(map); return; }
  const ov = document.getElementById('transitionOverlay');
  ov.classList.add('fade-in');
  setTimeout(() => { doEnterMap(map); ov.classList.remove('fade-in'); }, 380);
}

function doEnterMap(map) {
  stopAmbient();
  currentMapId = map.id;
  player.active_map = map.id;
  if (!player.visited_maps.includes(map.id)) player.visited_maps.push(map.id);
  if (!player.map_states[map.id]) player.map_states[map.id] = {};
  savePlayer();
  closeActionPopup(); closeDialog();

  const bg  = document.getElementById('mapBg');
  const ph  = document.getElementById('mapBgPlaceholder');
  const bgUrl = resolveAsset(map.background);
  if (bgUrl) { bg.src = bgUrl; bg.style.display='block'; ph.style.display='none'; }
  else                { bg.style.display='none'; ph.style.display='flex'; }

  renderObjects(map);
  renderMaskOverlay(map);
  initGrowTimers(map);
  updateHUD();
  renderMinimap();
  showBanner(map.name);
  setTimeout(() => tickAmbient(), 800);
}

// ═══════════════════════════════════════════════════════════════
