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
assets/audio/       Sound files (MP3) and CREDITS.md (file, source, author, license)
js/
  main.js           Entry point: wires modules together and starts the loop
  constants.js      ALL constants: tile size, base speeds, colors, points, keys
  levels.js         Per-level data: speeds, frightened time, scatter/chase timers, fruit,
                    Cruise Elroy, ghost-house dot limits
  gameLoop.js       requestAnimationFrame loop with a fixed time step
  game.js           Game state machine (ready, playing, dying, level complete, game over)
  input.js          Keyboard -> requested direction (and the debug keys); name entry keys
  storage.js        The only module that touches localStorage (saved scores)
  topScores.js      Top 10 table rules (qualify, insert)
  nameEntry.js      The name being typed for the top 10 table
  events.js         Tiny pub/sub (on, off, emit) between modules
  maze.js           Maze layout and tile queries (wall, dot, tunnel, intersection)
  wallShapes.js     How each wall tile is drawn (computed once at load)
  entity.js         Shared grid-movement logic (tile, direction, speed)
  pacman.js         Pac-Man movement, cornering, eating
  ghost.js          Ghost modes (scatter, chase, frightened, eaten), Cruise Elroy
  ghostHouse.js     When each ghost may leave the house (dot counters, timers)
  ghostAI.js        Target tile per ghost (Blinky, Pinky, Inky, Clyde), direction choice
  modeTimer.js      Scatter/chase cycles and frightened timer
  score.js          Score, high score, extra life
  fruit.js          Fruit appearance and points
  fruitArt.js       Fruit drawings (canvas paths), cached per device scale
  renderer.js       All drawing to the canvas
  sprites.js        Pac-Man and ghost drawings (canvas shapes), cached per device scale
  ui.js             Start screen, HUD, game over
  title.js          Attract-screen title: layout and timing (chase lane, shine, peeking ghost)
  titleArt.js       Title letters and shine mask (canvas), cached per device scale
  marquee.js        The arcade sign above the canvas (HTML/CSS), built and sized here
  audio.js          Sound manager: AudioContext, mute, suspend, preload of the files,
                    play / startLoop / stopLoop
  audioMixer.js     Mixer graph: sfx/music/ui buses, shared reverb, glue compressor, limiter
  soundManifest.js  Sound name -> file, bus, volume, loop, playback rate (the only file names)
  soundEffects.js   Game events -> sounds (the only place that decides what plays; comes
                    back when the events are connected)
  soundGallery.js   Debug sound gallery (B): every sound of the manifest, play/stop, length
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
- [x] 9. Fruits & bonuses: fruit timing, ghost-eating points, extra life
  - Also done here: Cruise Elroy (Blinky speeds up and keeps chasing near a level's end)
    and smooth fruit drawings at full device resolution.
- [ ] 10. UI screens: start screen, ready, game over, high score
  - Done so far: A attract screen (custom ghost names) and game flow (GAME OVER returns
    by itself); B1 high score saved in localStorage (storage.js); B2 top 10 table with
    name entry (up to 10 characters, typed or arrows); C pause (P, auto on hidden tab),
    saved mute (M), canvas scaled to fit the window, no catch-up burst after a stall.
    Debug +1,000 points moved to O (debug on, PLAYING only). More parts to come.
- [x] 11. Pixel art & animation: sprites, Pac-Man mouth, ghost eyes, death
  - Done as smooth canvas shapes, not pixel art (see design decisions): A vector
    characters (sprites.js, cached per device scale), B walking skirt (3/4 rounded feet,
    per-ghost walk clock), C death animation (stepped collapse + ray pop), D colors
    cleanup (all in `COLORS`), E DPR check (canvas rebuilt when only the pixel ratio
    changes).
  - Also in stage 11: sprites centered on the corridors (ghosts no longer cover the
    right/bottom wall lines), debug sprite boxes and a ghost gallery (G), Pac-Man's mouth
    closed during LEVEL_COMPLETE, the animated attract title (title.js, titleArt.js),
    and the arcade marquee above the canvas (marquee.js: static sign, then a glint sweep
    and chase lights, paused by P, off with reduced motion; then 2D: it reacts to the
    game; 2B: power-on and bulb patterns picked by the game). Marquee part 2C is
    skipped for now.
- [ ] 12. Sound: siren, waka, eat ghost, death, intro
  - Done so far: A audio infrastructure (audio.js: lazy AudioContext, sfx/loop buses,
    mute ramp, suspend on pause and hidden tab, debug test beep on B).
  - 12A+ (engine upgrade for modern sound, see design decisions): A mixer (audioMixer.js:
    sfx/music/ui buses, generated reverb, glue + limiter), B voice building blocks,
    polyphony, variation, play(name). Audio files behind the same API come after 12B.
  - 12B (redo, original one-shot sounds through the event bus): C the dot sound
    (SOFT POP, chosen in the gallery); D ghost eaten (rejected: three sets of original
    sounds, then the arcade's sweep; now a cartoon chomp + gulp in 5 variants, waiting
    for the choice). Next: power
    pellet, fruit, extra life; start jingle, death, level complete; UI sounds.
  - Restart (sound from MP3 files, see design decisions): the synthesized sounds and
    audioVoices.js are gone (history in commit b7c9b99). Files: A manifest
    (soundManifest.js), preload with fetch + decodeAudioData, play / startLoop /
    stopLoop, a gallery of every file, assets/audio/CREDITS.md.
  - 12.1 dot sound: one coin hit cut from dot-eat.mp3, played once per dot (see design
    decisions); gallery slider for the playback rate, dot run (3), hits to the
    console (4). Rate 1x, chosen by ear in play.
  - 12.2 power pellet sound (power-pellet.mp3, once per pellet, on top of the dots);
    manifest `trimStartSeconds` for the MP3 encoder's silence.
  - 12.3 frightened background loop (frightened-loop.mp3): trims detected at load with a
    manual override, seam fades against the click, one pure `getActiveLoop` that decides
    the background loop, crossfade on a change, faster while the ghosts flash.
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
- START is the attract screen (no maze): "CHARACTER / NICKNAME", the four ghosts one by
  one (picture, nickname and name together, not in steps like the arcade), the 10/50 PTS
  table and a blinking "PRESS ENTER TO START". Enter works at any moment. The new game is
  reset when leaving START (not at GAME OVER), so the attract screen still shows the last
  score. GAME OVER returns to START by itself after `GAME_OVER_SCREEN_MS` (3 s); Enter
  does nothing there.
- Attract-screen names are our own, not the arcade's SHADOW "BLINKY" etc.: Blinky
  -NAFTALI "BENNET", Pinky -MANSOR "ABBAS", Inky -AVIGDOR "LIBERMAN", Clyde -YAIR "GOLAN".
  Display text only: one table `GHOST_DISPLAY_NAMES` in constants.js keyed by `GHOST_NAME`;
  the internal ids stay Blinky/Pinky/Inky/Clyde everywhere in the code. Character at
  col 7, nickname at col 17; the longest line (-AVIGDOR cols 7-14, "LIBERMAN" cols 17-26)
  ends with the header, and ui.js asserts that every line fits.
- Top scores names: 1-10 characters (A-Z, 0-9, inner blanks), not the arcade's 3 letters
  (`TOP_SCORE_NAME_MAX_LENGTH`, the most a 28-tile row holds next to the rank and a
  7-digit score). Typed on the keyboard by physical key (`event.code`, so a Hebrew layout
  still types Latin letters; Backspace deletes) or arcade-style with the arrows
  (up/down step through `NAME_ALPHABET`, left/right move the cursor); Enter confirms,
  an empty name cannot be confirmed. No time limit. The name entry is its own screen
  (no maze), right after GAME OVER, only for a score that enters the table (> 0, and
  beats the last entry of a full table; a tie does not). After a name the attract
  screen starts with the table.
- Pause (P) only in PLAYING (including the freeze after eating a ghost), not in READY,
  DYING, LEVEL_COMPLETE or the other screens. Hiding the tab pauses a running game; it
  resumes only with P. A direction pressed while paused is kept (held joystick). The
  whole picture stands still while paused (also the 1UP blink and the pellet pulse),
  dimmed, with "PAUSED" on a black band. Mute (M) works on every screen and while paused,
  is saved, and shows a speaker-with-X icon top right. During the name entry P and M are
  letters. The debug +1,000 points key is O.
- Sound (stage 12A): silent until the player's first key or click (browser autoplay
  policy; the AudioContext is created only then, so no console warning). The sound is
  suspended (frozen mid-note, not restarted) while paused and whenever the tab is hidden,
  on every screen; outside PLAYING it comes back with the tab, in PLAYING only with P.
  Mute fades over 50 ms instead of cutting (no click); M while paused takes effect on
  resume. Debug B opens the sound gallery (N next sound, 1 play / start the loop,
  2 stop, 3 a run at level 1's dot rhythm, 4 print the file's hits to the console; an
  HTML slider under the canvas sets the playback rate live, 0.75x-2x, for the session).
- Dot sound (stage 12.1): one coin hit cut out of `dot-eat.mp3` (a manifest `slice`:
  0.015 s + 0.335 s, the first hit) played once per eaten dot, with +-15 cents of random
  pitch, at most 3 at once; not a loop. Measured: the file is 5.16 s with 14 hits about
  0.37 s apart (2.7 per second), while Pac-Man eats 6.7 dots per second on level 1
  (60.6 px/s, 8 px per dot + 1 frame stop = 149 ms), 7.5 frightened, 8.2 from level 5.
  A loop would need 2.5x-3x speed (far higher pitch, or a smeared time stretch with
  `preservesPitch`), would drift from the real eating (corners, gaps) and would need a
  timeout and a stop on every state change; a short hit per dot follows the real rhythm
  and ends by itself (nothing can be left playing on P, death, level end or game over).
  Power pellets do not play it.
- Power pellet sound (stage 12.2): `power-pellet.mp3` once per pellet (`POWER_PELLET_EATEN`),
  its own voices on the sfx bus, so it plays on top of the dot sounds and stops none of
  them; also on levels with no frightened time (the player still ate it). Downloaded
  MP3s start with 20-50 ms of encoder silence (both files here: 23 ms), skipped with the
  manifest's `trimStartSeconds` (not together with a slice). TODO for the level-complete
  sound: when the pellet is the level's last food, that sound should win.
- Trims (stage 12.3): every file's audible part (first / last sample above
  `AUDIO_SILENCE_LEVEL`, -60 dBFS) is found at load; `trimStartSeconds` /
  `trimEndSeconds` in the manifest win over it. One-shots play only that part; loops
  repeat exactly it with `loopStart` / `loopEnd` (the MP3 is never edited).
- Background loops (stage 12.3): one pure function, soundEffects.js
  `getActiveLoop(snapshot)`, decides which loop plays (or none); main.js passes it every
  frame to audio.js `setBackgroundLoop`, which acts only when the answer changes
  (crossfade over `AUDIO_LOOP_FADE_SECONDS`). Nothing else starts or stops a background
  loop. Only in PLAYING; a pause is not a reason to stop it (the suspended context
  freezes it and P resumes it mid-note; stopping would restart it from its beginning).
- Frightened loop (stage 12.3): `frightened-loop.mp3` while any ghost is FRIGHTENED (blue
  or flashing; eaten eyes and ghosts in the house do not count), on the music bus; a new
  pellet keeps it going (same name, no restart); `FRIGHTENED_FLASH_LOOP_RATE` 1.06 while
  flashing (glides over `AUDIO_LOOP_RATE_RAMP_SECONDS`). The file is a 10.000 s loop
  shifted by the MP3 encoder delay (1105 samples = 23 ms at 48 kHz), so the trim is set
  by hand (0.023-10.023): the detection finds faint pre-echo at 0.006 s, which would be
  a 17 ms gap every round. Its first note starts with an instant step (0.02 -> 0.31 in
  one sample), heard as a click on every round; every loop therefore plays its own copy
  of the file with a 2 ms fade at both loop points (`AUDIO_LOOP_SEAM_FADE_SECONDS`), so
  the seam joins zero to zero. The file's own end has ~15 ms at about -38 dB before the
  seam (inside the music it never drops below -25 dB); kept as is.
- Sound is NOT arcade-faithful (deviation from the original): ready-made MP3 files in
  `assets/audio/`, not the arcade's sounds and not synthesized in code. Each file is
  listed once in `js/soundManifest.js` (name -> file, bus, volume, loop, playback rate,
  max voices); no other code names a file. Every file has a row in
  `assets/audio/CREDITS.md` (source URL, author, license). Played with Web Audio
  buffers, not `<audio>` tags (no start delay, many copies of one sound at once, through
  the mixer). All files are fetched and decoded at startup (in an OfflineAudioContext,
  so there is still no AudioContext before the first key); a missing or broken file logs
  one warning and stays silent, and the game never waits for sound. The mixer
  (sfx/music/ui buses, glue compressor, limiter) stays; the shared reverb is kept with
  every bus send at 0 (the files carry their own room).
- History: from stage 12A+ to 12B the sounds were synthesized in code (a soft pop for
  the dots; for a ghost eaten, three sets of original sounds, an imitation of the
  arcade's sweep and a cartoon chomp + gulp were all rejected). Replaced by files; the
  code is in commit b7c9b99.
- The screen fills the window: the largest whole number of physical pixels per game
  pixel that fits (crisp, 224x288 shape kept), so a black border of up to one scale
  step remains around it.
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
- The attract screen has our own animated title (not the official logo; Pac-Man has no
  face, only our in-game sprites are used), rows 2-8 above both attract phases:
  "PAC-MAN" in the HUD font at 16 px, yellow-to-orange letters, an outline in the maze
  wall color and a 3D block behind them; our Pac-Man chomps in place of the dash; Inky
  peeks over the last letter and follows the chase with his eyes; a shine sweeps across
  the letters every 4 s. Under it a lane: Pac-Man runs left over a row of dots with the
  four ghosts behind him, eats the power pellet, and the blue ghosts flee right with
  him following; it repeats every 12.5 s. Chosen from three static versions (DEPTH,
  MAZE, SPRITES). Both attract phases moved down to start at row 9 (prompt at row 34;
  the attract screen has no bottom HUD).
- An arcade "marquee" sign in HTML/CSS sits above the canvas (marquee.js, style.css): a
  backlit panel in a chrome frame with a ring of bulbs, "PAC-MAN" in the title's style
  (gradient face, maze-wall outline, stacked-shadow 3D block, tilted with perspective),
  our Pac-Man in place of the dash and Blinky and Clyde peeking in at the edges (copies
  of the cached sprites). It never costs the game a scale step: it is shown only when the
  window still holds the same whole-number scale with `MARQUEE_HEIGHT_CSS_PX` +
  `MARQUEE_GAP_CSS_PX` taken away, otherwise it hides (e.g. a short window, or F11 where
  it would drop x4 to x3). Animated with CSS only (transform/opacity): a glint sweeps
  across the glass, chase lights run around the frame; P pauses them, and
  prefers-reduced-motion turns them off (a still sign, all bulbs lit).
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
  (see Stage 9, Part A2).
- Pac-Man and the ghosts are smooth canvas shapes too (js/sprites.js, stage 11A), not
  pixel art: same sizes (13 / 14 game px), positions and colors as the old pixel masks,
  with a see-through radial shading (`COLORS.SPRITE_LIGHT/PLAIN/SHADE`) instead of
  outlines (a dark outline would vanish on the black maze). The walls, dots, HUD text
  and the mute icon keep their whole-pixel look.
- Characters are drawn centered on the corridor, not on their logical position: wall
  lines run through pixel 3 of their tiles, so a one-tile corridor is open from 8 px
  before the position to 7 px after, with its middle half a pixel left/up of the tile
  center (`CORRIDOR_CENTER_SHIFT` in renderer.js). Pac-Man (13 px) gets 1 px to each
  wall; the 14 px ghost is painted half a pixel inside a 15 px picture
  (`GHOST_PICTURE_SIZE`) and gets half a pixel to each wall. Movement and collisions
  are unchanged; this is drawing only.
- Cruise Elroy only applies while Blinky is out in SCATTER/CHASE (`Ghost.isDangerous`),
  since he starts in the house in our version. A Blinky eaten during frightened waits in
  the house until it ends (`EATEN_GHOST_WAITS_FOR_FRIGHT_END`), so Elroy is away a little
  longer than in the arcade. After a lost life Elroy is suspended until Clyde is released
  (leaves `IN_HOUSE`); all ghosts are back inside then, as in the arcade.

## Current status
- **Current stage:** 12 – sound, restarted with MP3 files (engine, manifest, preload,
  gallery and credits done; 12.1 the dot sound, 12.2 the power pellet sound and
  12.3 the frightened loop done; stage 10 still has open parts, marquee 2C skipped for now)
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
- Stage 9, Part B (extra life + Cruise Elroy):
  - score.js `addPoints` (every kind of points passes through it): the first time the
    score reaches `EXTRA_LIFE_SCORE` (10,000) per game, `lives++` and emit
    `EVENTS.EXTRA_LIFE`; `extraLifeAwarded` reset by `resetScore`. The icon shows at once
    (`reserveLives`). `addDebugPoints` for the debug key.
  - levels.js: `elroy1`/`elroy2` speeds in `SPEED_ROWS` (L1 80/85%, L2-4 90/95%, L5+
    100/105%), `elroyDots` in `LEVEL_ROWS` (20, 30, 40x3, 50x3, 60x3, 80x3, 100x4, 120);
    config `elroy1Dots`, `elroy2Dots` (half).
  - game.js `elroyLevel()` (pure: 0/1/2 from `getDotsRemaining()`, 0 while
    `isElroySuspended`), passed in `world.elroyLevel`; `updateElroySuspension()` in
    `updatePlaying` ends the suspension once `clyde` is not `isWaitingInHouse()`. Set on a
    lost life, cleared by `startLevel`.
  - ghost.js: `canBeElroy` (Blinky), `elroyLevel` read from world before the speed,
    `activeElroyLevel()` (only when `isDangerous()`), `normalSpeedFraction()` (Elroy
    replaces only the normal speed; tunnel and frightened still win), SCATTER targets
    `chaseTargetTile(world)` when Elroy (shared with CHASE).
  - Debug: O (`DEBUG_ADD_POINTS_KEY`, was P until stage 10C; debug on, PLAYING only) adds `DEBUG_ADD_POINTS`
    1,000; "ELROY n" next to Blinky's target; overlay line `ELROY 1  DOTS 18/20` or
    `ELROY OFF (WAIT CLYDE)`.
  - Checked in Node: extra life once per game (dots, ghosts, fruit), table values,
    thresholds 21/20/11/10, speeds and targets per state, Pinky unaffected, suspension
    until Clyde's release, P key rules; random runs with 18 and 9 dots left (Elroy 1 and 2
    active, scatter-chasing, no ghost in a wall, levels completed).
- Stage 9 is complete.
- Stage 10, Part A (attract screen and game flow, see design decisions):
  - game.js: START + Enter -> `resetGame()` + `enterReady()`; GAME_OVER ->
    `enterAttract()` after `GAME_OVER_SCREEN_MS` (consumes a pending Enter first).
    READY/PLAYING unchanged (the clock still starts on the first direction key).
  - js/ui.js: `drawAttractScreen(context, { stateTimeMs, elapsedMs })`; what is visible is
    derived from `stateTimeMs` (`revealedGhostCount`, `isAttractPointsVisible`), so
    re-entering START replays the sequence with nothing to reset. Order and colors come
    from `GHOST_STARTS`, texts from `GHOST_DISPLAY_NAMES` (`characterText`,
    `nicknameText`); asserts that every ghost has names and every line fits.
  - renderer.js exports for reuse: `drawGhostShape` (split out of `drawGhost`),
    `drawDotAt`, `drawPowerPelletAt`, `isBlinkOn`, `screenTileToPixel`.
  - constants.js: `GHOST_DISPLAY_NAMES`, `ATTRACT_*` texts, screen-tile positions and
    delays, `PTS_LABEL`,
    `PRESS_START_TEXT` = "PRESS ENTER TO START", `GAME_OVER_SCREEN_MS`,
    `COLORS.ATTRACT_TEXT`.
  - main.js: START draws only the top HUD and the attract screen (no maze, no level).
  - Checked: Node flow test (Enter -> READY, clock stopped in READY, random game to
    GAME OVER, back to START after 3 s, Enter during GAME OVER ignored, last score kept on
    the attract screen, new game fully reset, high score kept); headless Edge screenshot.
- Stage 10, Part B1 (saved high score):
  - js/storage.js: the only module that touches localStorage. `loadScores()` /
    `saveScores(scores)`, one key `SCORES_STORAGE_KEY` ("pacman.v1.scores") holding
    `{ highScore, topScores: [{ name, score }] }`. Every access in try/catch; loaded data
    is checked (safe integers >= 0, names of `TOP_SCORE_NAME_LENGTH` letters from
    `NAME_ALPHABET`, at most `TOP_SCORES_COUNT` entries), anything else -> defaults.
    Valid data is cleaned: known fields only, table sorted, high score >= table's best.
    `saveScores` returns false on failure (blocked, quota) and never throws.
  - score.js: `setupScoring` loads; `saveHighScore()` writes only when the high score went
    up since the last save, on `PACMAN_DIED` (every game ends with one) and on `pagehide`
    (main.js). Not on every point. The saved table is kept untouched.
  - Checked in Node with a fake localStorage: broken JSON and 10 wrong shapes -> defaults,
    blocked/no-access/full storage never throws, load at startup, save timing; the part A
    flow test also passes with no localStorage at all.
- Stage 10, Part B2 (top 10 table and name entry, see design decisions):
  - js/topScores.js (pure): `qualifiesForTopScores(topScores, score)`,
    `insertTopScore(topScores, entry)` (new array; ties stay below older entries).
  - js/nameEntry.js `class NameEntry` (pure): `slots` (one per character, `NAME_BLANK`
    when empty) + `cursor`; `apply(action)`, `type`, `deleteCharacter` (like Backspace),
    `stepLetter` (wraps; blank is last, so up from blank = A), `moveCursor` (clamped),
    `name()` (trimmed), `isEmpty()`.
  - input.js: input mode (`INPUT_MODE.GAME` / `NAME`, `setInputMode` also drops every
    pending press and the held direction). In NAME mode `handleKeyDown` sends every key to
    `handleNameKey` first, so no game or debug key can act: `NAME_ENTRY_KEYS` (arrows,
    Backspace, Enter, NumpadEnter) or a typed character from `event.code`
    (`LETTER_KEY_PREFIX`, `DIGIT_KEY_PREFIXES`, `SPACE_KEY`) -> queued actions read with
    `consumeNameActions()`. Ctrl/Alt/Meta keys and unknown keys keep their browser behavior.
  - storage.js: names 1-`TOP_SCORE_NAME_MAX_LENGTH` characters from `NAME_ALPHABET`, no
    blank at either end (key stays v1: no names were saved before).
  - score.js: `getTopScores()`, `isTopScore()`, `addTopScore(name)` (saves table and
    high score at once).
  - game.js: GAME_OVER -> after `GAME_OVER_SCREEN_MS` `enterNameEntry()` (new state
    `NAME_ENTRY`) when `isTopScore()`, else `enterAttract({ showTopScoresFirst: false })`.
    `updateNameEntry` applies the actions; Enter with a name -> `addTopScore`, input back
    to GAME, `enterAttract({ showTopScoresFirst: true })`. `attractTimeMs()` = state clock
    + `attractOffsetMs`.
  - ui.js: `attractPhase(attractTimeMs)` (pure): characters `ATTRACT_CHARACTERS_PHASE_MS`
    (10 s, the reveal replays each time) then the table `ATTRACT_TOP_SCORES_PHASE_MS`
    (8 s); the prompt blinks in both (in the characters phase after the reveal).
    `drawTopScoresPhase` ("NO SCORES YET" when empty), `drawNameEntryScreen`. Asserts the
    widest table row fits and the characters phase outlasts the reveal.
  - Checked in Node: NameEntry editing, table rules, name validation, input mode (D C P M
    W type letters, no game action, debug not toggled, F5/Ctrl+R untouched), full flow
    (GAME OVER -> NAME_ENTRY -> saved -> START with the table; not qualifying -> START),
    phase timing; storage and part A tests still pass. Headless Edge screenshots of the
    table and the name entry screen.
- Stage 10, Part C (pause, mute, window-sized canvas, see design decisions):
  - Keys: `PAUSE_KEY` P, `MUTE_KEY` M (input.js `consumePausePress`/`consumeMutePress`,
    GAME mode only, cleared by `setInputMode`); `DEBUG_ADD_POINTS_KEY` moved to O.
  - game.js: `isPaused` flag (not a state). `update` reads mute and pause first, then
    returns at once while paused (drops debug presses), so no clock advances.
    `handlePauseToggle` (PLAYING only), `pauseIfPlaying` (tab hidden), `handleMuteToggle`.
  - js/audio.js (sounds come in stage 12): `setupAudio`, `isMuted`, `toggleMuted` (saves).
    storage.js: shared `readJson`/`writeJson`; `loadSettings`/`saveSettings`, own key
    `SETTINGS_STORAGE_KEY`, `{ muted: boolean }` or defaults.
  - gameLoop.js: a frame gap above `MAX_FRAME_TIME_MS` (250 ms) is a stall (hidden tab,
    debugger) and is dropped with no catch-up updates; shorter gaps are caught up as before.
  - main.js: `update` stops `frameCount`/`elapsedMs` while paused; `visibilitychange` ->
    `pauseIfPlaying`; render adds `drawPauseOverlay` and `drawMuteIndicator` (renderer.js,
    icon `MUTE_ICON_ROWS` next to the ghost masks). `fittingPhysicalScale` replaces
    `DISPLAY_SCALE` (window minus `WINDOW_MARGIN_CSS_PX`); the canvas is rebuilt only when
    scale or pixel ratio change, then `clearFruitImageCache()` (fruitArt.js). The maze has
    no offscreen cache (drawn every frame) and the sprite pixel lists are in game pixels,
    so the fruit pictures are the only cache tied to the screen size.
  - Checked in Node: loop gaps (5 s -> 0 updates, 250 ms -> 15, 251 ms -> 0), settings
    validation, P only in PLAYING, 10 s paused = identical clocks/positions/score, hidden
    tab pauses and waits for P, M while paused saves, O debug only, P/M/O type during the
    name entry; earlier tests still pass. Headless Edge: 800x600 -> x2, 1600x1200 -> x4,
    pause overlay and mute icon.
- Stage 11, Part A (smooth characters, see design decisions):
  - js/sprites.js: `getPacmanImage(direction, mouthHalfAngle, deviceScale)`,
    `getGhostImage(color, direction, deviceScale)`, `getFrightenedGhostImage(isFlashWhite,
    deviceScale)`, `getGhostEyesImage(direction, deviceScale)`. Each look is painted once
    into a hidden canvas and cached by look + scale (the `getFruitImage` pattern);
    `clearSpriteCache()` runs next to `clearFruitImageCache()` in
    `applyPixelPerfectScale`. Pac-Man: arc with a mouth wedge (`Math.atan2` of the
    direction). Ghost: half-circle head, straight sides, `GHOST_SKIRT_FEET` (4) pointed
    feet; eyes as ovals placed by the existing `GHOST_EYES` table; frightened face as two
    dots and a zigzag mouth.
  - renderer.js: `drawPacmanShape`, `drawGhostShape` and `drawGhost` only `drawImage` the
    cached pictures at whole-pixel corners (`deviceScale(context)` shared with
    `drawFruitShape`), so `drawLives` and the attract screen changed with them. The pixel
    masks (`pacmanPixels`, `GHOST_BODY_ROWS`, eye and frightened-face rows) are gone; only
    the mute icon still uses `pixelsFromRows`/`fillPixels`.
  - Checked in headless Edge (driven over the DevTools protocol): every direction and
    mouth angle, all ghost colors and directions, frightened/flash, eyes, life icons,
    attract screen, a running game, a window resize (x3 -> x2); no console errors.
- Stage 11, Part B (walking skirt):
  - Skirt shape: rounded feet, a frame per entry of
    `GHOST_SKIRT_FEET_PER_FRAME` ([3, 4], so the notches clearly move), notches
    `GHOST_SKIRT_DEPTH` (3 px) deep; both tunable in constants.js (asserted: depth 1-7,
    whole feet). sprites.js `addSkirt(context, feet)` draws one quadratic curve per foot
    (control two depths below the skirt's top line). `GHOST_SKIRT_FRAME_COUNT` = the
    table's length; `getGhostImage` and `getFrightenedGhostImage` take `skirtFrame`
    (part of the cache key; at most 63 pictures per scale with two frames).
  - Debug gallery G (`DEBUG_SPRITE_GALLERY_KEY`, debug on; F and G close each other):
    `drawSpriteGallery(context, elapsedMs)` shows the 4 ghosts + frightened blue/flash
    (`SPRITE_GALLERY_ZOOM` 2) in one row per skirt frame and a LIVE row that walks;
    shares `drawGalleryPanel` with the fruit gallery.
  - ghost.js: `walkTimeMs` grows by `deltaMs` only in an update where the ghost really
    moved (position compared around the new `updateState`), like Pac-Man's
    `distanceTraveled`: still for Blinky in the doorway, in freezes and while paused;
    bobbing ghosts walk in READY. Each ghost has its own clock.
  - renderer.js `ghostSkirtFrame(walkTimeMs)` = frame every `GHOST_SKIRT_FRAME_MS` (130 ms,
    approximation of the arcade's ~8 frames); `drawGhostShape(..., skirtFrame)`. Eyes
    have no skirt. ui.js: the attract portraits walk in place from `elapsedMs`.
  - Checked: Node (READY: Blinky 0, bobbers 2000 ms; PLAYING; 5 s paused = no change;
    frame at 0/129/130/260 ms), headless Edge picture of both frames for every color and
    frightened/flash, running game with no console errors.
- Sprite position fix (after part B): ghosts covered the right/bottom wall lines by 1 px
  (old box `[x-6, x+8)`, also in the old pixel art), Pac-Man touched them. renderer.js
  `spriteBox(x, y, size)` (reach = size / 2 + `CORRIDOR_CENTER_SHIFT`, asserted whole)
  replaces `PACMAN_CENTER_PIXEL`/`GHOST_CENTER_PIXEL`; sprites.js `cachedGhostImage`
  translates by `GHOST_PICTURE_MARGIN`. Debug (Backquote) now draws each character's
  picture box (`COLORS.DEBUG_SPRITE_BOX`) and logical position
  (`COLORS.DEBUG_SPRITE_CENTER`), one real pixel thin (`drawSpriteDebug`).
  Checked in headless Edge at x7: equal gaps on both sides of a corridor.
- Stage 11, Part C (death animation, replaces the stage 8 placeholder):
  - renderer.js `drawPacmanDying(context, pacman, progress)` (timing unchanged,
    `game.deathProgress()`): the first `1 - DEATH_POP_SHARE` (80%) is the collapse,
    `drawDeathCollapse`: facing up, mouth half angle `PI * (frame + 1) /
    (DEATH_COLLAPSE_FRAMES + 1)` in 10 fixed steps (cached like any Pac-Man picture), the
    last a thin sliver; then `drawDeathPop`: `DEATH_POP_RAYS` (8) round-capped lines
    from the middle of Pac-Man's picture box, radius 2 -> 7 px, length 3 -> 0, drawn live
    (not cached). All in constants.js (`DEATH_COLLAPSE_FRAMES`, `DEATH_POP_*`);
    `DEATH_ANIMATION_FRAMES` is gone.
  - Checked: headless Edge strip of 16 steps; a minute of random play with deaths, no
    console errors, cache 23 Pac-Man pictures (13 + 10 death steps).
- Stage 11, Part D (cleanup, no visible change): every color now lives in `COLORS`
  (`PELLET_COLOR` -> `COLORS.PELLET`; gallery panel and labels ->
  `COLORS.DEBUG_GALLERY_BACKGROUND` / `DEBUG_GALLERY_LABEL`; the gallery frame uses
  `COLORS.WALL` instead of a copy of it). The spacing both galleries share is
  `DEBUG_GALLERY_GAP` / `DEBUG_GALLERY_LABEL_HEIGHT`; the fruit gallery's own layout
  values in renderer.js are `FRUIT_GALLERY_*` (were `GALLERY_*`). Per-fruit palettes stay
  in `FRUIT_ART_COLORS`. Checked: both galleries and the pellets look the same in
  headless Edge.
- Stage 11, Part E (DPR check): tested in headless Edge by changing only
  devicePixelRatio (same window size): no resize event fires, so the canvas kept its old
  resolution. A `matchMedia('(resolution: ...dppx)')` watcher was tried and dropped: its
  change events arrived one change late or not at all. main.js `render()` now compares
  `window.devicePixelRatio` with `appliedScale.pixelRatio` every frame and calls
  `applyPixelPerfectScale()` on a difference; the resize listener stays for window size
  changes. Checked: DPR 1 -> 2 -> 1.25 -> 1 rebuilds the canvas at once each time
  (x3 -> x7 -> x4 -> x3), window resize still works, no console errors.
- Stage 11 is complete.
- After stage 11: Pac-Man's mouth stays closed for the whole LEVEL_COMPLETE state (from
  the last dot through the maze flash). Drawing only: `Game.isLevelComplete()` (a state
  query, no state machine change), renderer.js `drawPacmanMouthClosed` uses
  `CLOSED_MOUTH_HALF_ANGLE` = the chomp's first frame (asserted 0), so it is the picture
  already cached for his direction. Checked in headless Edge with debug C: closed in the
  freeze and the flash, no new Pac-Man picture, level 2 starts in READY and waits for
  the first key.
- Animated attract title (see design decisions), replacing a first plain logo:
  - js/titleArt.js: the cached pictures, painted into the characters' cache through the
    now exported sprites.js `cachedImage(look, width, height, deviceScale, paint)` (paint
    also gets the scale), so `clearSpriteCache` repaints them on a resize or DPR change:
    `drawTitleLetters` (3D block from copies `TITLE_EXTRUDE_STEP` apart, colors mixed
    `TITLE_EXTRUDE_NEAR` -> `FAR`, then `COLORS.WALL` outline and gradient face; the dash
    cell left empty) and `drawTitleShine` (a letters mask, and a reused scratch canvas:
    mask, then a slanted gradient band with 'source-in', then onto the screen).
  - js/title.js: layout (asserted to fit rows `TITLE_FIRST_ROW`..`TITLE_END_ROW`) and pure
    timing from `elapsedMs`: `titleChaseAt(timeMs)` (positions, direction, distance for
    the chomp, pellet eaten), `titleShineProgress`, `peekEyesDirection`; `drawTitle`
    draws back to front: the peeking ghost clipped to above the letters, the letters, the
    shine, the dash Pac-Man, the lane (dots left of Pac-Man, the pulsing pellet via
    `drawPowerPelletAt`, Pac-Man via `drawPacman`, ghosts via `drawGhostShape` or the new
    renderer export `drawFrightenedGhostShape`). ui.js calls it in both phases.
  - constants.js: `TITLE_*` sizes, speeds (px/s) and timings, `COLORS.TITLE_*`; the top
    scores and characters rows are now relative to `TITLE_END_ROW` (ui.js asserts both
    phases end above `ATTRACT_PROMPT_ROW`).
  - Checked: Node (closest ghost 18 px while chasing, none after the pellet, the cycle
    repeats, shine and eyes), headless Edge at several moments of both phases with a
    full top 10 table, shine steps, DPR 1 -> 2, no console errors.
- Arcade marquee, part 1 (static, see design decisions):
  - main.js: `roomForScale(pixelRatio, reservedHeightCss)` (the unrounded fit),
    `fittingPhysicalScale` (unchanged result), `isMarqueeAffordable`; the canvas is also
    rebuilt when the marquee's visibility changes (`appliedScale.isMarqueeShown`), then
    `layoutMarquee({ isShown, widthCss })`. Debug overlay adds `WINDOW wxh  CANVAS wxh`
    and `MARQUEE ON/OFF  FREE npx` (the real numbers of the player's window).
  - js/marquee.js: `setupMarquee` builds the DOM once and sets the CSS variables that come
    from constants.js (sizes and the title colors shared with the canvas);
    `layoutMarquee` sets the width, places the bulbs clockwise (`--bulb-index` for the
    later chase lights) and copies Pac-Man and the ghosts from the sprite cache 1:1 at the
    device resolution. Each word is drawn twice: the text is the outlined 3D back,
    `::after` (from `data-text`) the gradient face.
  - constants.js: `MARQUEE_HEIGHT_CSS_PX` (60), `MARQUEE_GAP_CSS_PX` (6),
    `MARQUEE_LETTER_SIZE_CSS_PX`, `MARQUEE_FRAME_CSS_PX`, `MARQUEE_BULB_SPACING_CSS_PX`,
    `MARQUEE_PACMAN_MOUTH_DEGREES`, `MARQUEE_PEEK_GHOSTS`; the rest of the look are CSS
    variables on `#marquee`.
  - Checked in headless Edge: 1536x812, 1536x780 @1.25 (shown, x3 kept), 1536x740 (hidden,
    x3), 1536x960 (hidden, x4 kept), 1000x700 @1 and 1600x1000 @2 (shown); the canvas
    scale always equals the formula without a marquee; no console errors. Tests must wait
    for the web font (slow network: text stays invisible with display=block meanwhile).
- Arcade marquee, part 2A (animations, base):
  - style.css: `.marquee-shine` (a panel-sized slanted gradient, `mix-blend-mode: screen`,
    @keyframes `marquee-shine`: translateX -100% -> 100% in the first quarter of
    `--marquee-shine-period` 4 s); bulbs @keyframes `marquee-chase` (opacity, step-end,
    3 x `--marquee-chase-step` 0.12 s, one step lit and two at `--marquee-bulb-dim`, each
    bulb delayed by `-index x step` so the light runs clockwise);
    `#marquee.is-paused *` holds every animation; `prefers-reduced-motion: reduce`
    removes them and hides the shine.
  - marquee.js: the shine element in the panel; `setMarqueePaused(isPaused)` (touches the
    DOM only on a change), called by main.js `render()` with `game.isPaused`.
  - Checked in headless Edge: 85 animations running, FPS 60, P: all 85 paused and the
    shine's time held for 1 s, running again after P; reduced motion: 0 animations, all
    84 bulbs lit; glint pictures frozen mid-sweep; no console errors.
- Arcade marquee, part 2D (reacting to the game; 2B and 2C skipped for now):
  - main.js `marqueeMood()` is read from the game every frame and passed to marquee.js
    `setMarqueeMood({ ghostLook, isDark, isFlashing, isFlashLit })` (no timers in the
    sign, so it stays in sync and P stops it): the peeking ghosts turn frightened
    (`MARQUEE_GHOST_LOOK`, blue then flashing with `isFrightenedFlashWhite`) only in
    PLAYING; dark (bulbs at `--marquee-bulb-off`, a black veil `.marquee-frame::after`,
    faded) from the death animation's start (`deathProgress() > 0`, not the freeze)
    through GAME_OVER; while the maze flashes all bulbs go on/off with the walls
    (game.js `isWallFlashOn()`, now also used by `wallColor()`), with no fade.
  - `celebrateMarquee()` on `GHOST_EATEN`, `FRUIT_EATEN`, `EXTRA_LIFE` (wired in main.js):
    all bulbs flash together (`marquee-burst`, `--marquee-burst-flash` x
    `--marquee-burst-flashes`), restarted by remove + `offsetWidth` + add, removed on
    `animationend`; skipped when hidden or with reduced motion.
  - style.css: reactions inside `prefers-reduced-motion: no-preference` (dark is not);
    order dark > maze flash > burst; the pause rule is `!important` because the
    reactions' animation shorthand would reset the play state.
  - Checked in headless Edge (game exposed through a debugger breakpoint): ghosts blue,
    white, back to their colors, held by P; a second ghost restarts the burst, P holds
    it; dark only after the 1 s freeze, lit again in READY, dark through GAME OVER; bulb
    on/off exactly with the walls; reduced motion: no burst, dark still works; no
    console errors.
- Arcade marquee, part 2B-A (power-on):
  - style.css `#marquee.is-powering-on`: each bulb waits off and lights in turn
    (`marquee-bulb-on`, fill-mode both, delay `--bulb-index / --bulb-count` x
    `--marquee-power-bulbs-time`), under the veil, which then flickers off
    (`marquee-power-veil`, `--marquee-power-time` 1.2 s). Inside the no-preference block,
    before the burst (dark still wins).
  - marquee.js: `startReaction(className)` (shared with the burst: remove,
    `offsetWidth`, add; skipped when hidden or with reduced motion) and
    `endReaction` (`REACTION_CLASS_BY_ANIMATION`). `powerOnMarquee()` when the sign
    appears (`layoutMarquee`: hidden -> shown, also the first layout) and when it leaves
    dark (`setMarqueeMood`: the next life's READY, the screens after GAME OVER).
    `placeBulbs` sets `--bulb-count`.
  - Checked in headless Edge (sampled every frame from page start): bulbs 0 -> 84 in
    ~0.6 s, two veil flickers, chase back after ~1.2 s; same on READY after a death and
    on a hidden -> shown resize; reduced motion: none at all; 2D tests unchanged.
- Arcade marquee, part 2B-B (bulb patterns):
  - constants.js `MARQUEE_PATTERN` (CHASE, ALTERNATE, FILL, SPARKLE);
    `setMarqueeMood({ ..., pattern })` writes it to `data-pattern` on #marquee (on a
    change only). style.css, inside no-preference and before every reaction (so they
    win): alternate = odd/even swap (`mod(--bulb-index, 2)`, `--marquee-alternate-step`);
    fill = a registered `@property --marquee-fill-progress` animated on `.marquee-bulbs`
    (-0.15 -> 1.3 over `--marquee-fill-time`), each bulb lit by
    `clamp(dim, (progress x count - index) x 1000, 1)`, with `transition: none` (the
    dark fade smeared every step and ran on through a pause); sparkle = one twinkle per
    `--marquee-sparkle-period` at `--bulb-random` (set once in `placeBulbs`).
  - Debug key L (`DEBUG_MARQUEE_PATTERN_KEY`, debug on): main.js steps
    `DEBUG_MARQUEE_PATTERNS` (the four, then null = the game's choice, chase for now);
    overlay `LIGHTS FILL (L)` on the MARQUEE line.
  - Checked in headless Edge: lit bulbs per sample for each pattern (chase 28/84 moving,
    alternate 42/84 swapping, fill 0 -> 84 clockwise then dark, sparkle a few random),
    P holds fill, death still goes dark, reduced motion all lit; 2D and power-on tests
    unchanged; no console errors.
- Arcade marquee, part 2B-C (pattern by game state): main.js `marqueePattern` (debug L
  still wins): START takes turns through `MARQUEE_ATTRACT_PATTERNS` (chase, alternate,
  fill, sparkle) every `MARQUEE_ATTRACT_PATTERN_MS` (9 s = three fill rounds) from
  `game.stateTimeMs`, so each visit starts with the chase; `MARQUEE_STATE_PATTERNS`:
  READY alternate, NAME_ENTRY sparkle; chase everywhere else. Checked in headless Edge:
  the pattern at attract times 0-45 s and in every state, L over READY and back.
  Marquee part 2B is complete.
- Stage 12, Part A (audio infrastructure, no game sounds yet, see design decisions):
  - js/audio.js (the sound manager, module = one instance): one `AudioContext`, made
    only inside the first `AUDIO_UNLOCK_EVENTS` (keydown/pointerdown) by `unlockAudio`
    (listeners removed once it runs); graph sound -> envelope gain -> bus
    (`AUDIO_BUS.SFX` / `LOOP`, `AUDIO_SFX_VOLUME` / `AUDIO_LOOP_VOLUME`) -> master
    (`AUDIO_MASTER_VOLUME`) -> destination.
  - A sound is a frozen table `{ waveform, frequencyHz, volume, attackSeconds,
    holdSeconds, releaseSeconds }` (`TEST_BEEP`). `playSound(sound, bus)`: one-shot,
    whole envelope scheduled on `context.currentTime`; skipped before the unlock and
    while suspended. `startLoop(sound)` / `stopLoop()`: one loop at a time, the old one
    fades out over its release; a loop may start while suspended.
  - Mute: `toggleMuted` (unchanged saving through storage.js `saveSettings`) now also
    ramps the master to 0 / back over `AUDIO_MUTE_RAMP_SECONDS` (`rampTo`: cancel, hold
    the current value, linear ramp). The context starts muted when the saved flag says so.
  - Suspend: `applySuspension` runs the context only when `!isGamePaused &&
    !document.hidden`; `setAudioPaused(game.isPaused)` from `render()` (on a change only,
    like the marquee) and from main.js `visibilitychange` (so a paused game stays silent
    the moment the tab returns); audio.js also listens to `visibilitychange` itself, so
    a hidden tab is silent on every screen. Promise rejections are caught.
  - Debug: B (`DEBUG_SOUND_GALLERY_KEY`, debug on, every screen, dropped while paused)
    plays `TEST_BEEP`; overlay line `AUDIO LOCKED` / `AUDIO RUNNING  MUTED  LOOP`.
  - Checked in headless Edge (spies on AudioContext, createGain, createOscillator, a faked
    `document.hidden`): no context and no console warning before the first key; beep
    oscillators end; M ramps 0.5 -> 0 in ~30 ms and saves, starts at 0 when saved muted;
    P suspends/resumes, B while paused plays nothing; hidden tab in PLAYING stays
    suspended until P, on the attract screen comes back by itself; a second loop ends
    the first, every oscillator ends. Node elroy/fruit tests still pass.
- Stage 12A+, Part A (mixer graph): js/audioMixer.js `createMixer(context, { masterVolume
  })` returns `{ masterGain, busInputs }`. Each bus (`AUDIO_BUS` SFX/MUSIC/UI, levels in
  `AUDIO_BUS_VOLUMES`) goes dry to the master and through its own send
  (`AUDIO_REVERB_SENDS`) to one shared reverb: highpass `AUDIO_REVERB_LOW_CUT_HZ` ->
  ConvolverNode -> return gain `AUDIO_REVERB_RETURN` -> master. The impulse response is
  made in code (`createImpulseResponse`: stereo noise, own noise per channel, fading as
  `(1 - t) ** AUDIO_REVERB_DECAY_POWER` over `AUDIO_REVERB_SECONDS`). Master (mute
  ramps it, unchanged) -> glue compressor `AUDIO_GLUE_COMPRESSOR` -> limiter-style
  compressor `AUDIO_LIMITER` (ratio 20, hard knee) -> destination. The loop bus is gone:
  `startLoop(sound, bus = SFX)`; `AUDIO_SFX_VOLUME` / `AUDIO_LOOP_VOLUME` replaced.
  Checked in headless Edge (connect() spy): the wiring above, impulse 2 channels x
  0.8 s decaying (RMS per quarter 0.40/0.16/0.04/0.003), 20 full-volume beeps at once
  peak 0.96 after the limiter (no clipping); the 12A tests (lock, M ramp and save,
  P / hidden tab, loops end) unchanged; no console errors.
- Stage 12A+, Part B (building blocks): js/audioVoices.js `startNote(context,
  destination, voice, note)`: oscillator `layers` (ratio, detune, gain), optional
  `noise` (one shared looped noise buffer, random start), optional `filter` whose cutoff
  moves start -> peak -> end (`FILTER_UNIT.HZ` or multiples of the note, `NOTE`), ADSR
  `envelope` (linear attack, `setTargetAtTime` decay/release over
  `AUDIO_ENVELOPE_TIME_CONSTANTS`), optional glide (`glideFromRatio`), StereoPanner; the
  chain disconnects itself on `ended`; `stopAt(time, fade)` for stealing. Also
  `rampTo` (moved from audio.js), `centsToRatio`.
  - audio.js `play(name, { delaySeconds, frequencyRatio, pan })` looks the sound up in
    constants.js `SOUNDS` (`label`, `bus`, `maxVoices`, `variation { pitchCents, volume
    }`, `notes` with `voice` from `VOICES`). One random variation per play (shared by its
    notes). Polyphony: plays still sounding at the new one's start beyond `maxVoices`
    (default `AUDIO_DEFAULT_MAX_VOICES`) fade out over `AUDIO_VOICE_STEAL_SECONDS`.
    Skipped while the game wants silence; a context still starting plays it after
    `resume()`. `playSound`, `startLoop`/`stopLoop` and `TEST_BEEP` are
    gone (loops come back with the siren). Debug line `AUDIO RUNNING  VOICES n`.
- Stage 12B, Part C (dot sound, see design decisions): js/soundEffects.js
  `setupSoundEffects` (main.js) listens to `DOT_EATEN { col }` and plays the active
  variant with `dotPan(col)` (`AUDIO_DOT_PAN_WIDTH`). Chosen after three rounds in the
  gallery (soft pluck / bubble / crystal on a climbing scale were rejected; from pop /
  wood / click the pop was tuned in five versions): `dotPopSoft`, voice `popSoft`, a
  520 Hz sine that glides up from 0.8x in 20 ms, a 6 ms attack (no hard touch), no
  noise, a lowpass at 2x -> 1.5x the note, about 80 ms long, +-20 cents and +-12%
  volume per dot, 3 at most. Peak about 0.1 per play before the master. The other
  versions were removed; `SOUND_EFFECT_VARIANTS` (`chosen`) keeps the list for the
  gallery. Asserts that every variant and voice exists. Gallery: input.js `isSoundGalleryOpen`,
  `consumeSoundGalleryActions` (N, 1-5 = `DEBUG_SOUND_VARIANT_KEYS`, only while it is open; B, F, G close each
  other); js/soundGallery.js `applySoundGalleryActions`, `soundGalleryView`;
  renderer.js `drawSoundGallery`. The dot preview plays `AUDIO_DOT_PREVIEW_COUNT` (12)
  dots left to right. Debug line `DOT B WOOD`.
  - Checked in headless Edge: each variant's preview stays on its pitch within the +-20
    cents variation, 10 dots at once = 3 voices, every oscillator and noise source ends,
    real play sounds, nothing while paused; 12A checks (lock, M ramp, P, hidden tab) and
    the Node elroy/fruit tests pass; no console errors.
- Stage 12B, Part D (ghost eaten, see design decisions): constants.js
  `chompGulpSound({ label, bites, gulpRatio, timeScale, reverbSend })` builds the notes
  from `CHOMP_*` (bites, then the gulp starting at the last bite's end with the thump);
  voices `chompBite` (noise only, bandpass Q 2 on the note = `CHOMP_BITE_HZ`),
  `chompGulp` (sine, lowpass 1500 -> 500 Hz), `chompThump` (sine). Five sounds, each
  changing one thing of A: A `ghostChomp` BASE, B 3 BITES, C HIGHER GULP (x1.5),
  D LONGER (all times x1.6, the clicks as sharp), E MORE REVERB (`reverbSend` 1.5).
  `NO_VARIATION` so they compare fairly. Engine: a note's `pitchPath` (points
  `{ atSeconds, ratio }`, exponential slides; audioVoices.js `followPitchPath`) replaces
  the glide (the dot uses it: 0.8 -> 1 in 20 ms) and the arcade's `stairs`; a sound's
  `reverbSend` (audio.js `soundInput`: one node per sound feeding its bus and the reverb,
  which `createMixer` now returns as `reverbInput`). The arcade sweep, its voices and
  `ARCADE_*` constants are gone. soundEffects.js listens to `GHOST_EATEN { points }`;
  a sound with `followsChain` (none now) rises by `AUDIO_GHOST_CHAIN_SEMITONES`; the
  gallery plays the chain of four `AUDIO_GHOST_PREVIEW_SPACING_SECONDS` apart; debug
  line `SFX A B` (every effect's variant).
  - Checked: OfflineAudioContext render through the real mixer in headless Edge (bites,
    then gulp; RMS 0.06-0.07, peak below 0.95 at master 1, about 0.25 s + tail; the
    reverb variant rings ~0.2 s longer); in the game, gallery B -> N -> 1-5: 44 noise +
    40 oscillator sources, all ended; no console errors. Found on the way: right after
    an AudioContext starts the mixer's compressors hold the very first sound back
    (about 3x quieter for ~50 ms); harmless in play.
- Stage 12 restart, Part A (sound from files, see design decisions):
  - Removed: js/audioVoices.js, js/soundEffects.js and from constants.js `VOICES`,
    `SOUNDS`, `SOUND_EFFECT(_VARIANTS)`, `FILTER_UNIT`, `CHOMP_*`, `AUDIO_DOT_*`,
    `AUDIO_GHOST_*`, `AUDIO_ENVELOPE_TIME_CONSTANTS`, `AUDIO_NOISE_BUFFER_SECONDS`,
    `DEBUG_SOUND_VARIANT_KEYS`; from audio.js the synthesis (`scheduleSound`,
    `soundInput`, `randomVariation`). `rampTo` moved into audio.js. `AUDIO_REVERB_SENDS`
    all 0 (audioMixer.js unchanged; it still returns `reverbInput`, unused for now).
  - js/soundManifest.js: `SOUND_FILES_FOLDER` ('assets/audio/'), frozen `SOUND_MANIFEST`
    (one sound: `dot` -> dot-eat.mp3, SFX, volume 0.5, 3 voices), `soundFilePath(name)`,
    asserts (file, known bus, volume >= 0, playbackRate > 0, loop boolean).
  - audio.js: `preloadSounds` from `setupAudio` (not awaited): one OfflineAudioContext
    (`AUDIO_DECODE_SAMPLE_RATE` 48000, 1 channel, 1 frame); `loadSound` fetches, checks
    `response.ok`, decodes into `buffers`; `loadStates` (`SOUND_LOAD_STATE` LOADING /
    READY / MISSING); a failure -> one `console.warn` naming the sound, file and reason.
    `play(name, { delaySeconds, pan })` (one-shots only, asserted): `createVoice` =
    source (playbackRate, loop) -> gain (volume) -> optional StereoPanner -> bus, unplugs
    itself on `ended`; polyphony `makeRoomFor` / `fadeOutAt` (steal fade, then `stop`).
    `stopSound(name)`. `startLoop(name)` / `stopLoop(name)` (loops only, asserted):
    `wantedLoops` + `runningLoops`, fade in/out over `AUDIO_LOOP_FADE_SECONDS` (80 ms);
    a loop asked for before the first key or before its file arrived starts when both
    are there; asking twice starts it once. `soundDuration`, `soundLoadState`,
    `isSoundPlaying`. Debug line `AUDIO RUNNING  MUTED  VOICES n  LOOPS n  FILES r/n`.
  - Gallery (B): soundGallery.js lists `SOUND_MANIFEST`; input.js keys N
    (`DEBUG_SOUND_GALLERY_NEXT_KEY`), 1 (`DEBUG_SOUND_PLAY_KEY`), 2
    (`DEBUG_SOUND_STOP_KEY`) -> `SOUND_GALLERY_ACTION` NEXT / PLAY / STOP; renderer.js
    `drawSoundGallery`, one line per sound: label, length or LOADING / MISSING, LOOP,
    `>>` while it sounds.
  - assets/audio/CREDITS.md: dot-eat.mp3, own work, David Kolche, CC0 1.0.
  - Checked in headless Edge (spies on AudioContext, buffer sources, ramps, stops): no
    context and no warning before the first key; FILES 1/1; 10 fast plays = 10 sources,
    3 sounding, 2 stops them, all 10 ended; M ramps and saves; P suspends, nothing plays
    while paused, P resumes. With a test manifest (a loop, a missing file, a non-audio
    file): exactly one warning each (HTTP 404 / Unable to decode), FILES 2/4, the
    gallery shows MISSING, playing them creates nothing; the loop starts once, fades in
    over 80 ms, stops 80 ms after its fade to 0 begins, its source ends; a game still
    runs. dot-eat.mp3 is 5.16 s long.
- Stage 12.1 (dot sound, see design decisions):
  - soundManifest.js: `SOUND` names (`SOUND.DOT`); optional `slice { offsetSeconds,
    durationSeconds }` (one-shots only) and `pitchVariationCents`, asserted; `dot`: slice
    0.015 + 0.335, 15 cents, volume 0.5, 3 voices, playbackRate 1 (chosen by ear in play; the slider stays for later sounds).
  - audio.js: `startOneShot` plays `playedPart(name)` with `start(time, offset,
    duration)`; a slice gets 5 ms fades at both ends (`fadeSliceEdges`,
    `AUDIO_SLICE_FADE_SECONDS`); rate = `effectiveRate(name)` (gallery override or
    manifest) x `randomPitchVariation` (`CENTS_PER_OCTAVE`); `fadeOutAt` cancels the
    slice's own end fade first. `setPlaybackRateOverride` (live on sounding and waiting
    plays and on a running loop), `soundPlaybackRate`, `soundBuffer`; `soundDuration`
    counts the slice and the rate.
  - js/soundEffects.js (new): `setupSoundEffects` (main.js): `DOT_EATEN` ->
    `play(SOUND.DOT)`.
  - js/soundAnalysis.js (new, debug): `logSoundHits(name, buffer)`: mono, RMS per
    `SOUND_ANALYSIS_WINDOW_SECONDS` (5 ms), a hit from ON (25% of the loudest) until OFF
    (8%), widened to EDGE (10% of its peak); `console.log` summary + `console.table`
    (start, peak, end, length, gap).
  - Gallery: keys 3 (`DEBUG_SOUND_DOT_RUN_KEY`, `SOUND_GALLERY_DOT_RUN_COUNT` 24 plays
    `dotIntervalSeconds(SOUND_GALLERY_DOT_RUN_LEVEL)` apart, all scheduled at once) and
    4 (`DEBUG_SOUND_ANALYZE_KEY`); `setSoundGalleryShown` (main.js, every frame) builds
    once and shows `#sound-rate` (range `SOUND_GALLERY_RATE_MIN/MAX/STEP`, css/style.css);
    `input` -> override, `change` -> console line with the value to keep. Panel line adds
    `x1.50`.
  - Checked in headless Edge: key 4 prints 14 hits, 0.368 s apart (2.72/s); a play =
    `start(t, 0.015, 0.335)`; the dot run 24 plays 0.1486 s apart, at most 3 voices; the
    slider at 1.5 changes plays already scheduled and the next ones in the game; walking
    left: 7 dots = 7 plays, at most 2 sounding; P: suspended, nothing new; M + P:
    running and muted; three deaths: 0 sources alive 0.5 s after each; at game over
    0 alive, all 84 sources ended; no console errors (only the old favicon 404).
- Stage 12.2 (power pellet sound, see design decisions):
  - soundManifest.js: `SOUND.POWER_PELLET` -> power-pellet.mp3 (1.872 s: ~1 s of sound,
    then silence), SFX, volume 0.5, 2 voices, `trimStartSeconds` 0.023. New optional
    field `trimStartSeconds` (asserted >= 0 and not with a slice).
  - audio.js `playedPart`: a slice, else the file from `trimStartSeconds` to its end;
    loops start there and set `loopStart` to it, so the silence never repeats.
  - soundEffects.js: `POWER_PELLET_EATEN` -> `playPowerPellet` (TODO: level complete
    wins when it was the last food; score.js subscribes first, so `getDotsRemaining()`
    is already 0 there).
  - soundAnalysis.js: renamed `logSoundAnalysis`; the summary also prints the silence
    at the start and end (`SOUND_ANALYSIS_SILENCE_LEVEL`, about -60 dBFS).
  - assets/audio/CREDITS.md: power-pellet.mp3, own work, David Kolche, CC0 1.0 (every
    audio file in the project is the user's own work).
  - Checked in headless Edge: FILES 2/2; key 4: 1.872 s, 0.023 s silence at the start;
    a play = `start(t, 0.023, 1.849)`; a pellet among the dots: its own source, the
    dots' sources not stopped and new dots keep playing, ghosts FRIGHTENED; P: no new
    source; M + P: running and muted; everything ended afterwards; no console errors.
- Stage 12.3 (frightened loop, see design decisions):
  - constants.js: `AUDIO_SILENCE_LEVEL` (replaces `SOUND_ANALYSIS_SILENCE_LEVEL`),
    `AUDIO_LOOP_SEAM_FADE_SECONDS`, `AUDIO_LOOP_RATE_RAMP_SECONDS`,
    `FRIGHTENED_FLASH_LOOP_RATE`, `SOUND_GALLERY_SEAM_LEAD_SECONDS`.
  - soundManifest.js: `SOUND.FRIGHTENED` (music bus, volume 0.6, trim 0.023-10.023 set by
    hand); `trimEndSeconds` (asserted: not with a slice, ends after it starts).
  - soundAnalysis.js: `audibleRange(buffer, level)` (used by audio.js at load);
    `logSoundAnalysis(name, buffer, loop)` prints the audible range and, for a loop, the
    jump at the seam in the file and with the fades vs the biggest jump inside the loop.
  - audio.js: `trims` (`findTrim`: manifest or detected) used by `playedPart`;
    `loopBuffers` (`createLoopBuffer`: a copy with the seam fades); loops play it with
    `loopStart` / `loopEnd` = the trim; `startLoop(name, { fromSeconds })` (`wantedLoops`
    is a Map); `setBackgroundLoop(name, rateFactor)`; `loopRateFactors`;
    `soundLoopBuffer`, `soundTrim`.
  - soundEffects.js: pure `getActiveLoop({ state, isAnyGhostFrightened })` and
    `activeLoopRateFactor({ isFrightFlashing })`. game.js: `isAnyGhostFrightened()`,
    `isFrightFlashing()`. main.js: `backgroundLoopSituation()` -> `setBackgroundLoop`
    in `render()`.
  - Gallery: a loop (key 1) starts `SOUND_GALLERY_SEAM_LEAD_SECONDS` before its end; the
    selected sound shows `TRIM a-b [SET]  FOUND a-b`; key 4 adds the seam line.
  - Checked in headless Edge: the getActiveLoop table (only PLAYING + frightened); FILES
    3/3; key 4: 10.032 s, audible 0.006-10.023, seam jump 0.007 / 0 with fades, biggest
    inside 0.291 (the first note's step); gallery loop source loopStart 0.023, loopEnd
    10.023, started at 8.523 and still playing past the seam; a render of 3 rounds:
    jump at the seams 0.0064 (biggest inside 0.17), -8 dB right after the seam; READY and
    PLAYING without fright: no loop; pellet -> one loop source, a second pellet: still one;
    P: suspended, clock still, same source after P; flashing: rate gliding to 1.06; fright
    over: no loop; no console errors.
- **Next:** more sound files
  (with credits): ghost eaten, fruit, extra life, death, start jingle,
  level complete, siren; the open parts of stage 10; marquee 2C (breathing glow, living
  sprites) later.
