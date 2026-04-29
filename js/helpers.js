// HELPERS
// ═══════════════════════════════════════════════════════════════
function isPortal(obj) {
  if (obj.type==='portal') return true;
  return world.entities?.find(e=>e.id===obj.entity_id)?.category === 'portal';
}
function showBanner(name) {
  const b = document.getElementById('mapBanner');
  b.textContent = name; b.classList.add('show');
  setTimeout(()=>b.classList.remove('show'), 2200);
}
function show(id) { document.getElementById(id).style.display = 'flex'; }
function hide(id) { document.getElementById(id).style.display = 'none'; }
function setText(id, txt) { const el=document.getElementById(id); if(el) el.textContent=txt; }
function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast show'+(type?' '+type:'');
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>t.classList.remove('show'), 2500);
}
function spawnParticle(x, y, content, xp=false) {
  const p = document.createElement('div');
  p.className = xp ? 'xp-particle' : 'particle';
  p.textContent = content; p.style.left=(x-12)+'px'; p.style.top=(y-12)+'px';
  document.body.appendChild(p); setTimeout(()=>p.remove(), 1500);
}
function spawnXP(x, y, amt) { spawnParticle(x, y, `+${amt} XP`, true); }

// ═══════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════
init();
