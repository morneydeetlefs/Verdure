// ═══════════════════════════════════════════
// PLACE OBJECT MODAL
// ═══════════════════════════════════════════
function openPlaceModal(x, y) {
  if (!activeMapId) { showToast('Select a map first'); return; }
  _pendX = x; _pendY = y;
  document.getElementById('modalTitle').textContent = 'Place Object';
  document.getElementById('modalBody').innerHTML = `
    <div class="fhint">Position (${(x * 100).toFixed(1)}%, ${(y * 100).toFixed(1)}%)</div>
    <div class="fg"><div class="fl">Entity</div>
      <select class="fi" id="placeEnt" onchange="onPlaceEntChange(this.value)">
        <option value="">— select entity —</option>
        ${world.entities.map(e => `<option value="${e.id}">${CICONS[e.category] || ''} ${e.name}</option>`).join('')}
      </select></div>
    <div class="fg"><div class="fl">Label (optional)</div><input class="fi" id="placeLbl" placeholder="leave blank for entity name"></div>
    <div id="portalPlaceF" style="display:none"></div>`;
  document.getElementById('modalFoot').innerHTML = `<button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="confirmPlace()">Place</button>`;
  openModal();
}
function onPlaceEntChange(eid) {
  const ent = world.entities.find(e => e.id === eid), pf = document.getElementById('portalPlaceF');
  if (ent?.category === 'portal') {
    pf.style.display = 'flex'; pf.style.flexDirection = 'column'; pf.style.gap = '10px';
    pf.innerHTML = `<div class="fg"><div class="fl">Links to Map</div>
      <select class="fi" id="placePortalTgt"><option value="">— unlinked —</option>
        ${world.maps.filter(m => m.id !== activeMapId).map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
      </select></div>
      <div class="fg"><div class="fl">Requires Level</div><input class="fi" id="placePortalLvl" type="number" min="0" value="0"></div>`;
  } else { pf.style.display = 'none'; pf.innerHTML = ''; }
}
function confirmPlace() {
  const eid = document.getElementById('placeEnt')?.value; if (!eid) { showToast('Select an entity'); return; }
  const map = world.maps.find(m => m.id === activeMapId); if (!map) return;
  const ent = world.entities.find(e => e.id === eid), lbl = document.getElementById('placeLbl')?.value || '';
  if (!map.objects) map.objects = [];
  const obj = {
    id: 'obj_' + Date.now(), entity_id: eid, label: lbl, x: _pendX, y: _pendY,
    state: ent?.states?.[0]?.id || 'idle', size: 48, z_order: ent?.category === 'portal' ? 20 : 10, rotation: 0, animation: 'none', notes: ''
  };
  if (ent?.category === 'portal') {
    if (!map.portals) map.portals = [];
    const pid = 'portal_' + Date.now();
    map.portals.push({
      id: pid, to: document.getElementById('placePortalTgt')?.value || null,
      label: lbl || ent.name, requires_level: parseInt(document.getElementById('placePortalLvl')?.value) || 0, x: _pendX, y: _pendY
    });
    obj.type = 'portal'; obj.portal_id = pid;
  }
  map.objects.push(obj); saveWorld(); renderCanvas(); renderMapList(); closeModal();
  showToast(ent?.category === 'portal' ? 'Portal placed' : 'Object placed');
}

// ═══════════════════════════════════════════
// ENTITY LIST & MIGRATION
// ═══════════════════════════════════════════
function renderEntityList() {
  const el = document.getElementById('entityList');
  const list = world.entities.filter(e => catFilter === 'all' || e.category === catFilter);
  if (!list.length) { el.innerHTML = `<div class="empty-s"><div class="esi">🌾</div><div>No entities${catFilter !== 'all' ? ' here' : ' yet'}</div></div>`; return; }
  el.innerHTML = list.map(e => {
    const url = resolveAsset(e.default_sprite || '');
    const th = url ? `<img src="${url}" style="width:20px;height:20px;object-fit:contain;image-rendering:pixelated">` : `<span>${CICONS[e.category] || '📦'}</span>`;
    return `<div class="litem ${e.id === activeEntityId ? 'active' : ''}" onclick="selEntity('${e.id}')">
      <span>${th}</span><span class="ln">${e.name}</span><span class="lm">${e.rarity?.slice(0, 1) || 'c'}</span>
    </div>`;
  }).join('');
}
function filterCat(c, el) { catFilter = c; document.querySelectorAll('#catFilter .tag').forEach(t => t.classList.remove('active')); el.classList.add('active'); renderEntityList(); }
function selEntity(id) { activeEntityId = id; renderEntityList(); renderEntityForm(); }

function migrateEntity(e) {
  if (!e.states?.length) e.states = [{ id: 'idle', label: 'Idle', sprite: null, duration_hours: null, visible: true }];
  e.states.forEach(s => { if (s.sprite === undefined) s.sprite = null; if (s.duration_hours === undefined) s.duration_hours = null; if (s.visible === undefined) s.visible = true; });
  if (!e.default_sprite && e.sprite) { e.default_sprite = storeAsset(e.sprite); delete e.sprite; }
  if (e.default_sprite === undefined) e.default_sprite = '';
  if (!e.ambient_sound) e.ambient_sound = '';
  if (!e.zone_requirements) e.zone_requirements = [];
  if (!e.seasonal_visibility) e.seasonal_visibility = [];
  if (!e.interactions) e.interactions = [];
  if (e.category === 'minigame') {
    if (e.game_html === undefined) e.game_html = 'cc-game.html';
    if (e.totalMovesAllowed === undefined) e.totalMovesAllowed = 25;
    if (!e.rewards) e.rewards = { diamond: '', lightning: '', star: '' };
  }
  e.interactions.forEach(ix => {
    if (!ix.requires) { ix.requires = ix.requires_entity_id ? [ix.requires_entity_id] : []; delete ix.requires_entity_id; }
    if (!ix.required_states) ix.required_states = [];
    if (!ix.seasons) ix.seasons = [];
    if (ix.consume_requires === undefined) ix.consume_requires = true;
    if (ix.respawn === undefined) ix.respawn = false;
    if (ix.respawn_hours === undefined) ix.respawn_hours = 24;
    if (!ix.sound) ix.sound = '';
    if (!ix.required_obj_states) ix.required_obj_states = [];
    if (ix.elevate === undefined) ix.elevate = false;
  });
  ['collectible', 'interactable', 'hidden', 'grow_time_hours', 'growth_speed_multiplier', 'respawn', 'respawn_hours', 'place_requires'].forEach(k => delete e[k]);
  if (!e.effect) e.effect = ''; if (e.tradeable === undefined) e.tradeable = false;
}

// ═══════════════════════════════════════════
// ENTITY FORM
// ═══════════════════════════════════════════
function renderEntityForm() {
  const entity = world.entities.find(e => e.id === activeEntityId);
  const form = document.getElementById('entityForm');
  if (!entity) { form.innerHTML = '<div class="empty-s"><div class="esi">🌾</div><div>Select an entity to edit</div></div>'; return; }
  migrateEntity(entity);
  _ezones = [...(entity.zone_requirements || [])]; _eseasons = [...(entity.seasonal_visibility || [])];
  const spUrl = resolveAsset(entity.default_sprite || '');
  form.innerHTML = `
  <div class="fhint">ID: ${entity.id}</div>

  <div class="fsec"><div class="fsech">Identity</div><div class="fsecb">
    <div class="frow">
      <div class="fg" style="flex:2"><div class="fl">Name</div><input class="fi" id="eName" value="${entity.name}"></div>
      <div class="fg"><div class="fl">Category</div><select class="fi" id="eCat">${Object.keys(CICONS).map(c => `<option value="${c}" ${entity.category === c ? 'selected' : ''}>${CICONS[c]} ${c}</option>`).join('')}</select></div>
    </div>
    <div class="fg"><div class="fl">Description</div><textarea class="fi" id="eDesc">${entity.description || ''}</textarea></div>
    <div class="frow">
      <div class="fg" style="flex:1"><div class="fl">Rarity</div><select class="fi" id="eRarity">${['common', 'uncommon', 'rare', 'legendary'].map(r => `<option value="${r}" ${entity.rarity === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
      <div class="fg" style="flex:1"><div class="fl">Effect</div><select class="fi" id="eEffect"><option value="">none</option>${EFFECTS.map(ef => `<option value="${ef}" ${entity.effect === ef ? 'selected' : ''}>${ef.replace(/_/g, ' ')}</option>`).join('')}</select></div>
    </div>
    <label class="crow"><input type="checkbox" id="eTrade" ${entity.tradeable ? 'checked' : ''}><span>Tradeable</span></label>
  </div></div>

  <div class="fsec"><div class="fsech">Default Sprite</div><div class="fsecb">
    <div class="sparea">
      <div class="spprev" onclick="pickFile('image/*',loadSp)" title="Click to upload">
        ${spUrl ? `<img data-role="spPrev" src="${spUrl}">` : `<span data-role="spPrev" style="font-size:1.8rem;opacity:.4">🖼</span>`}
        <div class="sphint">${spUrl ? 'click to change' : 'click to upload'}</div>
      </div>
      <div class="spctrl">
        <button class="btn primary" onclick="pickFile('image/*',loadSp)" style="width:100%">📁 Upload Image</button>
        <div class="fhint" style="text-align:center">— or paste URL —</div>
        <input class="fi" id="eSpUrl" placeholder="https://…" value="${(!entity.default_sprite || entity.default_sprite.startsWith('ast_')) ? '' : entity.default_sprite}" oninput="onSpUrl(this.value)">
        ${entity.default_sprite ? `<button class="btn danger" onclick="clearSp()" style="width:100%;font-size:.68rem;padding:4px">✕ Remove</button>` : ''}
        ${entity.default_sprite?.startsWith('ast_') ? `<div class="abadge">🔑 ${entity.default_sprite}</div>` : ''}
      </div>
    </div>
  </div></div>

  <div class="fsec"><div class="fsech">Zone & Season Constraints</div><div class="fsecb">
    <div class="fg"><div class="fl">Climate Zones</div>
      <div class="zgrid">${[...Array(12)].map((_, i) => `<div class="chip ${(entity.zone_requirements || []).includes(i + 1) ? 'active' : ''}" onclick="togZ(${i + 1},this)">${i + 1}</div>`).join('')}</div>
      <div class="fhint">Leave all off = available in any zone</div></div>
    <div class="fg"><div class="fl">Seasonal Visibility</div>
      <div class="sgrid">${SEASONS.map(s => `<div class="chip ${(entity.seasonal_visibility || []).includes(s.id) ? 'active' : ''}" onclick="togS(${s.id},this)">${s.label}</div>`).join('')}</div>
      <div class="fhint">Leave all off = visible all year</div></div>
  </div></div>

  <div class="fsec"><div class="fsech">Ambient Sound</div><div class="fsecb">
    <div style="display:flex;gap:8px;align-items:center">
      <button class="btn" onclick="pickFile('audio/*',loadAmb)" style="flex:1">🔊 Upload Audio</button>
      ${entity.ambient_sound ? `<button class="btn" onclick="prvAmb()" title="Preview">▶</button><button class="btn danger" onclick="clearAmb()">✕</button>` : ''}
    </div>
    ${entity.ambient_sound ? `<div class="abadge">🔑 ${entity.ambient_sound}</div>` : `<div class="fhint">No ambient sound</div>`}
    <input class="fi" id="eAmbUrl" placeholder="or paste URL" value="${(!entity.ambient_sound || entity.ambient_sound.startsWith('ast_')) ? '' : entity.ambient_sound}" oninput="setAmbUrl(this.value)">

  </div></div>

  ${entity.category === 'minigame' ? `
  <div class="fsec"><div class="fsech">Mini-Game Settings</div><div class="fsecb">
    <div class="fg"><div class="fl">Game HTML file</div><input class="fi" id="eGameHtml" placeholder="cc-game.html" value="${entity.game_html || ''}"></div>
    <div class="fg"><div class="fl">Move limit</div><input class="fi" type="number" min="0" id="eMoveLimit" value="${entity.totalMovesAllowed || 25}"></div>
    <div class="fg"><div class="fl">Reward: diamond</div><input class="fi" id="eRewardDiamond" placeholder="entity id" value="${entity.rewards?.diamond || ''}"></div>
    <div class="fg"><div class="fl">Reward: lightning</div><input class="fi" id="eRewardLightning" placeholder="entity id" value="${entity.rewards?.lightning || ''}"></div>
    <div class="fg"><div class="fl">Reward: star</div><input class="fi" id="eRewardStar" placeholder="entity id" value="${entity.rewards?.star || ''}"></div>
    <div class="fhint">Set the HTML file and rewards used by this mini-game entity.</div>
  </div></div>` : ''}

  <div class="fsec"><div class="fsech">States<button class="btn" style="padding:2px 8px;font-size:.65rem" onclick="addState()">+ Add</button></div><div class="fsecb">
    <div class="fhint">Each state can override the sprite and set an auto-advance timer. First state = initial/default.</div>
    <div class="slist" id="statesList">
      ${(entity.states || []).map((s, i) => `
        <div class="srow" data-i="${i}">
          <div class="srtop">
            <input class="fi" style="width:90px" placeholder="id" value="${s.id}" oninput="updSt(${i},'id',this.value)">
            <input class="fi" style="flex:1" placeholder="label" value="${s.label || ''}" oninput="updSt(${i},'label',this.value)">
            <button class="btn danger" style="padding:2px 6px;font-size:.7rem" onclick="remSt(${i})">✕</button>
          </div>
          <div class="srsp">
            <div class="spthumb" onclick="pickFile('image/*',f=>loadStSp(f,${i}))" title="State sprite">
              ${resolveAsset(s.sprite || '') ? `<img src="${resolveAsset(s.sprite || '')}">` : `<span>🖼</span>`}
            </div>            <div style="flex:1;display:flex;flex-direction:column;gap:5px">
              <div class="fg"><div class="fl">Auto-advance after (hours)</div>
                <input class="fi" type="number" min="0" step="0.5" placeholder="blank = manual only"
                  value="${s.duration_hours || ''}" oninput="updSt(${i},'duration_hours',this.value?parseFloat(this.value):null)"></div>
              <label class="crow"><input type="checkbox" ${s.visible !== false ? 'checked' : ''} onchange="updSt(${i},'visible',this.checked)"><span>Visible (uncheck = hidden until revealed)</span></label>
            </div>
          </div>
          ${s.sprite?.startsWith('ast_') ? `<div class="abadge">🔑 ${s.sprite}</div>` : ''}
        </div>`).join('')}
    </div>
  </div></div>

  <div class="fsec"><div class="fsech">Interactions<button class="btn" style="padding:2px 8px;font-size:.65rem" onclick="addIx()">+ Add</button></div><div class="fsecb">
    <div class="fhint">Everything the player can do — including planting and combining.</div>
    <div class="ixlist" id="ixList">
      ${(entity.interactions || []).map((ix, i) => buildIxRow(entity, ix, i)).join('')}
      ${!(entity.interactions || []).length ? '<div class="fhint">No interactions defined</div>' : ''}
    </div>
  </div></div>

  <div style="display:flex;gap:8px">
    <button class="btn danger" onclick="delEntity()">Delete Entity</button>
    <button class="btn primary" style="flex:1" onclick="saveEntity()">Save Entity</button>
  </div>`;
}

function buildIxRow(ent, ix, i) {
  const stChks = ent.states?.length ? `
    <div><div class="ixlbl">📍 Active in states:</div><div class="stchks">
      ${ent.states.map(s => `<label class="stchk"><input type="checkbox" ${(ix.required_states || []).includes(s.id) ? 'checked' : ''} onchange="togIxSt(${i},'${s.id}',this.checked)">${s.label || s.id}</label>`).join('')}
      <label class="stchk" style="color:var(--dim);font-style:italic"><input type="checkbox" ${!(ix.required_states?.length) ? 'checked' : ''} onchange="if(this.checked)clrIxSts(${i})">All</label>
    </div></div>`: '';
  // Required object states — which states the PLACED OBJECT must be in
  const objStChks = ent.states?.length ? `
    <div><div class="ixlbl">🎯 Object must be in state:</div><div class="stchks">
      ${ent.states.map(s => `<label class="stchk"><input type="checkbox" ${(ix.required_obj_states || []).includes(s.id) ? 'checked' : ''} onchange="togIxObjSt(${i},'${s.id}',this.checked)">${s.label || s.id}</label>`).join('')}
      <label class="stchk" style="color:var(--dim);font-style:italic"><input type="checkbox" ${!(ix.required_obj_states?.length) ? 'checked' : ''} onchange="if(this.checked)clrIxObjSts(${i})">Any</label>
    </div></div>`: '';
  const snChks = `<div><div class="ixlbl">🍂 Active in seasons:</div><div class="snchks">
    ${SEASONS.map(s => `<label class="snchk"><input type="checkbox" ${(ix.seasons || []).includes(s.id) ? 'checked' : ''} onchange="togIxSn(${i},${s.id},this.checked)">${s.label}</label>`).join('')}
    <label class="snchk" style="color:var(--dim);font-style:italic"><input type="checkbox" ${!(ix.seasons?.length) ? 'checked' : ''} onchange="if(this.checked)clrIxSns(${i})">All</label>
  </div></div>`;
  const rqList = `<div><div class="ixlbl">🔧 Required items: <button class="btn" style="padding:1px 5px;font-size:.6rem;margin-left:4px" onclick="addIxRq(${i})">+ Add</button></div>
    <div class="rqlist" id="rql_${i}">
      ${(ix.requires || []).map((r, ri) => `<div class="rqrow">
        <select class="fi" onchange="updIxRq(${i},${ri},this.value)">
          <option value="">— select —</option>
          ${world.entities.filter(e => e.id !== ent.id).map(e => `<option value="${e.id}" ${r === e.id ? 'selected' : ''}>${CICONS[e.category] || ''} ${e.name}</option>`).join('')}
        </select>
        <button class="btn danger" style="padding:1px 5px;font-size:.65rem;flex-shrink:0" onclick="remIxRq(${i},${ri})">✕</button>
      </div>`).join('')}
      ${!(ix.requires || []).length ? '<div class="fhint">None — always available</div>' : ''}
    </div>
    <label class="crow" style="margin-top:4px"><input type="checkbox" ${ix.consume_requires !== false ? 'checked' : ''} onchange="updIx(${i},'consume_requires',this.checked)"><span>Consume required items on use</span></label>
  </div>`;
  const respawnF = (ix.action === 'harvest' || ix.action === 'collect') ? `
    <div style="display:flex;flex-direction:column;gap:6px;padding:8px;background:rgba(0,0,0,.2);border-radius:var(--r)">
      <label class="crow"><input type="checkbox" ${ix.respawn ? 'checked' : ''} onchange="updIx(${i},'respawn',this.checked);renderEntityForm()"><span>Respawn after this action</span></label>
      ${ix.respawn ? `<div class="fg"><div class="fl">Respawn after (hours)</div><input class="fi" type="number" min="0" step="0.5" value="${ix.respawn_hours || 24}" oninput="updIx(${i},'respawn_hours',parseFloat(this.value)||24)"></div>` : ''}
    </div>`: '';
  const elevateF = `<label class="crow" style="padding:4px 0">
    <input type="checkbox" ${ix.elevate ? 'checked' : ''} onchange="updIx(${i},'elevate',this.checked)">
    <span>⬆ Elevate to next state after this action</span>
  </label>`;
  const rewardF = ix.action !== 'dialog' ? `<div class="fg"><div class="ixlbl">🎁 Reward</div><input class="fi" placeholder="entity id, name, or e.g. 10_coins" value="${ix.reward || ''}" oninput="updIx(${i},'reward',this.value)"></div>` : '';
  const dlgF = ix.action === 'dialog' ? `<div style="display:flex;align-items:center;gap:6px;padding:6px;background:var(--bg);border:1px solid var(--border);border-radius:var(--r)">
    <span style="font-size:.72rem;color:var(--dim);flex:1">${ix.dialog_id ? `Dialog: ${ix.dialog_id}` : 'No dialog tree yet'}</span>
    <button class="btn primary" style="padding:3px 10px;font-size:.68rem" onclick="openDlgEditor('${ent.id}',${i})">✎ Edit</button>
  </div>`: '';
  const combNote = ix.action === 'combine' ? `<div class="fhint">Required items = ingredients. Reward = output entity. Enable "consume" to use them up.</div>` : '';
  const soundF = `<div style="display:flex;align-items:center;gap:6px">
    <div class="ixlbl" style="white-space:nowrap">🔔 Sound:</div>
    <input class="fi" style="flex:1;font-size:.75rem" placeholder="URL or leave blank" value="${ix.sound || ''}" oninput="updIx(${i},'sound',this.value)">
    <button class="btn" style="padding:2px 6px;font-size:.7rem;flex-shrink:0" onclick="pickFile('audio/*',f=>loadIxSnd(f,${i}))" title="Upload">📁</button>
  </div>`;
  return `<div class="ixrow" data-i="${i}">
    <div class="ixtop">
      <select class="fi" style="flex:1" onchange="updIx(${i},'trigger',this.value)">${TRIGGERS.map(t => `<option value="${t}" ${ix.trigger === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <select class="fi" style="flex:1" onchange="updIx(${i},'action',this.value);renderEntityForm()">${ACTIONS.map(a => `<option value="${a}" ${ix.action === a ? 'selected' : ''}>${a}</option>`).join('')}</select>
      <button class="btn danger" style="padding:2px 6px;font-size:.7rem" onclick="remIx(${i})">✕</button>
    </div>
    ${dlgF}${combNote}${rewardF}${elevateF}${rqList}${respawnF}${objStChks}${stChks}${snChks}${soundF}
  </div>`;
}

// ENTITY FORM HELPERS
function togZ(z, el) { el.classList.toggle('active'); const i = _ezones.indexOf(z); if (i === -1) _ezones.push(z); else _ezones.splice(i, 1); }
function togS(s, el) { el.classList.toggle('active'); const i = _eseasons.indexOf(s); if (i === -1) _eseasons.push(s); else _eseasons.splice(i, 1); }
function addState() { const e = world.entities.find(e => e.id === activeEntityId); if (!e) return; if (!e.states) e.states = []; e.states.push({ id: 'state_' + (e.states.length + 1), label: 'New State', sprite: null, duration_hours: null, visible: true }); renderEntityForm(); }
function remSt(i) { const e = world.entities.find(en => en.id === activeEntityId); if (e?.states) { e.states.splice(i, 1); renderEntityForm(); } }
function updSt(i, k, v) { const e = world.entities.find(en => en.id === activeEntityId); if (e?.states?.[i]) e.states[i][k] = v; }
function addIx() { const e = world.entities.find(en => en.id === activeEntityId); if (!e) return; if (!e.interactions) e.interactions = []; e.interactions.push({ trigger: 'click', action: 'collect', reward: '', requires: [], consume_requires: true, required_states: [], required_obj_states: [], seasons: [], respawn: false, respawn_hours: 24, elevate: false, sound: '' }); renderEntityForm(); }
function remIx(i) { const e = world.entities.find(en => en.id === activeEntityId); if (e?.interactions) { e.interactions.splice(i, 1); renderEntityForm(); } }
function updIx(i, k, v) { const e = world.entities.find(en => en.id === activeEntityId); if (e?.interactions?.[i]) e.interactions[i][k] = v; }
function addIxRq(ii) {
  const e = world.entities.find(en => en.id === activeEntityId);
  if (!e?.interactions?.[ii]) return;
  if (!e.interactions[ii].requires) e.interactions[ii].requires = [];
  const ri = e.interactions[ii].requires.length;
  e.interactions[ii].requires.push('');
  // Append row directly without full re-render so the new empty select stays visible
  const list = document.getElementById('rql_' + ii);
  if (!list) { renderEntityForm(); return; }
  const hint = list.querySelector('.fhint');
  if (hint) hint.remove();
  const row = document.createElement('div');
  row.className = 'rqrow';
  row.innerHTML = `<select class="fi" onchange="updIxRq(${ii},${ri},this.value)">
    <option value="">— select item —</option>
    ${world.entities.filter(en => en.id !== e.id).map(en => `<option value="${en.id}">${CICONS[en.category] || ''} ${en.name}</option>`).join('')}
  </select>
  <button class="btn danger" style="padding:1px 5px;font-size:.65rem;flex-shrink:0" onclick="remIxRq(${ii},${ri})">✕</button>`;
  list.appendChild(row);
}
function remIxRq(ii, ri) { const e = world.entities.find(en => en.id === activeEntityId); if (e?.interactions?.[ii]?.requires) { e.interactions[ii].requires.splice(ri, 1); renderEntityForm(); } }
function updIxRq(ii, ri, v) { const e = world.entities.find(en => en.id === activeEntityId); if (e?.interactions?.[ii]?.requires) e.interactions[ii].requires[ri] = v; }
function togIxSt(ii, sid, c) { const e = world.entities.find(en => en.id === activeEntityId); if (!e?.interactions?.[ii]) return; if (!e.interactions[ii].required_states) e.interactions[ii].required_states = []; if (c) { if (!e.interactions[ii].required_states.includes(sid)) e.interactions[ii].required_states.push(sid); } else e.interactions[ii].required_states = e.interactions[ii].required_states.filter(s => s !== sid); renderEntityForm(); }
function clrIxSts(ii) { const e = world.entities.find(en => en.id === activeEntityId); if (e?.interactions?.[ii]) { e.interactions[ii].required_states = []; renderEntityForm(); } }
function togIxSn(ii, sid, c) { const e = world.entities.find(en => en.id === activeEntityId); if (!e?.interactions?.[ii]) return; if (!e.interactions[ii].seasons) e.interactions[ii].seasons = []; if (c) { if (!e.interactions[ii].seasons.includes(sid)) e.interactions[ii].seasons.push(sid); } else e.interactions[ii].seasons = e.interactions[ii].seasons.filter(s => s !== sid); renderEntityForm(); }
function clrIxSns(ii) { const e = world.entities.find(en => en.id === activeEntityId); if (e?.interactions?.[ii]) { e.interactions[ii].seasons = []; renderEntityForm(); } }

function togIxObjSt(ii, sid, checked) {
  const e = world.entities.find(en => en.id === activeEntityId);
  if (!e?.interactions?.[ii]) return;
  if (!e.interactions[ii].required_obj_states) e.interactions[ii].required_obj_states = [];
  if (checked) { if (!e.interactions[ii].required_obj_states.includes(sid)) e.interactions[ii].required_obj_states.push(sid); }
  else e.interactions[ii].required_obj_states = e.interactions[ii].required_obj_states.filter(s => s !== sid);
  renderEntityForm();
}
function clrIxObjSts(ii) { const e = world.entities.find(en => en.id === activeEntityId); if (e?.interactions?.[ii]) { e.interactions[ii].required_obj_states = []; renderEntityForm(); } }

// SPRITE / SOUND HELPERS
function loadSp(file) { const fr = new FileReader(); fr.onload = e => { const ent = world.entities.find(en => en.id === activeEntityId); if (!ent) return; ent.default_sprite = storeAsset(e.target.result); saveWorld(); renderEntityForm(); showToast('Sprite uploaded'); }; fr.readAsDataURL(file); }
function onSpUrl(v) { const ent = world.entities.find(en => en.id === activeEntityId); if (!ent) return; ent.default_sprite = v; const p = document.getElementById('spPrev'); if (p && v) { if (p.tagName === 'IMG') p.src = v; else { const ni = document.createElement('img'); ni.src = v; ni.id = 'spPrev'; p.replaceWith(ni); } } }
function clearSp() { const ent = world.entities.find(en => en.id === activeEntityId); if (!ent) return; ent.default_sprite = ''; saveWorld(); renderEntityForm(); showToast('Sprite removed'); }
function loadStSp(file, i) { const fr = new FileReader(); fr.onload = e => { const ent = world.entities.find(en => en.id === activeEntityId); if (!ent?.states?.[i]) return; ent.states[i].sprite = storeAsset(e.target.result); saveWorld(); renderEntityForm(); showToast(`State ${i} sprite uploaded`); }; fr.readAsDataURL(file); }
function loadAmb(file) { const fr = new FileReader(); fr.onload = e => { const ent = world.entities.find(en => en.id === activeEntityId); if (!ent) return; ent.ambient_sound = storeAsset(e.target.result); saveWorld(); renderEntityForm(); showToast('Ambient sound uploaded'); }; fr.readAsDataURL(file); }
function setAmbUrl(v) { const ent = world.entities.find(en => en.id === activeEntityId); if (ent) ent.ambient_sound = v; }
function clearAmb() { const ent = world.entities.find(en => en.id === activeEntityId); if (!ent) return; ent.ambient_sound = ''; saveWorld(); renderEntityForm(); }
function prvAmb() { const ent = world.entities.find(en => en.id === activeEntityId); if (!ent?.ambient_sound) return; try { new Audio(resolveAsset(ent.ambient_sound)).play(); } catch (e) { showToast('Cannot preview'); } }
function loadIxSnd(file, i) { const fr = new FileReader(); fr.onload = e => { const ent = world.entities.find(en => en.id === activeEntityId); if (ent?.interactions?.[i]) { ent.interactions[i].sound = storeAsset(e.target.result); saveWorld(); showToast('Sound uploaded'); } }; fr.readAsDataURL(file); }

function saveEntity() {
  const e = world.entities.find(en => en.id === activeEntityId); if (!e) return;
  e.name = document.getElementById('eName')?.value || e.name;
  e.category = document.getElementById('eCat')?.value || e.category;
  e.description = document.getElementById('eDesc')?.value || '';
  e.rarity = document.getElementById('eRarity')?.value || 'common';
  e.effect = document.getElementById('eEffect')?.value || '';
  e.tradeable = document.getElementById('eTrade')?.checked || false;
  const spUrl = document.getElementById('eSpUrl')?.value || ''; if (spUrl && !e.default_sprite?.startsWith('ast_')) e.default_sprite = spUrl;
  const ambUrl = document.getElementById('eAmbUrl')?.value || ''; if (ambUrl && !e.ambient_sound?.startsWith('ast_')) e.ambient_sound = ambUrl;
  e.zone_requirements = _ezones.slice().sort((a, b) => a - b);
  e.seasonal_visibility = _eseasons.slice().sort((a, b) => a - b);
  if (e.category === 'minigame') {
    e.game_html = document.getElementById('eGameHtml')?.value || 'cc-game.html';
    e.totalMovesAllowed = parseInt(document.getElementById('eMoveLimit')?.value) || 25;
    e.rewards = {
      diamond: document.getElementById('eRewardDiamond')?.value || '',
      lightning: document.getElementById('eRewardLightning')?.value || '',
      star: document.getElementById('eRewardStar')?.value || ''
    };
  } else {
    delete e.game_html;
    delete e.totalMovesAllowed;
    delete e.rewards;
  }
  e.interactions = (e.interactions || []).map(ix => ({ ...ix, requires: (ix.requires || []).filter(r => r && r !== ''), ...(ix.required_obj_states === undefined ? { required_obj_states: [] } : {}) }));
  saveWorld(); renderEntityList(); showToast(`"${e.name}" saved`);
}
function delEntity() {
  if (!confirm('Delete this entity?')) return;
  world.entities = world.entities.filter(e => e.id !== activeEntityId); activeEntityId = null;
  saveWorld(); renderEntityList(); document.getElementById('entityForm').innerHTML = '<div class="empty-s"><div class="esi">🌾</div><div>Select an entity</div></div>'; showToast('Entity deleted');
}

// NEW ENTITY MODAL
function openNewEntityModal() {
  document.getElementById('modalTitle').textContent = 'New Entity';
  document.getElementById('modalBody').innerHTML = `
    <div class="fg"><div class="fl">Name</div><input class="fi" id="neName" placeholder="e.g. Rusty Watering Can"></div>
    <div class="fg"><div class="fl">Category</div><select class="fi" id="neCat">${Object.keys(CICONS).map(c => `<option value="${c}">${CICONS[c]} ${c}</option>`).join('')}</select></div>
    <div class="fg"><div class="fl">Rarity</div><select class="fi" id="neRar">${['common', 'uncommon', 'rare', 'legendary'].map(r => `<option value="${r}">${r}</option>`).join('')}</select></div>
    <div class="fg"><div class="fl">Description</div><textarea class="fi" id="neDesc" placeholder="Brief flavour text…"></textarea></div>`;
  document.getElementById('modalFoot').innerHTML = `<button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="confirmNewEntity()">Create</button>`;
  openModal(); setTimeout(() => document.getElementById('neName')?.focus(), 100);
}
function confirmNewEntity() {
  const name = document.getElementById('neName').value.trim(); if (!name) { showToast('Enter a name'); return; }
  const ent = {
    id: 'entity_' + Date.now(), name, category: document.getElementById('neCat').value, rarity: document.getElementById('neRar').value,
    description: document.getElementById('neDesc').value, default_sprite: '', ambient_sound: '',
    zone_requirements: [], seasonal_visibility: [], effect: '', tradeable: false,
    game_html: '', totalMovesAllowed: 25, rewards: { diamond: '', lightning: '', star: '' },
    states: [{ id: 'idle', label: 'Idle', sprite: null, duration_hours: null, visible: true }], interactions: []
  };
  world.entities.push(ent); saveWorld(); closeModal(); activeEntityId = ent.id; renderEntityList(); renderEntityForm(); showToast(`"${name}" created`);
}

