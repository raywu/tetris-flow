import type { YouTubeVideo } from './types.ts';
import { signIn } from './auth.ts';
import { fetchSubscriptions, searchVideos } from './youtube.ts';
import { buildRecommendations } from './recommendations.ts';

type State = 'idle' | 'signing-in' | 'loading' | 'ready';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export class PreGameScreen {
  private container: HTMLElement;
  private onStart: (video: YouTubeVideo | null) => void;
  private el: HTMLElement | null = null;
  private state: State = 'idle';
  private videos: YouTubeVideo[] = [];
  private token: string | null = null;

  constructor(container: HTMLElement, onStart: (video: YouTubeVideo | null) => void) {
    this.container = container;
    this.onStart = onStart;
  }

  mount(): void {
    this.el = document.createElement('div');
    this.el.className = 'pregame';
    this.render();
    this.container.appendChild(this.el);
  }

  unmount(): void {
    this.el?.remove();
    this.el = null;
  }

  private render(): void {
    if (!this.el) return;
    this.el.innerHTML = this.buildHTML();
    this.attachListeners();
  }

  private buildHTML(): string {
    return `
      <div class="pregame-inner">
        <h1 class="pregame-title">TETRIS FLOW</h1>
        <p class="pregame-sub">Enter the zone. Learn while you play.</p>
        ${this.buildBody()}
      </div>
    `;
  }

  private buildBody(): string {
    switch (this.state) {
      case 'idle':
        return `
          <div class="pregame-actions">
            <button class="btn btn-primary" id="pg-signin">Sign in with Google</button>
            <button class="btn btn-ghost" id="pg-skip">Play without audio</button>
          </div>
        `;

      case 'signing-in':
      case 'loading':
        return `
          <div class="pregame-status">
            <span class="spinner"></span>
            <span>${this.state === 'signing-in' ? 'Signing in...' : 'Finding recommendations...'}</span>
          </div>
          <div class="pregame-actions">
            <button class="btn btn-ghost" id="pg-skip">Skip</button>
          </div>
        `;

      case 'ready':
        return `
          <div class="pregame-search-row">
            <input class="pregame-search" id="pg-search" type="text" placeholder="Search YouTube..." />
          </div>
          ${this.videos.length > 0
            ? `<div class="rec-grid">${this.videos.map(v => this.buildCard(v)).join('')}</div>`
            : `<p class="pregame-status">No recommendations found. Search above or skip.</p>`
          }
          <div class="pregame-actions">
            <button class="btn btn-ghost" id="pg-skip">Play without audio</button>
          </div>
        `;
    }
  }

  private buildCard(v: YouTubeVideo): string {
    return `
      <div class="rec-card" data-video-id="${v.videoId}">
        <img class="rec-thumb" src="${v.thumbnailUrl}" alt="" loading="lazy" />
        <div class="rec-info">
          <span class="rec-title">${v.title}</span>
          <span class="rec-meta">${v.channelTitle} · ${formatDuration(v.durationSeconds)}</span>
        </div>
      </div>
    `;
  }

  private attachListeners(): void {
    this.el?.querySelector('#pg-signin')?.addEventListener('click', () => this.handleSignIn());
    this.el?.querySelector('#pg-skip')?.addEventListener('click', () => this.onStart(null));

    this.el?.querySelectorAll('.rec-card').forEach(card => {
      card.addEventListener('click', () => {
        const videoId = (card as HTMLElement).dataset.videoId!;
        const video = this.videos.find(v => v.videoId === videoId) ?? null;
        this.onStart(video);
      });
    });

    const searchInput = this.el?.querySelector<HTMLInputElement>('#pg-search');
    if (searchInput) {
      let debounce: ReturnType<typeof setTimeout>;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => this.handleSearch(searchInput.value.trim()), 500);
      });
    }
  }

  private async handleSignIn(): Promise<void> {
    this.setState('signing-in');
    try {
      this.token = await signIn();
      this.setState('loading');
      const subs = await fetchSubscriptions(this.token);
      this.videos = await buildRecommendations(this.token, subs);
      this.setState('ready');
    } catch (err) {
      console.error('Sign-in failed:', err);
      this.setState('idle');
    }
  }

  private async handleSearch(query: string): Promise<void> {
    if (!query || !this.token) return;
    const results = await searchVideos(this.token, query);
    this.videos = results;
    this.render();
  }

  private setState(s: State): void {
    this.state = s;
    this.render();
  }
}
