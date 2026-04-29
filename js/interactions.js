// INTERACTION POPUP
// ═══════════════════════════════════════════════════════════════
function handleClick(obj, entity, el) {
  const map = world.maps.find(m => m.id === currentMapId); if (!map) return;

  // Portals: traverse immediately
  if (isPortal(obj)) {
    const portal = (map.portals || []).find(p => p.id === obj.portal_id);
    if (!portal?.to) { showToast('Portal not linked', 'error'); return; }
    if ((player.level || 1) < (portal.requires_level || 0)) { showToast(`Requires level ${portal.requires_level}`, 'error'); return; }
    enterMap(portal.to); return;
  }
  if (!entity) return;

  const interactions = entity.interactions || [];
  if (!interactions.length && !entity.collectible) return;
  openActionPopup(obj, entity, interactions);
}

function openActionPopup(obj, entity, interactions) {
  const os = player.map_states[currentMapId] || {};
  const curState = os[obj.id]?.state || obj.state || 'idle';
  const states = entity.states || [{ id: 'idle' }];
  const stIdx = states.findIndex(s => s.id === curState);
  const isFirst = stIdx <= 0;
  const isLast = stIdx >= states.length - 1;
  const stLabel = states[stIdx]?.label || curState;
  const stProg = states.length > 1 ? ` (${stIdx + 1}/${states.length})` : '';

  const planted = os[obj.id]?.planted_at;
  const growMs = entity.grow_time_hours > 0 ? entity.grow_time_hours * 3600000 / (entity.growth_speed_multiplier || 1) : 0;
  const remain = planted && growMs > 0 ? growMs - (Date.now() - planted) : 0;

  let html = `<div class="popup-title">${entity.name}</div>`;
  if (entity.description) html += `<div class="popup-desc">${entity.description}</div>`;
  html += `<div class="popup-sep"></div>`;
  html += `<div class="popup-state">${stLabel}${stProg}${remain > 0 ? ' · ⏱ ' + formatDur(remain) : (stIdx > 0 && !isLast ? ' · ✓ Ready' : '')}</div>`;
  html += `<div class="popup-sep"></div>`;

  // Current season from world meta (1-4), 0 = any
  const curSeason = world.meta?.current_season || 0;

  const valid = interactions.filter(ix => {
    // required_obj_states: placed object must be in one of these states
    if (ix.required_obj_states?.length && !ix.required_obj_states.includes(curState)) return false;
    // seasons: only available in specified seasons
    if (ix.seasons?.length && curSeason && !ix.seasons.includes(curSeason)) return false;
    // Legacy required_states (entity-level condition)
    if (ix.required_states?.length && !ix.required_states.includes(curState)) return false;
    // Built-in trigger rules when no explicit obj state filter
    if (!ix.required_obj_states?.length) {
      if (ix.trigger === 'harvest' || ix.action === 'harvest') return isLast;
      if (ix.trigger === 'water' || ix.action === 'grow') return !isLast;
      if (ix.trigger === 'plant') return isFirst;
    }
    return true;
  });

  if (!valid.length && !entity.collectible) {
    html += `<div style="font-family:'DM Mono',monospace;font-size:.72rem;color:var(--dim);padding:6px 12px">No actions available.</div>`;
  }

  const ICONS = { click: '👆', play: '🎮', collect: '🤲', water: '💧', harvest: '🌾', inspect: '🔍', plant: '🌱' };
  valid.forEach(ix => {
    const ri = interactions.indexOf(ix);
    // Multi-requirement check (backward compat with old single requires_entity_id)
    const reqs = ix.requires?.length ? ix.requires : (ix.requires_entity_id ? [ix.requires_entity_id] : []);
    const unmet = reqs.filter(rid => rid && !hasItem(rid));
    const locked = unmet.length > 0;
    const reqNames = unmet.map(rid => world.entities?.find(e => e.id === rid)?.name || rid).filter(Boolean);
    const icon = ICONS[ix.trigger] || '▶';
    const lbl = ix.trigger.charAt(0).toUpperCase() + ix.trigger.slice(1);
    html += `<button class="action-btn${locked ? ' locked' : ''}" ${locked ? `title="Needs: ${reqNames.join(', ')}"` : ''}
      onclick="${locked ? '' : 'fireInteraction(\'' + obj.id + '\',\'' + ix.trigger + '\',' + ri + ')'}">
      <span class="action-icon">${icon}</span>${lbl}
      ${locked ? `<span class="action-lock">🔒 ${reqNames.join(', ')}</span>` : ''}
    </button>`;
  });

  // Auto collect button
  if (entity.collectible && !interactions.find(ix => ix.trigger === 'collect')) {
    html += `<button class="action-btn" onclick="quickCollect('${obj.id}')"><span class="action-icon">🤲</span>Collect</button>`;
  }

  html += `<div class="popup-sep"></div>`;
  html += `<button class="action-btn" onclick="closeActionPopup()"><span class="action-icon">✕</span>Close</button>`;

  document.getElementById('actionPopup').innerHTML = html;
  document.getElementById('actionOverlay').classList.add('open');
}

function closeActionPopup() {
  document.getElementById('actionOverlay').classList.remove('open');
  document.getElementById('actionPopup').innerHTML = '';
}

// Close popup when clicking contentArea background
document.getElementById('contentArea').addEventListener('click', e => {
  if (e.target === e.currentTarget || e.target.id === 'mapBg' || e.target.id === 'mapBgPlaceholder')
    closeActionPopup();
});

// ═══════════════════════════════════════════════════════════════
// INTERACTION EXECUTION
// ═══════════════════════════════════════════════════════════════
function fireInteraction(objId, trigger, ixIdx) {
  closeActionPopup();
  const map = world.maps.find(m => m.id === currentMapId);
  const obj = map?.objects?.find(o => o.id === objId);
  const entity = world.entities?.find(e => e.id === obj?.entity_id);
  if (!obj || !entity) return;
  const ix = entity.interactions[ixIdx]; if (!ix) return;

  // Check all required items (supports both old single-id and new array schema)
  const reqs = ix.requires?.length ? ix.requires : (ix.requires_entity_id ? [ix.requires_entity_id] : []);
  const unmetReq = reqs.find(rid => rid && !hasItem(rid));
  if (unmetReq) {
    const name = world.entities?.find(e => e.id === unmetReq)?.name || 'required item';
    showToast(`Need ${name}`, 'error'); return;
  }
  if (ix.sound) { const src = resolveAsset(ix.sound); try { new Audio(src).play(); } catch { } }

  switch (ix.action) {
    case 'collect': doCollect(obj, entity, ix); break;
    case 'grow': doGrow(obj, entity, ix); break;
    case 'harvest': doHarvest(obj, entity, ix); break;
    case 'reveal': doReveal(obj, entity, ix); break;
    case 'transform': doTransform(obj, entity, ix); break;
    case 'reward': doReward(obj, entity, ix); break;
    case 'dialog': openDialog(ix.dialog_id); break;
    case 'plant': doPlant(obj, entity, ix); break;
    case 'combine': doCombine(obj, entity, ix); break;
    case 'play_minigame': doPlayMinigame(obj, entity, ix); break;
    case 'unlock': giveXP(20); showToast('Unlocked!'); break;
    default: showToast(ix.action); break;
  }

  // Elevate: advance object to next state after action
  if (ix.elevate) elevateObj(obj, entity);

  // Consume required items if flagged
  if (ix.consume_requires !== false) {
    const reqs2 = ix.requires?.length ? ix.requires : (ix.requires_entity_id ? [ix.requires_entity_id] : []);
    if (reqs2.length) { reqs2.forEach(rid => { if (rid) consumeItem(rid, 1); }); updateInventoryUI(); }
  }
}

function quickCollect(objId) {
  closeActionPopup();
  const map = world.maps.find(m => m.id === currentMapId);
  const obj = map?.objects?.find(o => o.id === objId);
  const entity = world.entities?.find(e => e.id === obj?.entity_id);
  if (obj && entity) doCollect(obj, entity, { reward: '' });
}

// ── Individual actions ─────────────────────────────────
function getObjState(mapId, objId) {
  if (!player.map_states[mapId]) player.map_states[mapId] = {};
  return player.map_states[mapId][objId] || {};
}
function setObjState(mapId, objId, patch) {
  if (!player.map_states[mapId]) player.map_states[mapId] = {};
  player.map_states[mapId][objId] = { ...getObjState(mapId, objId), ...patch };
}

function doCollect(obj, entity, ix) {
  const cost = entity.category === 'hazard' ? 'clear_hazard' : 'collect';
  if (!useEnergy(cost)) return;

  // Advance to next defined state, or mark collected if at last state
  const states = entity.states || [{ id: 'idle' }];
  const os = getObjState(currentMapId, obj.id);
  const cur = os.state || obj.state || states[0].id;
  const ci = states.findIndex(s => s.id === cur);
  const ni = Math.min(ci + 1, states.length - 1);
  const next = states[ni];
  const atLast = ni === states.length - 1;

  // If entity is collectible (goes to inventory), add it and mark collected
  // If it just advances state (e.g. hazard clear), only advance state
  const goesToInventory = entity.category !== 'hazard' && entity.category !== 'building' && entity.category !== 'decoration';
  const shouldCollect = goesToInventory && (ix.reward || atLast);

  setObjState(currentMapId, obj.id, {
    state: next.id,
    collected: shouldCollect,
    collected_at: shouldCollect ? Date.now() : null
  });

  if (goesToInventory && !ix.reward) addItem(obj.entity_id, 1);
  if (ix.reward) giveReward(ix.reward);
  giveXP(entity.category === 'hazard' ? XP_REWARD.clear_hazard : XP_REWARD.collect);
  savePlayer();
  const map = world.maps.find(m => m.id === currentMapId);
  renderObjects(map);
  const el = document.querySelector(`[data-obj-id="${obj.id}"]`);
  if (el) { const r = el.getBoundingClientRect(); spawnParticle(r.left + r.width / 2, r.top, CAT_ICON[entity.category] || '✨'); }
  if (!ix.reward) showToast(goesToInventory ? `Collected ${entity.name}` : `${entity.name} → ${next.label || next.id}`);
}

function doGrow(obj, entity, ix) {
  if (!useEnergy('water')) return;
  const states = entity.states || [{ id: 'idle' }];
  const os = getObjState(currentMapId, obj.id);
  const cur = os.state || obj.state || states[0].id;
  const ci = states.findIndex(s => s.id === cur);
  const ni = Math.min(ci + 1, states.length - 1);
  if (ni === ci) { showToast('Already at final state'); return; }
  const next = states[ni];
  const atFinal = ni >= states.length - 1;
  setObjState(currentMapId, obj.id, { state: next.id, planted_at: atFinal ? null : Date.now() });
  if (ix.reward) giveReward(ix.reward);
  giveXP(XP_REWARD.grow);
  savePlayer();
  renderObjects(world.maps.find(m => m.id === currentMapId));
  showToast(`${entity.name} → ${next.label || next.id}`);
}

function doHarvest(obj, entity, ix) {
  if (!useEnergy('harvest')) return;
  const states = entity.states || [{ id: 'idle' }];
  const os = getObjState(currentMapId, obj.id);
  const cur = os.state || obj.state || states[0].id;
  if (cur !== states[states.length - 1].id) { showToast(`${entity.name} isn't ready`, 'error'); return; }
  if (ix.reward) giveReward(ix.reward);
  // Respawn now lives on the interaction (ix.respawn) — fall back to entity-level for old worlds
  const willRespawn = ix.respawn !== undefined ? ix.respawn : entity.respawn;
  const respawnHrs = ix.respawn_hours !== undefined ? ix.respawn_hours : (entity.respawn_hours || 24);
  setObjState(currentMapId, obj.id, {
    state: willRespawn ? states[0].id : states[states.length - 1].id,
    collected: !willRespawn,
    respawn_at: willRespawn ? Date.now() + respawnHrs * 3600000 : null,
    planted_at: null
  });
  giveXP(XP_REWARD.harvest);
  savePlayer();
  renderObjects(world.maps.find(m => m.id === currentMapId));
  showToast(`Harvested ${entity.name}`);
}

function doReveal(obj, entity, ix) {
  if (!useEnergy('inspect')) return;
  // Advance to next state (first visible state), don't hardcode 'found'
  const states = entity.states || [{ id: 'idle' }];
  const os = getObjState(currentMapId, obj.id);
  const cur = os.state || obj.state || states[0].id;
  const ci = states.findIndex(s => s.id === cur);
  const next = states[Math.min(ci + 1, states.length - 1)];
  setObjState(currentMapId, obj.id, { state: next.id, revealed: true });
  if (ix.reward) giveReward(ix.reward);
  giveXP(XP_REWARD.reveal);
  savePlayer();
  renderObjects(world.maps.find(m => m.id === currentMapId));
  setTimeout(() => {
    const el = document.querySelector(`[data-obj-id="${obj.id}"]`);
    if (el) { el.classList.add('just-revealed'); setTimeout(() => el.classList.remove('just-revealed'), 700); }
  }, 50);
  showToast(`Discovered: ${entity.name}!`);
}

function doTransform(obj, entity, ix) {
  const states = entity.states || [{ id: 'idle' }];
  const os = getObjState(currentMapId, obj.id);
  const cur = os.state || obj.state || states[0].id;
  const ci = states.findIndex(s => s.id === cur);
  const next = states[Math.min(ci + 1, states.length - 1)];
  setObjState(currentMapId, obj.id, { state: next.id });
  if (ix.reward) giveReward(ix.reward);
  giveXP(10); savePlayer();
  renderObjects(world.maps.find(m => m.id === currentMapId));
  showToast(`${entity.name} → ${next.label || next.id}`);
}

function doReward(obj, entity, ix) {
  if (ix.reward) giveReward(ix.reward);
  giveXP(10); showToast(`Reward received`);
}

function doPlant(obj, entity, ix) {
  const unmet = (entity.place_requires || []).find(rid => !hasItem(rid));
  if (unmet) { showToast(`Need ${world.entities?.find(e => e.id === unmet)?.name || 'required tool'}`, 'error'); return; }
  doGrow(obj, entity, ix);
  giveXP(XP_REWARD.plant - XP_REWARD.grow);
}

function doCombine(obj, entity, ix) {
  // All requires[] are ingredients — checked before fireInteraction reaches here
  // Reward is the output entity added to inventory
  if (ix.reward) giveReward(ix.reward);
  giveXP(XP_REWARD.collect);
  showToast(`Created: ${ix.reward || 'item'}`);
}

function doPlayMinigame(obj, entity, ix) {
  const gameHtml = entity.game_html || ix.game_html || 'cc-game.html';
  const gameWindow = window.open(gameHtml, 'minigame', 'width=520,height=760,scrollbars=no,resizable=no');
  if (!gameWindow) { showToast('Popup blocked. Allow popups for this site.', 'error'); return; }

  const config = {
    totalMovesAllowed: entity.totalMovesAllowed || 25
  };

  let started = false;
  const cleanup = () => {
    window.removeEventListener('message', onMessage);
    if (readyPoll) clearInterval(readyPoll);
  };

  const onMessage = (event) => {
    if (!event.data || event.data.source !== 'merge-mania' || event.data.event !== 'gameOver') return;
    cleanup();
    if (!gameWindow.closed) gameWindow.close();

    const result = event.data.result || {};
    const rewardConfig = entity.rewards || [];
    const rewardItems = [];

    if (Array.isArray(rewardConfig)) {
      rewardItems.push(...rewardConfig.filter(r => r));
    } else if (rewardConfig && typeof rewardConfig === 'object') {
      const special = result.specialObjectsCreated || {};
      let usedSpecials = false;
      for (const [key, rewardId] of Object.entries(rewardConfig)) {
        const count = Number(special[key] || 0);
        if (count > 0) {
          usedSpecials = true;
          for (let i = 0; i < count; i++) rewardItems.push(rewardId);
        }
      }
      if (!usedSpecials) {
        for (const rewardId of Object.values(rewardConfig)) {
          if (rewardId) rewardItems.push(rewardId);
        }
      }
    }

    if (ix.reward) rewardItems.push(ix.reward);

    rewardItems.forEach(reward => giveReward(reward));
    const xpGain = Math.floor((result.score || 0) / 100);
    if (xpGain > 0) giveXP(xpGain);
    showToast(`Mini-game complete! Score: ${result.score || 0} · Rewards: ${rewardItems.length} · XP: ${xpGain}`);
  };

  const tryStart = () => {
    if (started || !gameWindow || gameWindow.closed) return;
    try {
      if (typeof gameWindow.startMergeMania === 'function') {
        gameWindow.startMergeMania(config);
        started = true;
      }
    } catch (err) {
      // ignore cross-origin or not-ready errors until ready
    }
  };

  window.addEventListener('message', onMessage);
  gameWindow.onload = tryStart;
  const readyPoll = setInterval(tryStart, 200);
}

function elevateObj(obj, entity) {
  // Advance object to next state (called after any interaction with elevate:true)
  const states = entity.states || [{ id: 'idle' }];
  const os = getObjState(currentMapId, obj.id);
  const cur = os.state || obj.state || states[0].id;
  const ci = states.findIndex(s => s.id === cur);
  if (ci < 0 || ci >= states.length - 1) return; // already at last state
  const next = states[ci + 1];
  const atFinal = ci + 1 >= states.length - 1;
  setObjState(currentMapId, obj.id, {
    state: next.id,
    planted_at: atFinal ? null : Date.now()
  });
  savePlayer();
  renderObjects(world.maps.find(m => m.id === currentMapId));
  showToast(`${entity.name} → ${next.label || next.id}`);
}

function consumeItem(entityId, qty) {
  const slot = player.inventory?.find(i => i.entity_id === entityId);
  if (!slot) return;
  slot.quantity = Math.max(0, slot.quantity - qty);
  savePlayer();
}

// ═══════════════════════════════════════════════════════════════
