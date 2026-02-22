import './style.css';
import { Game } from './game.ts';
import { DEBUG } from './constants.ts';
import { PreGameScreen } from './pregame.ts';
import { YouTubePlayer } from './player.ts';
import type { YouTubeVideo } from './types.ts';

if ((import.meta as any).env.DEV) {
  import('./debug.ts').then(({ mountDebugOverlay }) => mountDebugOverlay());
}

const app = document.querySelector<HTMLDivElement>('#app')!;

function buildGameDOM(): {
  wrapper: HTMLElement;
  boardCanvas: HTMLCanvasElement;
  previewCanvas: HTMLCanvasElement;
  overlay: HTMLElement;
  scoreEl: HTMLElement;
  levelEl: HTMLElement;
  linesEl: HTMLElement;
} {
  const wrapper = document.createElement('div');
  wrapper.className = 'game-wrapper';

  const leftHud = document.createElement('div');
  leftHud.className = 'hud hud-left';
  leftHud.innerHTML = `
    <div class="hud-block">
      <span class="hud-label">SCORE</span>
      <span class="hud-value" id="score">0</span>
    </div>
    <div class="hud-block">
      <span class="hud-label">LEVEL</span>
      <span class="hud-value" id="level">1</span>
    </div>
    <div class="hud-block">
      <span class="hud-label">LINES</span>
      <span class="hud-value" id="lines">0</span>
    </div>
  `;

  const boardContainer = document.createElement('div');
  boardContainer.className = 'board-container';

  const boardCanvas = document.createElement('canvas');
  boardCanvas.id = 'board';

  const overlay = document.createElement('div');
  overlay.className = 'overlay hidden';

  boardContainer.appendChild(boardCanvas);
  boardContainer.appendChild(overlay);

  const rightHud = document.createElement('div');
  rightHud.className = 'hud hud-right';
  rightHud.innerHTML = `
    <div class="hud-block">
      <span class="hud-label">NEXT</span>
      <canvas id="preview"></canvas>
    </div>
    <div class="hud-block controls">
      <span class="hud-label">CONTROLS</span>
      <span>← →  Move</span>
      <span>↑    Rotate CW</span>
      <span>Z    Rotate CCW</span>
      <span>↓    Soft drop</span>
      <span>SPC  Hard drop</span>
      <span>P    Pause</span>
      <span>R    Restart</span>
    </div>
  `;

  wrapper.appendChild(leftHud);
  wrapper.appendChild(boardContainer);
  wrapper.appendChild(rightHud);

  return {
    wrapper,
    boardCanvas,
    previewCanvas: boardCanvas, // placeholder; resolved after DOM append
    overlay,
    scoreEl: leftHud.querySelector('#score')!,
    levelEl: leftHud.querySelector('#level')!,
    linesEl: leftHud.querySelector('#lines')!,
  };
}

function buildMiniPlayer(video: YouTubeVideo): {
  bar: HTMLElement;
  playPauseBtn: HTMLButtonElement;
} {
  const bar = document.createElement('div');
  bar.className = 'mini-player';
  bar.innerHTML = `
    <img class="mini-thumb" src="${video.thumbnailUrl}" alt="" />
    <div class="mini-info">
      <span class="mini-title">${video.title}</span>
      <span class="mini-channel">${video.channelTitle}</span>
    </div>
    <div class="mini-controls">
      <button class="mini-btn" id="mini-playpause" title="Play/Pause">⏸</button>
    </div>
  `;
  return { bar, playPauseBtn: bar.querySelector('#mini-playpause')! };
}

function startGame(video: YouTubeVideo | null): void {
  app.innerHTML = '';

  const gameContainer = document.createElement('div');
  gameContainer.className = 'game-container';

  const { wrapper, boardCanvas, overlay, scoreEl, levelEl, linesEl } = buildGameDOM();
  gameContainer.appendChild(wrapper);

  let ytPlayer: YouTubePlayer | null = null;

  if (video) {
    const { bar, playPauseBtn } = buildMiniPlayer(video);
    gameContainer.appendChild(bar);

    ytPlayer = new YouTubePlayer(
      video.videoId,
      () => {},
      () => {},
    );

    playPauseBtn.addEventListener('click', () => {
      if (ytPlayer!.isPaused()) {
        ytPlayer!.play();
        playPauseBtn.textContent = '⏸';
      } else {
        ytPlayer!.pause();
        playPauseBtn.textContent = '▶';
      }
    });
  }

  app.appendChild(gameContainer);

  const previewCanvas = wrapper.querySelector<HTMLCanvasElement>('#preview')!;

  const game = new Game(
    boardCanvas,
    previewCanvas,
    scoreEl,
    levelEl,
    linesEl,
    overlay,
  );

  game.start();
  if (DEBUG) (window as any).__tetris = game;
}

function init(): void {
  const pregame = new PreGameScreen(app, (video) => {
    pregame.unmount();
    startGame(video);
  });
  pregame.mount();
}

init();
