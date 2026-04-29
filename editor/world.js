// ═══════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════
function saveWorld(){localStorage.setItem('verdure_world',JSON.stringify(world));}
function loadWorld(){
  try{const s=localStorage.getItem('verdure_world');
    if(s){const w=JSON.parse(s);if(w.maps&&w.entities){world=w;if(!world.assets)world.assets={};if(!world.dialogs)world.dialogs=[];}}}
  catch(e){}
}

// ═══════════════════════════════════════════
// ASSET LIBRARY
// ═══════════════════════════════════════════
function assetKey(b64){
  // Hash spread across the full base64 string — not just the header bytes
  // (all PNGs share the same first ~100 chars, so we must sample the whole file)
  const data = b64.slice(b64.indexOf(',') + 1); // strip "data:image/png;base64,"
  const len  = data.length;
  let hash = 0;
  // Sample every ~100th character across the full string for speed + uniqueness
  const step = Math.max(1, Math.floor(len / 200));
  for (let i = 0; i < len; i += step) {
    hash = ((hash << 5) - hash + data.charCodeAt(i)) >>> 0;
  }
  // Also include length so files that differ only at the end are distinct
  hash = ((hash << 5) - hash + len) >>> 0;
  return 'ast_' + hash.toString(36).padStart(7,'0') + len.toString(36).slice(-4);
}
function storeAsset(b64){
  if(!b64||!b64.startsWith('data:'))return b64;
  const k=assetKey(b64);world.assets[k]=b64;return k;
}
function resolveAsset(keyOrUrl){
  if(!keyOrUrl)return '';
  if(keyOrUrl.startsWith('data:')||keyOrUrl.startsWith('http')||keyOrUrl.startsWith('/')||keyOrUrl.startsWith('.'))return keyOrUrl;
  return world.assets[keyOrUrl]||'';
}
function pruneAssets(){
  const used=new Set();
  world.entities.forEach(e=>{
    if(e.default_sprite)used.add(e.default_sprite);
    if(e.ambient_sound)used.add(e.ambient_sound);
    (e.states||[]).forEach(s=>{if(s.sprite)used.add(s.sprite);});
    (e.interactions||[]).forEach(ix=>{if(ix.sound)used.add(ix.sound);});
  });
  world.maps.forEach(m=>{if(m.background)used.add(m.background);});
  Object.keys(world.assets).forEach(k=>{if(!used.has(k))delete world.assets[k];});
}
function renderAssetGrid(){
  const g=document.getElementById('assetGrid');
  const keys=Object.keys(world.assets);
  if(!keys.length){g.innerHTML='<div class="fhint">No assets yet. Upload images or audio from the Entities tab.</div>';return;}
  g.innerHTML=keys.map(k=>{
    const v=world.assets[k];
    const isImg=v.startsWith('data:image'),isAud=v.startsWith('data:audio');
    return `<div class="acard">
      ${isImg?`<img src="${v}" alt="${k}">`:`<div style="font-size:2.5rem">${isAud?'🔊':'📄'}</div>`}
      <div class="akey">${k}</div>
      ${isAud?`<button class="btn" style="padding:1px 6px;font-size:.6rem" onclick="prevAudio('${k}')">▶</button>`:''}
      <button class="btn danger" style="padding:1px 6px;font-size:.6rem" onclick="delAsset('${k}')">✕ Remove</button>
    </div>`;
  }).join('');
}
function delAsset(k){if(!confirm('Remove asset? Entities using it will lose the image/audio.'))return;delete world.assets[k];saveWorld();renderAssetGrid();showToast('Asset removed');}
function prevAudio(k){try{new Audio(resolveAsset(k)).play();}catch(e){}}
function addAssetManual(){
  const inp=document.createElement('input');inp.type='file';inp.accept='image/*,audio/*';
  inp.onchange=e=>{const f=e.target.files[0];if(!f)return;const fr=new FileReader();fr.onload=ev=>{storeAsset(ev.target.result);saveWorld();renderAssetGrid();showToast('Asset stored');};fr.readAsDataURL(f);};
  inp.click();
}

// ═══════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════
function switchTab(t){
  ['maps','entities','assets','json'].forEach(x=>{
    document.getElementById(x+'Tab').style.display=x===t?'flex':'none';
    document.getElementById('tab'+x.charAt(0).toUpperCase()+x.slice(1)).classList.toggle('active',x===t);
  });
  if(t==='assets')renderAssetGrid();
  if(t==='json')renderJson();
}

