/**
 * Infinite scroll for the roll feed. Each additional gallery is a pre-rendered
 * static HTML fragment at /fragments/rolls/<slug>/ so images stay fully
 * optimised by Astro and nothing extra ships up front.
 */
const feed = document.querySelector<HTMLElement>('[data-feed]');

if (feed) {
  const sentinel = feed.querySelector<HTMLElement>('[data-feed-sentinel]');
  const status = feed.querySelector<HTMLElement>('[data-feed-status]');
  const moreBtn = feed.querySelector<HTMLButtonElement>('[data-feed-more]');
  const list = feed.querySelector<HTMLElement>('[data-feed-list]');

  const queue: string[] = JSON.parse(feed.dataset.pending || '[]');
  const batchSize = Number(feed.dataset.batch || '2');
  let loading = false;

  const setStatus = (text: string) => {
    if (status) status.textContent = text;
  };

  async function loadBatch(): Promise<void> {
    if (loading || queue.length === 0 || !list) return;
    loading = true;
    setStatus('Loading…');
    if (moreBtn) moreBtn.hidden = true;

    const slugs = queue.splice(0, batchSize);
    for (const slug of slugs) {
      try {
        const response = await fetch(`/fragments/rolls/${slug}/`);
        if (!response.ok) throw new Error(`${response.status}`);
        const html = await response.text();
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        list.append(template.content);
      } catch {
        // A single bad fragment shouldn't stop the feed.
        console.warn(`Could not load roll "${slug}"`);
      }
    }

    loading = false;

    if (queue.length === 0) {
      setStatus('End of roll.');
      observer?.disconnect();
      if (moreBtn) moreBtn.remove();
    } else {
      setStatus('');
      if (moreBtn) moreBtn.hidden = false;
      // If the sentinel is still on screen after appending, keep going.
      if (sentinel && sentinel.getBoundingClientRect().top < window.innerHeight) {
        void loadBatch();
      }
    }
  }

  const observer =
    sentinel && 'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) void loadBatch();
          },
          { rootMargin: '600px 0px' },
        )
      : null;

  if (queue.length === 0) {
    setStatus('End of roll.');
    moreBtn?.remove();
  } else {
    if (sentinel) observer?.observe(sentinel);
    if (moreBtn) {
      moreBtn.hidden = false;
      moreBtn.addEventListener('click', () => void loadBatch());
    }
  }
}

export {};
