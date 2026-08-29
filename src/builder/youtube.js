const VIDEO_ID = /^[A-Za-z0-9_-]{6,20}$/;

export function youtubeVideoId(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (VIDEO_ID.test(raw) && !raw.includes('/') && !raw.includes('.')) return raw;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let id = null;
    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] || null;
    else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      else {
        const parts = url.pathname.split('/').filter(Boolean);
        if (['shorts', 'embed', 'live'].includes(parts[0])) id = parts[1] || null;
      }
    }
    return id && VIDEO_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function canonicalYoutubeUrl(value) {
  const id = youtubeVideoId(value);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

export function youtubeThumbnailUrl(value, quality = 'maxresdefault') {
  const id = youtubeVideoId(value);
  return id ? `https://img.youtube.com/vi/${id}/${quality}.jpg` : null;
}
