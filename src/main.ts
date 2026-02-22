import './style.css';
import { Game } from './game.ts';
import { DEBUG } from './constants.ts';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = '';

const wrapper = document.createElement('div');
wrapper.className = 'game-wrapper';

// Left HUD: score, level, lines
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

// Center: board canvas + overlay
const boardContainer = document.createElement('div');
boardContainer.className = 'board-container';

const boardCanvas = document.createElement('canvas');
boardCanvas.id = 'board';

const overlay = document.createElement('div');
overlay.className = 'overlay hidden';

boardContainer.appendChild(boardCanvas);
boardContainer.appendChild(overlay);

// Right HUD: next piece preview + controls
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
app.appendChild(wrapper);

const previewCanvas = document.getElementById('preview') as HTMLCanvasElement;

const game = new Game(
  boardCanvas,
  previewCanvas,
  document.getElementById('score')!,
  document.getElementById('level')!,
  document.getElementById('lines')!,
  overlay,
);

game.start();
if (DEBUG) (window as any).__tetris = game;
