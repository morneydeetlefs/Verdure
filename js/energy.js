// GROW TIMERS
// ═══════════════════════════════════════════════════════════════
function startGrowTimer() {
  if (growInterval) clearInterval(growInterval);
  growInterval = setInterval(tickGrowTimers, 10000);
  tickGrowTimers();
}

function initGrowTimers(map) {
  // Ensure editor-placed objects already in a mid-growth state get a planted_at
  let dirty = false;
  (map.objects||[]).forEach(obj => {
    const entity = world.entities?.find(e=>e.id===obj.entity_id);
    if (!entity?.grow_time_hours) return;
    const states = entity.states||[{id:'idle'}];
    const os = getObjState(map.id, obj.id);
    const cur = os.state || obj.state || states[0].id;
    const ci  = states.findIndex(s=>s.id===cur);
    // mid-growth state with no timer: start one now
    if (ci > 0 && ci < states.length-1 && !os.planted_at) {
      setObjState(map.id, obj.id, { state:cur, planted_at:Date.now() });
      dirty = true;
    }
  });
  if (dirty) savePlayer();
}

function tickGrowTimers() {
  if (!world||!currentMapId) return;
  const map = world.maps.find(m=>m.id===currentMapId); if (!map) return;
  const os  = player.map_states[currentMapId]||{};
  let changed = false;

  map.objects.forEach(obj => {
    const entity = world.entities?.find(e=>e.id===obj.entity_id);
    if (!entity?.grow_time_hours) return;
    const s = os[obj.id]; if (!s?.planted_at) return;

    const growMs  = entity.grow_time_hours*3600000/(entity.growth_speed_multiplier||1);
    const elapsed = Date.now()-s.planted_at;

    if (elapsed >= growMs) {
      const states = entity.states||[{id:'idle'}];
      const ci     = states.findIndex(st=>st.id===s.state);
      if (ci >= 0 && ci < states.length-1) {
        const next     = states[ci+1];
        const overflow = elapsed - growMs;
        const atFinal  = ci+1 >= states.length-1;
        // carry overflow into next state timer — no time lost
        setObjState(currentMapId, obj.id, { state:next.id, planted_at: atFinal ? null : Date.now()-overflow });
        changed = true;
        showToast(`${entity.name} → ${next.label||next.id}`);
      }
    }

    // Respawn
    if (s.respawn_at && Date.now() >= s.respawn_at) {
      const states = entity.states||[{id:'idle'}];
      setObjState(currentMapId, obj.id, { state:states[0].id, collected:false, respawn_at:null, planted_at:null });
      changed = true; showToast(`${entity.name} has regrown`);
    }
  });

  if (changed) { savePlayer(); renderObjects(map); }

  // Update countdown badges
  document.querySelectorAll('.obj-badge[data-planted-at]').forEach(b => {
    const rem = parseInt(b.dataset.growMs) - (Date.now()-parseInt(b.dataset.plantedAt));
    b.textContent = rem > 0 ? formatDur(rem) : 'Ready!';
  });
}

function formatDur(ms) {
  if (ms <= 0) return 'Ready!';
  const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ═══════════════════════════════════════════════════════════════

function regenEnergy() {
  const now = Date.now(), last = player.last_regen||now;
  const pips = Math.floor((now-last) / ENERGY_REGEN_MS);
  if (pips > 0) {
    player.energy = Math.min(MAX_ENERGY, (player.energy||MAX_ENERGY) + pips);
    player.last_regen = last + pips * ENERGY_REGEN_MS;
    savePlayer();
  }
  return player.energy ?? MAX_ENERGY;
}

function useEnergy(action) {
  const cost = ENERGY_COST[action] || 1;
  const cur  = regenEnergy();
  if (cur < cost) {
    const wait = ENERGY_REGEN_MS - (Date.now()-(player.last_regen||Date.now()));
    showToast(`Not enough energy — refills in ${formatDur(wait)}`,'error');
    return false;
  }
  player.energy = cur - cost;
  savePlayer(); updateEnergyUI();
  return true;
}
