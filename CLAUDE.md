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
- [x] 7. Ghost AI: target tiles, scatter/chase/frightened, personalities
- [x] 8. Game rules: collisions, lives, death, level completion, speeds
  - Note: the Dossier's "eating speed" (level 1: ~71% vs 80%) is the *result* of the dot
    pause, not a separate speed: measured 71.1% with the pause alone. levels.js keeps
    `pacmanDots` / `pacmanFrightDots` as reference values only.
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
  (scatter/chase timer and the ghost-house dot counters and no-dot timer) starts on the
  first direction key; the arcade starts him moving left at once. The READY state
  ("READY!" in yellow) lasts until that key, at a level's start and after a death.
- Until stage 10 the START state is just "PRESS ENTER" over the maze.
- Eaten ghosts wait for frightened to end (deviation from the arcade, flag
  `EATEN_GHOST_WAITS_FOR_FRIGHT_END` in constants.js; `false` = arcade behavior). A ghost
  that revives in the house while frightened still runs enters `WAITING_FOR_FRIGHT_END`:
  it bobs at the house center in its normal color, cannot be eaten and does not collide;
  a new power pellet only makes it wait longer (never blue, no reversal). When frightened
  ends the waiters leave one by one (Blinky, Pinky, Inky, Clyde order),
  `EATEN_GHOST_EXIT_DELAY_MS` (500 ms) apart, into the current scatter/chase mode without
  reversing. If frightened already ended when the eyes arrive, the ghost leaves at once.
  Waiters are not part of the house dot counters and never delay them.
  Known edge: "no reversal" covers only the wait. A power pellet eaten during the ~1 s a
  released ghost is still climbing out (`LEAVING_HOUSE`) saves a reversal
  (`pendingReversal`), like any ghost leaving the house, so it comes out heading right.
- The level number is shown (the arcade only shows fruits): "LEVEL n" in white, HUD font,
  centered in the bottom HUD on the life icons' middle line (lives left, fruits right).
  In READY (level start and after a death) "LEVEL n" in cyan takes the message row 17
  and "READY!" moves one row down to row 18 (on the wall block under the house, with a
  black box behind it): row 16, right above the old READY! spot, is the house's wall.
- Lives: only the lives in reserve are drawn, as in the arcade (3 lives = 2 icons; none
  on the last life). `lives` drops at the moment of death (`PACMAN_DIED`), but the icon
  goes only when the next life starts: during DYING `Game.reserveLives()` still shows
  the old count.
- Frightened times for levels 1-4 changed to 8/6/5/4s, original 6/5/4/3, for a gentler
  difficulty curve (`frightSeconds` in levels.js `LEVEL_ROWS`). Level 5 and above and the
  number of flashes are unchanged, so the flashing still fills the last 2 s.
  Flashing is counted back from the end (`frightFlashes` x `FRIGHTENED_ONE_FLASH_MS`).
  Where that is longer than the frightened time (levels 9, 12, 13, 15, 16, 18: 1 s with
  3 flashes = 1.2 s), the ghosts start in the middle of the pattern: blue for the first
  200 ms, then flashing.
- Level fruit row: 4 icons (the arcade shows 7). Measured: lives on the left (cols 2-8),
  "LEVEL n" centered at col 14 (up to "LEVEL 99" = cols 10-18), so cols 18-26 (right
  margin mirrors the lives' 2 columns) hold 4 two-tile icons. Like the arcade, it shows the
  fruits of the current and previous levels, eaten or not; oldest on the right.
- The bonus fruit and its points are drawn only in PLAYING: they vanish as soon as Pac-Man
  dies and stay hidden while the maze flashes.
- Fruits are smooth canvas drawings, not the arcade's pixel art (js/fruitArt.js): 16x16
  game px with outlines, radial-gradient volume and shine. PEACH is drawn as an orange,
  GRAPES as a melon, GALAXIAN as a spaceship of our own design (the `FRUIT` names and
  points are the Dossier's). For this the main canvas runs at full device resolution
  (see Stage 9, Part A2); all other graphics keep their whole-pixel look.

## Current status
- **Current stage:** 9 – Fruits & bonuses (Part A done)
- **Done:** Stage 0 (environment), Stage 1 (project docs), Stage 2:
  - index.html, css/style.css, js/constants.js, js/gameLoop.js, js/main.js.
  - Fixed-timestep loop (60 updates/sec, accumulator) with a 250 ms spiral-of-death cap.
  - Canvas at arcade resolution 224x288, `image-rendering: pixelated`, `imageSmoothingEnabled = false`.
    (Changed in stage 9A2: the canvas now has full device resolution, see there.)
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
    in `GHOST_STARTS` (Pinky 1 s, Inky 4 s, Clyde 7 s). Replaced in stage 8C by dot counters.
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
- Stage 7, Part A (chase targets):
  - js/ghostAI.js: pure functions only (imports frozen constants and `isOpposite`).
    `squaredDistance`, `tilesAhead` (facing up also shifts left: the arcade overflow bug),
    `blinky/pinky/inky/clydeChaseTarget`, `getChaseTarget(name, situation)`, and
    `chooseDirection(tile, direction, target, isWalkable)`: greedy, no reversal, tie order
    `GHOST_DIRECTION_PRIORITY` (up, left, down, right), no UP on `NO_UP_TURN_TILES`
    (12,11), (15,11), (12,23), (15,23). Dead end -> reverse.
  - constants.js: `GHOST_NAME`, `scatterTile` per ghost (Dossier corners in maze rows:
    Blinky (25,-3), Pinky (2,-3), Inky (27,32), Clyde (0,32)), `PINKY_TILES_AHEAD` 4,
    `INKY_TILES_AHEAD` 2, `CLYDE_SHY_DISTANCE_TILES` 8 (Clyde chases when distance² > 64).
  - ghost.js: at a tile center `chooseDirectionAtCenter` uses ghostAI when the ghost has a
    `targetTile` and is inside the maze, else a random choice. The decision is made at the
    tile center (the arcade decides one tile ahead).
  - Debug (still Backquote, not D): target square + line per ghost in its color, white
    frames on the four no-up tiles.
- Stage 7, Part B (modes):
  - js/modeTimer.js: `ModeTimer` (one clock for all ghosts) runs
    `GHOST_MODE_SCHEDULE_LEVEL_1` (7/20/7/20/5/20/5 s, then chase forever) from the first
    key press; frightened (`FRIGHTENED_DURATION_MS` 6 s, temporary) pauses it. A new pellet
    restarts the full frightened time.
  - ghost.js: `update(deltaMs, world)` with world = { isClockRunning, mode, pacmanTile,
    pacmanDirection, blinkyTile }. `enterMode(mode, shouldReverse)`: outside ghosts switch
    state and reverse; in-house/leaving ghosts set `pendingReversal` and exit heading right.
    Leaving ghosts join the current mode. SCATTER targets `scatterTile`; FRIGHTENED is
    random (ignores no-up tiles) at `GHOST_FRIGHTENED_SPEED_LEVEL_1` 50%.
  - main.js: `updateGhostMode` reverses on every change except when frightened ends
    (Dossier); listens to `POWER_PELLET_EATEN`. Debug overlay shows `MODE CHASE 14s`,
    written only when the text changes.
  - Ghosts inside the house are not drawn blue (they come out blue if frightened still runs).
- Stage 7, Part B2 (flashing, rendering only): `isFrightenedFlashWhite` (pure, in
  modeTimer.js) from the shared frightened clock: last `FRIGHTENED_FLASH_TIME_MS` (2 s,
  counted back from the end) alternates every `FRIGHTENED_FLASH_INTERVAL_MS` (200 ms),
  white first, so all ghosts flash in sync. Frightened ghosts have their own face mask
  (small eyes, wavy mouth): blue + peach face, white + red face.
- Checked in Node (scratch scripts, not in the repo): target/choice examples, 3-minute
  headless runs (no ghost in a wall, no up turn from a no-up tile), schedule pause, exits
  with pending reversal, flash timing with a second pellet.
- Stage 8, Part A (level table + game state machine, no collisions yet):
  - js/levels.js: three Dossier tables, each a list of `fromLevel` rows (a row holds until
    the next one, the last repeats): `SPEED_ROWS` (1, 2, 5, 21; fractions of max speed,
    null fright speeds from 21), `MODE_SCHEDULE_ROWS` (1, 2, 5; seconds, 1033/1037 s and a
    one-frame scatter), `LEVEL_ROWS` (1..19: fright seconds, flashes, fruit + points).
    `getLevelConfig(level)` returns a frozen config in ms; asserts on row order and on
    fright speeds whenever there is a fright time.
  - constants.js: removed the `*_LEVEL_1` speeds, the level-1 schedule,
    `FRIGHTENED_DURATION_MS` and `FRIGHTENED_FLASH_TIME_MS`. Added
    `FRIGHTENED_ONE_FLASH_MS` (2 x 200 ms; flash time = frightFlashes x it), `GAME_STATE`,
    `FRUIT`, `START_LEVEL` (change temporarily to test a level), `START_KEY`,
    `TUNNEL_ROW`/`TUNNEL_LENGTH_TILES`, message row/texts/colors.
  - Speeds: `Pacman(levelConfig)`, `update(deltaMs, isFrightened)` (normal or fright speed;
    the dot pause is unchanged). `Ghost(start, levelConfig)`: house > tunnel (maze.js
    `isTunnel`, also off-screen columns) > frightened > normal.
  - js/game.js `class Game`: owns level, config, pacman, ghosts, modeTimer;
    `startLevel(level)`; `update` switches on START (Enter, `consumeStartPress`) -> READY
    (`clearRequestedDirection`; ghosts bob with the clock stopped; first arrow -> PLAYING in
    the same update) -> PLAYING (old main.js logic). DYING / LEVEL_COMPLETE / GAME_OVER
    are empty stubs. Fright time 0: a pellet only reverses the ghosts.
  - main.js is wiring only; render by state (START: maze + "PRESS ENTER"; READY: all +
    "READY!" via renderer `drawMessage`). Debug overlay adds `STATE ... LEVEL n`.
  - Checked in Node: configs for levels 1-100, tunnel tiles, state flow, level 17 pellet,
    flash start (L1: 2000 ms before the end), 3-minute random run, eating speed 71.1%.
- Stage 8, Part B (collisions, lives, eating ghosts):
  - All pauses are counted in game time inside `update` (`stateTimeMs` reset by
    `enterState`, `freezeRemainingMs`), never `setTimeout`.
  - Collision = same tile, checked after Pac-Man moves and after each ghost moves; the
    frame stops as soon as one happens. Decided by the ghost's own state:
    `isDangerous` (SCATTER/CHASE) -> emit `PACMAN_DIED`, DYING; `isEdible` (FRIGHTENED)
    -> `eatGhost`: `GHOST_EATEN_POINTS` 200/400/800/1600 by `ghostsEatenChain` (reset on
    every pellet), emit `GHOST_EATEN { name, points }`, 1 s freeze (fright clock stops
    too) hiding Pac-Man and that ghost, points in cyan at its spot.
  - score.js listens to both events: ghost points, `lives--`; `dotsRemaining` now only
    counts food. `resetScore()` (keeps the high score), `getLives()`.
  - ghost.js: EATEN = eyes only, `GHOST_EATEN_SPEED` 1.5 (approximation, never slowed),
    targets `GHOST_HOUSE_EXIT_TILE`; above the door (row 11, col 13/14) -> new state
    ENTERING_HOUSE (fixed path down to `GHOST_HOUSE_CENTER_TILE`) -> LEAVING_HOUSE at once.
    `wasEaten` makes the revived ghost join `scatterChaseMode`, never blue. Eyes ignore
    mode changes and collisions.
  - DYING: 1 s freeze, then ghosts vanish and a placeholder animation (facing up, mouth
    opens in 11 steps until he is gone, 1.5 s), 0.5 s empty, then `resetActors()` (new
    characters and mode clock, maze untouched) + READY, or GAME_OVER ("GAME OVER" in red);
    Enter there -> `resetGame()` (maze.js `resetMaze`, `resetScore`, level 1) -> START.
  - Lives: icons for reserve lives only (arcade), bottom left; a lost life's icon goes when
    the next life starts (`reserveLives()`).
  - renderer.js: Pac-Man pixels cached by mouth angle; `drawPacmanDying`, `drawLives`,
    `drawGhostPoints`, eyes-only ghosts; `drawGhosts` takes an `isVisible` callback.
  - Checked in Node: death timeline and reset, eaten dots stay eaten, 4-ghost chain = 3000,
    revived ghosts not blue, game over -> full reset, 10-minute random run (13 games).
- Stage 8, Part C (ghost-house release + level complete):
  - js/ghostHouse.js `class GhostHouse` (one per level, created in `startLevel`, survives
    deaths): only the first ghost still `IN_HOUSE` (start-list order Blinky, Pinky, Inky,
    Clyde) counts. Personal counters by name, limits per level in levels.js `HOUSE_ROWS`
    (L1 0/0/30/60, L2 0/0/0/50, L3+ all 0; Blinky always 0). After a lost life
    (`onLifeLost`) a global counter with exact matches on `GLOBAL_DOT_LIMITS` (Blinky 0,
    Pinky 7, Inky 17, Clyde 32); at Clyde's 32 with Clyde inside it switches off and the
    paused personal counters resume. Arcade quirk kept: if Clyde left early, it stays on.
    No-dot timer `noDotTimeMs` (4 s, 3 s from level 5) releases the preferred ghost.
    Runs only in PLAYING (no timer before the first key). Power pellets count as dots.
  - ghost.js: `releaseAfterMs`/`waitForRelease` removed; `release()` and
    `isWaitingInHouse()`; `world.isClockRunning` removed.
  - LEVEL_COMPLETE when `getDotsRemaining() === 0` right after Pac-Man moves (before
    collisions): 1 s freeze, ghosts vanish, walls flash white/blue 4 times (250 ms per
    color, `game.wallColor()` -> `drawMaze(..., wallColor)`), then `resetMaze`,
    `recountFood`, `startLevel(level + 1)`, READY. Score and lives carry over.
  - Debug: overlay line `HOUSE PERSONAL I 12/30 C 0/60  NO DOT 1.3s` (or `GLOBAL n`);
    key C (`DEBUG_CLEAR_DOTS_KEY`, only while debug is on) clears all food without points.
    A C press outside PLAYING is dropped (`Game.update`), so it cannot fire when play starts.
  - While the walls flash (`Game.isMazeFlashing`) the ghost door is hidden, as in the
    arcade: `drawMaze(context, elapsedMs, { wallColor, isDoorVisible })`.
  - Checked in Node: release order and counts for levels 1/2/3, no-dot timer, death ->
    global -> personal resume, the Clyde quirk, level complete -> level 2 config,
    10-minute random run.
- Stage 8, Part C2 (eaten ghosts wait for frightened to end, see design decisions):
  - ghost.js: `enterHouse(distance, mode)` decides at the house center between
    `LEAVING_HOUSE` and the new `WAITING_FOR_FRIGHT_END` (bobs via `bobAround(centerY)`,
    house speed, ignores `enterMode`); `release()` accepts both waiting states.
  - ghostHouse.js: `update(deltaMs, ghosts, isFrightened)` = `updateDotCounters` (unchanged,
    only `IN_HOUSE` ghosts) + `updateFrightWaiters` (own clock `frightExitDelayMs`, held at 0
    while frightened). Debug line adds `FRIGHT WAIT B,P`.
  - Checked in Node with the flag on and off: waiters harmless and never blue, a second
    pellet extends the wait, exit order and 500 ms spacing, no reversal, late eyes leave at
    once, dot-counter releases unchanged, 10-minute random run.
- Stage 8, Part C3 (level display, see design decisions): renderer `drawLevel(context,
  level)` and `drawMessage(context, text, color, { row, hasBackground })`; constants
  `LEVEL_LABEL`, `LEVEL_INTRO_ROW`, `READY_ROW`, `HUD_LEVEL_CENTER_COL`,
  `COLORS.LEVEL_INTRO_TEXT`. Reads `game.level` only; the debug overlay no longer shows it.
- Frightened times for levels 1-4: 8/6/5/4 s (see design decisions), `frightSeconds` in
  `LEVEL_ROWS`. Stage 8 is now complete.
- Stage 9, Part A (bonus fruit):
  - js/fruit.js `class Fruit` (one per level, created in `startLevel` like `GhostHouse`,
    survives deaths): `dotsEaten` (power pellets count) -> visible at `FRUIT_APPEAR_DOTS`
    70 / 170 for a random `FRUIT_MIN_SHOW_MS`..`FRUIT_MAX_SHOW_MS` (9-10 s). `tryEat`
    when Pac-Man is on row 17, col 13 or 14 (`FRUIT_TILE` is 13.5): emits
    `EVENTS.FRUIT_EATEN { fruit, points }` (score.js adds them), points shown
    `FRUIT_POINTS_SHOW_MS` (2 s) in pink. `onLifeLost` hides fruit and points, keeps the
    count. Fruit type and points come from levels.js `LEVEL_ROWS` via `levelConfig`.
    It never subscribes to events itself: `Game.handleDotEaten` passes dots on.
  - game.js: `fruit.update` + `tryEat` in `updatePlaying` after the freeze check (clock
    runs only in PLAYING, stops while a ghost is eaten); `isFruitVisible`,
    `isFruitPointsVisible`; `levelFruits` = `recentLevelFruits(level)` (newest first,
    `FRUIT_HUD_SLOTS` 4).
  - renderer.js: `drawFruit`, `drawFruitPoints`, `drawLevelFruits` (from
    `FRUIT_HUD_RIGHT_COL` 26 leftward). Debug overlay line `FRUIT DOTS n  SHOW 7.2s`.
  - Checked in Node: appear at 70/170 only, show time, eat from cols 13/14 only, points per
    level, death keeps the count, new level resets it, clock stops in READY and freezes,
    HUD row contents, pixel bounds (cols 18.4-25.6), 10-minute random run.
- Stage 9, Part A2 (fruit graphics, see design decisions):
  - main.js `applyPixelPerfectScale`: `canvas.width/height` = screen x `physicalScale`
    (one canvas pixel per physical pixel, CSS size unchanged), then
    `context.setTransform(physicalScale, ...)` and `imageSmoothingEnabled = false` (a size
    change resets the context). All drawing code still works in game pixels; whole-pixel
    `fillRect` stays sharp (integer scale), the pellets' arc and the text got smoother.
  - js/fruitArt.js: one painter per fruit in `FRUIT_PAINTERS` (cherries, strawberry,
    orange, apple, melon, spaceship, bell, key), shape data as named point tables on a
    16x16 grid, shared helpers (`litGradient`, `fillAndOutline`, `paintShine`,
    `paintLeaf`...). `getFruitImage(fruit, deviceScale)` paints each fruit once into a
    hidden canvas, cached by fruit and scale (zoom/monitor change -> new entry).
    Asserts that every `FRUIT` has a painter and colors.
  - constants.js: `FRUIT_ART_SIZE` (16), `FRUIT_ART_COLORS` per fruit, `FRUIT_OUTLINE_WIDTH`,
    gallery constants, `DEBUG_FRUIT_GALLERY_KEY` (F). The placeholder (`FRUIT_DIAMETER`,
    `FRUIT_STEM_*`, `FRUIT_COLORS`) is gone.
  - renderer.js `drawFruitShape(context, x, y, fruit, zoom)` = `drawImage` of the cached
    picture at the scale read from `context.getTransform().a`; `drawFruitGallery` (debug:
    ` then F, all 8 fruits x3 on a panel, in every state).
  - Checked: headless Edge screenshots (gallery, maze spot, HUD row), Node fruit logic
    tests unchanged.
- **Next:** Stage 9, Part B: extra life (and any remaining bonuses).
