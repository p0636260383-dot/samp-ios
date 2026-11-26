document.addEventListener('DOMContentLoaded', () => {
  const send = action => { if (window.cef) window.cef.emit('rotmain.action', action); };
  for (const name of ['shop', 'market', 'trade', 'exchange']) {
    const button = document.getElementById('open-' + name);
    button.tabIndex = 0;
    button.setAttribute('role','button');
    button.addEventListener('click', () => send(name));
    button.addEventListener('keydown', e => { if(e.key==='Enter' || e.key===' ') {e.preventDefault();send(name);} });
  }
  document.getElementById('btn-close').addEventListener('click', () => send('close'));
  document.addEventListener('keydown', e => { if(e.key==='Escape') send('close'); });
});
