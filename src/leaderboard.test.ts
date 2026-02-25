// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
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
  afterEach(() => {
    document.body.querySelector('.leaderboard-backdrop')?.remove();
    document.body.classList.remove('selector-open');
  });

  it('appends .leaderboard-backdrop to document.body', () => {
    showLeaderboard('Alice', [], () => {});
    expect(document.body.querySelector('.leaderboard-backdrop')).not.toBeNull();
  });

  it('contains .leaderboard-modal inside backdrop', () => {
    showLeaderboard('Alice', [], () => {});
    const modal = document.body.querySelector('.leaderboard-backdrop .leaderboard-modal');
    expect(modal).not.toBeNull();
  });

  it('title contains userName when provided', () => {
    showLeaderboard('Alice', [], () => {});
    expect(document.body.querySelector('.leaderboard-title')!.textContent).toContain('Alice');
  });

  it('title is "Leaderboard" when userName is null', () => {
    showLeaderboard(null, [], () => {});
    expect(document.body.querySelector('.leaderboard-title')!.textContent).toBe('Leaderboard');
  });

  it('renders 10 rows when 10 entries provided', () => {
    showLeaderboard('Alice', makeEntries(10), () => {});
    expect(document.body.querySelectorAll('tbody tr').length).toBe(10);
  });

  it('renders "No scores yet." when entries is empty', () => {
    showLeaderboard('Alice', [], () => {});
    expect(document.body.querySelector('table')).toBeNull();
    expect(document.body.querySelector('.lb-empty')?.textContent).toBe('No scores yet.');
  });

  it('renders .lb-error when errorMessage is provided', () => {
    showLeaderboard('Alice', [], () => {}, 'Connection failed');
    expect(document.body.querySelector('table')).toBeNull();
    expect(document.body.querySelector('.lb-error')?.textContent).toBe('Connection failed');
  });

  it('formats score with toLocaleString()', () => {
    showLeaderboard('Alice', [{ score: 1000, videoTitle: 'T', playedAt: new Date() }], () => {});
    expect(document.body.querySelector('.lb-score')!.textContent).toBe((1000).toLocaleString());
  });

  it('close button calls onDismiss and removes backdrop', () => {
    const onDismiss = vi.fn();
    showLeaderboard('Alice', [], onDismiss);
    document.body.querySelector<HTMLButtonElement>('.panel-collapse')!.click();
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(document.body.querySelector('.leaderboard-backdrop')).toBeNull();
  });

  it('returned cleanup fn removes backdrop and calls onDismiss', () => {
    const onDismiss = vi.fn();
    const cleanup = showLeaderboard('Alice', [], onDismiss);
    cleanup();
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(document.body.querySelector('.leaderboard-backdrop')).toBeNull();
  });

  it('does NOT add selector-open class to body', () => {
    showLeaderboard('Alice', [], () => {});
    expect(document.body.classList.contains('selector-open')).toBe(false);
  });

  it('HTML-escapes videoTitle', () => {
    showLeaderboard('Alice', [{ score: 1, videoTitle: '<script>alert(1)</script>', playedAt: new Date() }], () => {});
    const cell = document.body.querySelector('.lb-video')!;
    expect(cell.innerHTML).not.toContain('<script>');
    expect(cell.textContent).toContain('alert(1)');
  });
});
