let apiReady = false;
let apiReadyCallbacks: Array<() => void> = [];

function loadYTApi(): Promise<void> {
  if (apiReady) return Promise.resolve();
  if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
    return new Promise(resolve => apiReadyCallbacks.push(resolve));
  }
  return new Promise(resolve => {
    apiReadyCallbacks.push(resolve);
    (window as any).onYouTubeIframeAPIReady = () => {
      apiReady = true;
      for (const cb of apiReadyCallbacks) cb();
      apiReadyCallbacks = [];
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
}

export class YouTubePlayer {
  private player: YT.Player | null = null;
  private containerId: string;
  private videoId: string;
  private onReady: () => void;
  private onEnded: () => void;

  constructor(videoId: string, onReady: () => void, onEnded: () => void) {
    this.videoId = videoId;
    this.onReady = onReady;
    this.onEnded = onEnded;
    this.containerId = `yt-player-${Date.now()}`;
    this.init();
  }

  private async init(): Promise<void> {
    await loadYTApi();

    const container = document.createElement('div');
    container.id = this.containerId;
    container.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;top:0;left:0;';
    document.body.appendChild(container);

    this.player = new YT.Player(this.containerId, {
      width: '1',
      height: '1',
      videoId: this.videoId,
      playerVars: { autoplay: 1, controls: 0 },
      events: {
        onReady: () => this.onReady(),
        onStateChange: (e: YT.OnStateChangeEvent) => {
          if (e.data === YT.PlayerState.ENDED) this.onEnded();
        },
      },
    });
  }

  play(): void {
    this.player?.playVideo();
  }

  pause(): void {
    this.player?.pauseVideo();
  }

  isPaused(): boolean {
    return this.player?.getPlayerState() === YT.PlayerState.PAUSED;
  }

  getProgress(): { current: number; duration: number } | null {
    if (!this.player) return null;
    const duration = this.player.getDuration();
    if (!duration) return null;
    return { current: this.player.getCurrentTime(), duration };
  }

  destroy(): void {
    this.player?.destroy();
    this.player = null;
    document.getElementById(this.containerId)?.remove();
  }
}
