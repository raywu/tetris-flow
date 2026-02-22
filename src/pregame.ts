import type { YouTubeVideo } from './types.ts';
import { signIn, getToken } from './auth.ts';
import { fetchSubscriptions, searchVideos } from './youtube.ts';
import { buildRecommendations } from './recommendations.ts';

type State = 'idle' | 'signing-in' | 'loading' | 'ready' | 'error';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export class PreGameScreen {
  private container: HTMLElement;
  private onStart: (video: YouTubeVideo | null, videos: YouTubeVideo[]) => void;
  private skipLabel: string | undefined;
  private initialVideos: YouTubeVideo[] | undefined;
  private el: HTMLElement | null = null;
  private state: State = 'idle';
  private videos: YouTubeVideo[] = [];
  private token: string | null = null;
  private errorMessage = '';

  constructor(
    container: HTMLElement,
    onStart: (video: YouTubeVideo | null, videos: YouTubeVideo[]) => void,
    skipLabel?: string,
    initialVideos?: YouTubeVideo[],
  ) {
    this.container = container;
    this.onStart = onStart;
    this.skipLabel = skipLabel;
    this.initialVideos = initialVideos;
  }

  mount(): void {
    this.el = document.createElement('div');
    this.el.className = 'pregame';

    if (this.initialVideos?.length) {
      this.videos = this.initialVideos;
      this.state = 'ready';
      const t = getToken();
      if (t) this.token = t;
      this.render();
      this.container.appendChild(this.el);
      return;
    }

    const existing = getToken();
    if (existing) {
      this.token = existing;
      this.state = 'loading';
    }

    this.render();
    this.container.appendChild(this.el);

    if (existing) {
      this.loadRecommendations();
    }
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
            ${this.skipLabel ? `<button class="btn btn-ghost" id="pg-skip">${this.skipLabel}</button>` : ''}
          </div>
        `;

      case 'signing-in':
      case 'loading':
        return `
          <div class="pregame-status">
            <span class="spinner"></span>
            <span>${this.state === 'signing-in' ? 'Signing in...' : 'Finding recommendations...'}</span>
          </div>
          ${this.skipLabel ? `<div class="pregame-actions"><button class="btn btn-ghost" id="pg-skip">${this.skipLabel}</button></div>` : ''}
        `;

      case 'ready':
        return `
          <div class="pregame-search-row">
            <input class="pregame-search" id="pg-search" type="text" placeholder="Search YouTube..." />
            ${this.token ? `<button class="btn btn-ghost" id="pg-refresh" title="Refresh recommendations">↺</button>` : ''}
          </div>
          ${this.videos.length > 0
            ? `<div class="rec-grid">${this.videos.map(v => this.buildCard(v)).join('')}</div>`
            : `<p class="pregame-status">No recommendations found. Search above or skip.</p>`
          }
          ${this.skipLabel ? `<div class="pregame-actions"><button class="btn btn-ghost" id="pg-skip">${this.skipLabel}</button></div>` : ''}
        `;

      case 'error':
        return `
          <div class="pregame-error">
            <span class="pregame-error-msg">${this.errorMessage}</span>
            <button class="btn btn-ghost" id="pg-retry">Try again</button>
          </div>
          ${this.skipLabel ? `<div class="pregame-actions"><button class="btn btn-ghost" id="pg-skip">${this.skipLabel}</button></div>` : ''}
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
    this.el?.querySelector('#pg-skip')?.addEventListener('click', () => this.onStart(null, this.videos));
    this.el?.querySelector('#pg-retry')?.addEventListener('click', () => this.setState('idle'));
    this.el?.querySelector('#pg-refresh')?.addEventListener('click', () => {
      this.setState('loading');
      this.loadRecommendations();
    });

    this.el?.querySelectorAll('.rec-card').forEach(card => {
      card.addEventListener('click', () => {
        const videoId = (card as HTMLElement).dataset.videoId!;
        const video = this.videos.find(v => v.videoId === videoId) ?? null;
        this.onStart(video, this.videos);
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
      await this.loadRecommendations();
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'Sign-in failed';
      this.setState('error');
    }
  }

  private async loadRecommendations(): Promise<void> {
    try {
      const subs = await fetchSubscriptions(this.token!);
      this.videos = await buildRecommendations(this.token!, subs);
      this.setState('ready');
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'Failed to load recommendations';
      this.setState('error');
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
