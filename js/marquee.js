import {
  COLORS,
  DIRECTION,
  GHOST_STARTS,
  PACMAN_DIAMETER,
  TITLE_TEXT,
  MARQUEE_HEIGHT_CSS_PX,
  MARQUEE_GAP_CSS_PX,
  MARQUEE_LETTER_SIZE_CSS_PX,
  MARQUEE_FRAME_CSS_PX,
  MARQUEE_BULB_SPACING_CSS_PX,
  MARQUEE_PACMAN_MOUTH_DEGREES,
  MARQUEE_PEEK_GHOSTS,
} from './constants.js';
import { getPacmanImage, getGhostImage, GHOST_PICTURE_SIZE } from './sprites.js';

// The arcade "marquee": the lit sign above the canvas, built once in HTML
// and styled in css/style.css. This module only builds it, sizes it and
// copies our cached sprites into it; main.js decides whether it fits.
// The title has the attract-screen title's style: our Pac-Man in place of
// the dash, ghosts peeking in at the edges.

const marquee = document.getElementById('marquee');
const DEGREES_PER_HALF_TURN = 180;
const PACMAN_MOUTH_HALF_ANGLE = MARQUEE_PACMAN_MOUTH_DEGREES * Math.PI / DEGREES_PER_HALF_TURN;
// Ghost pictures are larger than Pac-Man's in the game; same here.
const GHOST_SIZE_CSS_PX = MARQUEE_LETTER_SIZE_CSS_PX * GHOST_PICTURE_SIZE / PACMAN_DIAMETER;
const [WORD_BEFORE_DASH, WORD_AFTER_DASH] = TITLE_TEXT.split('-');
// Bulbs sit on the frame's middle line.
const BULB_INSET_CSS_PX = MARQUEE_FRAME_CSS_PX / 2;

// The parts that change after setup (sizes, pictures).
const parts = { bulbs: null, pacman: null, ghosts: {}, bulbsWidth: null };

function element(tag, className, children = []) {
  const node = document.createElement(tag);
  node.className = className;
  node.append(...children);
  return node;
}

// A word of the title: the text itself is the gradient face; a copy in
// data-text is the outlined 3D block behind it (style.css, ::before).
function titleWord(text) {
  const word = element('span', 'marquee-word', [text]);
  word.dataset.text = text;
  return word;
}

// The sizes JS also needs (layout, bulbs) and the colors shared with the
// canvas title come from constants.js, so they are set here, not in CSS.
function setCssVariables() {
  const variables = {
    '--marquee-height': `${MARQUEE_HEIGHT_CSS_PX}px`,
    '--marquee-gap': `${MARQUEE_GAP_CSS_PX}px`,
    '--marquee-letter-size': `${MARQUEE_LETTER_SIZE_CSS_PX}px`,
    '--marquee-frame': `${MARQUEE_FRAME_CSS_PX}px`,
    '--marquee-ghost-size': `${GHOST_SIZE_CSS_PX}px`,
    '--marquee-wall': COLORS.WALL,
    '--marquee-title-light': COLORS.TITLE_LIGHT,
    '--marquee-title-body': COLORS.TITLE_BODY,
    '--marquee-title-shade': COLORS.TITLE_SHADE,
    '--marquee-extrude-near': COLORS.TITLE_EXTRUDE_NEAR,
    '--marquee-extrude-far': COLORS.TITLE_EXTRUDE_FAR,
  };
  for (const [name, value] of Object.entries(variables)) {
    marquee.style.setProperty(name, value);
  }
}

// Frame (chrome, with the bulbs on it) around the panel (the backlit sign),
// which holds the tilted title and the peeking ghosts.
export function setupMarquee() {
  setCssVariables();
  parts.pacman = element('canvas', 'marquee-pacman');
  parts.ghosts.left = element('canvas', 'marquee-ghost marquee-ghost-left');
  parts.ghosts.right = element('canvas', 'marquee-ghost marquee-ghost-right');
  parts.bulbs = element('div', 'marquee-bulbs');
  const title = element('div', 'marquee-title', [
    titleWord(WORD_BEFORE_DASH),
    parts.pacman,
    titleWord(WORD_AFTER_DASH),
  ]);
  const panel = element('div', 'marquee-panel', [parts.ghosts.left, title, parts.ghosts.right]);
  marquee.replaceChildren(element('div', 'marquee-frame', [parts.bulbs, panel]));
}

// Evenly spaced points from start to end, about spacing apart, both ends
// included.
function spacedPoints(start, end, spacing) {
  const gaps = Math.max(1, Math.round((end - start) / spacing));
  return Array.from({ length: gaps + 1 }, (unused, index) => start + (index * (end - start)) / gaps);
}

// Bulb centers clockwise from the top left corner, so a chase-lights
// animation can run around the sign by index.
function bulbCenters(width, height) {
  const left = BULB_INSET_CSS_PX;
  const top = BULB_INSET_CSS_PX;
  const right = width - BULB_INSET_CSS_PX;
  const bottom = height - BULB_INSET_CSS_PX;
  const across = spacedPoints(left, right, MARQUEE_BULB_SPACING_CSS_PX);
  // The corners belong to the top and bottom rows.
  const down = spacedPoints(top, bottom, MARQUEE_BULB_SPACING_CSS_PX).slice(1, -1);
  return [
    ...across.map((x) => ({ x, y: top })),
    ...down.map((y) => ({ x: right, y })),
    ...[...across].reverse().map((x) => ({ x, y: bottom })),
    ...[...down].reverse().map((y) => ({ x: left, y })),
  ];
}

// Rebuilt only when the sign's width changes.
function placeBulbs(width) {
  if (parts.bulbsWidth === width) {
    return;
  }
  parts.bulbsWidth = width;
  const bulbs = bulbCenters(width, MARQUEE_HEIGHT_CSS_PX).map(({ x, y }, index) => {
    const bulb = element('span', 'marquee-bulb');
    bulb.style.left = `${x}px`;
    bulb.style.top = `${y}px`;
    bulb.style.setProperty('--bulb-index', index);
    return bulb;
  });
  parts.bulbs.replaceChildren(...bulbs);
}

// A cached sprite copied 1:1 into a small canvas of sizeCss CSS pixels: the
// picture is fetched at exactly the canvas's real-pixel size.
function copySprite(canvas, sizeCss, pictureSize, getImage) {
  const sizeDevice = Math.round(sizeCss * window.devicePixelRatio);
  canvas.width = sizeDevice;
  canvas.height = sizeDevice;
  canvas.style.width = `${sizeCss}px`;
  canvas.style.height = `${sizeCss}px`;
  const picture = getImage(sizeDevice / pictureSize);
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, sizeDevice, sizeDevice);
  context.drawImage(picture, 0, 0, sizeDevice, sizeDevice);
}

function ghostColor(name) {
  return GHOST_STARTS.find((start) => start.name === name).color;
}

// The ghosts look in, toward the title.
function copySprites() {
  copySprite(parts.pacman, MARQUEE_LETTER_SIZE_CSS_PX, PACMAN_DIAMETER, (scale) =>
    getPacmanImage(DIRECTION.RIGHT, PACMAN_MOUTH_HALF_ANGLE, scale));
  copySprite(parts.ghosts.left, GHOST_SIZE_CSS_PX, GHOST_PICTURE_SIZE, (scale) =>
    getGhostImage(ghostColor(MARQUEE_PEEK_GHOSTS.left), DIRECTION.RIGHT, 0, scale));
  copySprite(parts.ghosts.right, GHOST_SIZE_CSS_PX, GHOST_PICTURE_SIZE, (scale) =>
    getGhostImage(ghostColor(MARQUEE_PEEK_GHOSTS.right), DIRECTION.LEFT, 0, scale));
}

// Called by main.js whenever the canvas is rebuilt (new size or pixel
// ratio, which also empties the sprite cache): the sign is as wide as the
// canvas, and its pictures are copied again at the new resolution.
export function layoutMarquee({ isShown, widthCss }) {
  marquee.hidden = !isShown;
  if (!isShown) {
    return;
  }
  marquee.style.setProperty('--marquee-width', `${widthCss}px`);
  placeBulbs(widthCss);
  copySprites();
}
