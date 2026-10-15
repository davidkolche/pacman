import { FRUIT, FRUIT_ART_SIZE, FRUIT_ART_COLORS, FRUIT_OUTLINE_WIDTH } from './constants.js';

// The fruit drawings: smooth canvas paths (a deliberate change from the
// arcade's pixel art). Only how a fruit looks lives here; when and where it
// appears is fruit.js's job.
// Every fruit is designed on a FRUIT_ART_SIZE x FRUIT_ART_SIZE grid of game
// pixels (0,0 = top left). It is painted once per device scale into a hidden
// canvas, and every frame only copies that picture: the paths, gradients and
// outlines are far slower than one drawImage, and they never change.
// The shapes below are drawing data (like the ghost's skirt in sprites.js): points on
// that 16x16 grid. Colors live in constants.js.

const FULL_CIRCLE = 2 * Math.PI;
const HALF_CIRCLE = Math.PI;

// Light comes from the top left: a gradient's bright center and the shine
// spots are moved that way by this part of the shape's radius.
const LIGHT_OFFSET = 0.35;
// Where the body color sits between the light (0) and the shade (1).
const BODY_STOP = 0.45;
const SHINE_ANGLE = -Math.PI / 4;
const SHINE_ALPHA = 0.9;
// Thin lines inside a shape (leaf veins, melon stripes, seeds' shading).
const DETAIL_WIDTH = 0.35;
const STEM_WIDTH = 0.9;

// ---------- Shared helpers ----------

// A radial gradient for a round part centered at (x, y): light near the top
// left, the body color in the middle, the shade on the far side.
function litGradient(context, x, y, radius, light, body, shade) {
  const offset = radius * LIGHT_OFFSET;
  const gradient = context.createRadialGradient(x - offset, y - offset, 0, x, y, radius);
  gradient.addColorStop(0, light);
  gradient.addColorStop(BODY_STOP, body);
  gradient.addColorStop(1, shade);
  return gradient;
}

// Fills the current path with the fill and draws the dark outline around it.
function fillAndOutline(context, fill, outline) {
  context.fillStyle = fill;
  context.fill();
  context.lineWidth = FRUIT_OUTLINE_WIDTH;
  context.lineJoin = 'round';
  context.strokeStyle = outline;
  context.stroke();
}

// A small white oval that makes a surface look shiny.
function paintShine(context, x, y, radiusX, radiusY, color) {
  context.beginPath();
  context.ellipse(x, y, radiusX, radiusY, SHINE_ANGLE, 0, FULL_CIRCLE);
  context.globalAlpha = SHINE_ALPHA;
  context.fillStyle = color;
  context.fill();
  context.globalAlpha = 1;
}

function paintCurvedLine(context, from, bend, to, width, color) {
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.quadraticCurveTo(bend.x, bend.y, to.x, to.y);
  context.lineWidth = width;
  context.lineCap = 'round';
  context.strokeStyle = color;
  context.stroke();
}

// A leaf from its base to its tip, between two bulging sides, with a vein.
function paintLeaf(context, leaf, colors) {
  const { base, tip, upperBend, lowerBend } = leaf;
  context.beginPath();
  context.moveTo(base.x, base.y);
  context.quadraticCurveTo(upperBend.x, upperBend.y, tip.x, tip.y);
  context.quadraticCurveTo(lowerBend.x, lowerBend.y, base.x, base.y);
  fillAndOutline(context, colors.leaf, colors.leafVein);
  context.beginPath();
  context.moveTo(base.x, base.y);
  context.lineTo(tip.x, tip.y);
  context.lineWidth = DETAIL_WIDTH;
  context.stroke();
}

// A closed path through a list of points with straight sides.
function polygonPath(context, points) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) {
    context.lineTo(point.x, point.y);
  }
  context.closePath();
}

// A closed path of cubic curves: start, then [control1, control2, end] steps.
function curvePath(context, start, curves) {
  context.beginPath();
  context.moveTo(start.x, start.y);
  for (const [first, second, end] of curves) {
    context.bezierCurveTo(first.x, first.y, second.x, second.y, end.x, end.y);
  }
  context.closePath();
}

// Shortcut for the shape data: point(3, 4) reads better than { x: 3, y: 4 }.
function point(x, y) {
  return Object.freeze({ x, y });
}

// ---------- Cherries ----------

// Two cherries, the back one a little higher, hanging from stems that meet
// at the top under a small leaf.
const CHERRY_SHAPE = Object.freeze({
  back: Object.freeze({ x: 10.8, y: 10.4, radius: 3.6 }),
  front: Object.freeze({ x: 5.2, y: 11.2, radius: 3.6 }),
  stemJoint: point(11.5, 2.2),
  backStem: Object.freeze({ from: point(10.6, 7.0), bend: point(11.8, 4.5) }),
  frontStem: Object.freeze({ from: point(5.6, 7.8), bend: point(6.5, 3.5) }),
  leaf: Object.freeze({
    base: point(11.5, 2.2), tip: point(15.0, 1.2), upperBend: point(13.0, 0.0), lowerBend: point(13.8, 3.4),
  }),
  shineRadiusX: 0.9,
  shineRadiusY: 0.55,
});

function paintCherry(context, ball, colors) {
  const { x, y, radius } = ball;
  context.beginPath();
  context.arc(x, y, radius, 0, FULL_CIRCLE);
  fillAndOutline(context, litGradient(context, x, y, radius, colors.light, colors.body, colors.shade), colors.outline);
  const offset = radius * LIGHT_OFFSET;
  paintShine(context, x - offset, y - offset, CHERRY_SHAPE.shineRadiusX, CHERRY_SHAPE.shineRadiusY, colors.highlight);
}

// Back to front: stems first (the cherries cover their ends), the back
// cherry, then the front one over it, and the leaf on top.
function paintCherries(context, colors) {
  const { back, front, stemJoint, backStem, frontStem, leaf } = CHERRY_SHAPE;
  paintCurvedLine(context, backStem.from, backStem.bend, stemJoint, STEM_WIDTH, colors.stem);
  paintCurvedLine(context, frontStem.from, frontStem.bend, stemJoint, STEM_WIDTH, colors.stem);
  paintCherry(context, back, colors);
  paintCherry(context, front, colors);
  paintLeaf(context, leaf, colors);
}

// ---------- Strawberry ----------

// A rounded heart pointing down, covered in seeds, under a green star-shaped
// crown of leaves.
const STRAWBERRY_SHAPE = Object.freeze({
  bodyStart: point(8, 4.4),
  bodyCurves: Object.freeze([
    [point(12.6, 3.8), point(14.8, 6.6), point(13.8, 9.6)],
    [point(12.8, 12.6), point(10.2, 14.8), point(8, 15.3)],
    [point(5.8, 14.8), point(3.2, 12.6), point(2.2, 9.6)],
    [point(1.2, 6.6), point(3.4, 3.8), point(8, 4.4)],
  ]),
  // The light point of the body's gradient and its reach.
  center: point(8, 9),
  radius: 7,
  seeds: Object.freeze([
    point(5, 7.4), point(8, 6.9), point(11, 7.4),
    point(3.8, 10), point(6.5, 9.6), point(9.5, 9.6), point(12.2, 10),
    point(5.2, 12.4), point(8, 12.2), point(10.8, 12.4),
    point(8, 14.3),
  ]),
  seedRadiusX: 0.42,
  seedRadiusY: 0.62,
  // The crown: leaf tips around the top, alternating with points close to
  // the stem.
  crown: Object.freeze([
    point(8, 3.0), point(9.2, 4.0), point(12.6, 3.6), point(10.2, 5.0), point(11.0, 6.8),
    point(8, 5.6), point(5.0, 6.8), point(5.8, 5.0), point(3.4, 3.6), point(6.8, 4.0),
  ]),
  stemFrom: point(8, 3.6),
  stemBend: point(8, 2.2),
  stemTo: point(9.0, 0.9),
  shine: point(4.6, 6.6),
  shineRadiusX: 0.9,
  shineRadiusY: 0.5,
});

function paintStrawberry(context, colors) {
  const shape = STRAWBERRY_SHAPE;
  curvePath(context, shape.bodyStart, shape.bodyCurves);
  const { x, y } = shape.center;
  fillAndOutline(context, litGradient(context, x, y, shape.radius, colors.light, colors.body, colors.shade), colors.outline);
  for (const seed of shape.seeds) {
    context.beginPath();
    context.ellipse(seed.x, seed.y, shape.seedRadiusX, shape.seedRadiusY, 0, 0, FULL_CIRCLE);
    context.fillStyle = colors.seed;
    context.fill();
    context.lineWidth = DETAIL_WIDTH / 2;
    context.strokeStyle = colors.seedShade;
    context.stroke();
  }
  paintShine(context, shape.shine.x, shape.shine.y, shape.shineRadiusX, shape.shineRadiusY, colors.highlight);
  paintCurvedLine(context, shape.stemFrom, shape.stemBend, shape.stemTo, STEM_WIDTH, colors.leafVein);
  polygonPath(context, shape.crown);
  fillAndOutline(context, colors.leaf, colors.leafVein);
}

// ---------- Orange (FRUIT.PEACH) ----------

// A round orange with a dimpled peel, a short stem and one leaf.
const ORANGE_SHAPE = Object.freeze({
  body: Object.freeze({ x: 8, y: 9.3, radius: 5.9 }),
  // Tiny dents scattered over the peel (drawn inside the body only).
  dimples: Object.freeze([
    point(5.2, 7.8), point(7.6, 6.6), point(10.4, 7.2), point(12.0, 9.4),
    point(4.4, 10.6), point(6.8, 9.6), point(9.2, 9.0), point(10.8, 11.6),
    point(5.8, 12.8), point(8.2, 12.0), point(8.8, 14.0), point(12.4, 12.6),
  ]),
  dimpleRadius: 0.32,
  dimpleAlpha: 0.45,
  stemFrom: point(8, 3.8),
  stemBend: point(8, 2.6),
  stemTo: point(7.0, 1.6),
  leaf: Object.freeze({
    base: point(8, 3.4), tip: point(13.2, 1.4), upperBend: point(10.0, 0.6), lowerBend: point(11.6, 3.8),
  }),
  shine: point(5.6, 6.8),
  shineRadiusX: 1.3,
  shineRadiusY: 0.75,
});

function paintOrange(context, colors) {
  const { body, dimples } = ORANGE_SHAPE;
  context.beginPath();
  context.arc(body.x, body.y, body.radius, 0, FULL_CIRCLE);
  fillAndOutline(
    context,
    litGradient(context, body.x, body.y, body.radius, colors.light, colors.body, colors.shade),
    colors.outline,
  );
  context.fillStyle = colors.dimple;
  context.globalAlpha = ORANGE_SHAPE.dimpleAlpha;
  for (const dimple of dimples) {
    context.beginPath();
    context.arc(dimple.x, dimple.y, ORANGE_SHAPE.dimpleRadius, 0, FULL_CIRCLE);
    context.fill();
  }
  context.globalAlpha = 1;
  const { shine } = ORANGE_SHAPE;
  paintShine(context, shine.x, shine.y, ORANGE_SHAPE.shineRadiusX, ORANGE_SHAPE.shineRadiusY, colors.highlight);
  paintCurvedLine(context, ORANGE_SHAPE.stemFrom, ORANGE_SHAPE.stemBend, ORANGE_SHAPE.stemTo, STEM_WIDTH, colors.stem);
  paintLeaf(context, ORANGE_SHAPE.leaf, colors);
}

// ---------- Apple ----------

// Wider at the top with a dip where the stem goes in, and a smaller dip at
// the bottom.
const APPLE_SHAPE = Object.freeze({
  bodyStart: point(8, 5.4),
  bodyCurves: Object.freeze([
    [point(9.8, 3.6), point(14.8, 3.8), point(14.4, 8.8)],
    [point(14.2, 12.6), point(11.8, 15.4), point(9.6, 15.0)],
    [point(8.8, 14.8), point(7.2, 14.8), point(6.4, 15.0)],
    [point(4.2, 15.4), point(1.8, 12.6), point(1.6, 8.8)],
    [point(1.2, 3.8), point(6.2, 3.6), point(8, 5.4)],
  ]),
  center: point(8, 9.6),
  radius: 7,
  stemFrom: point(8, 5.6),
  stemBend: point(7.8, 3.0),
  stemTo: point(9.0, 1.2),
  leaf: Object.freeze({
    base: point(8.4, 3.0), tip: point(13.4, 2.0), upperBend: point(10.6, 0.6), lowerBend: point(11.4, 4.2),
  }),
  shine: point(4.6, 7.4),
  shineRadiusX: 1.4,
  shineRadiusY: 0.8,
});

function paintApple(context, colors) {
  const shape = APPLE_SHAPE;
  curvePath(context, shape.bodyStart, shape.bodyCurves);
  const { x, y } = shape.center;
  fillAndOutline(context, litGradient(context, x, y, shape.radius, colors.light, colors.body, colors.shade), colors.outline);
  paintShine(context, shape.shine.x, shape.shine.y, shape.shineRadiusX, shape.shineRadiusY, colors.highlight);
  paintCurvedLine(context, shape.stemFrom, shape.stemBend, shape.stemTo, STEM_WIDTH, colors.stem);
  paintLeaf(context, shape.leaf, colors);
}

// ---------- Melon (FRUIT.GRAPES) ----------

// An oval melon with dark stripes running from the stem to the bottom.
const MELON_SHAPE = Object.freeze({
  body: Object.freeze({ x: 8, y: 9.4, radiusX: 6.6, radiusY: 5.6 }),
  // Each stripe is half of a narrower oval with the same height, so all of
  // them meet at the top and the bottom like the lines on a globe.
  stripeWidths: Object.freeze([0.25, 0.6, 0.9]),
  stripeAlpha: 0.7,
  stemFrom: point(8, 4.0),
  stemBend: point(8.2, 2.6),
  stemTo: point(9.6, 2.0),
  shine: point(5.0, 7.0),
  shineRadiusX: 1.4,
  shineRadiusY: 0.7,
});

function paintMelon(context, colors) {
  const { body } = MELON_SHAPE;
  context.beginPath();
  context.ellipse(body.x, body.y, body.radiusX, body.radiusY, 0, 0, FULL_CIRCLE);
  fillAndOutline(
    context,
    litGradient(context, body.x, body.y, body.radiusX, colors.light, colors.body, colors.shade),
    colors.outline,
  );
  context.lineWidth = DETAIL_WIDTH * 2;
  context.strokeStyle = colors.stripe;
  context.globalAlpha = MELON_SHAPE.stripeAlpha;
  context.beginPath();
  context.moveTo(body.x, body.y - body.radiusY);
  context.lineTo(body.x, body.y + body.radiusY);
  for (const width of MELON_SHAPE.stripeWidths) {
    const radiusX = body.radiusX * width;
    // Right half, then left half, each from the top to the bottom.
    context.moveTo(body.x, body.y - body.radiusY);
    context.ellipse(body.x, body.y, radiusX, body.radiusY, 0, -HALF_CIRCLE / 2, HALF_CIRCLE / 2);
    context.moveTo(body.x, body.y - body.radiusY);
    context.ellipse(body.x, body.y, radiusX, body.radiusY, 0, -HALF_CIRCLE / 2, HALF_CIRCLE / 2, true);
  }
  context.stroke();
  context.globalAlpha = 1;
  const { shine } = MELON_SHAPE;
  paintShine(context, shine.x, shine.y, MELON_SHAPE.shineRadiusX, MELON_SHAPE.shineRadiusY, colors.highlight);
  paintCurvedLine(context, MELON_SHAPE.stemFrom, MELON_SHAPE.stemBend, MELON_SHAPE.stemTo, STEM_WIDTH, colors.stem);
}

// ---------- Spaceship (FRUIT.GALAXIAN) ----------

// Our own small fighter, nose up: a yellow hull, swept blue wings, a red
// cockpit dome and an engine flame at the back.
const SPACESHIP_SHAPE = Object.freeze({
  hull: Object.freeze([
    point(8, 0.8), point(9.9, 5.4), point(10.4, 12.0), point(8, 13.4), point(5.6, 12.0), point(6.1, 5.4),
  ]),
  hullCenter: point(8, 7),
  hullRadius: 7,
  leftWing: Object.freeze([point(6.0, 7.2), point(1.0, 12.4), point(1.4, 14.0), point(5.8, 12.2)]),
  rightWing: Object.freeze([point(10.0, 7.2), point(15.0, 12.4), point(14.6, 14.0), point(10.2, 12.2)]),
  wingCenter: point(8, 11),
  wingRadius: 7,
  cockpit: Object.freeze({ x: 8, y: 6.6, radiusX: 1.1, radiusY: 1.8 }),
  flame: Object.freeze([point(6.6, 13.0), point(9.4, 13.0), point(8, 15.6)]),
  flameCore: Object.freeze([point(7.4, 13.2), point(8.6, 13.2), point(8, 14.6)]),
  shineRadiusX: 0.45,
  shineRadiusY: 0.7,
});

function paintSpaceship(context, colors) {
  const shape = SPACESHIP_SHAPE;
  // The flame first: the hull covers its top edge.
  polygonPath(context, shape.flame);
  context.fillStyle = colors.flame;
  context.fill();
  polygonPath(context, shape.flameCore);
  context.fillStyle = colors.flameCore;
  context.fill();

  const { x: wingX, y: wingY } = shape.wingCenter;
  const wingFill = litGradient(context, wingX, wingY, shape.wingRadius, colors.wingLight, colors.wing, colors.wingShade);
  for (const wing of [shape.leftWing, shape.rightWing]) {
    polygonPath(context, wing);
    fillAndOutline(context, wingFill, colors.outline);
  }

  polygonPath(context, shape.hull);
  const { x, y } = shape.hullCenter;
  fillAndOutline(context, litGradient(context, x, y, shape.hullRadius, colors.light, colors.body, colors.shade), colors.outline);

  const { cockpit } = shape;
  context.beginPath();
  context.ellipse(cockpit.x, cockpit.y, cockpit.radiusX, cockpit.radiusY, 0, 0, FULL_CIRCLE);
  const cockpitFill = litGradient(
    context, cockpit.x, cockpit.y, cockpit.radiusY, colors.cockpitLight, colors.cockpit, colors.cockpitShade,
  );
  fillAndOutline(context, cockpitFill, colors.outline);
  const offset = cockpit.radiusX * LIGHT_OFFSET;
  paintShine(context, cockpit.x - offset, cockpit.y - offset, shape.shineRadiusX, shape.shineRadiusY, colors.highlight);
}

// ---------- Bell ----------

// A golden bell with a knob on top, a flared rim and a blue clapper.
const BELL_SHAPE = Object.freeze({
  knob: Object.freeze({ x: 8, y: 2.4, radius: 1.1 }),
  bodyStart: point(8, 3.2),
  bodyCurves: Object.freeze([
    [point(11.6, 3.2), point(12.0, 6.6), point(12.0, 9.4)],
    [point(12.0, 11.2), point(13.0, 12.0), point(14.2, 12.4)],
    [point(14.6, 12.6), point(14.6, 13.6), point(14.0, 13.6)],
    [point(10.0, 13.6), point(6.0, 13.6), point(2.0, 13.6)],
    [point(1.4, 13.6), point(1.4, 12.6), point(1.8, 12.4)],
    [point(3.0, 12.0), point(4.0, 11.2), point(4.0, 9.4)],
    [point(4.0, 6.6), point(4.4, 3.2), point(8, 3.2)],
  ]),
  center: point(8, 8),
  radius: 7,
  rimLine: Object.freeze({ fromX: 3.2, toX: 12.8, y: 11.8 }),
  clapper: Object.freeze({ x: 8, y: 14.4, radius: 1.3 }),
  shine: point(5.6, 6.4),
  shineRadiusX: 0.6,
  shineRadiusY: 1.6,
});

function paintBell(context, colors) {
  const shape = BELL_SHAPE;
  const { clapper, knob } = shape;
  // The clapper hangs below the rim; the bell covers its top.
  context.beginPath();
  context.arc(clapper.x, clapper.y, clapper.radius, 0, FULL_CIRCLE);
  fillAndOutline(
    context,
    litGradient(context, clapper.x, clapper.y, clapper.radius, colors.clapperLight, colors.clapper, colors.clapperShade),
    colors.outline,
  );

  const { x, y } = shape.center;
  const goldFill = litGradient(context, x, y, shape.radius, colors.light, colors.body, colors.shade);
  context.beginPath();
  context.arc(knob.x, knob.y, knob.radius, 0, FULL_CIRCLE);
  fillAndOutline(context, goldFill, colors.outline);
  curvePath(context, shape.bodyStart, shape.bodyCurves);
  fillAndOutline(context, goldFill, colors.outline);

  // A darker band just above the rim.
  const { rimLine } = shape;
  context.beginPath();
  context.moveTo(rimLine.fromX, rimLine.y);
  context.lineTo(rimLine.toX, rimLine.y);
  context.lineWidth = DETAIL_WIDTH;
  context.strokeStyle = colors.shade;
  context.stroke();
  // Upright shine: the light runs down the bell's left side.
  context.beginPath();
  context.ellipse(shape.shine.x, shape.shine.y, shape.shineRadiusX, shape.shineRadiusY, 0, 0, FULL_CIRCLE);
  context.globalAlpha = SHINE_ALPHA;
  context.fillStyle = colors.highlight;
  context.fill();
  context.globalAlpha = 1;
}

// ---------- Key ----------

// A blue ring (the bow) on top of a silver blade with two teeth.
const KEY_SHAPE = Object.freeze({
  bow: Object.freeze({ x: 8, y: 4.4, radius: 3.6, holeRadius: 1.4 }),
  blade: Object.freeze([
    point(7.0, 7.4), point(9.0, 7.4), point(9.0, 10.6), point(11.4, 10.6), point(11.4, 12.0),
    point(9.0, 12.0), point(9.0, 12.8), point(10.8, 12.8), point(10.8, 14.2), point(9.0, 14.2),
    point(8, 15.4), point(7.0, 14.2),
  ]),
  bladeCenter: point(8, 10),
  bladeRadius: 6,
  shineRadiusX: 1.0,
  shineRadiusY: 0.55,
});

function paintKey(context, colors) {
  const { bow, blade } = KEY_SHAPE;
  const { x, y } = KEY_SHAPE.bladeCenter;
  polygonPath(context, blade);
  fillAndOutline(
    context,
    litGradient(context, x, y, KEY_SHAPE.bladeRadius, colors.bladeLight, colors.blade, colors.bladeShade),
    colors.outline,
  );

  // A ring: the outer circle with the hole cut out by the even-odd rule
  // (a point inside both circles counts as outside the shape).
  context.beginPath();
  context.arc(bow.x, bow.y, bow.radius, 0, FULL_CIRCLE);
  context.moveTo(bow.x + bow.holeRadius, bow.y);
  context.arc(bow.x, bow.y, bow.holeRadius, 0, FULL_CIRCLE, true);
  context.fillStyle = litGradient(context, bow.x, bow.y, bow.radius, colors.light, colors.body, colors.shade);
  context.fill('evenodd');
  context.lineWidth = FRUIT_OUTLINE_WIDTH;
  context.strokeStyle = colors.outline;
  context.stroke();
  const offset = bow.radius * LIGHT_OFFSET * 2;
  paintShine(context, bow.x - offset, bow.y - offset, KEY_SHAPE.shineRadiusX, KEY_SHAPE.shineRadiusY, colors.highlight);
}

// ---------- Cache ----------

const FRUIT_PAINTERS = Object.freeze({
  [FRUIT.CHERRIES]: paintCherries,
  [FRUIT.STRAWBERRY]: paintStrawberry,
  [FRUIT.PEACH]: paintOrange,
  [FRUIT.APPLE]: paintApple,
  [FRUIT.GRAPES]: paintMelon,
  [FRUIT.GALAXIAN]: paintSpaceship,
  [FRUIT.BELL]: paintBell,
  [FRUIT.KEY]: paintKey,
});

// A fruit added to FRUIT without a drawing would fail only when it first
// appears, levels into a game.
for (const fruit of Object.values(FRUIT)) {
  console.assert(fruit in FRUIT_PAINTERS && fruit in FRUIT_ART_COLORS, `Fruit ${fruit} has no drawing`);
}

// One picture per fruit and device scale. A new scale (browser zoom, another
// monitor, the larger debug gallery) simply paints a new picture.
const imageCache = new Map();

// Now that the screen grows with the window, resizing may pass through many
// scales; main.js empties the cache whenever the scale changes, so pictures
// for old sizes do not pile up. The next draw paints what it needs again.
export function clearFruitImageCache() {
  imageCache.clear();
}

// deviceScale = real screen pixels per game pixel. The picture has exactly
// that many pixels per game pixel, so drawing it FRUIT_ART_SIZE game pixels
// wide copies it 1:1, with no blur.
export function getFruitImage(fruit, deviceScale) {
  const cacheKey = `${fruit}@${deviceScale}`;
  if (!imageCache.has(cacheKey)) {
    imageCache.set(cacheKey, paintFruitImage(fruit, deviceScale));
  }
  return imageCache.get(cacheKey);
}

function paintFruitImage(fruit, deviceScale) {
  const image = document.createElement('canvas');
  image.width = Math.round(FRUIT_ART_SIZE * deviceScale);
  image.height = image.width;
  const context = image.getContext('2d');
  context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
  FRUIT_PAINTERS[fruit](context, FRUIT_ART_COLORS[fruit]);
  return image;
}
