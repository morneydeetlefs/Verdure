// ═══════════════════════════════════════════
// MAP LIST
// ═══════════════════════════════════════════
function renderMapList(){
  const el=document.getElementById('mapList');
  if(!world.maps.length){el.innerHTML='<div class="empty-s"><div class="esi">🗺</div><div>No maps yet</div></div>';return;}
  el.innerHTML=world.maps.map(m=>`<div class="litem ${m.id===activeMapId?'active':''}" onclick="selectMap('${m.id}')">
    <span>${m.type==='top-down'?'🗺':'🏠'}</span><span class="ln">${m.name}</span><span class="lm">Z${m.zone}</span>
  </div>`).join('');
}
function selectMap(id){activeMapId=id;selectedObjId=null;selectedMaskId=null;renderMapList();renderCanvas();renderMapProps();}

// ═══════════════════════════════════════════
// CANVAS
// ═══════════════════════════════════════════
function renderCanvas(){
  const map=world.maps.find(m=>m.id===activeMapId);
  const cv=document.getElementById('mapCanvas'),em=document.getElementById('cEmpty');
  if(!map){em.style.display='flex';cv.style.display='none';document.getElementById('cInfo').textContent='No map selected';return;}
  em.style.display='none';cv.style.display='block';
  document.getElementById('cInfo').textContent=`${map.name} · ${map.type} · Zone ${map.zone}`;
  const bg=document.getElementById('mapBg'),ph=document.getElementById('mapBgPh');
  if(map.background){bg.src=resolveAsset(map.background);bg.style.display='block';ph.style.display='none';}
  else{bg.style.display='none';ph.style.display='flex';}
  renderPlacedObjs();renderMasks();
}
function renderPlacedObjs(){
  const map=world.maps.find(m=>m.id===activeMapId);
  const c=document.getElementById('placedObjs');
  if(!map){c.innerHTML='';return;}
  const sorted=[...(map.objects||[])].sort((a,b)=>(a.z_order||0)-(b.z_order||0));
  c.innerHTML=sorted.map(obj=>{
    const ent=world.entities.find(e=>e.id===obj.entity_id);
    const sz=obj.size||48,lbl=obj.label||ent?.name||obj.type||'obj';
    const sel=obj.id===selectedObjId,rot=obj.rotation||0;
    const ac=ANIMS.includes(obj.animation)&&obj.animation!=='none'?`anim-${obj.animation}`:'';
    const ot=`translate(-50%,-50%)${rot?` rotate(${rot}deg)`:''}`;
    const curSt=obj.state||'idle',stDef=ent?.states?.find(s=>s.id===curSt);
    const spKey=stDef?.sprite||ent?.default_sprite||'',spUrl=resolveAsset(spKey);
    const vis=spUrl?`<img class="osprite" src="${spUrl}" style="width:${sz}px;height:${sz}px" draggable="false">`
      :`<div class="oicon" style="width:${sz}px;height:${sz}px;font-size:${Math.round(sz*.5)}px">${ent?(CICONS[ent.category]||'📦'):(isPortal(obj)?'🚪':'📦')}</div>`;
    return `<div class="pobj${sel?' sel':''}" style="left:${obj.x*100}%;top:${obj.y*100}%;z-index:${obj.z_order||10};transform:${ot}"
        onclick="selObj(event,'${obj.id}')" onmousedown="startDrag(event,'${obj.id}')">
      <div class="oawrap ${ac}">${vis}<div class="olabel">${lbl}</div></div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════
// TOOLS
// ═══════════════════════════════════════════
function setTool(t){
  activeTool=t;
  document.querySelectorAll('.tbtn').forEach(b=>b.classList.remove('active'));
  const m={select:'tSelect',place:'tPlace',portal:'tPortal',mask:'tMask'};
  if(m[t])document.getElementById(m[t]).classList.add('active');
  if(t!=='mask')cancelMaskDraw();
}
function selObj(e,id){
  e.stopPropagation();if(activeTool!=='select')return;
  selectedObjId=id;selectedMaskId=null;renderPlacedObjs();renderObjProps();
}
document.getElementById('mapCanvas').addEventListener('click',function(e){
  if(activeTool==='place'){const r=this.getBoundingClientRect();openPlaceModal((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);}
  if(activeTool==='portal'){const r=this.getBoundingClientRect();addPortal((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);}
  if(activeTool==='mask')addMaskPt(e);
  if(activeTool==='select'&&(e.target===this||e.target.id==='mapBg'||e.target.id==='mapBgPh')){selectedObjId=null;selectedMaskId=null;renderPlacedObjs();renderMapProps();}
});

// DRAG
function startDrag(e,id){
  if(activeTool!=='select')return;
  const cv=document.getElementById('mapCanvas'),r=cv.getBoundingClientRect();
  const map=world.maps.find(m=>m.id===activeMapId),obj=map?.objects?.find(o=>o.id===id);
  if(!obj)return;
  _dragState={id,sx:e.clientX,sy:e.clientY,ox:obj.x,oy:obj.y,r};e.stopPropagation();
}
document.addEventListener('mousemove',e=>{
  if(!_dragState)return;
  const dx=(e.clientX-_dragState.sx)/_dragState.r.width,dy=(e.clientY-_dragState.sy)/_dragState.r.height;
  const map=world.maps.find(m=>m.id===activeMapId),obj=map?.objects?.find(o=>o.id===_dragState.id);
  if(!obj)return;
  obj.x=Math.max(0,Math.min(1,_dragState.ox+dx));obj.y=Math.max(0,Math.min(1,_dragState.oy+dy));
  renderPlacedObjs();
});
document.addEventListener('mouseup',()=>{if(_dragState){saveWorld();_dragState=null;}});

// BACKGROUND
function loadBg(file){
  const fr=new FileReader();fr.onload=ev=>{const map=world.maps.find(m=>m.id===activeMapId);if(!map)return;map.background=storeAsset(ev.target.result);saveWorld();renderCanvas();showToast('Background updated');};fr.readAsDataURL(file);
}
function clearBg(){const map=world.maps.find(m=>m.id===activeMapId);if(!map)return;map.background=null;saveWorld();renderCanvas();showToast('Background cleared');}

// ═══════════════════════════════════════════
// PROPERTIES PANELS
// ═══════════════════════════════════════════
function renderMapProps(){
  const map=world.maps.find(m=>m.id===activeMapId);
  const pb=document.getElementById('propsBody'),pf=document.getElementById('propsFooter');
  if(!map){pb.innerHTML='<div class="empty-s"><div class="esi">🗺</div><div>Select a map or object</div></div>';pf.style.display='none';return;}
  pf.style.display='flex';
  pb.innerHTML=`
    <div class="fg"><div class="fl">Map Name</div><input class="fi" id="pName" value="${map.name}"></div>
    <div class="fg"><div class="fl">Type</div><select class="fi" id="pType">
      <option value="top-down" ${map.type==='top-down'?'selected':''}>Top-down</option>
      <option value="side-view" ${map.type==='side-view'?'selected':''}>Side-view</option></select></div>
    <div class="fg"><div class="fl">Climate Zone</div>
      <div class="zgrid">${[...Array(12)].map((_,i)=>`<div class="chip ${map.zone===i+1?'active':''}" onclick="setMapZ(${i+1},this)">${i+1}</div>`).join('')}</div></div>
    <div class="fg"><div class="fl">Blight (0–100)</div><input class="fi" id="pBlight" type="number" min="0" max="100" value="${map.blight_level||0}"></div>
    <div class="fg"><div class="fl">Description</div><textarea class="fi" id="pDesc">${map.description||''}</textarea></div>
    <div class="fhint">${(map.objects||[]).length} objects · ${(map.portals||[]).length} portals · ${(map.masks||[]).length} masks</div>
    ${_portalList(map)}${_maskList(map)}`;
}
let _pMapZone=null;
function setMapZ(z,el){_pMapZone=z;document.querySelectorAll('#propsBody .chip').forEach(c=>c.classList.remove('active'));el.classList.add('active');}

function _portalList(map){
  if(!(map.portals||[]).length)return'';
  return`<div class="fsec"><div class="fsech">Portals</div><div class="fsecb">${
    map.portals.map(p=>`<div style="display:flex;gap:6px;align-items:center">
      <div style="flex:1;font-size:.78rem">${p.label||'Portal'}</div>
      <select class="fi" style="flex:1;font-size:.72rem" onchange="updPortal('${p.id}',this.value)">
        <option value="">— unlinked —</option>
        ${world.maps.filter(m=>m.id!==activeMapId).map(m=>`<option value="${m.id}" ${p.to===m.id?'selected':''}>${m.name}</option>`).join('')}
      </select></div>`).join('')
  }</div></div>`;
}
function updPortal(pid,toId){const map=world.maps.find(m=>m.id===activeMapId);const p=(map?.portals||[]).find(p=>p.id===pid);if(p){p.to=toId;saveWorld();}}

function _maskList(map){
  if(!(map.masks||[]).length)return'';
  return`<div class="fsec"><div class="fsech">Masks</div><div class="fsecb">${
    map.masks.map(m=>`<div style="display:flex;gap:6px;align-items:center">
      <div style="width:10px;height:10px;border-radius:2px;background:${MASK_TYPES[m.type]?.color||'grey'};flex-shrink:0"></div>
      <div style="flex:1;font-size:.78rem">${m.label||MASK_TYPES[m.type]?.label||m.type}</div>
      <div class="fhint">${m.points.length}pts</div>
      <button class="btn danger" style="padding:1px 5px;font-size:.65rem" onclick="delMask('${m.id}')">✕</button>
    </div>`).join('')
  }</div></div>`;
}
function delMask(id){const map=world.maps.find(m=>m.id===activeMapId);if(!map)return;map.masks=(map.masks||[]).filter(m=>m.id!==id);saveWorld();renderCanvas();renderMapProps();showToast('Mask deleted');}

function applyProps(){
  if(selectedObjId){applyObjProps();return;}
  const map=world.maps.find(m=>m.id===activeMapId);if(!map)return;
  const name=document.getElementById('pName')?.value?.trim();if(!name){showToast('Map name required');return;}
  map.name=name;map.type=document.getElementById('pType')?.value||map.type;
  if(_pMapZone)map.zone=_pMapZone;_pMapZone=null;
  map.blight_level=parseInt(document.getElementById('pBlight')?.value)||0;
  map.description=document.getElementById('pDesc')?.value||'';
  saveWorld();renderMapList();renderCanvas();showToast(`"${map.name}" updated`);
}

function renderObjProps(){
  const map=world.maps.find(m=>m.id===activeMapId);if(!map)return;
  const obj=(map.objects||[]).find(o=>o.id===selectedObjId);if(!obj)return;
  const ent=world.entities.find(e=>e.id===obj.entity_id);
  const pb=document.getElementById('propsBody');document.getElementById('propsFooter').style.display='flex';
  const stOpts=(ent?.states||[{id:'idle',label:'Idle'}]).map(s=>`<option value="${s.id}" ${obj.state===s.id?'selected':''}>${s.label||s.id}</option>`).join('');
  pb.innerHTML=`
    <div class="fhint" style="color:var(--sprout)">${ent?.name||obj.type||'Object'}</div>
    <div class="fg"><div class="fl">Label</div><input class="fi" id="pObjLbl" value="${obj.label||''}"></div>
    <div class="fg"><div class="fl">Initial State</div><select class="fi" id="pObjSt">${stOpts}</select></div>
    <div class="fg"><div class="fl">Size (px)</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="range" min="16" max="256" value="${obj.size||48}" style="flex:1;accent-color:var(--sprout)" oninput="prvSize(this.value)">
        <input class="fi" id="pObjSz" type="number" min="16" max="256" value="${obj.size||48}" style="width:64px" oninput="prvSize(this.value)">
      </div></div>
    <div class="fg"><div class="fl">Z-Order</div><input class="fi" id="pObjZ" type="number" min="1" max="100" value="${obj.z_order||10}"></div>
    <div class="fg"><div class="fl">Rotation (°)</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="range" id="pRotR" min="0" max="360" value="${obj.rotation||0}" style="flex:1;accent-color:var(--sprout)" oninput="prvRot(this.value)">
        <input class="fi" id="pRotN" type="number" min="0" max="360" value="${obj.rotation||0}" style="width:64px" oninput="prvRot(this.value)">
      </div></div>
    <div class="fg"><div class="fl">Animation</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">
        ${ANIMS.map(a=>`<div class="tag ${obj.animation===a?'active':''}" onclick="setAnim('${a}',this)">${a}</div>`).join('')}
      </div></div>
    <div class="fg"><div class="fl">Notes</div><textarea class="fi" id="pNotes" style="min-height:48px">${obj.notes||''}</textarea></div>
    ${isPortal(obj)?_portalObjProps(obj):''}`;
}
function _portalObjProps(obj){
  const map=world.maps.find(m=>m.id===activeMapId);
  const p=(map?.portals||[]).find(p=>p.id===obj.portal_id);
  return`<div class="fg"><div class="fl">Portal Target</div>
    <select class="fi" id="pPTgt"><option value="">— unlinked —</option>
      ${world.maps.filter(m=>m.id!==activeMapId).map(m=>`<option value="${m.id}" ${p?.to===m.id?'selected':''}>${m.name}</option>`).join('')}
    </select></div>
    <div class="fg"><div class="fl">Requires Level</div><input class="fi" id="pPLvl" type="number" min="0" value="${p?.requires_level||0}"></div>`;
}
function applyObjProps(){
  const map=world.maps.find(m=>m.id===activeMapId);if(!map)return;
  const obj=(map.objects||[]).find(o=>o.id===selectedObjId);if(!obj)return;
  obj.label=document.getElementById('pObjLbl')?.value||'';
  obj.state=document.getElementById('pObjSt')?.value||obj.state;
  obj.size=parseInt(document.getElementById('pObjSz')?.value)||48;
  obj.z_order=parseInt(document.getElementById('pObjZ')?.value)||10;
  obj.rotation=parseInt(document.getElementById('pRotN')?.value)||0;
  obj.notes=document.getElementById('pNotes')?.value||'';
  if(isPortal(obj)){
    const p=(map.portals||[]).find(p=>p.id===obj.portal_id);
    if(p){p.to=document.getElementById('pPTgt')?.value||null;p.requires_level=parseInt(document.getElementById('pPLvl')?.value)||0;}
  }
  saveWorld();renderPlacedObjs();showToast('Object updated');
}
function deleteSelected(){
  const map=world.maps.find(m=>m.id===activeMapId);if(!map)return;
  if(selectedObjId){
    const obj=map.objects?.find(o=>o.id===selectedObjId);
    if(obj?.portal_id)map.portals=(map.portals||[]).filter(p=>p.id!==obj.portal_id);
    map.objects=(map.objects||[]).filter(o=>o.id!==selectedObjId);
    selectedObjId=null;saveWorld();renderCanvas();renderMapProps();showToast('Object deleted');
  } else {
    if(!confirm('Delete this map?'))return;
    world.maps=world.maps.filter(m=>m.id!==activeMapId);activeMapId=null;
    saveWorld();renderMapList();renderCanvas();
    document.getElementById('propsBody').innerHTML='<div class="empty-s"><div class="esi">🗺</div><div>Select a map</div></div>';
    document.getElementById('propsFooter').style.display='none';showToast('Map deleted');
  }
}
function prvSize(v){const obj=world.maps.find(m=>m.id===activeMapId)?.objects?.find(o=>o.id===selectedObjId);if(!obj)return;obj.size=parseInt(v)||48;const i=document.getElementById('pObjSz');if(i)i.value=v;renderPlacedObjs();}
function prvRot(v){const obj=world.maps.find(m=>m.id===activeMapId)?.objects?.find(o=>o.id===selectedObjId);if(!obj)return;obj.rotation=parseInt(v)||0;document.getElementById('pRotR').value=v;document.getElementById('pRotN').value=v;renderPlacedObjs();}
function setAnim(a,el){const obj=world.maps.find(m=>m.id===activeMapId)?.objects?.find(o=>o.id===selectedObjId);if(!obj)return;obj.animation=a;document.querySelectorAll('#propsBody .tag').forEach(t=>t.classList.remove('active'));el.classList.add('active');renderPlacedObjs();}
function isPortal(obj){if(obj?.type==='portal')return true;return world.entities.find(e=>e.id===obj?.entity_id)?.category==='portal';}

// PORTAL TOOL
function addPortal(x,y){
  const map=world.maps.find(m=>m.id===activeMapId);if(!map)return;
  document.getElementById('modalTitle').textContent='Add Portal';
  document.getElementById('modalBody').innerHTML=`
    <div class="fg"><div class="fl">Label</div><input class="fi" id="pLbl" placeholder="e.g. Garden Gate"></div>
    <div class="fg"><div class="fl">Links to Map</div><select class="fi" id="pTgt">
      <option value="">— unlinked —</option>
      ${world.maps.filter(m=>m.id!==activeMapId).map(m=>`<option value="${m.id}">${m.name}</option>`).join('')}
    </select></div>
    <div class="fg"><div class="fl">Requires Level</div><input class="fi" id="pLvl" type="number" min="0" value="0"></div>`;
  document.getElementById('modalFoot').innerHTML=`<button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="confirmPortal(${x},${y})">Add Portal</button>`;
  openModal();
}
function confirmPortal(x,y){
  const map=world.maps.find(m=>m.id===activeMapId);if(!map)return;
  if(!map.portals)map.portals=[];if(!map.objects)map.objects=[];
  const lbl=document.getElementById('pLbl').value||'Portal',to=document.getElementById('pTgt').value||null,lvl=parseInt(document.getElementById('pLvl').value)||0;
  const pid='portal_'+Date.now();
  map.portals.push({id:pid,to,label:lbl,requires_level:lvl,x,y});
  map.objects.push({id:'obj_'+Date.now(),entity_id:null,type:'portal',label:lbl,x,y,state:'idle',size:52,z_order:20,rotation:0,animation:'none',portal_id:pid,notes:''});
  saveWorld();renderCanvas();renderMapProps();closeModal();showToast('Portal added');
}

// NEW MAP MODAL
function openNewMapModal(){
  _newMapZone=6;
  document.getElementById('modalTitle').textContent='New Map';
  document.getElementById('modalBody').innerHTML=`
    <div class="fg"><div class="fl">Name</div><input class="fi" id="nmName" placeholder="e.g. Abandoned Lot"></div>
    <div class="fg"><div class="fl">Type</div><select class="fi" id="nmType">
      <option value="top-down">Top-down (outdoor)</option>
      <option value="side-view">Side-view (indoor)</option></select></div>
    <div class="fg"><div class="fl">Climate Zone</div>
      <div class="zgrid">${[...Array(12)].map((_,i)=>`<div class="chip ${i===5?'active':''}" onclick="pickNMZ(${i+1},this)">${i+1}</div>`).join('')}</div></div>
    <div class="fg"><div class="fl">Blight Level (0–100)</div><input class="fi" id="nmBlight" type="number" min="0" max="100" value="75"></div>
    <div class="fg"><div class="fl">Description</div><textarea class="fi" id="nmDesc" placeholder="Brief description…"></textarea></div>`;
  document.getElementById('modalFoot').innerHTML=`<button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="confirmNewMap()">Create Map</button>`;
  openModal();
}
function pickNMZ(z,el){_newMapZone=z;document.querySelectorAll('#modalBody .chip').forEach(c=>c.classList.remove('active'));el.classList.add('active');}
function confirmNewMap(){
  const name=document.getElementById('nmName').value.trim();if(!name){showToast('Enter a map name');return;}
  const map={id:'map_'+Date.now(),name,type:document.getElementById('nmType').value,zone:_newMapZone,
    blight_level:parseInt(document.getElementById('nmBlight').value)||75,
    description:document.getElementById('nmDesc').value,background:null,portals:[],masks:[],objects:[]};
  world.maps.push(map);saveWorld();closeModal();selectMap(map.id);showToast(`Map "${name}" created`);
}

