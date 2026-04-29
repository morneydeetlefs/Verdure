// HUD
// ═══════════════════════════════════════════════════════════════
function updateHUD() {
  const xpNeeded = player.level * XP_PER_LEVEL;
  setText('hudName', player.name || 'Gardener');
  setText('hudLevel', `LVL ${player.level} · ${player.xp}/${xpNeeded} XP`);
  setText('hudCurrency', `${player.coins || 0} 🪙 · ${player.gems?.ruby || 0} ♦ · ${player.gems?.sapphire || 0} 🔷`);
  document.getElementById('xpBar').style.width = (player.xp / xpNeeded * 100) + '%';
  const map = world?.maps?.find(m => m.id === currentMapId);
  if (map) {
    setText('hudMap', map.name);
    setText('hudMapMeta', `Zone ${map.zone} · ${map.type}`);
    document.getElementById('blightBar').style.width = (map.blight_level || 0) + '%';
  }
  updateInventoryUI();
  updateEnergyUI();
}

function openMarketplace() {
  document.getElementById('marketOverlay')?.classList.add('open');
}

function closeMarketplace() {
  document.getElementById('marketOverlay')?.classList.remove('open');
}

// ═══════════════════════════════════════════════════════════════
// MINIMAP
// ═══════════════════════════════════════════════════════════════
function toggleMinimap() {
  const mm = document.getElementById('minimap');
  mm.classList.toggle('open');
  if (mm.classList.contains('open')) renderMinimap();
}
function renderMinimap() {
  const el = document.getElementById('minimapList'); if (!world?.maps) return;
  el.innerHTML = world.maps.map(m => {
    const vis = player.visited_maps?.includes(m.id);
    const cur = m.id === currentMapId;
    return `<div class="minimap-item ${cur ? 'current' : ''} ${!vis && !cur ? 'unvisited' : ''}" onclick="mmNav('${m.id}')">
      ${m.type === 'top-down' ? '🗺' : '🏠'} ${vis || cur ? m.name : '???'}
    </div>`;
  }).join('');
}
function mmNav(mapId) {
  if (mapId === currentMapId) return;
  const map = world.maps.find(m => m.id === currentMapId);
  const linked = (map?.portals || []).some(p => p.to === mapId);
  const visited = player.visited_maps?.includes(mapId);
  if (!linked && !visited) { showToast('Find a portal to reach this map', 'error'); return; }
  document.getElementById('minimap').classList.remove('open');
  enterMap(mapId);
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════
function openSettings() {
  document.getElementById('settingsName').value = player.name || '';
  document.getElementById('settingsVolume').value = masterVolume;
  setText('labelsBtn', `Labels: ${showLabels ? 'On' : 'Off'}`);
  document.getElementById('settingsPanel').classList.add('open');
}
function closeSettings() { document.getElementById('settingsPanel').classList.remove('open'); }
function saveSettings() {
  const name = document.getElementById('settingsName').value.trim();
  if (name) player.name = name;
  masterVolume = parseFloat(document.getElementById('settingsVolume').value);
  setVolume(masterVolume); savePlayer(); updateHUD(); closeSettings(); showToast('Settings saved');
}
function toggleLabels() {
  showLabels = !showLabels;
  setText('labelsBtn', `Labels: ${showLabels ? 'On' : 'Off'}`);
  const map = world?.maps?.find(m => m.id === currentMapId);
  if (map) renderObjects(map);
}
function resetProgress() {
  if (!confirm('Reset all progress? This cannot be undone.')) return;
  localStorage.removeItem('verdure_player');
  localStorage.removeItem('verdure_world');
  location.reload();
}

// ═══════════════════════════════════════════════════════════════
