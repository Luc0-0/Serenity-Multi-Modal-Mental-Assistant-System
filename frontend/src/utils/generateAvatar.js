/**
 * Generates a deterministic SVG avatar featuring the user's initial letter
 * with a warm, elegant design based on a username hash.
 */

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

export function generateAvatar(name, size = 32) {
    const letter = (name?.[0] || "U").toUpperCase();
    const hash = hashCode(name || "User");

    // Warm palette derived from name hash
    const hue = 25 + (hash % 30);       // 25-55 range (amber/warm brown)
    const sat = 20 + (hash % 25);       // muted saturation
    const light = 22 + (hash % 14);     // dark background

    const bg = `hsl(${hue}, ${sat}%, ${light}%)`;
    const accent = `hsl(${hue + 5}, ${sat + 15}%, ${light + 35}%)`;
    const letterColor = `hsl(${hue + 10}, ${sat + 10}%, ${light + 50}%)`;

    // Decorative ring position varies by hash
    const ringOpacity = 0.15 + (hash % 20) * 0.01;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="14" fill="${bg}"/>
    <circle cx="32" cy="32" r="26" fill="none" stroke="${accent}" stroke-width="0.8" opacity="${ringOpacity}"/>
    <text x="32" y="32" dy="0.35em" text-anchor="middle"
      font-family="Playfair Display, Georgia, serif"
      font-size="30" font-weight="600" font-style="italic"
      fill="${letterColor}">${letter}</text>
  </svg>`;

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function generateAIAvatar(size = 32) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="14" fill="hsl(32, 18%, 20%)"/>
    <circle cx="32" cy="32" r="22" fill="none" stroke="hsl(38, 30%, 48%)" stroke-width="0.8" opacity="0.25"/>
    <circle cx="32" cy="32" r="13" fill="none" stroke="hsl(38, 28%, 52%)" stroke-width="0.6" opacity="0.18"/>
    <text x="32" y="32" dy="0.35em" text-anchor="middle"
      font-family="Playfair Display, Georgia, serif"
      font-size="28" font-weight="600" font-style="italic"
      fill="hsl(38, 35%, 62%)">S</text>
  </svg>`;

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
