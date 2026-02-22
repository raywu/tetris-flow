import { getActiveClientId, switchClientId, signIn } from './auth.ts';

export function mountDebugOverlay(): void {
  const bar = document.createElement('div');
  bar.id = 'debug-overlay';
  bar.style.cssText = [
    'position:fixed',
    'bottom:8px',
    'left:8px',
    'z-index:50',
    'background:rgba(0,0,0,0.6)',
    'color:#aaa',
    'font:11px/1.4 monospace',
    'padding:4px 8px',
    'border-radius:4px',
    'display:flex',
    'align-items:center',
    'gap:8px',
    'pointer-events:auto',
  ].join(';');

  const label = document.createElement('span');

  const btn = document.createElement('button');
  btn.textContent = 'Switch →';
  btn.style.cssText = [
    'background:none',
    'border:1px solid #555',
    'color:#aaa',
    'font:11px monospace',
    'padding:1px 6px',
    'border-radius:3px',
    'cursor:pointer',
  ].join(';');

  function refresh(): void {
    const id = getActiveClientId();
    label.textContent = `Client: …${id.slice(-20)}`;
  }

  btn.addEventListener('click', () => {
    switchClientId();
    refresh();
    signIn().catch(() => {});
  });

  bar.appendChild(label);
  bar.appendChild(btn);
  document.body.appendChild(bar);
  refresh();
}
