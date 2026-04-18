function escapeSvgText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pickPalette(seedText) {
  const palettes = [
    ['#1f3c88', '#f0b429'],
    ['#7c2d12', '#fbbf24'],
    ['#14532d', '#86efac'],
    ['#312e81', '#c4b5fd'],
    ['#9a3412', '#fdba74'],
    ['#0f766e', '#99f6e4'],
  ];

  const seed = Array.from(seedText).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palettes[seed % palettes.length];
}

export function createBookCoverDataUrl({ title = 'Untitled Book', author = 'Unknown Author', category = 'Book' } = {}) {
  const [base, accent] = pickPalette(`${title}${author}${category}`);
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'BK';

  const safeTitle = escapeSvgText(title);
  const safeAuthor = escapeSvgText(author);
  const safeCategory = escapeSvgText(category);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420">
      <defs>
        <linearGradient id="cover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${base}" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
      </defs>
      <rect width="300" height="420" rx="22" fill="url(#cover)" />
      <rect x="20" y="20" width="260" height="380" rx="18" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.24)" />
      <text x="36" y="62" fill="white" font-size="16" font-family="Inter, Arial, sans-serif" letter-spacing="2">${safeCategory.toUpperCase()}</text>
      <text x="36" y="186" fill="rgba(255,255,255,0.18)" font-size="96" font-weight="700" font-family="Georgia, serif">${initials}</text>
      <foreignObject x="36" y="210" width="228" height="120">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:white;font-family:Georgia,serif;font-size:28px;line-height:1.15;font-weight:700;">
          ${safeTitle}
        </div>
      </foreignObject>
      <text x="36" y="372" fill="rgba(255,255,255,0.86)" font-size="18" font-family="Inter, Arial, sans-serif">${safeAuthor}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function shouldUseGeneratedCover(imageUrl) {
  if (!imageUrl) {
    return true;
  }

  return /via\.placeholder\.com/i.test(imageUrl);
}
