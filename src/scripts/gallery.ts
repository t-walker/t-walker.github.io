/**
 * <film-gallery> — one roll: a large focused frame with prev/next arrows and a
 * clickable thumbnail rail underneath. Registered as a custom element so that
 * galleries injected later by the infinite-scroll feed upgrade automatically.
 */
class FilmGallery extends HTMLElement {
  private index = 0;
  private frames: HTMLElement[] = [];
  private thumbs: HTMLButtonElement[] = [];
  private caption: HTMLElement | null = null;
  private counter: HTMLElement | null = null;
  private prevBtn: HTMLButtonElement | null = null;
  private nextBtn: HTMLButtonElement | null = null;
  private rail: HTMLElement | null = null;
  private touchStartX = 0;
  private touchStartY = 0;

  connectedCallback(): void {
    if (this.dataset.ready === 'true') return;
    this.dataset.ready = 'true';

    this.frames = Array.from(this.querySelectorAll<HTMLElement>('.frame'));
    this.thumbs = Array.from(this.querySelectorAll<HTMLButtonElement>('.thumb'));
    this.caption = this.querySelector('.caption span') ?? this.querySelector('.caption');
    this.counter = this.querySelector('.stage__counter');
    this.prevBtn = this.querySelector('.stage__nav--prev');
    this.nextBtn = this.querySelector('.stage__nav--next');
    this.rail = this.querySelector('.rail__scroll');

    this.prevBtn?.addEventListener('click', () => this.go(-1));
    this.nextBtn?.addEventListener('click', () => this.go(1));

    this.thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => this.show(i)));

    this.querySelector('.rail__nav--prev')?.addEventListener('click', () => this.scrollRail(-1));
    this.querySelector('.rail__nav--next')?.addEventListener('click', () => this.scrollRail(1));

    this.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.go(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.go(-1);
      }
    });

    const stage = this.querySelector<HTMLElement>('.stage');
    stage?.addEventListener(
      'touchstart',
      (event) => {
        const touch = event.changedTouches[0];
        if (!touch) return;
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
      },
      { passive: true },
    );
    stage?.addEventListener(
      'touchend',
      (event) => {
        const touch = event.changedTouches[0];
        if (!touch) return;
        const dx = touch.clientX - this.touchStartX;
        const dy = touch.clientY - this.touchStartY;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) this.go(dx < 0 ? 1 : -1);
      },
      { passive: true },
    );

    this.show(0, { scrollThumb: false });
    this.syncRailNav();
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => this.syncRailNav()).observe(this);
    }
  }

  /** Hide the rail arrows when every thumbnail already fits on screen. */
  private syncRailNav(): void {
    if (!this.rail) return;
    const overflows = this.rail.scrollWidth > this.rail.clientWidth + 4;
    this.querySelectorAll<HTMLElement>('.rail__nav').forEach((btn) => {
      btn.hidden = !overflows;
    });
  }

  private go(delta: number): void {
    this.show(this.index + delta);
  }

  private show(next: number, options: { scrollThumb?: boolean } = {}): void {
    const { scrollThumb = true } = options;
    const clamped = Math.max(0, Math.min(next, this.frames.length - 1));
    this.index = clamped;

    this.frames.forEach((frame, i) => {
      frame.classList.toggle('is-active', i === clamped);
      frame.setAttribute('aria-hidden', i === clamped ? 'false' : 'true');
      // Warm the neighbouring frames so arrow clicks feel instant.
      if (Math.abs(i - clamped) <= 1) {
        frame.querySelector('img')?.setAttribute('loading', 'eager');
      }
    });

    this.thumbs.forEach((thumb, i) => {
      const active = i === clamped;
      thumb.classList.toggle('is-active', active);
      thumb.setAttribute('aria-selected', String(active));
      thumb.tabIndex = active ? 0 : -1;
    });

    if (this.caption) {
      const text = this.frames[clamped]?.dataset.caption ?? '';
      this.caption.textContent = text;
      this.caption.parentElement?.classList.toggle('is-empty', text === '');
    }
    if (this.counter) {
      this.counter.textContent = `${clamped + 1} / ${this.frames.length}`;
    }
    if (this.prevBtn) this.prevBtn.disabled = clamped === 0;
    if (this.nextBtn) this.nextBtn.disabled = clamped === this.frames.length - 1;

    if (scrollThumb) this.thumbs[clamped]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  private scrollRail(direction: number): void {
    if (!this.rail) return;
    this.rail.scrollBy({ left: direction * this.rail.clientWidth * 0.8, behavior: 'smooth' });
  }
}

if (!customElements.get('film-gallery')) {
  customElements.define('film-gallery', FilmGallery);
}

export {};
