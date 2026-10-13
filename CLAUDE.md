# Pac-Man (1980) – Project Guide

## Goal
A faithful recreation of the 1980 arcade Pac-Man. This is a learning project (IITC course): the main goal is to **deeply understand the development process**, not just ship a working game.

**Rules reference:** "The Pac-Man Dossier" by Jamey Pittman. When unsure about original behavior (speeds, ghost targeting, timers, fruit, scoring), follow the Dossier.

## Tech stack
- HTML5 Canvas + vanilla JavaScript (ES modules)
- No libraries, no frameworks, no build tools
- Run with VS Code Live Server on Windows (ES modules require a local server, not `file://`)

## Folder structure (planned)
```
index.html          Page + <canvas>; loads js/main.js as type="module"
css/style.css       Page layout, centering and scaling the canvas
assets/             Sound files (later)
js/
  main.js           Entry point: wires modules together and starts the loop
  constants.js      ALL constants: tile size, base speeds, colors, points, keys
  levels.js         Per-level data: speeds, frightened time, scatter/chase timers, fruit
  gameLoop.js       requestAnimationFrame loop with a fixed time step
  game.js           Game state machine (ready, playing, dying, level complete, game over)
  input.js          Keyboard -> requested direction
  maze.js           Maze layout and tile queries (wall, dot, tunnel, intersection)
  entity.js         Shared grid-movement logic (tile, direction, speed)
  pacman.js         Pac-Man movement, cornering, eating
  ghost.js          Ghost modes (scatter, chase, frightened, eaten) and ghost house
  ghostAI.js        Target tile per ghost (Blinky, Pinky, Inky, Clyde), direction choice
  modeTimer.js      Scatter/chase cycles and frightened timer
  score.js          Score, high score, extra life
  fruit.js          Fruit appearance and points
  renderer.js       All drawing to the canvas
  sprites.js        Pixel-art data and animations
  ui.js             Start screen, HUD, game over
  audio.js          Sound effects
```
Folders and modules are created only when their stage arrives.

## Coding conventions
- One module per responsibility. Export only what other modules need.
- Small functions, each doing one thing.
- Clear, descriptive English names (`requestedDirection`, not `rd`).
- English comments that explain **why**, not what.
- **No magic numbers.** Constants live in `js/constants.js`; per-level data in `js/levels.js`.
- Use `const` by default, `let` when reassigning; never `var`.

## How to work with me
- I am a beginner. **Explain all concepts and plans in Hebrew.** Code, comments and commit messages stay in English.
- Before coding, explain every new concept in simple terms with a small example.
- Work in small steps. Stay strictly within the current stage's scope; don't jump ahead.
- At the end of each stage, ask me 2-3 short questions to check that I understood.
- Git: when a stage works, propose a commit with a clear message and **wait for my approval** before committing.
- At the end of each stage, update "Current status" below and the roadmap checkbox.

## Roadmap
- [x] 0. Environment: VS Code, Live Server, Git
- [x] 1. Planning: CLAUDE.md, LEARNING.md, .gitignore, README
- [x] 2. Skeleton & game loop: index.html, canvas, fixed-step loop
- [x] 3. Maze: tile map, drawing walls, dots and energizers
- [x] 4. Pac-Man movement: grid movement, input buffering, cornering, tunnel
- [x] 5. Eating & score: dots, energizers, score display
  - Note: arcade "dot pause": Pac-Man stops for 1 frame per dot and 3 frames per energizer,
    so he is slower while eating than in empty corridors (Dossier).
- [x] 6. Ghosts structure: ghost entities, ghost house, basic movement
- [ ] 7. Ghost AI: target tiles, scatter/chase/frightened, personalities
- [ ] 8. Game rules: collisions, lives, death, level completion, speeds
  - Note: per-level "eating speed" in js/levels.js. Pac-Man has a separate, lower speed
    while eating dots (level 1: 71% eating vs 80% normal; frightened 79% vs 90%), and
    `PACMAN_SPEED_LEVEL_1` moves from constants.js into levels.js.
- [ ] 9. Fruits & bonuses: fruit timing, ghost-eating points, extra life
- [ ] 10. UI screens: start screen, ready, game over, high score
- [ ] 11. Pixel art & animation: sprites, Pac-Man mouth, ghost eyes, death
- [ ] 12. Sound: siren, waka, eat ghost, death, intro
- [ ] 13. Quality & tests: refactor, bug fixes, simple tests
- [ ] 14. Deploy: publish online (e.g. GitHub Pages)

## Design decisions
- Power pellets: green pulse instead of arcade blinking (intentional deviation from the original).
- All four ghosts start in the house (the arcade starts Blinky outside) and leave in the
  order Blinky, Pinky, Inky, Clyde. The house is only 49x25 px inside, too small for four
  14x14 ghosts, so Blinky waits in the doorway (col 13.5, row 11.75) without bobbing;
  he uses the same LEAVING_HOUSE path as the others.
- Pac-Man starts standing still (`DIRECTION_NONE`, mouth closed) and the game clock
  (ghost release timers) starts on the first direction key; the arcade starts him moving
  left at once.

## Current status
- **Current stage:** 7 – Ghost AI (not started)
- **Done:** Stage 0 (environment), Stage 1 (project docs), Stage 2:
  - index.html, css/style.css, js/constants.js, js/gameLoop.js, js/main.js.
  - Fixed-timestep loop (60 updates/sec, accumulator) with a 250 ms spiral-of-death cap.
  - Canvas at arcade resolution 224x288, `image-rendering: pixelated`, `imageSmoothingEnabled = false`.
  - Blur fix: debug FPS/UPS/DPR moved from the canvas to an HTML overlay; display scale is
    rounded down to a whole number of physical pixels per game pixel using `devicePixelRatio`
    (recomputed on `resize`).
- Stage 3:
  - js/maze.js: 28x31 layout as strings (240 dots, 4 power pellets), console.assert on its
    shape, helpers `tileAt`, `isWall`, `tileToPixel`, `pixelToTile`, `countTiles`.
  - js/wallShapes.js: decides how each wall tile looks, computed once at load. Flood fills
    find the main corridors, the outer border (walls connected to the grid edge) and the
    ghost-house walls. Wall lines run through pixel 3 of edge wall tiles via neighbor "arms";
    the outer border and ghost house get a second line offset away from the corridors,
    with concentric corner radii (3 +/- spacing).
  - js/renderer.js: draws only with whole-pixel `fillRect` (paths/arcs are anti-aliased and
    looked blurry when scaled): wall runs, Bresenham corner arcs, 2x2 dots, 8x8 pixel-art
    power pellets (static), pink ghost door between the ghost house's two lines.
  - constants.js: `SCREEN_COLUMNS/ROWS` (28x36) split from `MAZE_COLUMNS/ROWS` (28x31),
    `HUD_TOP_ROWS = 3`, `HUD_BOTTOM_ROWS = 2`, `TILE` symbols, wall/dot/pellet sizes and colors.
- Stage 4:
  - js/input.js: arrows + WASD by `event.code`; only records the last requested direction
    (persists like a held joystick); `preventDefault` stops page scrolling.
  - js/pacman.js: `class Pacman` (x/y body center in pixels, direction, queuedDirection,
    isMoving, speed = 75.76 px/s x 80%, distanceTraveled). Moves in steps that never pass a
    tile center; stops at the center before a wall or the ghost door; instant reversal.
    Cornering: a turn is taken anywhere in the current tile (4 px before / 3 px after the
    center) when the next tile is open, then moves diagonally back to the center line.
    Tunnel wraps 2 tiles off-screen; no vertical turns while off-screen.
  - maze.js: `tileCenterPixel`, `isBlockedForPacman`, exported `isInsideMaze`.
  - renderer.js: `drawPacman` draws a 13 px pixel-mask circle with fillRect; chomp cycles
    4 mouth frames over `CHOMP_CYCLE_PX` (16 px) of `distanceTraveled`, so it freezes at
    walls. Masks are cached per direction and frame.
- Stage 5:
  - Part A: js/events.js (tiny pub/sub: `on`, `off`, `emit`; event names in `EVENTS`).
    maze.js `takeFood` removes a dot/pellet; pacman.js emits `DOT_EATEN` /
    `POWER_PELLET_EATEN` and applies the dot pause (1 / 3 frames). js/score.js listens and
    keeps `score` and `dotsRemaining` (counted from the maze).
  - Part B: "Press Start 2P" Google Font; main.js awaits `document.fonts.load(HUD_FONT)`
    before the loop starts (canvas text is never redrawn, so it would stay in the fallback
    font). renderer.js `drawHud`: 8px font at arcade resolution with whole-pixel positions,
    "1UP" (blinks by `frameCount`) + "HIGH SCORE" in row 0, right-aligned scores in row 1,
    minimum "00". In-memory high score (`getHighScore`).
  - Power pellets: green `context.arc` pulse (the one anti-aliased drawing), radius from a
    sine of game time `elapsedMs` (summed in update) between `PELLET_MIN_RADIUS` and
    `PELLET_MAX_RADIUS` (half a tile, asserted) over `PELLET_PULSE_PERIOD_MS`.
  - The HTML FPS/UPS overlay is hidden by default (a runtime debug key came in stage 6B).
    Temporary console.logs removed.
- Stage 6, Part A:
  - constants.js: frozen `GHOST_STATE` enum (IN_HOUSE, LEAVING_HOUSE, SCATTER, CHASE,
    FRIGHTENED, EATEN); `GHOST_STARTS` (name, color, start tile, direction, state):
    Blinky above the door facing left (SCATTER, stands still for now), Pinky/Inky/Clyde
    in the house; bobbing range (4 px) and speed (50%, approximation); sprite/eye sizes.
  - js/ghost.js: `class Ghost` with a `switch (state)` in `update`; only IN_HOUSE is
    implemented (bob up/down, flipping `direction` so the eyes follow); the other states
    are commented stubs naming their stage. `createGhosts()` builds the four.
  - renderer.js: `drawGhosts` draws a 14x14 body mask (round top, wavy skirt) and 4x5
    eyeballs with 2x2 blue pupils placed per direction (`GHOST_EYES`), whole pixels only.
    Ghosts are drawn after Pac-Man.
  - Decision: no shared base class yet; pacman.js unchanged. Revisit `entity.js` in
    stage 7 once ghosts move on the grid and the real duplication is visible.
- Stage 6, Part B:
  - IN_HOUSE -> LEAVING_HOUSE: each ghost counts `timeInHouseMs` up to its `releaseAfterMs`
    in `GHOST_STARTS` (Pinky 1 s, Inky 4 s, Clyde 7 s). TODO stage 8: arcade dot counters.
  - LEAVING_HOUSE -> SCATTER: fixed path (back to the middle row, across to column 13.5,
    up through the door to `GHOST_HOUSE_EXIT_TILE`), then SCATTER facing left.
  - SCATTER/CHASE/FRIGHTENED roam at random for now: steps never pass a tile center, at
    each center a random direction among the open ones, never reversing. maze.js
    `isBlockedForGhost` (wall or door). Tunnel wrap like Pac-Man. `GHOST_SPEED_LEVEL_1`
    = 75%, house speed 50%.
  - Grid helpers (`approach`, `isOpposite`, `distanceToNextCenter`, tunnel wrap...) are
    duplicated from pacman.js on purpose; merge into entity.js at the start of stage 7
    (with approval).
  - Debug: Backquote (`) toggles at runtime (`input.js isDebugEnabled`) the FPS/UPS
    overlay and short state labels above each ghost (`GHOST_STATE_LABELS`). Not D: it
    already moves Pac-Man right (WASD).
- Start fix (after stage 6): see the two new design decisions. `gameStarted` flag in
  main.js (TODO stage 8: READY state) is passed to `ghost.update(deltaMs, isClockRunning)`;
  release timers only count while it is on. Pac-Man's `update` waits while his direction
  is `DIRECTION_NONE` (outside `DIRECTION`, so ghosts never pick it). Ghosts have
  `bobsInHouse` (false for Blinky); release times 0 / 2 / 4 / 6 s.
- Refactor (before stage 7, zero behavior change): js/entity.js `class Entity` with x/y,
  direction, speed, `distanceThisUpdate`, `currentTile`, `currentTileCenter`,
  `isAtTileCenter`, `distanceToNextCenter`, `wrapThroughTunnel`, plus exported `approach`
  and `isOpposite`. `Pacman extends Entity` and `Ghost extends Entity` (`super(tile,
  direction)`). Kept in their own classes: cornering (`isAtCenterAlongDirection`,
  `moveBy`), eating, mouth distance; ghost state machine, intersection choice,
  `moveForward`; `canMove` in each (Pac-Man vs ghost door rules). Verified with a
  seeded 3-minute Node simulation: identical per-frame output before and after.
- **Next:** Stage 7: target tiles, scatter/chase timer, frightened.
