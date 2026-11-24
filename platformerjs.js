const player = document.getElementById('player');

const playerWidth = 50;
const playerHeight = 50;
const groundHeight = 100;

let x = 100;
let y = 100;

let vy = 0;
const speed = 5;
const gravity = 0.6;
const jumpPower = -14;
let isGrounded = false;

const keys = {};

window.addEventListener('keydown',(e)=>{
  keys[e.code] = true;
});

window.addEventListener('keyup',(e)=>{
  keys[e.code] = false;
});

function gameLoop(){

  const groundY = window.innerHeight - groundHeight;

  if(keys['KeyA']) x -= speed;
  if(keys['KeyD']) x += speed;

  x = Math.max(0, Math.min(x, window.innerWidth - playerWidth));

  if(keys['KeyW'] && isGrounded){
    vy = jumpPower;
    isGrounded = false;
  }

  if(keys['Space'] && isGrounded){
    vy = jumpPower;
    isGrounded = false;
  }
    
  vy += gravity;
  y += vy;

  if (y + playerHeight >= groundY){
    y = groundY - playerHeight;
    vy = 0;
    isGrounded = true;
  }

  player.style.transform = `translate(${x}px, ${y}px)`;
    
  requestAnimationFrame(gameLoop);
}

gameLoop();
