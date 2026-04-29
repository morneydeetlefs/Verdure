// PLANT MODE
// ═══════════════════════════════════════════════════════════════
function enterPlantMode(entityId) {
  plantModeId = entityId;
  document.getElementById('plantModeBar').classList.add('active');
  document.getElementById('contentArea').classList.add('plant-mode');
  closeActionPopup();
  showToast('Click the map to plant');
}

function cancelPlantMode() {
  plantModeId = null;
  document.getElementById('plantModeBar').classList.remove('active');
  document.getElementById('contentArea').classList.remove('plant-mode');
}

document.getElementById('mapStage').addEventListener('click', e => {
  if (!plantModeId) return;
  if (e.target.closest('.game-object')) return;
  const area = document.getElementById('contentArea');
  const r = area.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  if (x < 0 || x > 1 || y < 0 || y > 1) return;
  doPlantOnMap(plantModeId, x, y);
  cancelPlantMode();
});

function doPlantOnMap(entityId, x, y) {
  const entity = world.entities?.find(e => e.id === entityId); if (!entity) return;
  const unmet = (entity.place_requires || []).find(rid => !hasItem(rid));
  if (unmet) { showToast(`Need ${world.entities?.find(e => e.id === unmet)?.name || 'required tool'}`, 'error'); return; }
  if (!useEnergy('plant')) return;
  const map = world.maps.find(m => m.id === currentMapId);
  if (inMaskZone(map, x, y, 'no_plant')) { showToast('Cannot plant here', 'error'); return; }

  // Deduct from inventory
  const slot = player.inventory.find(i => i.entity_id === entityId);
  if (slot) slot.quantity = Math.max(0, slot.quantity - 1);

  const newObj = {
    id: 'placed_' + Date.now(),
    entity_id: entityId,
    label: '',
    x, y,
    size: 48,
    z_order: 10,
    rotation: 0,
    animation: entity.category === 'plant' ? 'sway' : 'none',
    collision: 'walkable',
    trigger_radius: 8,
    state: entity.states?.[0]?.id || 'idle',
    notes: 'player_placed'
  };
  if (!map.objects) map.objects = [];
  map.objects.push(newObj);
  setObjState(currentMapId, newObj.id, { state: newObj.state, planted_at: Date.now() });

  giveXP(XP_REWARD.plant);
  savePlayer();
  saveWorld();
  renderObjects(map);
  updateInventoryUI();
  const area = document.getElementById('contentArea');
  const ar = area.getBoundingClientRect();
  spawnParticle(ar.left + x * ar.width, ar.top + y * ar.height, '🌱');
  showToast(`Planted ${entity.name}`);
}

function inMaskZone(map, x, y, type) {
  return (map?.masks || []).some(m => (!type || m.type === type) && pip(x, y, m.points));
}
function pip(x, y, pts) { // point-in-polygon ray cast
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const { x: xi, y: yi } = pts[i], { x: xj, y: yj } = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ═══════════════════════════════════════════════════════════════
