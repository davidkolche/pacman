import {
  COLORS,
  TITLE_TEXT,
  TITLE_FONT,
  TITLE_FONT_SIZE,
  TITLE_OUTLINE_WIDTH,
  TITLE_EXTRUDE_DEPTH,
  TITLE_EXTRUDE_STEP,
  TITLE_SHINE_WIDTH,
} from './constants.js';
import { cachedImage } from './sprites.js';

// The pictures of the attract screen's title (our own design, not the
// official logo): the letters with their 3D block, and a mask of the
// letters' faces for the shine. Both are painted once per device scale into
// the characters' picture cache (sprites.js), so a resize or a new
// devicePixelRatio repaints them like the characters. Pac-Man, the ghosts
// and the timing are added by title.js on top of these.
// The font must be loaded before the first paint (main.js waits for it), or
// the cached pictures would keep a fallback font.

// Where the plain body color sits in the letters' gradient (top 0, bottom 1).
const BODY_STOP = 0.5;
const SHINE_MIDDLE_STOP = 0.5;
// Room around the letters for the outer half of the outline and its soft edge.
const SOFT_EDGE = 1;
export const TITLE_LETTERS_MARGIN = Math.ceil(TITLE_OUTLINE_WIDTH / 2 + SOFT_EDGE);

// The font is monospaced: every character is one font size wide, so the
// pictures' size is known before painting.
const TEXT_WIDTH = TITLE_TEXT.length * TITLE_FONT_SIZE;
export const TITLE_LETTERS_WIDTH = TEXT_WIDTH + TITLE_EXTRUDE_DEPTH + 2 * TITLE_LETTERS_MARGIN;
export const TITLE_LETTERS_HEIGHT = TITLE_FONT_SIZE + TITLE_EXTRUDE_DEPTH + 2 * TITLE_LETTERS_MARGIN;

// The dash's cell is left empty in the letters: Pac-Man chomps there.
export const TITLE_DASH_INDEX = TITLE_TEXT.indexOf('-');
export const TITLE_LAST_LETTER_INDEX = TITLE_TEXT.length - 1;
const LETTERS_TEXT = TITLE_TEXT.replace('-', ' ');

console.assert(TITLE_DASH_INDEX > 0, 'TITLE_TEXT needs a dash, Pac-Man takes its place');

// The middle of character cell index, from the letters picture's left edge.
export function titleCellCenterX(index) {
  return TITLE_LETTERS_MARGIN + (index + 1 / 2) * TITLE_FONT_SIZE;
}

function setLetterStyle(context) {
  context.font = TITLE_FONT;
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.lineJoin = 'round';
}

// A color between two '#RRGGBB' colors: amount 0 = from, 1 = to.
function mixColors(from, to, amount) {
  const channel = (color, index) => parseInt(color.slice(1 + 2 * index, 3 + 2 * index), 16);
  const mixed = [0, 1, 2].map((index) =>
    Math.round(channel(from, index) + (channel(to, index) - channel(from, index)) * amount));
  return `rgb(${mixed.join(', ')})`;
}

// The 3D block: copies of the outlined letters pushed back (down and
// right), the furthest first and darkest, each covered by the next.
function paintExtrusion(context) {
  context.lineWidth = TITLE_OUTLINE_WIDTH;
  for (let depth = TITLE_EXTRUDE_DEPTH; depth > 0; depth -= TITLE_EXTRUDE_STEP) {
    const color = mixColors(COLORS.TITLE_EXTRUDE_NEAR, COLORS.TITLE_EXTRUDE_FAR, depth / TITLE_EXTRUDE_DEPTH);
    context.strokeStyle = color;
    context.fillStyle = color;
    const offset = TITLE_LETTERS_MARGIN + depth;
    context.strokeText(LETTERS_TEXT, offset, offset);
    context.fillText(LETTERS_TEXT, offset, offset);
  }
}

// The letters' front: a blue outline in the maze wall color, then the face
// with light at the top and shade at the bottom, like the light on the
// fruits and characters.
function paintLetterFront(context) {
  context.lineWidth = TITLE_OUTLINE_WIDTH;
  context.strokeStyle = COLORS.WALL;
  context.strokeText(LETTERS_TEXT, TITLE_LETTERS_MARGIN, TITLE_LETTERS_MARGIN);
  const gradient = context.createLinearGradient(
    0, TITLE_LETTERS_MARGIN, 0, TITLE_LETTERS_MARGIN + TITLE_FONT_SIZE,
  );
  gradient.addColorStop(0, COLORS.TITLE_LIGHT);
  gradient.addColorStop(BODY_STOP, COLORS.TITLE_BODY);
  gradient.addColorStop(1, COLORS.TITLE_SHADE);
  context.fillStyle = gradient;
  context.fillText(LETTERS_TEXT, TITLE_LETTERS_MARGIN, TITLE_LETTERS_MARGIN);
}

function paintLetters(context) {
  setLetterStyle(context);
  paintExtrusion(context);
  paintLetterFront(context);
}

// Only the letters' faces, in any solid color: the shine is cut to this shape.
function paintLettersMask(context) {
  setLetterStyle(context);
  context.fillStyle = COLORS.TITLE_LIGHT;
  context.fillText(LETTERS_TEXT, TITLE_LETTERS_MARGIN, TITLE_LETTERS_MARGIN);
}

// How many real pixels one game pixel has on this context.
function deviceScale(context) {
  return context.getTransform().a;
}

function lettersImage(scale, look, paint) {
  return cachedImage(look, TITLE_LETTERS_WIDTH, TITLE_LETTERS_HEIGHT, scale, paint);
}

// At whole game pixels, so the cached picture is copied 1:1.
export function drawTitleLetters(context, left, top) {
  const image = lettersImage(deviceScale(context), 'title letters', paintLetters);
  context.drawImage(image, left, top, TITLE_LETTERS_WIDTH, TITLE_LETTERS_HEIGHT);
}

// One reusable scratch canvas for the shine (a new one only when the size
// changes): the mask, then the band painted only where the mask is
// ('source-in'), then the result over the letters.
let shineCanvas = null;

function shineScratch(mask) {
  if (!shineCanvas || shineCanvas.width !== mask.width || shineCanvas.height !== mask.height) {
    shineCanvas = document.createElement('canvas');
    shineCanvas.width = mask.width;
    shineCanvas.height = mask.height;
  }
  return shineCanvas;
}

// progress 0..1: the band enters on the left and leaves on the right. The
// gradient runs from bottom left to top right, so the band is slanted.
export function drawTitleShine(context, left, top, progress) {
  const scale = deviceScale(context);
  const mask = lettersImage(scale, 'title letters mask', paintLettersMask);
  const scratch = shineScratch(mask);
  const shine = scratch.getContext('2d');
  shine.setTransform(1, 0, 0, 1, 0, 0);
  shine.globalCompositeOperation = 'copy';
  shine.drawImage(mask, 0, 0);
  shine.globalCompositeOperation = 'source-in';
  shine.setTransform(scale, 0, 0, scale, 0, 0);
  const center = -TITLE_SHINE_WIDTH + progress * (TITLE_LETTERS_WIDTH + 2 * TITLE_SHINE_WIDTH);
  const gradient = shine.createLinearGradient(
    center - TITLE_SHINE_WIDTH / 2, TITLE_LETTERS_HEIGHT, center + TITLE_SHINE_WIDTH / 2, 0,
  );
  gradient.addColorStop(0, COLORS.TITLE_SHINE_CLEAR);
  gradient.addColorStop(SHINE_MIDDLE_STOP, COLORS.TITLE_SHINE);
  gradient.addColorStop(1, COLORS.TITLE_SHINE_CLEAR);
  shine.fillStyle = gradient;
  shine.fillRect(0, 0, TITLE_LETTERS_WIDTH, TITLE_LETTERS_HEIGHT);
  context.drawImage(scratch, left, top, TITLE_LETTERS_WIDTH, TITLE_LETTERS_HEIGHT);
}
