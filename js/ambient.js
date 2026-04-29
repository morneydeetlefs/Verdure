// AMBIENT SOUND
// ═══════════════════════════════════════════════════════════════
function playAmbient(src) {
  stopAmbient();
  if (!src) return;
  try { ambientAudio=new Audio(src); ambientAudio.loop=true; ambientAudio.volume=masterVolume*.4; ambientAudio.play().catch(()=>{}); } catch {}
}
function stopAmbient() {
  if (ambientAudio) { try{ambientAudio.pause();}catch{} ambientAudio=null; }
}
function tickAmbient() {
  const map = world?.maps?.find(m=>m.id===currentMapId); if (!map) return;
  for (const obj of (map.objects||[])) {
    const ent = world.entities?.find(e=>e.id===obj.entity_id);
    if (ent?.ambient_sound) { playAmbient(ent.ambient_sound); return; }
  }
}
function setVolume(v) { masterVolume=parseFloat(v); if(ambientAudio) ambientAudio.volume=masterVolume*.4; }

// ═══════════════════════════════════════════════════════════════
