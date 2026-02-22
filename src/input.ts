import { DAS_DELAY_MS, ARR_INTERVAL_MS } from './constants.ts';

export type InputAction =
  | 'move-left'
  | 'move-right'
  | 'soft-drop'
  | 'hard-drop'
  | 'rotate-cw'
  | 'rotate-ccw'
  | 'pause'
  | 'restart';

const KEY_MAP: Record<string, InputAction> = {
  ArrowLeft: 'move-left',
  ArrowRight: 'move-right',
  ArrowDown: 'soft-drop',
  Space: 'hard-drop',
  ArrowUp: 'rotate-cw',
  KeyZ: 'rotate-ccw',
  KeyP: 'pause',
  KeyR: 'restart',
};

const DAS_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowDown']);

export class InputHandler {
  private readonly actionQueue: InputAction[] = [];
  private dasKey: string | null = null;
  private dasTimer = 0;
  private arrTimer = 0;

  attach(): () => void {
    const onKeyDown = (e: KeyboardEvent) => { this.handleKeyDown(e); };
    const onKeyUp = (e: KeyboardEvent) => { this.handleKeyUp(e); };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }

  update(dt: number): void {
    if (this.dasKey === null) return;
    this.dasTimer -= dt;
    if (this.dasTimer > 0) return;
    this.arrTimer -= dt;
    if (this.arrTimer <= 0) {
      this.enqueueForKey(this.dasKey);
      this.arrTimer = ARR_INTERVAL_MS;
    }
  }

  consume(): InputAction[] {
    return this.actionQueue.splice(0);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    // Prevent arrow keys from scrolling the page
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    this.enqueueForKey(e.code);
    if (DAS_KEYS.has(e.code)) {
      this.dasKey = e.code;
      this.dasTimer = DAS_DELAY_MS;
      this.arrTimer = ARR_INTERVAL_MS;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.code === this.dasKey) {
      this.dasKey = null;
    }
  }

  private enqueueForKey(code: string): void {
    const action = KEY_MAP[code];
    if (action !== undefined) this.actionQueue.push(action);
  }
}
