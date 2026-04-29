// INVENTORY & XP
// ═══════════════════════════════════════════════════════════════
function hasItem(entityId) { return (player.inventory || []).some(i => i.entity_id === entityId && i.quantity > 0); }

function addItem(entityId, qty) {
  if (!entityId) return;
  const slot = player.inventory.find(i => i.entity_id === entityId);
  if (slot) slot.quantity += qty; else player.inventory.push({ entity_id: entityId, quantity: qty });
  updateInventoryUI();
  savePlayer();
}

function giveReward(str) {
  if (!str) return;
  const rewardKey = String(str).trim();
  const ent = world.entities?.find(e => e.id === rewardKey || e.name.toLowerCase() === rewardKey.toLowerCase());
  if (ent) {
    addItem(ent.id, 1);
    showToast(`+1 ${ent.name}`, 'xp');
    return;
  }

  const coinMatch = rewardKey.match(/^(\d+)_coins$/);
  if (coinMatch) {
    const amount = parseInt(coinMatch[1], 10);
    player.coins = (player.coins || 0) + amount;
    savePlayer();
    updateHUD();
    showToast(`+${amount} 🪙`, 'xp');
    return;
  }

  const gemMatch = rewardKey.match(/^(\d+)_(ruby|sapphire)$/);
  if (gemMatch) {
    const amount = parseInt(gemMatch[1], 10);
    const gemType = gemMatch[2];
    player.gems = player.gems || { ruby: 0, sapphire: 0 };
    player.gems[gemType] = (player.gems[gemType] || 0) + amount;
    savePlayer();
    updateHUD();
    const label = gemType === 'ruby' ? 'Ruby' : 'Sapphire';
    showToast(`+${amount} ${label}${amount === 1 ? '' : 's'}`, 'xp');
    return;
  }

  if (rewardKey === 'energy') {
    addEnergy(1);
    return;
  }

  const energyMatch = rewardKey.match(/^(\d+)_energy$/);
  if (energyMatch) {
    addEnergy(parseInt(energyMatch[1], 10));
    return;
  }

  const xpMatch = rewardKey.match(/^(\d+)_xp$/);
  if (xpMatch) {
    giveXP(parseInt(xpMatch[1], 10));
    return;
  }
}

function addEnergy(amount) {
  if (!amount || amount <= 0) return;
  const current = regenEnergy();
  player.energy = Math.min(MAX_ENERGY, current + amount);
  savePlayer(); updateEnergyUI();
  showToast(`+${amount} Energy`, 'xp');
}

function giveXP(amount) {
  if (!amount) return;
  player.xp = (player.xp || 0) + amount;
  const needed = player.level * XP_PER_LEVEL;
  if (player.xp >= needed) { player.xp -= needed; player.level++; showToast(`🎉 Level ${player.level}!`, 'xp'); }
  const area = document.getElementById('contentArea');
  const r = area?.getBoundingClientRect();
  if (r) spawnXP(r.left + r.width / 2, r.top + r.height - 60, amount);
  savePlayer(); updateHUD();
}

function getInventoryGroup(ent) {
  if (!ent) return 'other';
  if (ent.category === 'tool') return 'tool';
  if (ent.category === 'plant') return 'seed';
  return 'other';
}

function inventorySlotHtml(ent, slot) {
  const spUrl = resolveAsset(ent.default_sprite || ent.sprite || '');
  const vis = spUrl
    ? `<img class="inv-img" src="${spUrl}" draggable="false">`
    : `<div class="inv-icon">${CAT_ICON[ent.category] || '📦'}</div>`;
  return `<div class="inv-slot" title="${ent.name}" onclick="selectItem('${slot.entity_id}')">
      ${vis}<div class="inv-name">${ent.name}</div>${slot.quantity > 1 ? `<div class="inv-qty">×${slot.quantity}</div>` : ''}
    </div>`;
}

function updateInventoryUI() {
  const el = document.getElementById('invSlots'); if (!el) return;
  const inv = (player.inventory || []).filter(i => i.quantity > 0);
  if (!inv.length) { el.innerHTML = '<div class="inv-empty">Empty</div>'; return; }

  const groups = { seed: [], tool: [], other: [] };
  inv.forEach(slot => {
    const ent = world.entities?.find(e => e.id === slot.entity_id);
    if (!ent) return;
    const group = getInventoryGroup(ent);
    groups[group].push({ ent, slot });
  });

  const sections = [];
  if (groups.seed.length) {
    sections.push(`<div class="inv-group"><div class="inv-group-title">Seed Pouch</div><div class="inv-group-items">${groups.seed.map(item => inventorySlotHtml(item.ent, item.slot)).join('')}</div></div>`);
  }
  if (groups.tool.length) {
    sections.push(`<div class="inv-group"><div class="inv-group-title">Toolbox</div><div class="inv-group-items">${groups.tool.map(item => inventorySlotHtml(item.ent, item.slot)).join('')}</div></div>`);
  }
  if (groups.other.length) {
    sections.push(`<div class="inv-group"><div class="inv-group-title">General Items</div><div class="inv-group-items">${groups.other.map(item => inventorySlotHtml(item.ent, item.slot)).join('')}</div></div>`);
  }

  el.innerHTML = sections.join('');
}

function selectItem(entityId) {
  document.querySelectorAll('.inv-slot').forEach(s => s.classList.remove('active'));
  event?.currentTarget?.classList.add('active');
  const ent = world.entities?.find(e => e.id === entityId); if (!ent) return;
  if (ent.category === 'plant' || (ent.interactions || []).some(ix => ix.action === 'plant')) {
    enterPlantMode(entityId);
  } else {
    showToast(`Selected: ${ent.name}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// ENERGY
// ═══════════════════════════════════════════════════════════════

function updateEnergyUI() {
  const e = regenEnergy();
  const pipsEl = document.getElementById('energyPips');
  const countEl = document.getElementById('energyCount');
  if (pipsEl) pipsEl.innerHTML = Array.from({ length: MAX_ENERGY }, (_, i) => `<div class="pip ${i < e ? 'on' : 'off'}"></div>`).join('');
  if (countEl) countEl.textContent = `${e}/${MAX_ENERGY}`;
}
setInterval(() => { regenEnergy(); updateEnergyUI(); }, 30000);

// ═══════════════════════════════════════════════════════════════
