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

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function buildGameDOM(): {
  wrapper: HTMLElement;
  boardCanvas: HTMLCanvasElement;
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
    overlay,
    scoreEl: leftHud.querySelector('#score')!,
    levelEl: leftHud.querySelector('#level')!,
    linesEl: leftHud.querySelector('#lines')!,
  };
}

function buildMiniPlayer(video: YouTubeVideo): {
  bar: HTMLElement;
  playPauseBtn: HTMLButtonElement;
  skipBtn: HTMLButtonElement;
} {
  const bar = document.createElement('div');
  bar.className = 'mini-player';
  bar.innerHTML = `
    <div class="mini-progress"><div class="mini-progress-fill"></div></div>
    <img class="mini-thumb" src="${video.thumbnailUrl}" alt="" />
    <div class="mini-info">
      <span class="mini-title">${video.title}</span>
      <span class="mini-channel">${video.channelTitle} &middot; <span class="mini-time">--:--</span></span>
    </div>
    <div class="mini-controls">
      <button class="mini-btn" id="mini-playpause" title="Play/Pause" disabled>⏸</button>
      <button class="mini-btn" id="mini-skip" title="Next video">⏭</button>
    </div>
  `;
  return {
    bar,
    playPauseBtn: bar.querySelector<HTMLButtonElement>('#mini-playpause')!,
    skipBtn: bar.querySelector<HTMLButtonElement>('#mini-skip')!,
  };
}

function startGame(initialVideo: YouTubeVideo | null, initialList: YouTubeVideo[]): void {
  app.innerHTML = '';

  const gameContainer = document.createElement('div');
  gameContainer.className = 'game-container';

  const { wrapper, boardCanvas, overlay, scoreEl, levelEl, linesEl } = buildGameDOM();
  gameContainer.appendChild(wrapper);
  app.appendChild(gameContainer);

  const previewCanvas = wrapper.querySelector<HTMLCanvasElement>('#preview')!;
  const game = new Game(boardCanvas, previewCanvas, scoreEl, levelEl, linesEl, overlay);

  let ytPlayer: YouTubePlayer | null = null;
  let progressInterval: ReturnType<typeof setInterval> | null = null;
  let miniBar: HTMLElement | null = null;
  let videoList: YouTubeVideo[] = initialList;
  let currentVideoId: string | null = null;
  let audioPausedByGame = false;
  let modalCleanup: (() => void) | null = null;

  function clearProgress(): void {
    if (progressInterval !== null) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }

  function startProgress(bar: HTMLElement): void {
    clearProgress();
    progressInterval = setInterval(() => {
      const prog = ytPlayer?.getProgress();
      if (!prog) return;
      const pct = prog.duration > 0 ? (prog.current / prog.duration) * 100 : 0;
      const fill = bar.querySelector<HTMLElement>('.mini-progress-fill');
      const timeEl = bar.querySelector<HTMLElement>('.mini-time');
      if (fill) fill.style.width = `${pct}%`;
      if (timeEl) timeEl.textContent = `${formatTime(prog.current)} / ${formatTime(prog.duration)}`;
    }, 1000);
  }

  function openVideoSelector(): void {
    if (modalCleanup) return; // already open

    const panel = document.createElement('div');
    panel.className = 'video-panel';

    const header = document.createElement('div');
    header.className = 'video-panel-header';

    const panelTitle = document.createElement('span');
    panelTitle.className = 'video-panel-title';
    panelTitle.textContent = 'Select Video';

    const caret = document.createElement('button');
    caret.className = 'panel-collapse';
    caret.textContent = '↑';

    header.appendChild(panelTitle);
    header.appendChild(caret);
    panel.appendChild(header);
    gameContainer.appendChild(panel);
    document.body.classList.add('selector-open');

    let selector: PreGameScreen | null = null;

    function onEsc(e: KeyboardEvent): void {
      if (e.code === 'Escape') {
        closePanel();
        game.resume();
      }
    }

    function closePanel(): void {
      document.removeEventListener('keydown', onEsc);
      selector?.unmount();
      panel.remove();
      document.body.classList.remove('selector-open');
      modalCleanup = null;
    }

    document.addEventListener('keydown', onEsc);
    modalCleanup = closePanel;

    selector = new PreGameScreen(panel, (v, videos) => {
      audioPausedByGame = false;
      closePanel();
      game.resume();
      if (v) {
        videoList = videos;
        mountVideo(v);
      }
    }, undefined, videoList);

    caret.addEventListener('click', () => {
      closePanel();
      game.resume();
    });

    selector.mount();
  }

  game.onPauseChange = (paused) => {
    if (paused) {
      if (ytPlayer && !ytPlayer.isPaused()) {
        ytPlayer.pause();
        audioPausedByGame = true;
      }
      openVideoSelector();
    } else {
      if (audioPausedByGame) {
        ytPlayer?.play();
        audioPausedByGame = false;
      }
      modalCleanup?.();
      modalCleanup = null;
    }
  };

  function showEnded(bar: HTMLElement): void {
    clearProgress();
    const fill = bar.querySelector<HTMLElement>('.mini-progress-fill');
    if (fill) fill.style.width = '100%';
    const timeEl = bar.querySelector<HTMLElement>('.mini-time');
    if (timeEl) timeEl.textContent = 'Finished';

    const controls = bar.querySelector<HTMLElement>('.mini-controls');
    if (controls) {
      controls.innerHTML = '<button class="mini-btn mini-btn-text" id="mini-change-end">Change video</button>';
      controls.querySelector('#mini-change-end')?.addEventListener('click', () => {
        if (game.getState().phase === 'playing') {
          game.pause(); // triggers onPauseChange(true) → openVideoSelector
        } else {
          openVideoSelector(); // game over or already paused
        }
      });
    }
  }

  function mountVideo(video: YouTubeVideo): void {
    ytPlayer?.destroy();
    clearProgress();
    miniBar?.remove();

    currentVideoId = video.videoId;

    const built = buildMiniPlayer(video);
    miniBar = built.bar;
    gameContainer.appendChild(miniBar);

    ytPlayer = new YouTubePlayer(
      video.videoId,
      () => {
        built.playPauseBtn.disabled = false;
        startProgress(built.bar);
      },
      () => showEnded(built.bar),
    );

    built.playPauseBtn.addEventListener('click', () => {
      if (ytPlayer!.isPaused()) {
        ytPlayer!.play();
        built.playPauseBtn.textContent = '⏸';
      } else {
        ytPlayer!.pause();
        built.playPauseBtn.textContent = '▶';
      }
    });

    built.skipBtn.addEventListener('click', () => {
      if (videoList.length === 0) return;
      const idx = videoList.findIndex(v => v.videoId === currentVideoId);
      const next = videoList[(idx + 1) % videoList.length];
      if (next) mountVideo(next);
    });
  }

  game.start();
  if (initialVideo) mountVideo(initialVideo);
  if (DEBUG) (window as any).__tetris = game;
}

function init(): void {
  const pregame = new PreGameScreen(app, (video, videos) => {
    pregame.unmount();
    startGame(video, videos);
  }, 'Play without audio');
  pregame.mount();
}

init();
