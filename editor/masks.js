// ═══════════════════════════════════════════
// MASK SYSTEM
// ═══════════════════════════════════════════
function toggleMaskVis(){maskVisible=!maskVisible;const b=document.getElementById('tMaskVis');if(b)b.style.color=maskVisible?'':'var(--rust)';renderMasks();}
function getCC(e){const c=document.getElementById('mapCanvas'),r=c.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};}
document.getElementById('mapCanvas').addEventListener('dblclick',function(e){if(activeTool!=='mask')return;if(maskPts.length<3){showToast('Need at least 3 points');return;}e.preventDefault();maskPts.pop();finishMask();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activeTool==='mask')cancelMaskDraw();});
function addMaskPt(e){if(!activeMapId){showToast('Select a map first');return;}maskPts.push(getCC(e));renderMaskPrev();}
function renderMaskPrev(){
  const svg=document.getElementById('maskLayer');if(!svg)return;
  let g=document.getElementById('mpg');if(!g){g=document.createElementNS('http://www.w3.org/2000/svg','g');g.id='mpg';svg.appendChild(g);}
  g.innerHTML='';if(!maskPts.length)return;
  const c=document.getElementById('mapCanvas'),w=c.offsetWidth,h=c.offsetHeight;
  const pts=maskPts.map(p=>`${p.x*w},${p.y*h}`).join(' ');
  const pl=document.createElementNS('http://www.w3.org/2000/svg','polyline');
  pl.setAttribute('points',pts);pl.setAttribute('fill','rgba(255,255,100,.15)');pl.setAttribute('stroke','#f0e040');pl.setAttribute('stroke-width','1.5');pl.setAttribute('stroke-dasharray','5,3');pl.setAttribute('pointer-events','none');g.appendChild(pl);
  maskPts.forEach(p=>{const ci=document.createElementNS('http://www.w3.org/2000/svg','circle');ci.setAttribute('cx',p.x*w);ci.setAttribute('cy',p.y*h);ci.setAttribute('r','5');ci.setAttribute('fill','#f0e040');ci.setAttribute('stroke','#fff');ci.setAttribute('stroke-width','1');ci.setAttribute('pointer-events','none');g.appendChild(ci);});
}
function finishMask(){
  const pts=[...maskPts];maskPts=[];
  document.getElementById('modalTitle').textContent='New Mask Polygon';
  document.getElementById('modalBody').innerHTML=`
    <div class="fhint">${pts.length} points defined</div>
    <div class="fg"><div class="fl">Mask Type</div><select class="fi" id="nmType">${Object.entries(MASK_TYPES).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}</select></div>
    <div class="fg"><div class="fl">Label (optional)</div><input class="fi" id="nmLbl" placeholder="e.g. Concrete path"></div>`;
  window._mpts=pts;
  document.getElementById('modalFoot').innerHTML=`<button class="btn" onclick="closeModal();cancelMaskDraw()">Cancel</button><button class="btn primary" onclick="confirmMask()">Save Mask</button>`;
  openModal();
}
function confirmMask(){
  const type=document.getElementById('nmType')?.value||'no_plant',lbl=document.getElementById('nmLbl')?.value||'';
  const pts=window._mpts||[];const map=world.maps.find(m=>m.id===activeMapId);if(!map)return;
  if(!map.masks)map.masks=[];map.masks.push({id:'mask_'+Date.now(),type,label:lbl,points:pts});
  saveWorld();closeModal();cancelMaskDraw();renderMasks();renderMapProps();showToast('Mask saved');
}
function cancelMaskDraw(){maskPts=[];const g=document.getElementById('mpg');if(g)g.remove();}
function renderMasks(){
  const svg=document.getElementById('maskLayer');if(!svg)return;
  Array.from(svg.children).forEach(c=>{if(c.id!=='mpg')c.remove();});
  if(!maskVisible||!activeMapId)return;
  const map=world.maps.find(m=>m.id===activeMapId);if(!map?.masks?.length)return;
  const cv=document.getElementById('mapCanvas'),w=cv.offsetWidth,h=cv.offsetHeight;
  map.masks.forEach(mask=>{
    const mt=MASK_TYPES[mask.type]||MASK_TYPES.no_plant,isSel=mask.id===selectedMaskId;
    const pts=mask.points.map(p=>`${p.x*w},${p.y*h}`).join(' ');
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('data-mid',mask.id);
    const poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');
    poly.setAttribute('points',pts);poly.setAttribute('fill',mt.color);poly.setAttribute('stroke',mt.stroke);poly.setAttribute('stroke-width',isSel?'2.5':'1.5');poly.setAttribute('stroke-dasharray','6,3');poly.setAttribute('pointer-events','all');poly.style.cursor='pointer';
    poly.addEventListener('click',ev=>{if(activeTool!=='select')return;ev.stopPropagation();selectedMaskId=mask.id;renderMasks();});
    g.appendChild(poly);
    const cx=mask.points.reduce((s,p)=>s+p.x,0)/mask.points.length,cy=mask.points.reduce((s,p)=>s+p.y,0)/mask.points.length;
    const txt=document.createElementNS('http://www.w3.org/2000/svg','text');txt.setAttribute('x',cx*w);txt.setAttribute('y',cy*h);txt.setAttribute('text-anchor','middle');txt.setAttribute('font-family','monospace');txt.setAttribute('font-size','10');txt.setAttribute('fill',mt.stroke);txt.setAttribute('pointer-events','none');txt.textContent=mask.label||mt.label;g.appendChild(txt);
    if(isSel)mask.points.forEach((p,pi)=>{
      const c2=document.createElementNS('http://www.w3.org/2000/svg','circle');c2.setAttribute('cx',p.x*w);c2.setAttribute('cy',p.y*h);c2.setAttribute('r','6');c2.setAttribute('fill','white');c2.setAttribute('stroke',mt.stroke);c2.setAttribute('stroke-width','2');c2.style.cursor='move';
      c2.addEventListener('mousedown',ev=>{ev.stopPropagation();ev.preventDefault();
        const onMv=mv=>{const co=getCC(mv);mask.points[pi]=co;renderMasks();};
        const onUp=()=>{saveWorld();document.removeEventListener('mousemove',onMv);document.removeEventListener('mouseup',onUp);};
        document.addEventListener('mousemove',onMv);document.addEventListener('mouseup',onUp);});
      g.appendChild(c2);
    });
    svg.appendChild(g);
  });
}
window.addEventListener('resize',()=>renderMasks());

