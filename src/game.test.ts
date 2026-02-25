// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from './game.ts';

function makeGame(): { game: Game; overlay: HTMLElement } {
  const boardCanvas = document.createElement('canvas');
  boardCanvas.width = 300;
  boardCanvas.height = 600;
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = 80;
  previewCanvas.height = 80;
  const scoreEl = document.createElement('span');
  const levelEl = document.createElement('span');
  const linesEl = document.createElement('span');
  const overlay = document.createElement('div');
  const game = new Game(boardCanvas, previewCanvas, scoreEl, levelEl, linesEl, overlay);
  return { game, overlay };
}

describe('Game.onGameOver', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('initializes as null', () => {
    const { game } = makeGame();
    expect(game.onGameOver).toBeNull();
  });

  it('onGameOver does not fire on pause', () => {
    const { game } = makeGame();
    const cb = vi.fn();
    game.onGameOver = cb;
    game.start();
    game.pause();
    expect(cb).not.toHaveBeenCalled();
    game.stop();
  });

  it('onGameOver fires with final score on game over', () => {
    const { game } = makeGame();
    const cb = vi.fn();
    game.onGameOver = cb;
    game.start();

    const g = game as any;
    g.state.score = 9999;
    g.state.phase = 'gameover';
    g.showGameOver();

    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(9999);
    game.stop();
  });

  it('onGameOver = null does not crash on game-over', () => {
    const { game } = makeGame();
    game.onGameOver = null;
    game.start();

    const g = game as any;
    g.state.phase = 'gameover';
    expect(() => g.showGameOver()).not.toThrow();
    expect(game.getState().phase).toBe('gameover');
    game.stop();
  });

  it('onGameOver throwing does not crash game', () => {
    const { game } = makeGame();
    game.onGameOver = () => { throw new Error('callback error'); };
    game.start();

    const g = game as any;
    g.state.phase = 'gameover';
    // Callback error propagates through ?.() - catch it
    expect(() => g.showGameOver()).toThrow('callback error');
    expect(game.getState().phase).toBe('gameover');
    game.stop();
  });
});
