import {
  COLORS,
  DIRECTION,
  PACMAN_DIAMETER,
  GHOST_SIZE,
  GHOST_EYE_WIDTH,
  GHOST_EYE_HEIGHT,
  GHOST_PUPIL_SIZE,
  GHOST_EYE_SPACING,
  GHOST_EYES,
} from './constants.js';

// Pac-Man and the ghosts as smooth canvas shapes (a deliberate change from
// the arcade's pixel art, in the same style as fruitArt.js). Only how a
// character looks lives here; renderer.js decides where and when.
// Pac-Man is designed in a PACMAN_DIAMETER square of game pixels, a ghost in
// a GHOST_SIZE square, (0,0) = top left. Every look (direction, mouth,
// color...) is painted once per device scale into a hidden canvas, and every
// frame only copies that picture, like the fruits.

const FULL_CIRCLE = 2 * Math.PI;
const HALF_CIRCLE = Math.PI;

// Light comes from the top left, like on the fruits: the shading's bright
// center is moved that way by this part of the shape's radius.
const LIGHT_OFFSET = 0.35;
// Where the plain color shows, between the light (0) and the shade (1).
const PLAIN_STOP = 0.5;

const PACMAN_RADIUS = PACMAN_DIAMETER / 2;

// The ghost: a half-circle head as wide as the sprite, straight sides, and a
// skirt of pointed feet along the bottom.
const GHOST_RADIUS = GHOST_SIZE / 2;
const GHOST_SKIRT_HEIGHT = 2;
const GHOST_SKIRT_TOP = GHOST_SIZE - GHOST_SKIRT_HEIGHT;
const GHOST_SKIRT_FEET = 4;

// Shortcut for the shape data: point(3, 4) reads better than { x: 3, y: 4 }.
function point(x, y) {
  return Object.freeze({ x, y });
}

// The skirt from the right edge to the left one: a foot tip on the bottom
// edge, then a notch up at GHOST_SKIRT_TOP, and so on. Both outer corners
// are feet.
function skirtPoints() {
  const halfFootWidth = GHOST_SIZE / (2 * GHOST_SKIRT_FEET);
  const points = [];
  for (let step = 0; step <= 2 * GHOST_SKIRT_FEET; step++) {
    const isFootTip = step % 2 === 0;
    points.push(point(GHOST_SIZE - step * halfFootWidth, isFootTip ? GHOST_SIZE : GHOST_SKIRT_TOP));
  }
  return Object.freeze(points);
}

const GHOST_SKIRT_POINTS = skirtPoints();

// A frightened ghost's fixed face: two small round eyes and a zigzag mouth,
// at the spots of the old pixel face.
const FRIGHTENED_EYES = Object.freeze([point(5, 6), point(9, 6)]);
const FRIGHTENED_EYE_RADIUS = 1;
const FRIGHTENED_MOUTH = Object.freeze([
  point(1.5, 10.5),
  point(3, 9.5),
  point(5, 10.5),
  point(7, 9.5),
  point(9, 10.5),
  point(11, 9.5),
  point(12.5, 10.5),
]);
const FRIGHTENED_MOUTH_WIDTH = 1;

// Keyed by the direction objects themselves, so the lookup compares by
// identity like the rest of the code (direction === DIRECTION.LEFT).
const GHOST_EYES_BY_DIRECTION = new Map([
  [DIRECTION.LEFT, GHOST_EYES.LEFT],
  [DIRECTION.RIGHT, GHOST_EYES.RIGHT],
  [DIRECTION.UP, GHOST_EYES.UP],
  [DIRECTION.DOWN, GHOST_EYES.DOWN],
]);
const GHOST_EYE_COUNT = 2;

// ---------- Shared helpers ----------

// Fills the current path with the plain color, then once more with a light
// spot on the top left and a shade on the far side, so the flat shape looks
// round. The second fill is see-through, so it works on any color.
function fillShaded(context, color, centerX, centerY, radius) {
  context.fillStyle = color;
  context.fill();
  const offset = radius * LIGHT_OFFSET;
  const gradient = context.createRadialGradient(
    centerX - offset, centerY - offset, 0, centerX, centerY, radius,
  );
  gradient.addColorStop(0, COLORS.SPRITE_LIGHT);
  gradient.addColorStop(PLAIN_STOP, COLORS.SPRITE_PLAIN);
  gradient.addColorStop(1, COLORS.SPRITE_SHADE);
  context.fillStyle = gradient;
  context.fill();
}

function fillCircle(context, x, y, radius, color) {
  context.beginPath();
  context.arc(x, y, radius, 0, FULL_CIRCLE);
  context.fillStyle = color;
  context.fill();
}

// ---------- Pac-Man ----------

// A circle with a wedge cut out in the facing direction: the path goes from
// the center out along one lip, around the back, and back along the other
// lip. A closed mouth (angle 0) leaves a full circle; a half angle of a half
// circle leaves nothing.
function paintPacman(context, direction, mouthHalfAngle) {
  const facing = Math.atan2(direction.y, direction.x);
  context.beginPath();
  context.moveTo(PACMAN_RADIUS, PACMAN_RADIUS);
  context.arc(
    PACMAN_RADIUS, PACMAN_RADIUS, PACMAN_RADIUS,
    facing + mouthHalfAngle, facing - mouthHalfAngle + FULL_CIRCLE,
  );
  context.closePath();
  fillShaded(context, COLORS.PACMAN, PACMAN_RADIUS, PACMAN_RADIUS, PACMAN_RADIUS);
}

// ---------- Ghosts ----------

function ghostBodyPath(context) {
  context.beginPath();
  // The head, from the left side over the top to the right side.
  context.arc(GHOST_RADIUS, GHOST_RADIUS, GHOST_RADIUS, HALF_CIRCLE, FULL_CIRCLE);
  for (const { x, y } of GHOST_SKIRT_POINTS) {
    context.lineTo(x, y);
  }
  context.closePath();
}

function paintGhostBody(context, color) {
  ghostBodyPath(context);
  fillShaded(context, color, GHOST_RADIUS, GHOST_RADIUS, GHOST_RADIUS);
}

// Round white eyeballs with a round pupil, both shifted toward the
// direction, so the ghost looks where it is going. GHOST_EYES places them
// in the same spots as the old pixel eyes.
function paintGhostEyes(context, direction) {
  const { eyeCol, eyeRow, pupilCol, pupilRow } = GHOST_EYES_BY_DIRECTION.get(direction);
  const pupilRadius = GHOST_PUPIL_SIZE / 2;
  for (let eye = 0; eye < GHOST_EYE_COUNT; eye++) {
    const eyeLeft = eyeCol + eye * GHOST_EYE_SPACING;
    context.beginPath();
    context.ellipse(
      eyeLeft + GHOST_EYE_WIDTH / 2, eyeRow + GHOST_EYE_HEIGHT / 2,
      GHOST_EYE_WIDTH / 2, GHOST_EYE_HEIGHT / 2, 0, 0, FULL_CIRCLE,
    );
    context.fillStyle = COLORS.GHOST_EYE_WHITE;
    context.fill();
    fillCircle(
      context, eyeLeft + pupilCol + pupilRadius, eyeRow + pupilRow + pupilRadius,
      pupilRadius, COLORS.GHOST_PUPIL,
    );
  }
}

function paintFrightenedFace(context, faceColor) {
  for (const { x, y } of FRIGHTENED_EYES) {
    fillCircle(context, x, y, FRIGHTENED_EYE_RADIUS, faceColor);
  }
  context.beginPath();
  context.moveTo(FRIGHTENED_MOUTH[0].x, FRIGHTENED_MOUTH[0].y);
  for (const { x, y } of FRIGHTENED_MOUTH.slice(1)) {
    context.lineTo(x, y);
  }
  context.lineWidth = FRIGHTENED_MOUTH_WIDTH;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = faceColor;
  context.stroke();
}

// ---------- Picture cache ----------

// One picture per look and device scale. A new scale (browser zoom, another
// monitor, a resized window) simply paints a new picture.
const imageCache = new Map();

// main.js empties the cache whenever the scale changes, like the fruits'
// cache, so pictures for old sizes do not pile up.
export function clearSpriteCache() {
  imageCache.clear();
}

// deviceScale = real screen pixels per game pixel. The picture has exactly
// that many pixels per game pixel, so drawing it size game pixels wide
// copies it 1:1, with no blur.
function cachedImage(look, size, deviceScale, paint) {
  const cacheKey = `${look}@${deviceScale}`;
  if (!imageCache.has(cacheKey)) {
    imageCache.set(cacheKey, paintImage(size, deviceScale, paint));
  }
  return imageCache.get(cacheKey);
}

function paintImage(size, deviceScale, paint) {
  const image = document.createElement('canvas');
  image.width = Math.round(size * deviceScale);
  image.height = image.width;
  const context = image.getContext('2d');
  context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
  paint(context);
  return image;
}

function directionKey(direction) {
  return `${direction.x},${direction.y}`;
}

// PACMAN_DIAMETER game pixels square.
export function getPacmanImage(direction, mouthHalfAngle, deviceScale) {
  return cachedImage(
    `pacman ${directionKey(direction)} ${mouthHalfAngle}`, PACMAN_DIAMETER, deviceScale,
    (context) => paintPacman(context, direction, mouthHalfAngle),
  );
}

// The rest are GHOST_SIZE game pixels square.
export function getGhostImage(color, direction, deviceScale) {
  return cachedImage(
    `ghost ${color} ${directionKey(direction)}`, GHOST_SIZE, deviceScale,
    (context) => {
      paintGhostBody(context, color);
      paintGhostEyes(context, direction);
    },
  );
}

// A frightened ghost does not look where it is going: it has a fixed face.
// The flash only swaps the colors.
export function getFrightenedGhostImage(isFlashWhite, deviceScale) {
  const bodyColor = isFlashWhite ? COLORS.GHOST_FLASH : COLORS.GHOST_FRIGHTENED;
  const faceColor = isFlashWhite ? COLORS.GHOST_FLASH_FACE : COLORS.GHOST_FRIGHTENED_FACE;
  return cachedImage(
    `frightened ${isFlashWhite}`, GHOST_SIZE, deviceScale,
    (context) => {
      paintGhostBody(context, bodyColor);
      paintFrightenedFace(context, faceColor);
    },
  );
}

// An eaten ghost: only its eyes hurry home.
export function getGhostEyesImage(direction, deviceScale) {
  return cachedImage(
    `eyes ${directionKey(direction)}`, GHOST_SIZE, deviceScale,
    (context) => paintGhostEyes(context, direction),
  );
}
