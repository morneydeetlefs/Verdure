// RENDERING
// ═══════════════════════════════════════════════════════════════
function renderObjects(map) {
  const layer = document.getElementById('objectLayer');
  layer.innerHTML = '';
  const os = player.map_states[map.id] || {};
  const sorted = [...(map.objects||[])].sort((a,b)=>(a.z_order||0)-(b.z_order||0));

  sorted.forEach(obj => {
    const entity = world.entities?.find(e=>e.id===obj.entity_id);
    if (!entity && !isPortal(obj)) return;

    const state = os[obj.id]?.state || obj.state || (entity?.states?.[0]?.id || 'idle');

    // Hidden objects: new schema uses state.visible=false, old schema used entity.hidden
    const stateDef    = entity?.states?.find(s => s.id === state);
    const firstState  = entity?.states?.[0];
    const isHidden    = stateDef?.visible === false ||
                        (entity?.hidden && !os[obj.id]?.revealed);
    if (isHidden && !os[obj.id]?.revealed) return;

    // Collected objects: hide if collected and no respawn on any interaction
    const hasRespawn = (entity?.interactions||[]).some(ix => ix.respawn) || entity?.respawn;
    if (os[obj.id]?.collected && !hasRespawn) return;
    const size    = obj.size || 48;
    const rot     = obj.rotation || 0;
    const label   = obj.label || entity?.name || (isPortal(obj)?'Portal':'Object');
    const animCls = ANIM_CLASSES.has(obj.animation) ? 'anim-'+obj.animation : '';

    // Outer div: position + translate(-50%,-50%) + rotation — NEVER animated
    const el = document.createElement('div');
    el.className = 'game-object';
    el.dataset.objId = obj.id;
    el.style.cssText = `left:${obj.x*100}%;top:${obj.y*100}%;z-index:${obj.z_order||10};transform:translate(-50%,-50%)${rot?` rotate(${rot}deg)`:''}`;

    // Inner div: animation only — never translates
    const inner = document.createElement('div');
    inner.className = 'obj-inner' + (animCls ? ' '+animCls : '');

    // Visual — resolve sprite via asset library
    // New schema: state.sprite or entity.default_sprite (asset key or URL)
    // Old schema fallback: entity.sprite (raw base64)
    const vis = document.createElement('div');
    vis.className = 'obj-visual'; vis.style.position = 'relative';
    const stDef   = entity?.states?.find(s => s.id === state);
    const spKey   = stDef?.sprite || entity?.default_sprite || entity?.sprite || '';
    const spUrl   = resolveAsset(spKey);
    if (spUrl) {
      const img = document.createElement('img');
      img.className = 'obj-sprite';
      img.src = spUrl; img.draggable = false;
      img.style.width = img.style.height = size+'px';
      vis.appendChild(img);
    } else {
      const ic = document.createElement('div');
      ic.className = 'obj-icon';
      ic.style.cssText = `width:${size}px;height:${size}px;font-size:${Math.round(size*.5)}px`;
      ic.textContent = entity ? (CAT_ICON[entity.category]||'📦') : '🚪';
      vis.appendChild(ic);
    }

    // Grow badge
    const planted = os[obj.id]?.planted_at;
    if (planted && entity?.grow_time_hours > 0) {
      const growMs = entity.grow_time_hours * 3600000 / (entity.growth_speed_multiplier||1);
      const remain = growMs - (Date.now()-planted);
      if (remain > 0) {
        const badge = document.createElement('div');
        badge.className = 'obj-badge';
        badge.dataset.plantedAt = planted;
        badge.dataset.growMs    = growMs;
        badge.textContent = formatDur(remain);
        vis.appendChild(badge);
      }
    }

    // State dot (non-idle, non-collected)
    const states = entity?.states || [{id:'idle'}];
    const stIdx  = states.findIndex(s=>s.id===state);
    if (stIdx > 0 && stIdx < states.length-1) {
      const dot = document.createElement('div');
      dot.className = 'obj-dot';
      vis.appendChild(dot);
    }

    inner.appendChild(vis);
    const lbl = document.createElement('div');
    lbl.className = 'obj-label';
    lbl.textContent = showLabels ? label : '';
    inner.appendChild(lbl);

    el.appendChild(inner);
    el.addEventListener('click', ev => { ev.stopPropagation(); handleClick(obj, entity, el); });
    layer.appendChild(el);
  });
}

function renderMaskOverlay(map) {
  const svg = document.getElementById('maskOverlay');
  svg.innerHTML = '';
  if (!showMasks || !map.masks?.length) return;
  const area = document.getElementById('contentArea');
  const w = area.clientWidth, h = area.clientHeight;
  map.masks.forEach(mask => {
    const color = MASK_COLOR[mask.type] || 'rgba(180,100,100,.2)';
    const pts   = mask.points.map(p=>`${p.x*w},${p.y*h}`).join(' ');
    const poly  = document.createElementNS('http://www.w3.org/2000/svg','polygon');
    poly.setAttribute('points',pts); poly.setAttribute('fill',color);
    poly.setAttribute('stroke','rgba(255,255,255,.2)'); poly.setAttribute('stroke-width','1');
    svg.appendChild(poly);
  });
}

// ═══════════════════════════════════════════════════════════════
