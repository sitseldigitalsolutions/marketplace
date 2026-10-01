/**
 * Original, locally generated product illustrations (SVG → WebP) used for demo catalog imagery.
 * Each product type is drawn as a shaded object on a soft studio backdrop — no third-party or
 * copyrighted images are used. Real sellers replace these by uploading photos.
 */

export type ArtKind =
  | 'phone' | 'laptop' | 'earbuds' | 'headphones' | 'speaker' | 'smartwatch' | 'powerbank' | 'cable'
  | 'shirt' | 'jeans' | 'dress' | 'hoodie' | 'kurta' | 'tshirt' | 'running-shoe' | 'sneaker' | 'formal-shoe'
  | 'backpack' | 'watch' | 'earrings' | 'sunglasses' | 'pan' | 'pressure-cooker' | 'containers' | 'bedsheet'
  | 'rug' | 'lamp' | 'candles' | 'rice' | 'oil' | 'snack' | 'tea' | 'puzzle' | 'teddy' | 'scooter'
  | 'serum' | 'tube' | 'lipstick' | 'bottle' | 'perfume' | 'vase' | 'box';

const RULES: Array<[RegExp, ArtKind]> = [
  // Order matters: more specific phrases first (e.g. "headphones" before "phone").
  [/smartwatch|fit smart/i, 'smartwatch'],
  [/headphone|over-ear/i, 'headphones'],
  [/earbud|tws/i, 'earbuds'],
  [/phone|mobile/i, 'phone'],
  [/backpack|\bbag\b/i, 'backpack'],
  [/laptop|chromebook|notebook/i, 'laptop'],
  [/speaker/i, 'speaker'],
  [/power ?bank/i, 'powerbank'],
  [/cable|charger/i, 'cable'],
  [/t-shirt|\btee\b/i, 'tshirt'],
  [/shirt/i, 'shirt'],
  [/jeans|denim/i, 'jeans'],
  [/dress|maxi/i, 'dress'],
  [/hoodie|sweatshirt/i, 'hoodie'],
  [/kurta/i, 'kurta'],
  [/running/i, 'running-shoe'],
  [/sneaker/i, 'sneaker'],
  [/formal shoe|leather.*shoe|oxford/i, 'formal-shoe'],
  [/\bwatch/i, 'watch'],
  [/earring|jhumka/i, 'earrings'],
  [/sunglass/i, 'sunglasses'],
  [/pressure cooker/i, 'pressure-cooker'],
  [/cookware|\bpan\b|kadai|tawa/i, 'pan'],
  [/container|storage/i, 'containers'],
  [/bedsheet|bed sheet/i, 'bedsheet'],
  [/\brug\b|carpet/i, 'rug'],
  [/lamp/i, 'lamp'],
  [/candle/i, 'candles'],
  [/perfume|parfum|fragrance/i, 'perfume'],
  [/hair oil/i, 'bottle'],
  [/\brice\b|\batta\b|\bdal\b/i, 'rice'],
  [/\boil\b/i, 'oil'],
  [/makhana|snack|chips/i, 'snack'],
  [/\btea\b|coffee/i, 'tea'],
  [/puzzle/i, 'puzzle'],
  [/teddy|plush/i, 'teddy'],
  [/scooter/i, 'scooter'],
  [/serum/i, 'serum'],
  [/face wash|sunscreen|cream|\bgel\b/i, 'tube'],
  [/lipstick/i, 'lipstick'],
  [/vase/i, 'vase'],
];

export function artKindFor(title: string): ArtKind {
  return RULES.find(([re]) => re.test(title))?.[1] ?? 'box';
}

const COLOR_WORDS: Record<string, string> = {
  black: '#2b2d38', white: '#f4f5f8', blue: '#3b6fd8', red: '#d8433b', green: '#2f9e6b', pink: '#e96fa4',
  grey: '#8a8f9c', gray: '#8a8f9c', beige: '#d8c3a0', yellow: '#f2c230', navy: '#223a6b', brown: '#8a5a3b',
};

/** Deterministic palette per product (optionally tinted by a colour word in the title/variant). */
function palette(seed: string, colorHint?: string) {
  const hues = [255, 12, 170, 330, 215, 38, 145, 280];
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = hues[h % hues.length];
  const hint = colorHint && COLOR_WORDS[colorHint.toLowerCase()];
  return {
    bg1: `hsl(${hue} 70% 97%)`,
    bg2: `hsl(${(hue + 30) % 360} 65% 90%)`,
    main: hint ?? `hsl(${hue} 62% 52%)`,
    dark: hint ? shade(hint, -0.35) : `hsl(${hue} 55% 34%)`,
    light: hint ? shade(hint, 0.35) : `hsl(${hue} 80% 76%)`,
    accent: `hsl(${(hue + 160) % 360} 75% 55%)`,
  };
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

type P = ReturnType<typeof palette>;
const G = (id: string, a: string, b: string, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;

/** Object drawings, all within a 1000×1000 canvas, resting on y≈830. */
const DRAW: Record<ArtKind, (p: P) => string> = {
  phone: (p) => `${defs(G('b', p.light, p.dark, 1, 1), G('s', '#1d2030', '#3a4060', 1, 1))}
    <rect x="330" y="140" width="340" height="690" rx="54" fill="url(#b)"/>
    <rect x="348" y="160" width="304" height="650" rx="40" fill="url(#s)"/>
    <rect x="348" y="160" width="304" height="650" rx="40" fill="#fff" opacity=".06"/>
    <path d="M360 175 L560 175 L360 520 Z" fill="#fff" opacity=".08"/>
    <rect x="455" y="178" width="90" height="18" rx="9" fill="#0b0c12"/>
    <rect x="378" y="560" width="244" height="60" rx="14" fill="${p.main}" opacity=".85"/>
    <rect x="378" y="640" width="116" height="116" rx="22" fill="${p.accent}" opacity=".8"/><rect x="506" y="640" width="116" height="116" rx="22" fill="${p.light}" opacity=".7"/>
    <circle cx="700" cy="280" r="0"/>`,
  laptop: (p) => `${defs(G('b', '#e9ebf2', '#b9bdca'), G('s', '#1d2030', '#394061', 1, 1))}
    <rect x="215" y="215" width="570" height="380" rx="26" fill="#2a2d3a"/>
    <rect x="238" y="238" width="524" height="334" rx="10" fill="url(#s)"/>
    <path d="M250 250 L520 250 L250 470 Z" fill="#fff" opacity=".07"/>
    <rect x="270" y="280" width="200" height="26" rx="8" fill="${p.main}"/><rect x="270" y="324" width="300" height="16" rx="8" fill="#fff" opacity=".35"/><rect x="270" y="352" width="250" height="16" rx="8" fill="#fff" opacity=".25"/>
    <rect x="590" y="420" width="140" height="120" rx="16" fill="${p.accent}" opacity=".8"/>
    <path d="M150 600 H850 L810 660 H190 Z" fill="url(#b)"/><rect x="430" y="604" width="140" height="12" rx="6" fill="#9ca0ad"/>`,
  earbuds: (p) => `${defs(G('c', '#ffffff', '#dde0ea'), G('b', p.light, p.main, 1, 1))}
    <rect x="300" y="430" width="400" height="330" rx="160" fill="url(#c)" stroke="#cfd3de" stroke-width="4"/>
    <path d="M300 560 H700" stroke="#c4c8d4" stroke-width="5"/><circle cx="500" cy="640" r="12" fill="${p.accent}"/>
    <g transform="translate(360 250)"><ellipse cx="60" cy="70" rx="62" ry="70" fill="url(#b)"/><rect x="40" y="110" width="40" height="150" rx="20" fill="url(#b)"/><circle cx="60" cy="62" r="26" fill="${p.dark}" opacity=".5"/></g>
    <g transform="translate(520 230) rotate(12)"><ellipse cx="60" cy="70" rx="62" ry="70" fill="url(#b)"/><rect x="40" y="110" width="40" height="150" rx="20" fill="url(#b)"/><circle cx="60" cy="62" r="26" fill="${p.dark}" opacity=".5"/></g>`,
  headphones: (p) => `${defs(G('b', p.light, p.dark, 1, 1))}
    <path d="M270 560 C270 250 730 250 730 560" fill="none" stroke="${p.dark}" stroke-width="46" stroke-linecap="round"/>
    <path d="M300 540 C300 300 700 300 700 540" fill="none" stroke="#fff" stroke-width="10" opacity=".25"/>
    <rect x="200" y="500" width="150" height="250" rx="70" fill="url(#b)"/><rect x="650" y="500" width="150" height="250" rx="70" fill="url(#b)"/>
    <rect x="235" y="540" width="80" height="170" rx="40" fill="${p.dark}" opacity=".45"/><rect x="685" y="540" width="80" height="170" rx="40" fill="${p.dark}" opacity=".45"/>`,
  speaker: (p) => `${defs(G('b', p.light, p.dark, 1, 1))}
    <rect x="220" y="330" width="560" height="440" rx="200" fill="url(#b)"/>
    <rect x="260" y="370" width="480" height="360" rx="170" fill="${p.dark}" opacity=".35"/>
    ${Array.from({ length: 5 }, (_, r) => Array.from({ length: 11 }, (_, c) => `<circle cx="${310 + c * 38}" cy="${450 + r * 50}" r="8" fill="#fff" opacity=".35"/>`).join('')).join('')}
    <rect x="440" y="300" width="120" height="44" rx="18" fill="${p.dark}"/>`,
  smartwatch: (p) => `${defs(G('b', p.light, p.dark), G('s', '#171a28', '#343a58', 1, 1))}
    <rect x="410" y="80" width="180" height="300" rx="50" fill="url(#b)"/><rect x="410" y="620" width="180" height="300" rx="50" fill="url(#b)"/>
    <rect x="330" y="300" width="340" height="400" rx="90" fill="#2b2e3c"/><rect x="352" y="322" width="296" height="356" rx="72" fill="url(#s)"/>
    <text x="500" y="500" font-family="Arial" font-size="92" font-weight="700" fill="#fff" text-anchor="middle">10:09</text>
    <path d="M430 560 a70 70 0 0 1 140 0" fill="none" stroke="${p.accent}" stroke-width="16" stroke-linecap="round"/>
    <rect x="668" y="430" width="22" height="80" rx="10" fill="#555a6e"/>`,
  powerbank: (p) => `${defs(G('b', p.light, p.dark, 1, 1))}
    <rect x="330" y="170" width="340" height="630" rx="60" fill="url(#b)"/>
    <rect x="360" y="200" width="100" height="570" rx="40" fill="#fff" opacity=".12"/>
    ${[0, 1, 2, 3].map((i) => `<circle cx="${440 + i * 40}" cy="640" r="11" fill="${i < 3 ? '#7dffb8' : '#fff'}" opacity="${i < 3 ? 1 : 0.35}"/>`).join('')}
    <rect x="420" y="760" width="160" height="26" rx="12" fill="${p.dark}"/>`,
  cable: (p) => `${defs()}
    <path d="M250 300 C250 700 750 200 750 650" fill="none" stroke="${p.dark}" stroke-width="44" stroke-linecap="round"/>
    <path d="M250 300 C250 700 750 200 750 650" fill="none" stroke="${p.light}" stroke-width="18" stroke-dasharray="14 14" opacity=".6"/>
    <rect x="205" y="170" width="90" height="150" rx="22" fill="#d7dae4"/><rect x="228" y="120" width="44" height="70" rx="10" fill="#9ea3b2"/>
    <rect x="705" y="630" width="90" height="150" rx="22" fill="#d7dae4"/><rect x="728" y="760" width="44" height="60" rx="10" fill="#9ea3b2"/>`,
  shirt: (p) => `${defs(G('b', p.light, p.main))}
    <path d="M330 190 L420 150 Q500 220 580 150 L670 190 L800 330 L720 410 L670 360 L670 820 L330 820 L330 360 L280 410 L200 330 Z" fill="url(#b)"/>
    <path d="M420 150 Q500 220 580 150 L560 260 L500 220 L440 260 Z" fill="${p.dark}" opacity=".35"/>
    <line x1="500" y1="230" x2="500" y2="820" stroke="${p.dark}" stroke-width="5" opacity=".4"/>
    ${[320, 420, 520, 620, 720].map((y) => `<circle cx="500" cy="${y}" r="9" fill="#fff" opacity=".8"/>`).join('')}
    <rect x="360" y="330" width="90" height="70" rx="8" fill="${p.dark}" opacity=".18"/>`,
  jeans: (p) => `${defs(G('b', '#5b7fc4', '#2c4577'))}
    <path d="M330 150 H670 L700 840 H540 L500 400 L460 840 H300 Z" fill="url(#b)"/>
    <rect x="330" y="150" width="340" height="60" fill="#2a4172"/>
    <path d="M360 230 Q400 300 480 240" fill="none" stroke="#c9a14a" stroke-width="5"/><path d="M640 230 Q600 300 520 240" fill="none" stroke="#c9a14a" stroke-width="5"/>
    <circle cx="500" cy="180" r="10" fill="#c9a14a"/><line x1="500" y1="210" x2="500" y2="360" stroke="#c9a14a" stroke-width="4" stroke-dasharray="10 8"/>`,
  dress: (p) => `${defs(G('b', p.light, p.main))}
    <path d="M430 140 L470 150 Q500 190 530 150 L570 140 L600 330 L760 820 L240 820 L400 330 Z" fill="url(#b)"/>
    <path d="M400 330 H600" stroke="${p.dark}" stroke-width="16"/>
    ${[[380, 500], [560, 560], [460, 660], [620, 720], [330, 740], [500, 430]].map(([x, y]) => `<g transform="translate(${x} ${y})"><circle r="22" fill="#fff" opacity=".8"/><circle r="9" fill="${p.accent}"/></g>`).join('')}`,
  hoodie: (p) => `${defs(G('b', p.light, p.main))}
    <path d="M380 160 Q500 60 620 160 L700 200 L820 420 L740 460 L690 390 L690 820 L310 820 L310 390 L260 460 L180 420 L300 200 Z" fill="url(#b)"/>
    <path d="M400 170 Q500 280 600 170 Q560 120 500 120 Q440 120 400 170 Z" fill="${p.dark}" opacity=".35"/>
    <rect x="390" y="560" width="220" height="140" rx="30" fill="${p.dark}" opacity=".25"/>
    <line x1="470" y1="240" x2="460" y2="380" stroke="#fff" stroke-width="6"/><line x1="530" y1="240" x2="540" y2="380" stroke="#fff" stroke-width="6"/>`,
  kurta: (p) => `${defs(G('b', p.light, p.main))}
    <path d="M360 170 L440 140 Q500 200 560 140 L640 170 L760 360 L690 400 L650 340 L680 840 L320 840 L350 340 L310 400 L240 360 Z" fill="url(#b)"/>
    <path d="M500 190 V480" stroke="${p.dark}" stroke-width="6"/>
    ${Array.from({ length: 6 }, (_, i) => `<circle cx="500" cy="${220 + i * 45}" r="7" fill="#f6d57a"/>`).join('')}
    <path d="M330 780 H670" stroke="#f6d57a" stroke-width="14" stroke-dasharray="20 12"/>`,
  tshirt: (p) => `${defs(G('b', p.light, p.main), G('b2', '#ffd66b', '#f59e0b'), G('b3', '#7fe3c1', '#10b981'))}
    <g transform="translate(-120 40) scale(.8)"><path d="M330 190 L430 160 Q500 210 570 160 L670 190 L790 320 L710 390 L670 350 L670 800 L330 800 L330 350 L290 390 L210 320 Z" fill="url(#b3)"/></g>
    <g transform="translate(320 40) scale(.8)"><path d="M330 190 L430 160 Q500 210 570 160 L670 190 L790 320 L710 390 L670 350 L670 800 L330 800 L330 350 L290 390 L210 320 Z" fill="url(#b2)"/></g>
    <g transform="translate(100 80) scale(.8)"><path d="M330 190 L430 160 Q500 210 570 160 L670 190 L790 320 L710 390 L670 350 L670 800 L330 800 L330 350 L290 390 L210 320 Z" fill="url(#b)"/><circle cx="500" cy="440" r="70" fill="#fff" opacity=".7"/><path d="M470 430 l20 20 40 -40" stroke="${p.dark}" stroke-width="14" fill="none"/></g>`,
  'running-shoe': (p) => shoe(p, true),
  sneaker: (p) => shoe({ ...p, main: '#f4f5f8', dark: '#c9ccd6', light: '#ffffff' }, false),
  'formal-shoe': (p) => `${defs(G('b', '#8a5a3b', '#3d2415'))}
    <path d="M190 640 Q200 520 330 500 L520 470 Q640 450 700 520 Q820 540 830 640 Q830 700 760 700 L230 700 Q185 700 190 640 Z" fill="url(#b)"/>
    <path d="M330 500 Q420 560 560 480" fill="none" stroke="#2a180d" stroke-width="10"/>
    <path d="M200 690 H820" stroke="#1d1109" stroke-width="26" stroke-linecap="round"/>
    <path d="M260 560 Q420 520 640 540" stroke="#fff" stroke-width="10" opacity=".15" fill="none"/>`,
  backpack: (p) => `${defs(G('b', p.light, p.dark, 1, 1))}
    <path d="M400 190 Q400 120 500 120 Q600 120 600 190" fill="none" stroke="${p.dark}" stroke-width="30"/>
    <rect x="290" y="180" width="420" height="640" rx="120" fill="url(#b)"/>
    <rect x="350" y="520" width="300" height="220" rx="50" fill="${p.dark}" opacity=".35"/>
    <path d="M350 590 H650" stroke="#fff" stroke-width="8" opacity=".5"/><rect x="480" y="560" width="40" height="18" rx="6" fill="#f6d57a"/>
    <rect x="330" y="240" width="60" height="240" rx="30" fill="#fff" opacity=".12"/>`,
  watch: (p) => `${defs(G('b', '#8a5a3b', '#4a2d1a'), G('c', '#f1f2f6', '#b9bdca', 1, 1))}
    <rect x="430" y="90" width="140" height="820" rx="40" fill="url(#b)"/>
    <circle cx="500" cy="500" r="210" fill="url(#c)"/><circle cx="500" cy="500" r="176" fill="#fdfdfd" stroke="#d6d9e2" stroke-width="6"/>
    ${Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return `<line x1="${500 + Math.sin(a) * 150}" y1="${500 - Math.cos(a) * 150}" x2="${500 + Math.sin(a) * 165}" y2="${500 - Math.cos(a) * 165}" stroke="#2b2d38" stroke-width="${i % 3 ? 4 : 9}"/>`; }).join('')}
    <line x1="500" y1="500" x2="500" y2="390" stroke="#2b2d38" stroke-width="12" stroke-linecap="round"/><line x1="500" y1="500" x2="590" y2="540" stroke="#2b2d38" stroke-width="8" stroke-linecap="round"/><circle cx="500" cy="500" r="14" fill="${p.main}"/>`,
  earrings: (p) => [360, 640].map((x) => `
    <circle cx="${x}" cy="220" r="18" fill="none" stroke="#b7bcc9" stroke-width="10"/>
    <line x1="${x}" y1="238" x2="${x}" y2="330" stroke="#b7bcc9" stroke-width="8"/>
    <circle cx="${x}" cy="350" r="34" fill="#c7ccd9"/><circle cx="${x}" cy="350" r="16" fill="${p.accent}"/>
    <path d="M${x - 130} 560 Q${x} 390 ${x + 130} 560 Z" fill="#c1c6d3"/>
    <path d="M${x - 130} 560 Q${x} 470 ${x + 130} 560" fill="none" stroke="#8d93a3" stroke-width="8"/>
    ${[-100, -50, 0, 50, 100].map((d) => `<line x1="${x + d}" y1="560" x2="${x + d}" y2="640" stroke="#b7bcc9" stroke-width="5"/><circle cx="${x + d}" cy="650" r="14" fill="${p.main}"/>`).join('')}`).join(''),
  sunglasses: (p) => `${defs(G('l', '#2b2d38', p.dark, 1, 1))}
    <path d="M150 400 H850" stroke="#2b2d38" stroke-width="22"/>
    <path d="M170 410 Q170 640 330 640 Q470 640 470 420 Z" fill="url(#l)"/><path d="M530 420 Q530 640 670 640 Q830 640 830 410 Z" fill="url(#l)"/>
    <path d="M200 430 L330 430 L230 560 Z" fill="#fff" opacity=".18"/><path d="M560 430 L690 430 L590 560 Z" fill="#fff" opacity=".18"/>
    <path d="M470 430 Q500 400 530 430" stroke="#2b2d38" stroke-width="18" fill="none"/>`,
  pan: (p) => `${defs(G('b', '#3a3d4c', '#15161d'), G('r', '#6c7085', '#3a3d4c'))}
    <ellipse cx="430" cy="560" rx="300" ry="120" fill="url(#r)"/><ellipse cx="430" cy="545" rx="270" ry="98" fill="url(#b)"/>
    <ellipse cx="380" cy="520" rx="120" ry="32" fill="#fff" opacity=".07"/>
    <rect x="700" y="490" width="260" height="46" rx="23" fill="${p.dark}" transform="rotate(-12 700 490)"/>
    <ellipse cx="560" cy="330" rx="170" ry="60" fill="url(#r)" opacity=".9"/><ellipse cx="560" cy="320" rx="150" ry="46" fill="url(#b)"/>`,
  'pressure-cooker': (p) => `${defs(G('b', '#f1f2f6', '#9ea3b2', 1, 0))}
    <path d="M280 420 H720 V720 Q720 790 650 790 H350 Q280 790 280 720 Z" fill="url(#b)"/>
    <ellipse cx="500" cy="420" rx="230" ry="50" fill="#d9dce5"/><ellipse cx="500" cy="400" rx="200" ry="40" fill="#b9bdca"/>
    <rect x="470" y="300" width="60" height="100" rx="14" fill="#2b2d38"/><rect x="455" y="280" width="90" height="36" rx="12" fill="${p.main}"/>
    <rect x="700" y="400" width="240" height="40" rx="20" fill="#2b2d38"/><rect x="60" y="420" width="240" height="40" rx="20" fill="#2b2d38"/>
    <rect x="320" y="480" width="40" height="260" rx="20" fill="#fff" opacity=".5"/>`,
  containers: (p) => [[250, 460, 1], [500, 420, 1.15], [750, 470, 0.95]].map(([x, y, s], i) => `
    <g transform="translate(${x} ${y}) scale(${s})">
      <rect x="-110" y="-10" width="220" height="300" rx="30" fill="#eaf6ff" stroke="#b8d6ea" stroke-width="6" opacity=".95"/>
      <rect x="-100" y="${i === 1 ? 90 : 150}" width="200" height="${i === 1 ? 190 : 130}" rx="20" fill="${[p.accent, '#f2c230', '#7a4b2a'][i]}" opacity=".75"/>
      <rect x="-120" y="-50" width="240" height="56" rx="20" fill="${p.main}"/><rect x="-60" y="-66" width="120" height="24" rx="12" fill="${p.dark}"/>
    </g>`).join(''),
  bedsheet: (p) => `${defs(G('b', p.light, p.main, 1, 1))}
    <path d="M150 360 L720 280 L860 600 L290 700 Z" fill="url(#b)"/>
    ${Array.from({ length: 7 }, (_, i) => `<path d="M${190 + i * 80} ${355 - i * 11} L${330 + i * 80} ${690 - i * 14}" stroke="#fff" stroke-width="10" opacity=".35"/>`).join('')}
    <path d="M290 700 L860 600 L870 650 L300 760 Z" fill="${p.dark}"/>
    <rect x="600" y="200" width="240" height="120" rx="50" fill="#fff" transform="rotate(-10 600 200)" opacity=".95"/>`,
  rug: (p) => `${defs(G('b', '#d8b98a', '#a8804e'))}
    <ellipse cx="500" cy="560" rx="360" ry="230" fill="url(#b)"/>
    ${[300, 240, 180, 120, 60].map((r, i) => `<ellipse cx="500" cy="560" rx="${r}" ry="${r * 0.64}" fill="none" stroke="${i % 2 ? '#8a6436' : '#ecd6b0'}" stroke-width="16"/>`).join('')}`,
  lamp: (p) => `${defs(G('s', '#fff7e0', '#f5d98a'), G('b', p.light, p.dark, 1, 1))}
    <circle cx="500" cy="330" r="240" fill="#fff4c2" opacity=".45"/>
    <path d="M360 180 H640 L720 430 H280 Z" fill="url(#s)"/><path d="M360 180 H640" stroke="#e7c86a" stroke-width="10"/>
    <rect x="488" y="430" width="24" height="120" fill="#c9ccd6"/>
    <path d="M400 560 Q400 520 500 520 Q600 520 600 560 L630 800 Q630 830 500 830 Q370 830 370 800 Z" fill="url(#b)"/>`,
  candles: (p) => [[320, 470, 260], [500, 400, 330], [680, 500, 230]].map(([x, y, h], i) => `
    <rect x="${x - 70}" y="${y}" width="140" height="${h}" rx="18" fill="${['#f7e7d0', p.light, '#fde2e4'][i]}"/>
    <rect x="${x - 70}" y="${y + 40}" width="140" height="40" fill="${p.main}" opacity=".35"/>
    <line x1="${x}" y1="${y}" x2="${x}" y2="${y - 30}" stroke="#2b2d38" stroke-width="6"/>
    <path d="M${x} ${y - 110} Q${x + 34} ${y - 60} ${x} ${y - 30} Q${x - 34} ${y - 60} ${x} ${y - 110} Z" fill="#ffb02e"/>
    <circle cx="${x}" cy="${y - 60}" r="70" fill="#ffd66b" opacity=".18"/>`).join(''),
  rice: (p) => `${defs(G('b', '#f7f1e3', '#dcccaa'))}
    <path d="M330 220 Q500 170 670 220 L720 800 Q500 840 280 800 Z" fill="url(#b)"/>
    <path d="M330 220 Q500 170 670 220 L640 290 Q500 250 360 290 Z" fill="#c8b484"/>
    <rect x="360" y="420" width="280" height="240" rx="30" fill="${p.main}"/>
    <text x="500" y="520" font-family="Arial" font-size="58" font-weight="800" fill="#fff" text-anchor="middle">BASMATI</text>
    <text x="500" y="600" font-family="Arial" font-size="44" font-weight="700" fill="#fff" text-anchor="middle" opacity=".85">5 kg</text>
    ${Array.from({ length: 9 }, (_, i) => `<ellipse cx="${260 + i * 60}" cy="${840 - (i % 2) * 14}" rx="16" ry="7" fill="#f2ead6" transform="rotate(${i * 20} ${260 + i * 60} 840)"/>`).join('')}`,
  oil: (p) => `${defs(G('b', '#ffe07a', '#e0a31a', 1, 0))}
    <path d="M400 330 Q400 280 440 270 L440 200 H560 V270 Q600 280 600 330 L620 800 Q620 830 590 830 H410 Q380 830 380 800 Z" fill="url(#b)" opacity=".92"/>
    <rect x="430" y="150" width="140" height="60" rx="14" fill="${p.dark}"/>
    <rect x="395" y="480" width="210" height="200" rx="24" fill="#fff" opacity=".9"/>
    <circle cx="500" cy="560" r="44" fill="#6aa84f"/><path d="M500 530 Q530 560 500 600 Q470 560 500 530 Z" fill="#fff"/>
    <rect x="420" y="360" width="30" height="400" rx="15" fill="#fff" opacity=".35"/>`,
  snack: (p) => `${defs(G('b', p.light, p.main, 1, 1))}
    <path d="M320 180 L680 180 L700 220 L670 780 L700 820 L300 820 L330 780 L300 220 Z" fill="url(#b)"/>
    <path d="M300 220 H700 M300 780 H700" stroke="${p.dark}" stroke-width="10" stroke-dasharray="16 10"/>
    <circle cx="500" cy="500" r="130" fill="#fff" opacity=".9"/>
    ${[[470, 470], [530, 480], [490, 540], [540, 540], [450, 530]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="30" fill="#f4e6c9" stroke="#e0caa0" stroke-width="4"/>`).join('')}
    <rect x="370" y="670" width="260" height="46" rx="20" fill="${p.dark}"/>`,
  tea: (p) => `${defs(G('b', p.main, p.dark, 1, 1))}
    <path d="M300 300 L650 250 L760 330 L760 760 L410 820 L300 740 Z" fill="${p.dark}"/>
    <path d="M300 300 L650 250 L650 700 L300 740 Z" fill="url(#b)"/>
    <path d="M650 250 L760 330 L760 760 L650 700 Z" fill="${p.dark}" opacity=".7"/>
    <path d="M400 480 Q400 580 475 580 Q550 580 550 480 Z" fill="#fff"/><path d="M550 500 Q600 500 590 540 Q580 565 545 560" fill="none" stroke="#fff" stroke-width="12"/>
    <path d="M440 440 Q460 410 440 380 M490 440 Q510 410 490 380" stroke="#fff" stroke-width="8" fill="none" opacity=".7"/>`,
  puzzle: (p) => [[330, 330, p.main], [560, 330, '#f2c230'], [330, 560, p.accent], [560, 560, '#2f9e6b']].map(([x, y, c]) => `
    <g transform="translate(${x} ${y})"><rect width="210" height="210" rx="26" fill="${c}"/><circle cx="210" cy="105" r="36" fill="${c}"/><circle cx="105" cy="210" r="36" fill="${c}"/>
    <rect x="0" y="0" width="210" height="60" rx="26" fill="#fff" opacity=".18"/></g>`).join('') + `<text x="440" y="480" font-family="Arial" font-size="120" font-weight="900" fill="#fff" text-anchor="middle">A</text><text x="670" y="480" font-family="Arial" font-size="120" font-weight="900" fill="#fff" text-anchor="middle">B</text><text x="440" y="710" font-family="Arial" font-size="120" font-weight="900" fill="#fff" text-anchor="middle">C</text>`,
  teddy: (p) => {
    const f = '#c8905a', d = '#9e6a3c';
    return `<circle cx="350" cy="230" r="80" fill="${f}"/><circle cx="650" cy="230" r="80" fill="${f}"/><circle cx="350" cy="230" r="42" fill="#f1c9a0"/><circle cx="650" cy="230" r="42" fill="#f1c9a0"/>
    <ellipse cx="500" cy="630" rx="230" ry="220" fill="${f}"/><ellipse cx="500" cy="660" rx="130" ry="130" fill="#f1c9a0"/>
    <circle cx="500" cy="340" r="190" fill="${f}"/><ellipse cx="500" cy="400" rx="90" ry="70" fill="#f1c9a0"/>
    <circle cx="430" cy="320" r="18" fill="#2b2d38"/><circle cx="570" cy="320" r="18" fill="#2b2d38"/><ellipse cx="500" cy="385" rx="30" ry="22" fill="#2b2d38"/>
    <path d="M470 430 Q500 455 530 430" stroke="${d}" stroke-width="8" fill="none"/>
    <path d="M400 480 L500 520 L600 480 L600 530 L500 560 L400 530 Z" fill="${p.main}"/>
    <ellipse cx="330" cy="780" rx="80" ry="60" fill="${f}"/><ellipse cx="670" cy="780" rx="80" ry="60" fill="${f}"/>`;
  },
  scooter: (p) => `${defs(G('b', p.light, p.main, 1, 1))}
    <path d="M340 260 L300 700" stroke="#9ea3b2" stroke-width="30" stroke-linecap="round"/><path d="M260 250 H420" stroke="#2b2d38" stroke-width="34" stroke-linecap="round"/>
    <path d="M300 690 H720 Q760 690 760 720 H300 Z" fill="url(#b)"/>
    ${[[300, 760], [720, 760]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="70" fill="#2b2d38"/><circle cx="${x}" cy="${y}" r="38" fill="${p.accent}"/><circle cx="${x}" cy="${y}" r="14" fill="#fff"/>`).join('')}`,
  serum: (p) => `${defs(G('g', '#fff2d9', '#f3b86a', 1, 0))}
    <rect x="390" y="360" width="220" height="440" rx="44" fill="url(#g)" opacity=".92"/>
    <rect x="430" y="230" width="140" height="140" rx="20" fill="#2b2d38"/><ellipse cx="500" cy="180" rx="60" ry="70" fill="#3a3d4c"/>
    <rect x="420" y="480" width="160" height="200" rx="18" fill="#fff" opacity=".9"/>
    <text x="500" y="570" font-family="Arial" font-size="56" font-weight="800" fill="${p.dark}" text-anchor="middle">C</text>
    <text x="500" y="630" font-family="Arial" font-size="30" font-weight="700" fill="${p.main}" text-anchor="middle">10%</text>
    <rect x="405" y="380" width="26" height="380" rx="13" fill="#fff" opacity=".45"/>`,
  tube: (p) => `${defs(G('b', '#ffffff', p.light, 1, 0))}
    <path d="M360 170 H640 L600 700 H400 Z" fill="url(#b)" stroke="#d9dce5" stroke-width="4"/>
    <path d="M360 170 H640" stroke="${p.main}" stroke-width="30"/>
    <rect x="430" y="700" width="140" height="120" rx="20" fill="${p.main}"/>
    <path d="M430 330 Q500 260 570 330 Q500 420 430 330 Z" fill="${p.accent}" opacity=".8"/>
    <rect x="420" y="450" width="160" height="22" rx="10" fill="${p.dark}" opacity=".4"/><rect x="440" y="490" width="120" height="16" rx="8" fill="${p.dark}" opacity=".25"/>`,
  lipstick: (p) => `${defs(G('c', '#f6d57a', '#b8862a', 1, 0), G('l', p.light, p.dark, 1, 0))}
    <rect x="400" y="480" width="200" height="340" rx="20" fill="#2b2d38"/><rect x="415" y="420" width="170" height="80" rx="10" fill="url(#c)"/>
    <path d="M430 420 V250 L570 170 V420 Z" fill="url(#l)"/><path d="M440 410 V260 L470 243 V410 Z" fill="#fff" opacity=".25"/>
    <rect x="620" y="560" width="160" height="260" rx="18" fill="#2b2d38" opacity=".9"/>`,
  bottle: (p) => `${defs(G('b', '#b8452a', '#6a1f10', 1, 0))}
    <path d="M410 300 Q410 250 450 240 V180 H550 V240 Q590 250 590 300 V800 Q590 830 560 830 H440 Q410 830 410 800 Z" fill="url(#b)"/>
    <rect x="440" y="120" width="120" height="70" rx="16" fill="#2b2d38"/>
    <rect x="425" y="430" width="150" height="220" rx="20" fill="#fff" opacity=".92"/>
    <circle cx="500" cy="510" r="40" fill="#7a2cb8"/><path d="M500 480 L520 520 L480 520 Z" fill="#fff"/>
    <rect x="430" y="320" width="26" height="440" rx="13" fill="#fff" opacity=".25"/>`,
  perfume: (p) => `${defs(G('b', '#fff7ea', p.light, 1, 1))}
    <rect x="330" y="360" width="340" height="440" rx="60" fill="url(#b)" stroke="#e0d2b8" stroke-width="6" opacity=".95"/>
    <rect x="430" y="270" width="140" height="100" rx="16" fill="#c9a14a"/><rect x="410" y="180" width="180" height="110" rx="30" fill="#2b2d38"/>
    <rect x="380" y="520" width="240" height="140" rx="16" fill="#fff" opacity=".85"/>
    <text x="500" y="605" font-family="Georgia" font-size="46" font-style="italic" fill="#8a6436" text-anchor="middle">Santal</text>
    <rect x="350" y="390" width="40" height="380" rx="20" fill="#fff" opacity=".5"/>`,
  vase: (p) => `${defs(G('b', p.light, p.main, 1, 1))}
    <path d="M430 160 H570 Q560 260 640 360 Q720 470 680 640 Q640 820 500 820 Q360 820 320 640 Q280 470 360 360 Q440 260 430 160 Z" fill="url(#b)"/>
    <path d="M360 480 Q500 420 640 480" stroke="#fff" stroke-width="14" fill="none" opacity=".7"/><path d="M340 580 Q500 520 660 580" stroke="${p.dark}" stroke-width="10" fill="none" opacity=".4"/>
    <path d="M380 400 Q360 520 390 660" stroke="#fff" stroke-width="18" opacity=".25" fill="none"/>`,
  box: (p) => `${defs()}
    <path d="M300 360 L500 260 L700 360 L700 700 L500 800 L300 700 Z" fill="${p.main}"/>
    <path d="M300 360 L500 460 L700 360 L500 260 Z" fill="${p.light}"/><path d="M500 460 V800 L700 700 V360 Z" fill="${p.dark}"/>
    <path d="M400 310 L600 410 V480 L550 455 V385 L350 285 Z" fill="#fff" opacity=".6"/>`,
};

function shoe(p: P, sporty: boolean) {
  return `${defs(G('b', p.light, p.main, 1, 1))}
    <path d="M170 650 Q170 560 260 520 L420 440 Q470 420 500 460 L560 520 Q650 560 760 560 Q840 570 840 650 L840 690 H170 Z" fill="url(#b)"/>
    <path d="M160 690 H850 Q860 740 800 745 H210 Q150 740 160 690 Z" fill="${sporty ? p.accent : '#f0f1f5'}"/>
    <path d="M165 700 H850" stroke="${p.dark}" stroke-width="6" opacity=".4"/>
    ${[0, 1, 2, 3].map((i) => `<line x1="${430 + i * 34}" y1="${470 + i * 12}" x2="${470 + i * 34}" y2="${520 + i * 10}" stroke="${sporty ? '#fff' : p.dark}" stroke-width="10" stroke-linecap="round"/>`).join('')}
    <path d="M${sporty ? '280 610 Q480 520 700 620' : '300 600 Q500 580 740 610'}" stroke="${sporty ? '#fff' : p.dark}" stroke-width="${sporty ? 22 : 10}" fill="none" opacity=".8" stroke-linecap="round"/>`;
}

function defs(...g: string[]) {
  return g.length ? `<defs>${g.join('')}</defs>` : '';
}

/** Full 1000×1000 studio image for a product. `angle` 1 = alternate view (tinted backdrop, slight tilt). */
export function productSvg(title: string, opts: { angle?: number; colorHint?: string } = {}): string {
  const kind = artKindFor(title);
  const p = palette(title + (opts.colorHint ?? ''), opts.colorHint);
  const alt = (opts.angle ?? 0) % 2 === 1;
  const body = DRAW[kind](p);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
  <defs>
    <radialGradient id="bgGrad" cx="0.5" cy="0.38" r="0.75"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${alt ? p.bg2 : p.bg1}"/></radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="22"/></filter>
    <filter id="lift" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#1f2330" flood-opacity=".18"/></filter>
  </defs>
  <rect width="1000" height="1000" fill="url(#bgGrad)"/>
  ${alt ? `<circle cx="820" cy="170" r="140" fill="${p.light}" opacity=".35"/><circle cx="150" cy="820" r="90" fill="${p.accent}" opacity=".12"/>` : `<circle cx="160" cy="180" r="120" fill="${p.light}" opacity=".25"/>`}
  <ellipse cx="500" cy="860" rx="330" ry="46" fill="#1f2330" opacity=".14" filter="url(#soft)"/>
  <g filter="url(#lift)" transform="${alt ? 'rotate(-6 500 500) translate(10 -10)' : ''}">${body}</g>
</svg>`;
}
