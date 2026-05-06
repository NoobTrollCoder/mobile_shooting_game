const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// ===== プレイヤー =====
let player = {
  x: canvas.width / 2,
  y: canvas.height - 120,
  w: 36,
  h: 36,
  speed: 6
};

let bullets = [];
let enemies = [];
let score = 0;
let gameOver = false;

// ===== 入力状態 =====
let leftPressed = false;
let rightPressed = false;

// ===== スマホボタン =====
document.getElementById("leftBtn").addEventListener("touchstart", () => leftPressed = true);
document.getElementById("leftBtn").addEventListener("touchend", () => leftPressed = false);

document.getElementById("rightBtn").addEventListener("touchstart", () => rightPressed = true);
document.getElementById("rightBtn").addEventListener("touchend", () => rightPressed = false);

document.getElementById("fireBtn").addEventListener("touchstart", fireBullet);

// PC操作用
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") leftPressed = true;
  if (e.key === "ArrowRight") rightPressed = true;
  if (e.key === " ") fireBullet();
});

window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") leftPressed = false;
  if (e.key === "ArrowRight") rightPressed = false;
});

function fireBullet() {
  if (gameOver) {
    resetGame();
    return;
  }

  bullets.push({
    x: player.x,
    y: player.y - 20,
    w: 5,
    h: 15,
    speed: 9
  });
}

function spawnEnemy() {
  enemies.push({
    x: Math.random() * (canvas.width - 60) + 30,
    y: -40,
    w: 44,
    h: 30,
    speed: 2,
    hp: 1
  });
}

function resetGame() {
  player.x = canvas.width / 2;
  bullets = [];
  enemies = [];
  score = 0;
  gameOver = false;
}

// ===== 当たり判定 =====
function isHit(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

let spawnTimer = 0;

function update() {
  if (gameOver) return;

  if (leftPressed) player.x -= player.speed;
  if (rightPressed) player.x += player.speed;

  player.x = Math.max(20, Math.min(canvas.width - 20, player.x));

  spawnTimer++;
  if (spawnTimer > 60) {
    spawnEnemy();
    spawnTimer = 0;
  }

  bullets.forEach(b => b.y -= b.speed);
  bullets = bullets.filter(b => b.y > -20);

  enemies.forEach(e => e.y += e.speed);
  enemies = enemies.filter(e => e.y < canvas.height + 50);

  // 弾と敵
  for (let b of bullets) {
    for (let e of enemies) {
      if (isHit(b, e)) {
        e.hp -= 1;
        b.dead = true;

        if (e.hp <= 0) {
          e.dead = true;
          score += 1;
        }
      }
    }
  }

  bullets = bullets.filter(b => !b.dead);
  enemies = enemies.filter(e => !e.dead);

  // 敵とプレイヤー
  for (let e of enemies) {
    if (isHit(
      { x: player.x - player.w / 2, y: player.y - player.h / 2, w: player.w, h: player.h },
      { x: e.x - e.w / 2, y: e.y - e.h / 2, w: e.w, h: e.h }
    )) {
      gameOver = true;
    }
  }
}

function drawBackground() {
  ctx.fillStyle = "#05051a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  for (let i = 0; i < 80; i++) {
    const x = (i * 97) % canvas.width;
    const y = (i * 53) % canvas.height;
    ctx.fillRect(x, y, 2, 2);
  }
}

function draw() {
  drawBackground();

  // プレイヤー
  ctx.fillStyle = "#00ff88";
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - 24);
  ctx.lineTo(player.x - 22, player.y + 20);
  ctx.lineTo(player.x + 22, player.y + 20);
  ctx.closePath();
  ctx.fill();

  // 弾
  ctx.fillStyle = "white";
  bullets.forEach(b => {
    ctx.fillRect(b.x - b.w / 2, b.y, b.w, b.h);
  });

  // 敵
  ctx.fillStyle = "yellow";
  enemies.forEach(e => {
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, e.w / 2, e.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // スコア
  ctx.fillStyle = "white";
  ctx.font = "24px sans-serif";
  ctx.fillText("Score: " + score, 20, 40);

  if (gameOver) {
    ctx.fillStyle = "red";
    ctx.font = "48px sans-serif";
    ctx.fillText("GAME OVER", canvas.width / 2 - 140, canvas.height / 2);

    ctx.fillStyle = "white";
    ctx.font = "22px sans-serif";
    ctx.fillText("Tap FIRE to restart", canvas.width / 2 - 100, canvas.height / 2 + 40);
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();