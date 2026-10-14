# Snake

A modern take on the classic Snake arcade game, built with vanilla JavaScript and the HTML5 Canvas API.

Guide the snake around the board, collect glowing food to grow and increase your score, and avoid colliding with the walls or your own body. This version combines traditional grid-based gameplay with smooth continuous animation, an expressive snake character, sound effects, and responsive controls for desktop and mobile devices.

**[Play Snake](https://fredwahab.github.io/Snake/)**

![Snake gameplay showing the animated snake on the game board.](assets/gameplay.png)

## How to Play

Collect food to earn points and grow longer. Avoid hitting walls or your own body. The game ends when you collide; fill the entire board to win.

### Desktop Controls

| Key | Action |
| --- | --- |
| Arrow keys | Change direction |
| W / A / S / D | Change direction |
| Spacebar | Start, pause, resume, or restart |

The snake cannot reverse directly into itself.

### Mobile Controls

| Gesture | Action |
| --- | --- |
| Swipe up / down / left / right | Change direction |
| Tap game board | Start, pause, resume, or restart |

Mobile play uses swipe and tap input rather than on-screen directional buttons. The board adapts to portrait and landscape orientations.

### Sound

Use the speaker button in the game header to turn sound on or off. Your mute preference is saved between visits. Muting also stops sounds already playing.

## Features

- **Classic Snake gameplay** — Collect food, grow longer, avoid collisions, and fill the board to win.
- **Smooth movement** — The snake interpolates between grid positions rather than jumping abruptly between cells.
- **Continuous rounded body** — A path-based Canvas renderer creates connected sections and curved turns.
- **Expressive animations** — The snake blinks, flicks its tongue, reacts when eating, and recoils on collision.
- **Animated food** — Glowing food appears in random unoccupied cells, with varied colors.
- **Color progression** — The snake transitions through a palette as the score increases.
- **Scoring and records** — Current score and a persistent high score are displayed.
- **Pause, resume, and restart** — Available through keyboard and touchscreen controls.
- **Responsive layouts** — Distinct desktop, mobile portrait, and mobile landscape board dimensions.
- **Orientation handling** — An in-progress game is preserved when the device orientation changes and can be resumed after rotating back.
- **Sound effects** — Eight effects cover starting, eating, pausing, resuming, collisions, game over, high scores, and victory.
- **Persistent mute control** — The speaker button saves the setting and immediately stops active audio when muted.
- **No gameplay framework** — Core gameplay uses standard JavaScript and browser APIs.

## Technologies Used

- **HTML5** — Document structure and game canvas
- **CSS3** — Responsive layout, interface styling, and orientation-specific presentation
- **JavaScript (ES modules)** — Game state, movement, input, rendering, and audio management
- **Canvas 2D API** — Grid, snake, food, and frame-by-frame animations
- **Web Audio elements** — Sound-effect playback with MP3/OGG support
- **Vite** — Local development and optimized production builds
- **GitHub Actions** — Automated build and deployment
- **GitHub Pages** — Static hosting

## Project Structure

```text
Snake/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── assets/
│   └── gameplay.png
├── public/
│   ├── audio/
│   │   ├── start.mp3 / start.ogg
│   │   ├── eat.mp3 / eat.ogg
│   │   ├── pause.mp3 / pause.ogg
│   │   ├── resume.mp3 / resume.ogg
│   │   ├── collision.mp3 / collision.ogg
│   │   ├── game-over.mp3 / game-over.ogg
│   │   ├── high-score.mp3 / high-score.ogg
│   │   └── victory.mp3 / victory.ogg
│   └── favicon.svg
├── src/
│   ├── main.js
│   ├── game.js
│   ├── snake.js
│   ├── renderer.js
│   ├── input.js
│   ├── audio.js
│   └── style.css
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

### JavaScript Modules

| File | Responsibility |
| --- | --- |
| `main.js` | Creates the interface, wires up the mute button, and initializes the game |
| `game.js` | Manages game states, scores, food spawning, orientation changes, and the game loop |
| `snake.js` | Handles movement, queued directions, collisions, growth, and path history |
| `renderer.js` | Draws the grid, animated food, continuous snake body, and expressive head |
| `input.js` | Handles desktop keyboard and touchscreen gestures |
| `audio.js` | Loads and plays effects, controls overlapping audio, and persists mute settings |

The modules separate game rules, display, input, and audio so each system can be maintained independently.

## Technical Implementation

### Grid-Based Game Logic

Snake uses a logical grid with dimensions chosen for the current layout:

| Layout | Grid dimensions |
| --- | --- |
| Desktop | 15 × 15 |
| Mobile portrait | 10 × 16 |
| Mobile landscape | 18 × 10 |

The snake is represented by grid coordinates, with its head at the front of the body. Movement and collision detection operate at a fixed logical tick rate, independent of rendering frames. Food appears only in unoccupied cells.

### Smooth Animation and Rounded Paths

The game uses `requestAnimationFrame()` to draw frames between logical movement updates. The renderer interpolates the snake's head and tail positions, producing continuous-looking motion without changing the discrete rules of the game.

Rather than drawing disconnected body segments, the renderer builds a continuous route from the snake's position history. Rounded line joins and quadratic curves smooth the path through turns.

### Animated Growth and Head Details

When food is collected, the snake's logical length increases. Its tail remains in place during that growth step while the head advances, making the extension look natural.

The head is rendered as a rounded ellipse oriented in the direction of travel, with blinking eyes, an occasional forked tongue, a brief eating reaction, and a collision animation with recoil and X-shaped eyes. The snake also cycles through different colors as the score increases.

### Collision Detection

Before updating the snake's position, the game checks for:

- Movement beyond a board boundary
- Movement into a body cell
- Legal movement into the current tail cell when the tail is moving away

A collision triggers a short visual and audio reaction before the game-over state is displayed.

### Input and Responsive Layouts

The input module supports Arrow keys, WASD, Spacebar, taps, and directional swipes. Direction changes are queued and limited to one accepted turn per movement interval to prevent invalid rapid reversals.

Board dimensions adapt to desktop, mobile portrait, and mobile landscape. When an active game is interrupted by an orientation change, its state is preserved; the player can rotate back to return to it or start a new game in the new orientation.

### Audio Management

The audio manager loads effects from `public/audio/`, choosing OGG when supported and otherwise using MP3. It permits overlapping sound effects and assigns individual volume levels. The mute preference is stored in `localStorage`, and muting stops any sounds currently playing.

The same browser storage mechanism preserves the high score.

## Running Locally

### Prerequisites

- Node.js
- npm

Clone the repository and install dependencies:

```bash
git clone https://github.com/fredwahab/Snake.git
cd Snake
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local address printed in the terminal.

### Production Build

```bash
npm run build
```

Vite generates the production site in `dist/`. To test that build locally:

```bash
npm run preview
```

## Deployment

Snake is hosted on GitHub Pages and deployed using GitHub Actions. The deployment workflow builds the Vite application and publishes the compiled site when changes are pushed to the `main` branch.

The production base path is `/Snake/` so JavaScript, CSS, the favicon, and audio assets resolve correctly under the repository's GitHub Pages URL.

**Live game:** https://fredwahab.github.io/Snake/

## Future Improvements

Snake v1 is a complete, playable release. Potential future additions include optional themes, new game modes, achievements, or extra presentation polish. None are required for the current gameplay experience.

## About This Project

Snake is part of my browser games portfolio. I developed it to practice and demonstrate JavaScript programming, browser game architecture, HTML5 Canvas rendering, responsive design, and front-end deployment.

The project evolved from a traditional grid-based Snake implementation into a more expressive arcade game with continuous path rendering, independent animation and simulation, responsive input, persistent state, and an audio system.

---

**Developed by [Fred Wahab](https://fredwahab.com)**  
Part of my browser games portfolio.
