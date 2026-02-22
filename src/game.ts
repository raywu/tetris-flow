import type { GameState, ActivePiece, TetrominoDef } from './types.ts';
import { createGrid, lockPiece, clearLines, isBlockOut } from './board.ts';
import { tryMove, tryRotate, hardDrop } from './piece.ts';
import { Bag } from './bag.ts';
import { InputHandler } from './input.ts';
import { Renderer } from './renderer.ts';
import { calculateLineScore, calculateHardDropScore, calculateSoftDropScore, calculateLevel, getGravityMs } from './scoring.ts';
import { LOCK_DELAY_MS, LOCK_DELAY_MAX_RESETS } from './constants.ts';

export class Game {
  private state!: GameState;
  private bag!: Bag;
  private readonly renderer: Renderer;
  private readonly input: InputHandler;
  private rafId = 0;
  private lastTimestamp = 0;
  private lockResets = 0;
  private cleanupInput: (() => void) | null = null;

  private readonly hudScore: HTMLElement;
  private readonly hudLevel: HTMLElement;
  private readonly hudLines: HTMLElement;
  private readonly overlay: HTMLElement;

  constructor(
    boardCanvas: HTMLCanvasElement,
    previewCanvas: HTMLCanvasElement,
    hudScore: HTMLElement,
    hudLevel: HTMLElement,
    hudLines: HTMLElement,
    overlay: HTMLElement,
  ) {
    this.renderer = new Renderer(boardCanvas, previewCanvas);
    this.input = new InputHandler();
    this.hudScore = hudScore;
    this.hudLevel = hudLevel;
    this.hudLines = hudLines;
    this.overlay = overlay;
  }

  start(): void {
    this.newGame();
    this.cleanupInput = this.input.attach();
    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(ts => { this.loop(ts); });
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
    this.cleanupInput?.();
  }

  private newGame(): void {
    this.bag = new Bag();
    const firstDef = this.bag.next();
    const current = this.spawnPiece(firstDef);
    this.state = {
      board: createGrid(),
      current,
      next: this.bag.next(),
      score: 0,
      level: 1,
      lines: 0,
      phase: 'playing',
      dropAccumulator: 0,
      lockDelay: LOCK_DELAY_MS,
      lockDelayActive: false,
    };
    this.lockResets = 0;
    this.overlay.innerHTML = '';
    this.overlay.classList.add('hidden');
    this.updateHud();
  }

  private loop(timestamp: number): void {
    const dt = Math.min(timestamp - this.lastTimestamp, 100); // cap to prevent spiral
    this.lastTimestamp = timestamp;

    this.input.update(dt);
    this.processInput();

    if (this.state.phase === 'playing') {
      this.tick(dt);
    }

    this.renderer.render(this.state);
    this.rafId = requestAnimationFrame(ts => { this.loop(ts); });
  }

  private processInput(): void {
    for (const action of this.input.consume()) {
      if (action === 'restart') {
        this.newGame();
        return;
      }
      if (action === 'pause') {
        this.togglePause();
        continue;
      }
      if (this.state.phase !== 'playing') continue;

      switch (action) {
        case 'move-left': {
          const moved = tryMove(this.state, -1, 0);
          if (moved) { this.state.current = moved; this.onPieceMoved(); }
          break;
        }
        case 'move-right': {
          const moved = tryMove(this.state, 1, 0);
          if (moved) { this.state.current = moved; this.onPieceMoved(); }
          break;
        }
        case 'soft-drop': {
          const moved = tryMove(this.state, 0, 1);
          if (moved) {
            this.state.current = moved;
            this.state.score += calculateSoftDropScore(1);
            this.state.dropAccumulator = 0;
          }
          break;
        }
        case 'hard-drop': {
          const { piece, cellsDropped } = hardDrop(this.state);
          this.state.current = piece;
          this.state.score += calculateHardDropScore(cellsDropped);
          this.lockPieceAndSpawnNext();
          break;
        }
        case 'rotate-cw': {
          const rotated = tryRotate(this.state, 1);
          if (rotated) { this.state.current = rotated; this.onPieceMoved(); }
          break;
        }
        case 'rotate-ccw': {
          const rotated = tryRotate(this.state, -1);
          if (rotated) { this.state.current = rotated; this.onPieceMoved(); }
          break;
        }
      }
    }
  }

  private tick(dt: number): void {
    if (this.state.lockDelayActive) {
      this.state.lockDelay -= dt;
      if (this.state.lockDelay <= 0) {
        this.lockPieceAndSpawnNext();
      }
      return;
    }

    const gravityMs = getGravityMs(this.state.level);
    this.state.dropAccumulator += dt;
    if (this.state.dropAccumulator >= gravityMs) {
      this.state.dropAccumulator -= gravityMs;
      const moved = tryMove(this.state, 0, 1);
      if (moved) {
        this.state.current = moved;
      } else {
        this.state.lockDelayActive = true;
        this.state.lockDelay = LOCK_DELAY_MS;
      }
    }
  }

  private onPieceMoved(): void {
    if (!this.state.lockDelayActive) return;
    // If the piece moved to a position where it can fall further (e.g. off a ledge),
    // cancel lock delay so gravity resumes and piece reaches the real bottom.
    if (tryMove(this.state, 0, 1) !== null) {
      this.state.lockDelayActive = false;
      return;
    }
    if (this.lockResets < LOCK_DELAY_MAX_RESETS) {
      this.state.lockDelay = LOCK_DELAY_MS;
      this.lockResets++;
    }
  }

  private lockPieceAndSpawnNext(): void {
    lockPiece(this.state.board, this.state.current);
    const cleared = clearLines(this.state.board);
    if (cleared > 0) {
      this.state.score += calculateLineScore(cleared, this.state.level);
      this.state.lines += cleared;
      this.state.level = calculateLevel(this.state.lines);
    }

    const nextDef = this.bag.next();
    const spawned = this.spawnPiece(this.state.next);
    this.state.next = nextDef;

    if (isBlockOut(this.state.board, spawned)) {
      this.state.phase = 'gameover';
      this.showGameOver();
    } else {
      this.state.current = spawned;
      this.state.lockDelayActive = false;
      this.state.lockDelay = LOCK_DELAY_MS;
      this.lockResets = 0;
    }

    this.updateHud();
  }

  private spawnPiece(def: TetrominoDef): ActivePiece {
    return { def, rotation: 0, pos: { x: 3, y: -1 } };
  }

  private togglePause(): void {
    if (this.state.phase === 'playing') {
      this.state.phase = 'paused';
      this.overlay.innerHTML = '<span class="overlay-title">PAUSED</span><span class="overlay-hint">Press P to resume</span>';
      this.overlay.classList.remove('hidden');
    } else if (this.state.phase === 'paused') {
      this.state.phase = 'playing';
      this.overlay.innerHTML = '';
      this.overlay.classList.add('hidden');
      this.lastTimestamp = performance.now(); // reset dt to avoid time jump
    }
  }

  private showGameOver(): void {
    this.overlay.innerHTML = `
      <span class="overlay-title">GAME OVER</span>
      <span class="overlay-score">Score: ${this.state.score}</span>
      <span class="overlay-hint">Press R to restart</span>
    `;
    this.overlay.classList.remove('hidden');
  }

  private updateHud(): void {
    this.hudScore.textContent = String(this.state.score);
    this.hudLevel.textContent = String(this.state.level);
    this.hudLines.textContent = String(this.state.lines);
  }
}
