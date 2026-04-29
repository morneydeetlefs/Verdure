// ═══════════════════════════════════════════
// JSON / EXPORT / IMPORT
// ═══════════════════════════════════════════
function renderJson(){
  const clean=JSON.parse(JSON.stringify(world));
  if(clean.assets)Object.keys(clean.assets).forEach(k=>{const v=clean.assets[k];clean.assets[k]=v.startsWith('data:image')?'[image base64]':v.startsWith('data:audio')?'[audio base64]':'[data]';});
  clean.maps.forEach(m=>{if(m.background?.startsWith('data:'))m.background='[base64 — in assets]';});
  document.getElementById('jsonPane').textContent=JSON.stringify(clean,null,2);
}
function copyJson(){navigator.clipboard.writeText(JSON.stringify(world,null,2)).then(()=>showToast('Copied to clipboard'));}
function exportWorld(){pruneAssets();const b=new Blob([JSON.stringify(world,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='world.json';a.click();showToast('world.json downloaded');}
function importWorld(){
  const inp=document.createElement('input');inp.type='file';inp.accept='.json';
  inp.onchange=e=>{const f=e.target.files[0];if(!f)return;const fr=new FileReader();fr.onload=ev=>{
    try{const w=JSON.parse(ev.target.result);if(!w.maps||!w.entities)throw new Error('Missing maps or entities');world=w;if(!world.assets)world.assets={};if(!world.dialogs)world.dialogs=[];activeMapId=null;activeEntityId=null;selectedObjId=null;saveWorld();renderMapList();renderEntityList();renderCanvas();renderMapProps();showToast('World imported');}catch(err){showToast('Import failed: '+err.message);}};fr.readAsText(f);};inp.click();
}

// ═══════════════════════════════════════════
// MODAL / TOAST
// ═══════════════════════════════════════════
function openModal(){document.getElementById('modalOverlay').classList.add('open');}
function closeModal(){document.getElementById('modalOverlay').classList.remove('open');document.getElementById('theModal').classList.remove('modal-fs');document.getElementById('modalBody').style.cssText='';}
document.getElementById('modalOverlay').addEventListener('click',e=>{if(e.target===document.getElementById('modalOverlay'))closeModal();});
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(_toastT);_toastT=setTimeout(()=>t.classList.remove('show'),2200);}

// ═══════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════
function seedDemoData(){
  if(world.entities.length||world.maps.length)return;
  world.entities=[
    {id:'entity_1',name:'Rusty Watering Can',category:'tool',rarity:'common',description:'A battered old can. Still holds water.',default_sprite:'',ambient_sound:'',zone_requirements:[],seasonal_visibility:[],effect:'speeds_growth',tradeable:true,
      states:[{id:'idle',label:'Idle',sprite:null,duration_hours:null,visible:true},{id:'collected',label:'Collected',sprite:null,duration_hours:null,visible:true}],
      interactions:[{trigger:'click',action:'collect',reward:'',requires:[],consume_requires:true,required_states:[],seasons:[],respawn:false,respawn_hours:24,sound:''}]},
    {id:'entity_2',name:'Wildflower Seed',category:'plant',rarity:'common',description:'Hardy seeds that bloom anywhere.',default_sprite:'',ambient_sound:'',zone_requirements:[],seasonal_visibility:[1,2,3],effect:'restores_soil',tradeable:true,
      states:[{id:'seed',label:'Seed',sprite:null,duration_hours:24,visible:true},{id:'sprout',label:'Sprout',sprite:null,duration_hours:48,visible:true},{id:'bloom',label:'Bloom',sprite:null,duration_hours:null,visible:true}],
      interactions:[
        {trigger:'water',action:'grow',reward:'',requires:['entity_1'],consume_requires:false,required_states:['seed','sprout'],seasons:[],respawn:false,respawn_hours:24,sound:''},
        {trigger:'harvest',action:'harvest',reward:'wildflower_seed',requires:[],consume_requires:true,required_states:['bloom'],seasons:[],respawn:true,respawn_hours:72,sound:''}]},
    {id:'entity_3',name:'Saguaro Seedling',category:'plant',rarity:'uncommon',description:'Slow-growing desert giant. Warm zones only.',default_sprite:'',ambient_sound:'',zone_requirements:[9,10,11,12],seasonal_visibility:[2,3],effect:'restores_soil',tradeable:true,
      states:[{id:'seedling',label:'Seedling',sprite:null,duration_hours:72,visible:true},{id:'juvenile',label:'Juvenile',sprite:null,duration_hours:168,visible:true},{id:'mature',label:'Mature',sprite:null,duration_hours:null,visible:true}],
      interactions:[{trigger:'water',action:'grow',reward:'',requires:['entity_1'],consume_requires:false,required_states:['seedling','juvenile'],seasons:[2,3],respawn:false,respawn_hours:24,sound:''}]},
    {id:'entity_4',name:'Old Trowel',category:'tool',rarity:'common',description:'Worn but reliable. Hidden under debris.',default_sprite:'',ambient_sound:'',zone_requirements:[],seasonal_visibility:[],effect:'',tradeable:true,
      states:[{id:'idle',label:'Hidden',sprite:null,duration_hours:null,visible:false},{id:'found',label:'Found',sprite:null,duration_hours:null,visible:true}],
      interactions:[
        {trigger:'inspect',action:'reveal',reward:'',requires:[],consume_requires:true,required_states:[],seasons:[],respawn:false,respawn_hours:24,sound:''},
        {trigger:'click',action:'collect',reward:'',requires:[],consume_requires:true,required_states:['found'],seasons:[],respawn:false,respawn_hours:24,sound:''}]},
    {id:'entity_5',name:'Broken Greenhouse',category:'building',rarity:'rare',description:'Restore it to shelter cold-zone plants.',default_sprite:'',ambient_sound:'',zone_requirements:[],seasonal_visibility:[],effect:'provides_shelter',tradeable:false,
      states:[{id:'ruined',label:'Ruined',sprite:null,duration_hours:null,visible:true},{id:'restoring',label:'Restoring',sprite:null,duration_hours:null,visible:true},{id:'restored',label:'Restored',sprite:null,duration_hours:null,visible:true}],
      interactions:[{trigger:'click',action:'transform',reward:'',requires:[],consume_requires:true,required_states:['ruined','restoring'],seasons:[],respawn:false,respawn_hours:24,sound:''}]},
    {id:'entity_6',name:'Litter Pile',category:'hazard',rarity:'common',description:'Must be cleared before planting.',default_sprite:'',ambient_sound:'',zone_requirements:[],seasonal_visibility:[],effect:'blocks_hazard',tradeable:false,
      states:[{id:'present',label:'Present',sprite:null,duration_hours:null,visible:true},{id:'cleared',label:'Cleared',sprite:null,duration_hours:null,visible:true}],
      interactions:[{trigger:'click',action:'collect',reward:'5_coins',requires:[],consume_requires:true,required_states:[],seasons:[],respawn:false,respawn_hours:24,sound:''}]}
  ];
  world.maps=[
    {id:'map_1',name:'Abandoned Corner Lot',type:'top-down',zone:6,blight_level:80,description:'A neglected urban lot.',background:null,portals:[{id:'p1',to:'map_2',label:'Shed Door',requires_level:0,x:0.85,y:0.6}],masks:[],objects:[
      {id:'o1',entity_id:'entity_6',label:'',x:0.3,y:0.4,state:'present',size:48,z_order:5,rotation:0,animation:'jitter',notes:''},
      {id:'o2',entity_id:'entity_6',label:'',x:0.5,y:0.55,state:'present',size:48,z_order:5,rotation:0,animation:'jitter',notes:''},
      {id:'o3',entity_id:'entity_4',label:'',x:0.7,y:0.3,state:'idle',size:36,z_order:8,rotation:0,animation:'none',notes:'Hidden under debris'},
      {id:'op1',entity_id:null,type:'portal',label:'Shed Door',x:0.85,y:0.6,state:'idle',size:52,z_order:20,rotation:0,animation:'none',portal_id:'p1',notes:''}]},
    {id:'map_2',name:'Garden Shed',type:'side-view',zone:6,blight_level:40,description:'A dusty shed.',background:null,portals:[{id:'p2',to:'map_1',label:'Back Outside',requires_level:0,x:0.1,y:0.7}],masks:[],objects:[
      {id:'o4',entity_id:'entity_1',label:'',x:0.6,y:0.65,state:'idle',size:52,z_order:10,rotation:0,animation:'none',notes:''},
      {id:'o5',entity_id:'entity_3',label:'',x:0.3,y:0.5,state:'seedling',size:44,z_order:10,rotation:0,animation:'float',notes:''},
      {id:'op2',entity_id:null,type:'portal',label:'Back Outside',x:0.1,y:0.7,state:'idle',size:52,z_order:20,rotation:0,animation:'none',portal_id:'p2',notes:''}]}
  ];
  saveWorld();
}

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
loadWorld();
seedDemoData();
renderMapList();
renderEntityList();
renderCanvas();
renderMapProps();
