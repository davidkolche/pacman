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
- [ ] 4. Pac-Man movement: grid movement, input buffering, cornering, tunnel
- [ ] 5. Eating & score: dots, energizers, score display
- [ ] 6. Ghosts structure: ghost entities, ghost house, basic movement
- [ ] 7. Ghost AI: target tiles, scatter/chase/frightened, personalities
- [ ] 8. Game rules: collisions, lives, death, level completion, speeds
- [ ] 9. Fruits & bonuses: fruit timing, ghost-eating points, extra life
- [ ] 10. UI screens: start screen, ready, game over, high score
- [ ] 11. Pixel art & animation: sprites, Pac-Man mouth, ghost eyes, death
- [ ] 12. Sound: siren, waka, eat ghost, death, intro
- [ ] 13. Quality & tests: refactor, bug fixes, simple tests
- [ ] 14. Deploy: publish online (e.g. GitHub Pages)

## Current status
- **Current stage:** 4 – Pac-Man movement (not started)
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
- **Next:** Stage 4: Pac-Man grid movement, input buffering, cornering, tunnel.
