const player = document.getElementById('player');
const world = document.getElementById('world');
const ground = document.getElementById('ground');
const lava = document.getElementById('lava');
const hud = document.getElementById('hud');
const gameOverScreen = document.getElementById('gameOver');
const finalScore = document.getElementById('finalScore');
const countdownEl = document.getElementById('countdown');

const playerWidth = 50;
const playerHeight = 50;
const groundHeight = 100;
const platformHeight = 20;

const speed = 5;
const gravity = 0.6;
const jumpPower = -14;

const minGapY = 70;
const maxGapY = 110;
const minPlatformW = 110;
const maxPlatformW = 200;
const maxShiftX = 260;

const lavaStartSpeed = 0.6;
const lavaAcceleration = 0.0002;
const lavaMaxSpeed = 2.5;

const dashSpeed = 18;
const dashFrames = 10;
const dashCooldown = 3000;

const doubleJumpCooldown = 8000;

const maxLavaDistance = 600;

let groundY = window.innerHeight - groundHeight;
ground.style.top = groundY + 'px';

let x, y, vy, isGrounded, counting;
let lastDir = 1, dashDir = 1, dashTimer = 0, dashQueued = false, jumpQueued = false;


function makeAbility(id, cooldown) {
  const el = document.getElementById(id);
  return {
    el,
    fill: el.querySelector('.ability-fill'),
    text: el.querySelector('.ability-time'),
    cooldown,
    readyAt: 0
  };
}
const dashAb = makeAbility('dashAbility', dashCooldown);
const doubleJumpAb = makeAbility('doubleJumpAbility', doubleJumpCooldown);
let cameraY, lavaY, started, frames, dead;
let platforms, nextPlatformY, lastCenterX, bestHeight;

const keys = {};

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat && !counting && !dead) {
    dashQueued = true;
  }

  if (e.code === 'KeyW' && !e.repeat && !counting && !dead) {
    jumpQueued = true;
  }
  if (e.code === 'KeyR' && dead) resetGame();
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function resetGame() {
  if (platforms) {
    platforms.forEach((p) => p.el && p.el.remove());
  }

  lastDir = 1;
  dashDir = 1;
  dashTimer = 0;
  dashAb.readyAt = 0;
  doubleJumpAb.readyAt = 0;
  dashQueued = false;
  jumpQueued = false;

  x = (window.innerWidth - playerWidth) / 2;
  y = groundY - playerHeight;
  vy = 0;
  isGrounded = true;

  cameraY = 0;
  lavaY = groundY + groundHeight;
  started = false;
  frames = 0;
  dead = false;
  bestHeight = 0;

  platforms = [{ x: -100000, y: groundY, w: 200000, el: null }];
  nextPlatformY = groundY;
  lastCenterX = x + playerWidth / 2;

  gameOverScreen.classList.remove('show');
  generatePlatforms();
  startCountdown();
}

function startCountdown() {
  counting = true;
  dashQueued = false;
  jumpQueued = false;
  countdownEl.classList.remove('hidden');

  const steps = ['3', '2', '1', 'Climb!'];
  let i = 0;

  const next = () => {
    countdownEl.textContent = steps[i];
    if (steps[i] === 'Climb!') {
      counting = false;
      setTimeout(() => countdownEl.classList.add('hidden'), 500);
      return;
    }
    i++;
    setTimeout(next, 700);
  };
  next();
}

function generatePlatforms() {

  while (nextPlatformY > cameraY - window.innerHeight) {
    nextPlatformY -= rand(minGapY, maxGapY);

    const w = rand(minPlatformW, Math.min(maxPlatformW, window.innerWidth));
    const cx = Math.max(
      w / 2,
      Math.min(lastCenterX + rand(-maxShiftX, maxShiftX), window.innerWidth - w / 2)
    );
    lastCenterX = cx;

    const el = document.createElement('div');
    el.className = 'platform';
    el.style.width = w + 'px';
    el.style.transform = `translate(${cx - w / 2}px, ${nextPlatformY}px)`;
    world.appendChild(el);

    platforms.push({ x: cx - w / 2, y: nextPlatformY, w, el });
  }
}

function removeOldPlatforms() {
  const cutoff = cameraY + window.innerHeight + 100;
  platforms = platforms.filter((p) => {
    if (p.el && p.y > cutoff) {
      p.el.remove();
      return false;
    }
    return true;
  });
}

function die() {
  dead = true;
  finalScore.textContent = `You climbed ${bestHeight} m`;
  gameOverScreen.classList.add('show');
}

function spawnDashFx() {

  const ghost = document.createElement('div');
  ghost.className = 'dash-ghost';
  ghost.style.transform = `translate(${x}px, ${y}px)`;
  world.appendChild(ghost);
  setTimeout(() => ghost.remove(), 300);

  for (let i = 0; i < 2; i++) {
    const streak = document.createElement('div');
    streak.className = 'dash-streak';
    const sx = dashDir > 0 ? x - 40 : x + playerWidth - 5;
    const sy = y + rand(4, playerHeight - 4);
    streak.style.transform = `translate(${sx}px, ${sy}px)`;
    world.appendChild(streak);
    setTimeout(() => streak.remove(), 250);
  }
}

function updateCooldownUI(ab) {
  const remaining = Math.max(0, ab.readyAt - performance.now());
  if (remaining > 0) {
    ab.el.classList.add('cooling');
    ab.fill.style.height = ((1 - remaining / ab.cooldown) * 100) + '%';
    ab.text.textContent = (remaining / 1000).toFixed(2);
  } else {
    ab.el.classList.remove('cooling');
    ab.fill.style.height = '0%';
    ab.text.textContent = '';
  }
}

function updateAbilityUI() {
  updateCooldownUI(dashAb);
  updateCooldownUI(doubleJumpAb);
}

function spawnJumpFx() {
  const ring = document.createElement('div');
  ring.className = 'jump-ring';
  ring.style.left = x + 'px';
  ring.style.top = (y + playerHeight - 7) + 'px';
  world.appendChild(ring);
  setTimeout(() => ring.remove(), 350);
}

function update() {

  if (keys['KeyA']) lastDir = -1;
  if (keys['KeyD']) lastDir = 1;

  const now = performance.now();

  if (jumpQueued && !isGrounded && now >= doubleJumpAb.readyAt) {
    vy = jumpPower;
    doubleJumpAb.readyAt = now + doubleJumpCooldown;
    dashTimer = 0;
    spawnJumpFx();
  }
  jumpQueued = false;

  if (dashQueued && dashTimer <= 0 && now >= dashAb.readyAt) {
    dashTimer = dashFrames;
    dashDir = lastDir;
    dashAb.readyAt = now + dashCooldown;
  }
  dashQueued = false;

  const dashing = dashTimer > 0;

  if (dashing) {
    x += dashDir * dashSpeed;
    dashTimer--;
    spawnDashFx();
  } else {
    if (keys['KeyA']) x -= speed;
    if (keys['KeyD']) x += speed;
  }
  player.classList.toggle('dashing', dashing);

  x = Math.max(0, Math.min(x, window.innerWidth - playerWidth));

  if (keys['KeyW'] && isGrounded) {
    vy = jumpPower;
    isGrounded = false;
  }

  if (!started && (keys['KeyA'] || keys['KeyD'] || keys['KeyW'])) {
    started = true;
  }

  const prevBottom = y + playerHeight;
  vy += gravity;
  y += vy;
  const bottom = y + playerHeight;
  isGrounded = false;

  if (vy >= 0) {
    for (const p of platforms) {
      const overlapsX = x + playerWidth > p.x && x < p.x + p.w;
      if (overlapsX && prevBottom <= p.y + 1 && bottom >= p.y) {
        y = p.y - playerHeight;
        vy = 0;
        isGrounded = true;
        break;
      }
    }
  }

  const targetCam = y - window.innerHeight * 0.45;
  if (targetCam < cameraY) {
    cameraY += (targetCam - cameraY) * 0.1;
  }

  if (started) {
    frames++;
    const lavaSpeed = Math.min(lavaMaxSpeed, lavaStartSpeed + frames * lavaAcceleration);
    lavaY -= lavaSpeed;
  }

  lavaY = Math.min(lavaY, y + playerHeight + maxLavaDistance);

  const height = Math.max(0, Math.round((groundY - playerHeight - y) / 10));
  if (height > bestHeight) bestHeight = height;
  hud.textContent = `Height: ${bestHeight} m`;

  generatePlatforms();
  removeOldPlatforms();

  if (y + playerHeight > lavaY || y > cameraY + window.innerHeight) {
    die();
  }
}

function render() {
  player.style.transform = `translate(${x}px, ${y}px)`;
  world.style.transform = `translateY(${-cameraY}px)`;
  lava.style.transform = `translateY(${lavaY - cameraY}px)`;
  updateAbilityUI();
}

function gameLoop() {
  if (!dead && !counting) update();
  render();
  requestAnimationFrame(gameLoop);
}

resetGame();
gameLoop();
