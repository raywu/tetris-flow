import type { LeaderboardEntry } from './types.ts';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function showLeaderboard(
  gameContainer: HTMLElement,
  userName: string | null,
  entries: LeaderboardEntry[],
  onDismiss: () => void,
  errorMessage?: string,
): () => void {
  const panel = document.createElement('div');
  panel.className = 'leaderboard-panel';

  const header = document.createElement('div');
  header.className = 'leaderboard-header';

  const title = document.createElement('span');
  title.className = 'leaderboard-title';
  title.textContent = userName ? `${userName}'s Leaderboard` : 'Leaderboard';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'panel-collapse';
  closeBtn.textContent = '^';

  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  const body = document.createElement('div');
  body.className = 'leaderboard-body';

  if (errorMessage) {
    const errP = document.createElement('p');
    errP.className = 'lb-error';
    errP.textContent = errorMessage;
    body.appendChild(errP);
  } else if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'lb-empty';
    empty.textContent = 'No scores yet.';
    body.appendChild(empty);
  } else {
    const table = document.createElement('table');
    table.className = 'lb-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Date</th>
          <th>Video</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        ${entries.map(e => `
          <tr>
            <td>${e.playedAt.toLocaleDateString()}</td>
            <td class="lb-video">${escapeHtml(e.videoTitle || '—')}</td>
            <td class="lb-score">${e.score.toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    `;
    body.appendChild(table);
  }

  panel.appendChild(body);
  gameContainer.appendChild(panel);
  document.body.classList.add('selector-open');

  function cleanup(): void {
    panel.remove();
    document.body.classList.remove('selector-open');
    onDismiss();
  }

  closeBtn.addEventListener('click', cleanup);

  return cleanup;
}
