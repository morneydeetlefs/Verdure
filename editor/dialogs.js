// ═══════════════════════════════════════════
// DIALOG EDITOR
// ═══════════════════════════════════════════
function openDlgEditor(eid,ixIdx){
  const ent=world.entities.find(e=>e.id===eid);if(!ent)return;
  const ix=ent.interactions[ixIdx];if(!ix)return;
  if(!ix.dialog_id){
    if(!world.dialogs)world.dialogs=[];
    const dlg={id:'dlg_'+Date.now(),name:`${ent.name} dialog`,start_node:'node_start',
      nodes:[{id:'node_start',speaker:ent.name,text:'Hello, traveller.',x:40,y:40,choices:[{id:'c1',text:'Hello!',next:null,reward:''}]}]};
    world.dialogs.push(dlg);ix.dialog_id=dlg.id;saveWorld();
  }
  activeDlgId=ix.dialog_id;activeDlgNodeId=null;_renderDlgModal(eid,ixIdx);
}
function _renderDlgModal(eid,ixIdx){
  const dlg=(world.dialogs||[]).find(d=>d.id===activeDlgId);if(!dlg)return;
  document.getElementById('theModal').classList.add('modal-fs');
  document.getElementById('modalTitle').textContent=`Dialog: ${dlg.name}`;
  const mb=document.getElementById('modalBody');mb.style.cssText='padding:0;overflow:hidden;display:flex;flex-direction:column;height:100%';
  mb.innerHTML=`<div class="dlgws"><div class="dlgtb">
    <button class="btn primary" onclick="addDlgNode()">+ Node</button>
    <button class="btn" onclick="autoLayoutDlg()">Auto Layout</button>
    <div style="flex:1"></div>
    <span style="font-family:DM Mono, monospace;font-size:.68rem;color:var(--dim)">${dlg.nodes.length} nodes · click to edit · drag to move</span>
  </div>
  <div class="dlgma">
    <div class="dlgcv" id="dlgCv"><svg class="dlgsvg" id="dlgSvg"></svg>${dlg.nodes.map(n=>_dlgNodeHtml(n,dlg)).join('')}</div>
    <div class="dnep"><div class="deph">Node Properties</div><div class="depb" id="dlgEd"><div style="font-size:.78rem;color:var(--dim)">Click a node to edit.</div></div></div>
  </div></div>`;
  document.getElementById('modalFoot').innerHTML=`<button class="btn primary" onclick="closeDlgEditor('${eid}',${ixIdx})">Done</button>`;
  openModal();requestAnimationFrame(()=>{_bindDlgDrag();_drawDlgConns();});
}
function _dlgNodeHtml(n,dlg){
  return`<div class="dnode ${dlg.start_node===n.id?'start':''}" id="dn_${n.id}" style="left:${n.x}px;top:${n.y}px" onclick="selDlgNode('${n.id}')">
    <div class="dnh"><span>${dlg.start_node===n.id?'⭐ ':''}${n.id}</span><span style="cursor:pointer;color:var(--rust)" onclick="delDlgNode('${n.id}');event.stopPropagation()">✕</span></div>
    ${n.speaker?`<div style="font-family:DM Mono, monospace;font-size:.6rem;color:var(--sprout)">${n.speaker}</div>`:''}
    <div class="dnt">${n.text||'…'}</div>
    <div class="dncs">${(n.choices||[]).map(c=>`<div class="dncc">${c.text||'…'}</div>`).join('')}</div>
  </div>`;
}
function selDlgNode(nid){
  activeDlgNodeId=nid;
  const dlg=(world.dialogs||[]).find(d=>d.id===activeDlgId);if(!dlg)return;
  const n=dlg.nodes.find(nd=>nd.id===nid);if(!n)return;
  document.querySelectorAll('.dnode').forEach(el=>el.style.outline='');
  const el=document.getElementById('dn_'+nid);if(el)el.style.outline='2px solid var(--leaf)';
  document.getElementById('dlgEd').innerHTML=`
    <div class="fg"><div class="fl">Node ID</div><input class="fi" value="${n.id}" oninput="updDlgNode('id',this.value)"></div>
    <div class="fg"><div class="fl">Speaker</div><input class="fi" value="${n.speaker||''}" oninput="updDlgNode('speaker',this.value)"></div>
    <div class="fg"><div class="fl">Text</div><textarea class="fi" oninput="updDlgNode('text',this.value)">${n.text||''}</textarea></div>
    <button class="btn" style="width:100%" onclick="setDlgStart('${n.id}')">⭐ Set as Start Node</button>
    <div style="font-family:DM Mono, monospace;font-size:.65rem;color:var(--dim);letter-spacing:.08em;text-transform:uppercase;margin-top:6px">Choices</div>
    <div id="clist">${(n.choices||[]).map((c,ci)=>`
      <div style="background:var(--edge);border:1px solid var(--border);border-radius:var(--r);padding:8px;display:flex;flex-direction:column;gap:6px;margin-bottom:6px">
        <div style="display:flex;gap:6px;align-items:center">
          <input class="fi" style="flex:1" placeholder="Choice text" value="${c.text||''}" oninput="updChoice('${n.id}',${ci},'text',this.value)">
          <button class="btn danger" style="padding:1px 5px;font-size:.65rem" onclick="remChoice('${n.id}',${ci})">✕</button>
        </div>
        <select class="fi" onchange="updChoice('${n.id}',${ci},'next',this.value)">
          <option value="">— end conversation —</option>
          ${dlg.nodes.filter(nd=>nd.id!==n.id).map(nd=>`<option value="${nd.id}" ${c.next===nd.id?'selected':''}>${nd.id}</option>`).join('')}
        </select>
        <input class="fi" placeholder="Reward (optional)" value="${c.reward||''}" oninput="updChoice('${n.id}',${ci},'reward',this.value)">
      </div>`).join('')}
    </div>
    <button class="btn" style="width:100%;margin-top:4px" onclick="addChoice('${n.id}')">+ Add Choice</button>`;
}
function updDlgNode(k,v){
  const dlg=(world.dialogs||[]).find(d=>d.id===activeDlgId);if(!dlg)return;
  const n=dlg.nodes.find(nd=>nd.id===activeDlgNodeId);if(!n)return;
  if(k==='id'){const old=n.id;dlg.nodes.forEach(nd=>(nd.choices||[]).forEach(c=>{if(c.next===old)c.next=v;}));if(dlg.start_node===old)dlg.start_node=v;n.id=v;activeDlgNodeId=v;_rerenderDlg();}
  else n[k]=v;
  _drawDlgConns();saveWorld();
}
function addChoice(nid){const dlg=(world.dialogs||[]).find(d=>d.id===activeDlgId);const n=dlg?.nodes.find(nd=>nd.id===nid);if(!n)return;if(!n.choices)n.choices=[];n.choices.push({id:'c'+Date.now(),text:'…',next:null,reward:''});saveWorld();selDlgNode(nid);_rerenderDlg();}
function remChoice(nid,ci){const dlg=(world.dialogs||[]).find(d=>d.id===activeDlgId);const n=dlg?.nodes.find(nd=>nd.id===nid);if(!n?.choices)return;n.choices.splice(ci,1);saveWorld();selDlgNode(nid);_rerenderDlg();}
function updChoice(nid,ci,k,v){const dlg=(world.dialogs||[]).find(d=>d.id===activeDlgId);const n=dlg?.nodes.find(nd=>nd.id===nid);if(n?.choices?.[ci]){n.choices[ci][k]=v;_drawDlgConns();saveWorld();}}
function setDlgStart(nid){const dlg=(world.dialogs||[]).find(d=>d.id===activeDlgId);if(!dlg)return;dlg.start_node=nid;saveWorld();_rerenderDlg();}
function addDlgNode(){const dlg=(world.dialogs||[]).find(d=>d.id===activeDlgId);if(!dlg)return;const id='node_'+Date.now();dlg.nodes.push({id,speaker:'',text:'New node.',x:40+dlg.nodes.length*60,y:40+Math.floor(dlg.nodes.length/4)*160,choices:[]});saveWorld();_rerenderDlg();}
function delDlgNode(nid){const dlg=(world.dialogs||[]).find(d=>d.id===activeDlgId);if(!dlg)return;dlg.nodes=dlg.nodes.filter(n=>n.id!==nid);dlg.nodes.forEach(n=>(n.choices||[]).forEach(c=>{if(c.next===nid)c.next=null;}));if(activeDlgNodeId===nid)activeDlgNodeId=null;saveWorld();_rerenderDlg();}
function autoLayoutDlg(){const dlg=(world.dialogs||[]).find(d=>d.id===activeDlgId);if(!dlg)return;dlg.nodes.forEach((n,i)=>{n.x=40+(i%4)*280;n.y=40+Math.floor(i/4)*160;});saveWorld();_rerenderDlg();}
function _rerenderDlg(){
  const dlg=(world.dialogs||[]).find(d=>d.id===activeDlgId);const cv=document.getElementById('dlgCv');if(!cv||!dlg)return;
  document.querySelectorAll('.dnode').forEach(el=>el.remove());
  dlg.nodes.forEach(n=>cv.insertAdjacentHTML('beforeend',_dlgNodeHtml(n,dlg)));
  requestAnimationFrame(()=>{_bindDlgDrag();_drawDlgConns();if(activeDlgNodeId)selDlgNode(activeDlgNodeId);});
}
function _drawDlgConns(){
  const svg=document.getElementById('dlgSvg');if(!svg)return;
  const dlg=(world.dialogs||[]).find(d=>d.id===activeDlgId);if(!dlg)return;
  let p='';
  dlg.nodes.forEach(n=>(n.choices||[]).forEach((c,ci)=>{
    if(!c.next)return;
    const fe=document.getElementById('dn_'+n.id),te=document.getElementById('dn_'+c.next);if(!fe||!te)return;
    const fx=n.x+240,fy=n.y+60+ci*24,tx=te.offsetLeft,ty=te.offsetTop+30;
    const cx1=fx+60,cx2=tx-60;
    p+=`<path d="M${fx},${fy} C${cx1},${fy} ${cx2},${ty} ${tx},${ty}" fill="none" stroke="${ci===0?'#6b8f4e':'#d4892a'}" stroke-width="1.5" stroke-opacity=".7" marker-end="url(#arr)"/>`;
  }));
  svg.innerHTML=`<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#6b8f4e"/></marker></defs>${p}`;
}
function _bindDlgDrag(){
  document.querySelectorAll('.dnode').forEach(el=>{
    el.addEventListener('mousedown',function(e){
      if(e.target.tagName==='BUTTON'||e.target.tagName==='SPAN')return;
      const dlg=(world.dialogs||[]).find(d=>d.id===activeDlgId);
      const n=dlg?.nodes.find(nd=>nd.id===this.id.replace('dn_',''));if(!n)return;
      _dlgDrag={n,sx:e.clientX-n.x,sy:e.clientY-n.y};e.stopPropagation();
    });
  });
  const cv=document.getElementById('dlgCv');if(!cv)return;
  cv.onmousemove=e=>{if(!_dlgDrag)return;_dlgDrag.n.x=Math.max(0,e.clientX-_dlgDrag.sx);_dlgDrag.n.y=Math.max(0,e.clientY-_dlgDrag.sy);const el=document.getElementById('dn_'+_dlgDrag.n.id);if(el){el.style.left=_dlgDrag.n.x+'px';el.style.top=_dlgDrag.n.y+'px';}_drawDlgConns();};
  cv.onmouseup=()=>{if(_dlgDrag){saveWorld();_dlgDrag=null;}};
}
function closeDlgEditor(eid,ixIdx){
  saveWorld();document.getElementById('theModal').classList.remove('modal-fs');document.getElementById('modalBody').style.cssText='';closeModal();
  activeDlgId=null;activeDlgNodeId=null;if(eid){activeEntityId=eid;renderEntityForm();}
}

