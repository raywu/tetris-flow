// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showLeaderboard } from './leaderboard.ts';
import type { LeaderboardEntry } from './types.ts';

function makeEntries(n: number): LeaderboardEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    score: (n - i) * 100,
    videoTitle: `Video ${i + 1}`,
    playedAt: new Date(2024, 0, i + 1),
  }));
}

describe('showLeaderboard', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    document.body.classList.remove('selector-open');
  });

  it('appends .leaderboard-panel to gameContainer', () => {
    showLeaderboard(container, 'Alice', [], () => {});
    expect(container.lastElementChild?.classList.contains('leaderboard-panel')).toBe(true);
  });

  it('title contains userName', () => {
    showLeaderboard(container, 'Alice', [], () => {});
    const header = container.querySelector('.leaderboard-header')!;
    expect(header.textContent).toContain('Alice');
  });

  it('renders 10 rows when 10 entries provided', () => {
    showLeaderboard(container, 'Alice', makeEntries(10), () => {});
    expect(container.querySelectorAll('tbody tr').length).toBe(10);
  });

  it('renders "No scores yet." when entries is empty', () => {
    showLeaderboard(container, 'Alice', [], () => {});
    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelector('.lb-empty')?.textContent).toBe('No scores yet.');
  });

  it('renders .lb-error when errorMessage is provided', () => {
    showLeaderboard(container, 'Alice', [], () => {}, 'Connection failed');
    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelector('.lb-error')?.textContent).toBe('Connection failed');
  });

  it('formats score with toLocaleString()', () => {
    showLeaderboard(container, 'Alice', [{ score: 1000, videoTitle: 'T', playedAt: new Date() }], () => {});
    const scoreCell = container.querySelector('.lb-score')!;
    expect(scoreCell.textContent).toBe((1000).toLocaleString());
  });

  it('close button calls onDismiss and removes panel', () => {
    const onDismiss = vi.fn();
    showLeaderboard(container, 'Alice', [], onDismiss);
    const btn = container.querySelector<HTMLButtonElement>('.panel-collapse')!;
    btn.click();
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(container.querySelector('.leaderboard-panel')).toBeNull();
  });

  it('returned cleanup fn removes panel and calls onDismiss', () => {
    const onDismiss = vi.fn();
    const cleanup = showLeaderboard(container, 'Alice', [], onDismiss);
    cleanup();
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(container.querySelector('.leaderboard-panel')).toBeNull();
  });

  it('adds selector-open on mount, removes on dismiss', () => {
    const cleanup = showLeaderboard(container, 'Alice', [], () => {});
    expect(document.body.classList.contains('selector-open')).toBe(true);
    cleanup();
    expect(document.body.classList.contains('selector-open')).toBe(false);
  });

  it('HTML-escapes videoTitle', () => {
    const malicious = '<script>alert(1)</script>';
    showLeaderboard(container, 'Alice', [{ score: 1, videoTitle: malicious, playedAt: new Date() }], () => {});
    const cell = container.querySelector('.lb-video')!;
    expect(cell.innerHTML).not.toContain('<script>');
    expect(cell.textContent).toContain('alert(1)');
  });
});
