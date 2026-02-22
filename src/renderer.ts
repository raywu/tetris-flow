import type { GameState, ActivePiece, TetrominoDef } from './types.ts';
import { COLS, ROWS, CELL_SIZE, PREVIEW_CELL_SIZE, PREVIEW_CANVAS_SIZE, COLORS, GHOST_ALPHA, CELL_GLOW, DEBUG } from './constants.ts';
import { getCells } from './tetrominoes.ts';
import { getGhostPiece } from './piece.ts';

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly previewCtx: CanvasRenderingContext2D;

  constructor(boardCanvas: HTMLCanvasElement, previewCanvas: HTMLCanvasElement) {
    boardCanvas.width = COLS * CELL_SIZE;
    boardCanvas.height = ROWS * CELL_SIZE;
    previewCanvas.width = PREVIEW_CANVAS_SIZE;
    previewCanvas.height = PREVIEW_CANVAS_SIZE;
    this.ctx = boardCanvas.getContext('2d')!;
    this.previewCtx = previewCanvas.getContext('2d')!;
  }

  render(state: GameState): void {
    this.clearBoard();
    this.drawGrid();
    this.drawLockedCells(state.board);
    if (state.phase !== 'gameover') {
      const ghost = getGhostPiece(state);
      this.drawPiece(ghost, true);
      this.drawPiece(state.current, false);
    }
    this.drawPreview(state.next);
    if (DEBUG) this.drawDebugOverlay(state);
  }

  private drawDebugOverlay(s: GameState): void {
    const lines = [
      `phase: ${s.phase}`,
      `pos: ${s.current.pos.x}, ${s.current.pos.y}  rot: ${s.current.rotation}`,
      `lockDelay: ${s.lockDelay.toFixed(0)}ms  active: ${s.lockDelayActive}`,
      `dropAccum: ${s.dropAccumulator.toFixed(1)}`,
      `level: ${s.level}  lines: ${s.lines}  score: ${s.score}`,
    ];
    this.ctx.save();
    this.ctx.font = '11px monospace';
    this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this.ctx.fillRect(0, 0, 200, lines.length * 14 + 8);
    this.ctx.fillStyle = '#00ff88';
    lines.forEach((line, i) => this.ctx.fillText(line, 4, 14 + i * 14));
    this.ctx.restore();
  }

  private clearBoard(): void {
    this.ctx.fillStyle = '#0d0d14';
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  private drawGrid(): void {
    this.ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    this.ctx.lineWidth = 0.5;
    for (let col = 0; col <= COLS; col++) {
      this.ctx.beginPath();
      this.ctx.moveTo(col * CELL_SIZE, 0);
      this.ctx.lineTo(col * CELL_SIZE, ROWS * CELL_SIZE);
      this.ctx.stroke();
    }
    for (let row = 0; row <= ROWS; row++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, row * CELL_SIZE);
      this.ctx.lineTo(COLS * CELL_SIZE, row * CELL_SIZE);
      this.ctx.stroke();
    }
  }

  private drawLockedCells(board: number[][]): void {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = board[row]![col]!;
        if (cell !== 0) this.drawCell(this.ctx, col, row, cell, false);
      }
    }
  }

  private drawPiece(piece: ActivePiece, isGhost: boolean): void {
    for (const cell of getCells(piece)) {
      if (cell.y >= 0) {
        this.drawCell(this.ctx, cell.x, cell.y, piece.def.colorIndex, isGhost);
      }
    }
  }

  private drawCell(
    ctx: CanvasRenderingContext2D,
    col: number,
    row: number,
    colorIndex: number,
    isGhost: boolean,
  ): void {
    const x = col * CELL_SIZE;
    const y = row * CELL_SIZE;
    const color = COLORS[colorIndex]!;
    const pad = 1;
    const sz = CELL_SIZE - pad * 2;

    ctx.save();

    if (isGhost) {
      ctx.globalAlpha = GHOST_ALPHA;
      ctx.fillStyle = color;
      ctx.fillRect(x + pad, y + pad, sz, sz);
    } else {
      ctx.shadowColor = color;
      ctx.shadowBlur = CELL_GLOW;
      ctx.fillStyle = color;
      ctx.fillRect(x + pad, y + pad, sz, sz);
      ctx.shadowBlur = 0;
      // Top-left bright bevel
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(x + pad, y + pad, sz, 3);
      ctx.fillRect(x + pad, y + pad, 3, sz);
      // Bottom-right dark bevel
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x + pad, y + CELL_SIZE - pad - 3, sz, 3);
      ctx.fillRect(x + CELL_SIZE - pad - 3, y + pad, 3, sz);
    }

    ctx.restore();
  }

  private drawPreview(next: TetrominoDef): void {
    const ctx = this.previewCtx;
    const canvasSize = PREVIEW_CANVAS_SIZE;
    ctx.fillStyle = '#0d0d14';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    const shape = next.rotations[0]!;
    const minX = Math.min(...shape.map(p => p.x));
    const maxX = Math.max(...shape.map(p => p.x));
    const minY = Math.min(...shape.map(p => p.y));
    const maxY = Math.max(...shape.map(p => p.y));
    const pieceW = maxX - minX + 1;
    const pieceH = maxY - minY + 1;
    const cells = canvasSize / PREVIEW_CELL_SIZE;
    const offsetX = Math.floor((cells - pieceW) / 2) - minX;
    const offsetY = Math.floor((cells - pieceH) / 2) - minY;

    for (const p of shape) {
      this.drawPreviewCell(ctx, p.x + offsetX, p.y + offsetY, next.colorIndex);
    }
  }

  private drawPreviewCell(ctx: CanvasRenderingContext2D, col: number, row: number, colorIndex: number): void {
    const x = col * PREVIEW_CELL_SIZE;
    const y = row * PREVIEW_CELL_SIZE;
    const color = COLORS[colorIndex]!;
    const pad = 1;
    const sz = PREVIEW_CELL_SIZE - pad * 2;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.fillRect(x + pad, y + pad, sz, sz);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x + pad, y + pad, sz, 3);
    ctx.fillRect(x + pad, y + pad, 3, sz);
    ctx.restore();
  }
}
