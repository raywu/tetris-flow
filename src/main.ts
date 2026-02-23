import './style.css';
import { Game } from './game.ts';
import { DEBUG } from './constants.ts';
import { PreGameScreen } from './pregame.ts';
import { YouTubePlayer } from './player.ts';
import { addToWatchLater } from './youtube.ts';
import { getToken } from './auth.ts';
import type { YouTubeVideo } from './types.ts';

if ((import.meta as any).env.DEV) {
  import('./debug.ts').then(({ mountDebugOverlay }) => mountDebugOverlay());
}

const BOOKMARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>`;
const EXTERNAL_LINK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

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
      <span>P/ESC  Pause</span>
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
  seekBackBtn: HTMLButtonElement;
  seekFwdBtn: HTMLButtonElement;
  speedBtn: HTMLButtonElement;
  playPauseBtn: HTMLButtonElement;
  skipBtn: HTMLButtonElement;
  saveBtn: HTMLButtonElement;
  openBtn: HTMLButtonElement;
  thumbEl: HTMLImageElement;
  titleEl: HTMLElement;
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
      <button class="mini-btn" id="mini-seek-back" title="Back 10s" disabled>«10</button>
      <button class="mini-btn" id="mini-seek-fwd" title="Forward 10s" disabled>10»</button>
      <button class="mini-btn" id="mini-speed" title="Playback speed" disabled>1×</button>
      <button class="mini-btn" id="mini-playpause" title="Play/Pause" disabled>⏸</button>
      <button class="mini-btn" id="mini-skip" title="Next video">⏭</button>
      <button class="mini-btn" id="mini-save" title="Save to Watch Later">${BOOKMARK_SVG}</button>
      <button class="mini-btn" id="mini-open" title="Open on YouTube">${EXTERNAL_LINK_SVG}</button>
    </div>
  `;
  return {
    bar,
    seekBackBtn: bar.querySelector<HTMLButtonElement>('#mini-seek-back')!,
    seekFwdBtn: bar.querySelector<HTMLButtonElement>('#mini-seek-fwd')!,
    speedBtn: bar.querySelector<HTMLButtonElement>('#mini-speed')!,
    playPauseBtn: bar.querySelector<HTMLButtonElement>('#mini-playpause')!,
    skipBtn: bar.querySelector<HTMLButtonElement>('#mini-skip')!,
    saveBtn: bar.querySelector<HTMLButtonElement>('#mini-save')!,
    openBtn: bar.querySelector<HTMLButtonElement>('#mini-open')!,
    thumbEl: bar.querySelector<HTMLImageElement>('.mini-thumb')!,
    titleEl: bar.querySelector<HTMLElement>('.mini-title')!,
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
  let dragController: AbortController | null = null;
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
    caret.textContent = '^';

    header.appendChild(panelTitle);
    header.appendChild(caret);
    panel.appendChild(header);
    gameContainer.appendChild(panel);
    document.body.classList.add('selector-open');

    let selector: PreGameScreen | null = null;

    function closePanel(): void {
      selector?.unmount();
      panel.remove();
      document.body.classList.remove('selector-open');
      modalCleanup = null;
    }

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

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.code !== 'Escape') return;
    if (modalCleanup) {
      modalCleanup();
      game.resume();
    } else {
      const phase = game.getState().phase;
      if (phase === 'playing') game.pause();
      else if (phase === 'paused') game.resume();
    }
  });

  let suppressSelector = false;

  game.onPauseChange = (paused) => {
    if (paused) {
      if (ytPlayer && !ytPlayer.isPaused()) {
        ytPlayer.pause();
        audioPausedByGame = true;
      }
      if (!suppressSelector) openVideoSelector();
    } else {
      if (audioPausedByGame) {
        ytPlayer?.play();
        audioPausedByGame = false;
      }
      modalCleanup?.();
      modalCleanup = null;
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    if (game.getState().phase === 'playing') {
      suppressSelector = true;
      game.pause();
      suppressSelector = false;
    } else if (ytPlayer && !ytPlayer.isPaused()) {
      ytPlayer.pause();
      audioPausedByGame = true;
    }
  });

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

  const SPEED_RATES = [0.75, 1, 1.25, 1.5, 2];

  function mountVideo(video: YouTubeVideo): void {
    ytPlayer?.destroy();
    clearProgress();
    dragController?.abort();
    dragController = new AbortController();
    const { signal } = dragController;
    miniBar?.remove();

    currentVideoId = video.videoId;

    let speedIndex = 1;

    const built = buildMiniPlayer(video);
    miniBar = built.bar;
    gameContainer.appendChild(miniBar);

    ytPlayer = new YouTubePlayer(
      video.videoId,
      () => {
        built.playPauseBtn.disabled = false;
        built.seekBackBtn.disabled = false;
        built.seekFwdBtn.disabled = false;
        built.speedBtn.disabled = false;
        startProgress(built.bar);
      },
      () => showEnded(built.bar),
    );

    const progressBar = built.bar.querySelector<HTMLElement>('.mini-progress')!;
    const progressFill = built.bar.querySelector<HTMLElement>('.mini-progress-fill')!;

    function getFraction(clientX: number): number {
      const rect = progressBar.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }
    function seekToFraction(fraction: number): void {
      const prog = ytPlayer?.getProgress();
      if (!prog?.duration) return;
      ytPlayer!.seekTo(fraction * prog.duration);
      progressFill.style.width = `${fraction * 100}%`;
    }

    let dragging = false;
    progressBar.addEventListener('mousedown', (e) => {
      dragging = true;
      progressFill.style.transition = 'none';
      seekToFraction(getFraction(e.clientX));
      e.preventDefault();
    }, { signal });
    document.addEventListener('mousemove', (e) => {
      if (dragging) seekToFraction(getFraction(e.clientX));
    }, { signal });
    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      progressFill.style.transition = '';
    }, { signal });

    built.seekBackBtn.addEventListener('click', () => {
      const prog = ytPlayer?.getProgress();
      if (prog) ytPlayer!.seekTo(prog.current - 10);
    });

    built.seekFwdBtn.addEventListener('click', () => {
      const prog = ytPlayer?.getProgress();
      if (prog) ytPlayer!.seekTo(prog.current + 10);
    });

    built.speedBtn.addEventListener('click', () => {
      speedIndex = (speedIndex + 1) % SPEED_RATES.length;
      const rate = SPEED_RATES[speedIndex];
      ytPlayer?.setPlaybackRate(rate);
      built.speedBtn.textContent = `${rate}×`;
    });

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

    built.saveBtn.addEventListener('click', async () => {
      const token = getToken();
      if (!token || !currentVideoId) return;
      built.saveBtn.disabled = true;
      built.saveBtn.innerHTML = '...';
      try {
        await addToWatchLater(token, currentVideoId);
        built.saveBtn.innerHTML = '✓';
      } catch {
        built.saveBtn.innerHTML = '✗';
      }
      setTimeout(() => {
        built.saveBtn.innerHTML = BOOKMARK_SVG;
        built.saveBtn.disabled = false;
      }, 2000);
    });

    function openOnYouTube(): void {
      const t = Math.floor(ytPlayer?.getProgress()?.current ?? 0);
      window.open(`https://www.youtube.com/watch?v=${currentVideoId}&t=${t}`, '_blank');
    }

    built.openBtn.addEventListener('click', openOnYouTube);
    built.thumbEl.addEventListener('click', openOnYouTube);
    built.titleEl.addEventListener('click', openOnYouTube);
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
