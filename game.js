const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ===== 背景用 =====
let stars = [];
let planets = [];

function initBackground() {
  stars = [];
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      speed: Math.random() * 1.2 + 0.3
    });
  }

  planets = [
    { x: canvas.width * 0.2, y: canvas.height * 0.18, r: 42, color: "#7b5cff" },
    { x: canvas.width * 0.78, y: canvas.height * 0.30, r: 58, color: "#ff7a4a" },
    { x: canvas.width * 0.55, y: canvas.height * 0.72, r: 35, color: "#48d9ff" }
  ];
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initBackground();
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// ===== 状態管理 =====
const STATE_TITLE = "title";
const STATE_PLAYING = "playing";
const STATE_GAMEOVER = "gameover";

let state = STATE_TITLE;
let menuIndex = 0;
const menuItems = ["START", "FINISH"];

// ===== ゲーム変数 =====
let player;
let bullets = [];
let enemies = [];
let enemyBeams = [];

let score = 0;
let bossSpawnScore = 0;
let nextBossScore = 50;

let spawnTimer = 0;
let frameCount = 0;

let bossActive = false;
let bossAttackTimer = 0;
let bossAttackType = null;
let bossAttackCount = 0;

// ===== 入力 =====
let leftPressed = false;
let rightPressed = false;

// ===== 音 =====
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function beep(freq = 440, duration = 0.1, volume = 0.08) {
  if (!audioCtx) audioCtx = new AudioContextClass();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.frequency.value = freq;
  osc.type = "square";
  gain.gain.value = volume;

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// ===== 簡易レトロBGM =====
let bgmTimer = 0;
let bgmIndex = 0;

const normalBgm = [
  330, 392, 494, 659,
  587, 494, 392, 330
];

const bossBgm = [
  110, 98, 130, 82,
  110, 146, 98, 73
];

function playBgm() {
  if (state !== STATE_PLAYING) return;

  bgmTimer--;

  if (bgmTimer <= 0) {
    if (bossActive) {
      const f = bossBgm[bgmIndex % bossBgm.length];
      beep(f, 0.18, 0.05);
      beep(f / 2, 0.18, 0.035);
      bgmTimer = 18;
    } else {
      const f = normalBgm[bgmIndex % normalBgm.length];
      beep(f, 0.10, 0.03);
      bgmTimer = 10;
    }

    bgmIndex++;
  }
}

initBackground();

// ===== 初期化 =====
function resetGame() {
  player = {
    x: canvas.width / 2,
    y: canvas.height - 120,
    w: 44,
    h: 40,
    speed: 7
  };

  bullets = [];
  enemies = [];
  enemyBeams = [];

  score = 0;
  bossSpawnScore = 0;
  nextBossScore = 50;

  spawnTimer = 0;
  frameCount = 0;

  bossActive = false;
  bossAttackTimer = 0;
  bossAttackType = null;
  bossAttackCount = 0;

  // boss debug
  spawnBoss()
}

resetGame();

// ===== ボタン操作 =====
function setupButton(id, onDown, onUp) {
  const btn = document.getElementById(id);

  btn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    onDown();
  });

  btn.addEventListener("touchend", (e) => {
    e.preventDefault();
    if (onUp) onUp();
  });

  btn.addEventListener("mousedown", onDown);
  btn.addEventListener("mouseup", () => {
    if (onUp) onUp();
  });
}

setupButton("leftBtn", () => handleCommand("LEFT"), () => leftPressed = false);
setupButton("rightBtn", () => handleCommand("RIGHT"), () => rightPressed = false);
setupButton("fireBtn", () => handleCommand("FIRE"));

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") handleCommand("LEFT");
  if (e.key === "ArrowRight") handleCommand("RIGHT");
  if (e.key === " ") handleCommand("FIRE");
});

window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") leftPressed = false;
  if (e.key === "ArrowRight") rightPressed = false;
});

// ===== コマンド処理 =====
function handleCommand(cmd) {
  if (!audioCtx) audioCtx = new AudioContextClass();
  if (state === STATE_TITLE) {
    if (cmd === "LEFT" || cmd === "RIGHT") {
      menuIndex = 1 - menuIndex;
    }

    if (cmd === "FIRE") {
      if (menuItems[menuIndex] === "START") {
        resetGame();
        state = STATE_PLAYING;
      } else {
        alert("FINISH");
      }
    }
    return;
  }

  if (state === STATE_GAMEOVER) {
    if (cmd === "FIRE") {
      state = STATE_TITLE;
    }
    return;
  }

  if (state === STATE_PLAYING) {
    if (cmd === "LEFT") leftPressed = true;
    if (cmd === "RIGHT") rightPressed = true;

    if (cmd === "FIRE") {
      bullets.push({
        x: player.x,
        y: player.y - 25,
        w: 6,
        h: 18,
        speed: 10
      });
      beep(880, 0.05, 0.05);
    }
  }
}

// ===== 敵生成 =====
function spawnEnemy() {
  const r = Math.random();

  if (r < 0.70) {
    enemies.push({
      type: "yellow",
      x: Math.random() * (canvas.width - 80) + 40,
      y: -40,
      w: 56,
      h: 32,
      speed: 2.2,
      hp: 1,
      maxHp: 1,
      color: "yellow"
    });
  } else if (r < 0.93) {
    enemies.push({
      type: "blue",
      x: Math.random() * (canvas.width - 100) + 50,
      y: -60,
      w: 82,
      h: 48,
      speed: 1.6,
      hp: 3,
      maxHp: 3,
      color: "#288cff"
    });
  } else {
    enemies.push({
      type: "red",
      x: Math.random() * (canvas.width - 140) + 70,
      y: -90,
      w: 130,
      h: 76,
      speed: 1.0,
      hp: 15,
      maxHp: 15,
      color: "#ff3c3c"
    });
  }
}

// ===== ボス生成 =====
function spawnBoss() {
  enemies = [];
  enemyBeams = [];

  enemies.push({
    type: "boss",
    x: canvas.width / 2,
    y: -140,
    targetY: 120,
    vx: 3,
    w: canvas.width * 0.5,
    h: 160,
    speed: 2,
    hp: 100,
    maxHp: 100,
    color: "black"
  });

  bossActive = true;
  bossAttackTimer = 0;
  bossAttackType = null;
  bossAttackCount = 0;

  beep(110, 0.5, 0.12);
}

// ===== レーザー =====
function fireLaser(e, timer = 45) {
  enemyBeams.push({
    type: "laser",
    x: e.x,
    y: e.y + e.h / 2,
    w: e.w / 3,
    timer: timer
  });

  beep(900, 0.08, 0.08);
}

// ===== ボス攻撃 =====
function bossAttack(boss) {
  if (bossAttackType === null) {
    bossAttackType = ["triple", "laser", "spawn"][Math.floor(Math.random() * 3)];
    bossAttackCount = 0;
  }

  if (bossAttackType === "triple") {
    const dirs = [-0.45, 0, 0.45];

    for (const a of dirs) {
      enemyBeams.push({
        type: "bossBullet",
        x: boss.x,
        y: boss.y + boss.h / 2,
        vx: Math.sin(a) * 5,
        vy: 7,
        r: 8
      });
    }

    bossAttackCount++;
    beep(180, 0.1, 0.08);

    if (bossAttackCount >= 3) bossAttackType = null;
  }

  else if (bossAttackType === "laser") {
    fireLaser(boss, 35);
    bossAttackType = null;
  }

  else if (bossAttackType === "spawn") {
    for (const dx of [-90, 0, 90]) {
      enemies.push({
        type: "yellow",
        x: boss.x + dx,
        y: boss.y + boss.h / 2,
        w: 56,
        h: 32,
        speed: 3,
        hp: 1,
        maxHp: 1,
        color: "yellow"
      });
    }

    beep(220, 0.15, 0.08);
    bossAttackType = null;
  }
}

// ===== 当たり判定 =====
function rectHit(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function playerRect() {
  return {
    x: player.x - player.w / 2,
    y: player.y - player.h / 2,
    w: player.w,
    h: player.h
  };
}

function enemyRect(e) {
  return {
    x: e.x - e.w / 2,
    y: e.y - e.h / 2,
    w: e.w,
    h: e.h
  };
}

// ===== 更新 =====
function update() {
  if (state !== STATE_PLAYING) return;

  frameCount++;

  if (leftPressed) player.x -= player.speed;
  if (rightPressed) player.x += player.speed;

  player.x = Math.max(25, Math.min(canvas.width - 25, player.x));

  // 敵生成
  spawnTimer++;
  if (!bossActive && spawnTimer > 55) {
    if (bossSpawnScore >= nextBossScore) {
      spawnBoss();

      // ボス撃破スコアは次ボス出現カウントに入れない
      bossSpawnScore = 0;

      // 初回50点、以降100点ごと
      nextBossScore = 100;
    } else {
      spawnEnemy();
    }
    spawnTimer = 0;
  }

  // プレイヤー弾
  for (const b of bullets) {
    b.y -= b.speed;
  }
  bullets = bullets.filter(b => b.y > -30);

  // 敵弾・レーザー
  for (const beam of enemyBeams) {
    if (beam.type === "laser") {
      beam.timer--;

      const laserRect = {
        x: beam.x - beam.w / 2,
        y: beam.y,
        w: beam.w,
        h: canvas.height - beam.y
      };

      if (rectHit(playerRect(), laserRect)) {
        state = STATE_GAMEOVER;
      }
    }

    if (beam.type === "bossBullet") {
      beam.x += beam.vx;
      beam.y += beam.vy;

      const br = {
        x: beam.x - beam.r,
        y: beam.y - beam.r,
        w: beam.r * 2,
        h: beam.r * 2
      };

      if (rectHit(playerRect(), br)) {
        state = STATE_GAMEOVER;
      }
    }
  }

  enemyBeams = enemyBeams.filter(b => {
    if (b.type === "laser") return b.timer > 0;
    if (b.type === "bossBullet") return b.y < canvas.height + 50;
    return true;
  });

  // 敵移動
  const speedMul = 1 + frameCount / 3600;

  for (const e of enemies) {
    if (e.type === "boss") {
      if (e.y < e.targetY) {
        e.y += e.speed;
      } else {
        e.y = e.targetY;
        e.x += e.vx;

        if (e.x - e.w / 2 < 20 || e.x + e.w / 2 > canvas.width - 20) {
          e.vx *= -1;
        }

        bossAttackTimer++;
        if (bossAttackTimer > 90) {
          bossAttack(e);
          bossAttackTimer = 0;
        }
      }
    } else {
      e.y += e.speed * speedMul;

      // 赤敵は画面内に入ってからレーザー
      if (
        e.type === "red" &&
        e.y > canvas.height * 0.25 &&
        e.y < canvas.height * 0.70 &&
        Math.random() < 0.006
      ) {
        fireLaser(e, 45);
      }
    }

    if (rectHit(playerRect(), enemyRect(e))) {
      state = STATE_GAMEOVER;
    }
  }

  enemies = enemies.filter(e => e.y < canvas.height + 150);

  // 弾と敵
  for (const b of bullets) {
    const bulletRect = { x: b.x - b.w / 2, y: b.y, w: b.w, h: b.h };

    for (const e of enemies) {
      if (rectHit(bulletRect, enemyRect(e))) {
        b.dead = true;
        e.hp--;

        if (e.hp <= 0) {
          e.dead = true;

          if (e.type === "yellow") {
            score += 1;
            bossSpawnScore += 1;
          } else if (e.type === "blue") {
            score += 3;
            bossSpawnScore += 3;
          } else if (e.type === "red") {
            score += 5;
            bossSpawnScore += 5;
          } else if (e.type === "boss") {
            score += 30;
            bossActive = false;
            bossAttackType = null;
            bossAttackCount = 0;
            bossAttackTimer = 0;
            enemyBeams = [];
          }
        }
        break;
      }
    }
  }

  bullets = bullets.filter(b => !b.dead);
  enemies = enemies.filter(e => !e.dead);
}

// ===== 描画 =====
function drawBackground() {
  // 宇宙っぽいグラデーション
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#06061f");
  grad.addColorStop(0.5, "#101035");
  grad.addColorStop(1, "#020208");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 星を下に流す
  for (const s of stars) {
    s.y += s.speed;
    if (s.y > canvas.height) {
      s.y = 0;
      s.x = Math.random() * canvas.width;
    }

    ctx.fillStyle = "rgba(230, 240, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 惑星
  for (const p of planets) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();

    // ハイライト
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // 影
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.arc(p.x + p.r * 0.25, p.y + p.r * 0.25, p.r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer() {
  ctx.fillStyle = "#00ff88";
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - 24);
  ctx.lineTo(player.x - 22, player.y + 20);
  ctx.lineTo(player.x + 22, player.y + 20);
  ctx.closePath();
  ctx.fill();
}

function drawEnemy(e) {
  const x = e.x;
  const y = e.y;
  const w = e.w;
  const h = e.h;

  // ボスは別描画
  if (e.type === "boss") {
    // 本体ベース
    const grad = ctx.createLinearGradient(x - w / 2, y, x + w / 2, y);
    grad.addColorStop(0, "#111");
    grad.addColorStop(0.5, "#3b0066");
    grad.addColorStop(1, "#111");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y - h * 0.2);
    ctx.lineTo(x - w * 0.35, y - h / 2);
    ctx.lineTo(x + w * 0.35, y - h / 2);
    ctx.lineTo(x + w / 2, y - h * 0.2);
    ctx.lineTo(x + w * 0.42, y + h / 2);
    ctx.lineTo(x - w * 0.42, y + h / 2);
    ctx.closePath();
    ctx.fill();

    // 外枠
    ctx.strokeStyle = "#b000ff";
    ctx.lineWidth = 4;
    ctx.stroke();

    // 中央装甲
    ctx.fillStyle = "#160022";
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.42);
    ctx.lineTo(x + w * 0.22, y);
    ctx.lineTo(x, y + h * 0.38);
    ctx.lineTo(x - w * 0.22, y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 赤いコア
    const coreGlow = ctx.createRadialGradient(x, y, 4, x, y, 35);
    coreGlow.addColorStop(0, "#ffffff");
    coreGlow.addColorStop(0.3, "#ff003c");
    coreGlow.addColorStop(1, "rgba(255,0,60,0)");

    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(x, y, 35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff003c";
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();

    // 左右エンジン
    ctx.fillStyle = "#222";
    ctx.fillRect(x - w * 0.43, y + h * 0.22, w * 0.18, h * 0.18);
    ctx.fillRect(x + w * 0.25, y + h * 0.22, w * 0.18, h * 0.18);

    ctx.fillStyle = "#ffaa00";
    ctx.fillRect(x - w * 0.40, y + h * 0.32, w * 0.12, h * 0.08);
    ctx.fillRect(x + w * 0.28, y + h * 0.32, w * 0.12, h * 0.08);

    // 砲台
    ctx.fillStyle = "#555";
    ctx.fillRect(x - w * 0.30, y + h * 0.08, w * 0.10, h * 0.28);
    ctx.fillRect(x + w * 0.20, y + h * 0.08, w * 0.10, h * 0.28);

    ctx.fillStyle = "#999";
    ctx.fillRect(x - w * 0.285, y + h * 0.34, w * 0.07, h * 0.10);
    ctx.fillRect(x + w * 0.215, y + h * 0.34, w * 0.07, h * 0.10);

    // 装甲ライン
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.35, y - h * 0.15);
    ctx.lineTo(x + w * 0.35, y - h * 0.15);
    ctx.moveTo(x - w * 0.30, y + h * 0.18);
    ctx.lineTo(x + w * 0.30, y + h * 0.18);
    ctx.stroke();
  }

  else {
    // 通常敵：宇宙船っぽい楕円＋翼
    ctx.fillStyle = e.color;

    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 左右の翼
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x - w / 2 - 18, y + h / 2);
    ctx.lineTo(x - w / 5, y + h / 3);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w / 2 + 18, y + h / 2);
    ctx.lineTo(x + w / 5, y + h / 3);
    ctx.closePath();
    ctx.fill();

    // コックピット
    ctx.fillStyle = "#bff6ff";
    ctx.beginPath();
    ctx.arc(x, y - h * 0.15, Math.max(6, h / 5), 0, Math.PI * 2);
    ctx.fill();
  }

  // HPバー
  ctx.fillStyle = "gray";
  ctx.fillRect(x - w / 2, y - h / 2 - 12, w, 5);

  ctx.fillStyle = "white";
  ctx.fillRect(x - w / 2, y - h / 2 - 12, w * (e.hp / e.maxHp), 5);
}

function drawBeams() {
  for (const beam of enemyBeams) {
    if (beam.type === "laser") {
      ctx.fillStyle = "yellow";
      ctx.fillRect(beam.x - beam.w / 2, beam.y, beam.w, canvas.height - beam.y);

      ctx.fillStyle = "red";
      ctx.fillRect(beam.x - beam.w / 4, beam.y, beam.w / 2, canvas.height - beam.y);
    }

    if (beam.type === "bossBullet") {
      ctx.fillStyle = "purple";
      ctx.beginPath();
      ctx.arc(beam.x, beam.y, beam.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBossGauge() {
  const boss = enemies.find(e => e.type === "boss");
  if (!boss) return;

  const barW = 260;
  const barH = 16;
  const x = canvas.width - barW - 20;
  const y = 30;

  ctx.fillStyle = "white";
  ctx.font = "20px sans-serif";
  ctx.fillText("BOSS", x, y - 8);

  ctx.fillStyle = "gray";
  ctx.fillRect(x, y, barW, barH);

  ctx.fillStyle = "red";
  ctx.fillRect(x, y, barW * (boss.hp / boss.maxHp), barH);

  ctx.strokeStyle = "white";
  ctx.strokeRect(x, y, barW, barH);
}

function draw() {
  drawBackground();

  if (state === STATE_TITLE) {
    ctx.fillStyle = "white";
    ctx.font = "38px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ATOM SPACE SHOOTING", canvas.width / 2, canvas.height * 0.32);

    for (let i = 0; i < menuItems.length; i++) {
      ctx.fillStyle = i === menuIndex ? "yellow" : "white";
      ctx.font = "30px sans-serif";
      ctx.fillText((i === menuIndex ? "> " : "  ") + menuItems[i], canvas.width / 2, canvas.height * 0.50 + i * 45);
    }

    ctx.font = "18px sans-serif";
    ctx.fillStyle = "white";
    ctx.fillText("LEFT/RIGHT: SELECT   FIRE: OK", canvas.width / 2, canvas.height - 120);
    ctx.textAlign = "left";
    return;
  }

  // 弾
  ctx.fillStyle = "white";
  for (const b of bullets) {
    ctx.fillRect(b.x - b.w / 2, b.y, b.w, b.h);
  }

  for (const e of enemies) drawEnemy(e);
  drawBeams();
  drawPlayer();

  ctx.fillStyle = "white";
  ctx.font = "24px sans-serif";
  ctx.fillText("Score: " + score, 20, 40);

  drawBossGauge();

  if (state === STATE_GAMEOVER) {
    ctx.fillStyle = "red";
    ctx.font = "48px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);

    ctx.fillStyle = "white";
    ctx.font = "22px sans-serif";
    ctx.fillText("Tap FIRE to return title", canvas.width / 2, canvas.height / 2 + 45);
    ctx.textAlign = "left";
  }
}

function loop() {
  playBgm();
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();