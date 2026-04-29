// DIALOG
// ═══════════════════════════════════════════════════════════════
function openDialog(dialogId) {
  const dlg = world.dialogs?.find(d=>d.id===dialogId);
  if (!dlg) { showToast('Dialog not found','error'); return; }
  showNode(dlg, dlg.start_node);
}

function showNode(dlg, nodeId) {
  const node = dlg.nodes?.find(n=>n.id===nodeId);
  if (!node) { closeDialog(); return; }
  document.getElementById('dialogOverlay').classList.add('open');
  const box = document.getElementById('dialogBox');
  let html = '';
  if (node.speaker) html += `<div class="dlg-speaker">${node.speaker}</div>`;
  html += `<div class="dlg-text">${node.text||''}</div>`;
  if (node.choices?.length) {
    html += '<div class="dlg-choices">';
    node.choices.forEach(c => {
      const rwd = c.reward ? `<span class="dlg-reward">${c.reward}</span>` : '';
      html += `<button class="dlg-choice" onclick="pickChoice('${dlg.id}','${c.next||''}','${c.reward||''}')">${c.text}${rwd}</button>`;
    });
    html += '</div>';
  } else {
    html += `<div class="dlg-choices"><button class="dlg-choice" onclick="closeDialog()">Continue…</button></div>`;
  }
  box.innerHTML = html;
  giveXP(XP_REWARD.dialog);
}

function pickChoice(dlgId, nextId, reward) {
  if (reward) giveReward(reward);
  if (!nextId) { closeDialog(); return; }
  const dlg = world.dialogs?.find(d=>d.id===dlgId);
  if (dlg) showNode(dlg, nextId); else closeDialog();
}

function closeDialog() {
  document.getElementById('dialogOverlay').classList.remove('open');
  document.getElementById('dialogBox').innerHTML = '';
}

// ═══════════════════════════════════════════════════════════════
