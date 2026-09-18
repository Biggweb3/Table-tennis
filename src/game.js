import * as THREE from 'three';
import { sound } from './sound.js';
import { createTableTennisTable } from './table.js';
import { createPlayerHandAndPaddle, createComputerPaddle } from './paddles.js';
import { createGrassEnvironment } from './environment.js';
import { createBall } from './ball.js';
import confetti from 'canvas-confetti';

/**
 * GAME ENGINE & CONTROLLER
 */
export class GameEngine {
  constructor(canvasContainer, uiCallbacks) {
    this.container = canvasContainer;
    this.ui = uiCallbacks;

    // Game state variables
    this.playerScore = 0;
    this.computerScore = 0;
    this.currentRally = 0;
    this.personalBest = parseInt(localStorage.getItem('rally_pb') || '0', 10);
    this.longestMatchRally = 0;
    this.difficulty = 'club'; // 'chill' | 'club' | 'pro'
    this.gameStatus = 'menu'; // 'menu' | 'countdown' | 'playing' | 'point_over' | 'paused' | 'match_over'
    this.servingSide = 'player'; // 'player' | 'computer'
    this.serverReady = false;
    this.winner = null;

    // Power mechanic
    this.powerMeter = 0; // 0 to 1
    this.powerReady = false;
    this.isChargingPower = false;

    // Target positions & interpolation
    this.targetPlayerX = 0;
    this.targetPlayerY = 0.88;
    this.currentHandRecoil = 0;

    // Input state
    this.keys = {};
    this.pointerDown = false;
    this.pointerX = 0;

    // Timers
    this.clock = new THREE.Clock();
    this.lastTime = 0;

    // Settings
    this.cameraShake = 0;

    // Ball physics state
    this.ballPos = new THREE.Vector3(0, 0.95, 1.0);
    this.ballVel = new THREE.Vector3(0, 0, 0);
    this.ballBouncedNear = false;
    this.ballBouncedFar = false;
    this.lastHitter = null; // 'player' | 'computer'

    // AI parameters based on difficulty
    this.aiConfig = {
      chill: { reactionDelay: 0.14, speed: 3.5, errorMargin: 0.16, shotSpeed: 3.8 },
      club: { reactionDelay: 0.08, speed: 5.2, errorMargin: 0.08, shotSpeed: 4.8 },
      pro: { reactionDelay: 0.03, speed: 7.2, errorMargin: 0.03, shotSpeed: 5.8 },
    };

    this.initThree();
    this.initScene();
    this.initInputs();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xbde0fe); // Crisp soft daylight sky
    this.scene.fog = new THREE.FogExp2(0xbde0fe, 0.022);

    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 100);
    this.updateCameraForDevice(w, h);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => this.onWindowResize());
  }

  updateCameraForDevice(w, h) {
    const isMobile = w < 768;
    if (isMobile) {
      // Slightly higher and pulled back for comfortable thumb visibility
      this.camera.position.set(0, 1.75, 2.75);
      this.camera.lookAt(0, 0.82, -0.2);
    } else {
      // Elevated three-quarter perspective
      this.camera.position.set(0, 1.62, 2.5);
      this.camera.lookAt(0, 0.82, -0.2);
    }
    this.cameraBasePos = this.camera.position.clone();
  }

  onWindowResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.updateCameraForDevice(w, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  initScene() {
    // 1. LIGHTING (Soft comfortable outdoor daylight)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x386641, 0.7);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.35);
    sunLight.position.set(4, 8, 5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 25;
    sunLight.shadow.camera.left = -4;
    sunLight.shadow.camera.right = 4;
    sunLight.shadow.camera.top = 4;
    sunLight.shadow.camera.bottom = -4;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    // Subtle soft fill light
    const fillLight = new THREE.DirectionalLight(0xa7f3d0, 0.4);
    fillLight.position.set(-5, 4, -3);
    this.scene.add(fillLight);

    // 2. ENVIRONMENT
    this.env = createGrassEnvironment();
    this.scene.add(this.env.mesh);

    // 3. TABLE
    this.tableObj = createTableTennisTable();
    this.scene.add(this.tableObj.mesh);

    // 4. PADDLES
    this.playerPaddle = createPlayerHandAndPaddle();
    this.playerPaddle.position.set(0, 0.88, 1.48);
    this.scene.add(this.playerPaddle);

    this.cpuPaddle = createComputerPaddle();
    this.cpuPaddle.position.set(0, 0.88, -1.48);
    this.scene.add(this.cpuPaddle);

    // 5. BALL & PARTICLES
    this.ball = createBall();
    this.scene.add(this.ball.group);
    this.scene.add(this.ball.shadowMesh);
    this.ball.getParticleMeshes().forEach(m => this.scene.add(m));

    this.resetBallToServe();
  }

  initInputs() {
    // Mouse movement
    window.addEventListener('mousemove', (e) => {
      const rect = this.container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.targetPlayerX = THREE.MathUtils.clamp(normX * 0.95, -0.92, 0.92);
    });

    // Touch movement
    this.container.addEventListener('touchstart', (e) => {
      sound.init();
      if (e.touches.length > 0) {
        this.pointerDown = true;
        this.isChargingPower = true;
        this.handleTouch(e.touches[0]);
        if (this.gameStatus === 'playing' && this.serverReady && this.servingSide === 'player') {
          this.executeServe();
        }
      }
    }, { passive: false });

    this.container.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.handleTouch(e.touches[0]);
      }
      e.preventDefault();
    }, { passive: false });

    this.container.addEventListener('touchend', () => {
      this.pointerDown = false;
      this.isChargingPower = false;
    });

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      sound.init();
      this.keys[e.key] = true;
      if (e.code === 'Space') {
        this.isChargingPower = true;
        if (this.gameStatus === 'playing' && this.serverReady && this.servingSide === 'player') {
          this.executeServe();
        }
      }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (this.gameStatus === 'playing') {
          this.togglePause();
        } else if (this.gameStatus === 'paused') {
          this.resume();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
      if (e.code === 'Space') {
        this.isChargingPower = false;
      }
    });

    // Tap to serve on desktop click
    this.container.addEventListener('click', () => {
      sound.init();
      if (this.gameStatus === 'playing' && this.serverReady && this.servingSide === 'player') {
        this.executeServe();
      }
    });
  }

  handleTouch(touch) {
    const rect = this.container.getBoundingClientRect();
    const normX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    this.targetPlayerX = THREE.MathUtils.clamp(normX * 1.15, -0.92, 0.92);
  }

  setDifficulty(diff) {
    this.difficulty = diff;
  }

  startCountdown() {
    this.gameStatus = 'countdown';
    let count = 3;
    this.ui.onCountdown(count);
    sound.playUIClick();

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        this.ui.onCountdown(count);
        sound.playUIClick();
      } else if (count === 0) {
        this.ui.onCountdown('RALLY!');
        sound.playServe();
      } else {
        clearInterval(timer);
        this.ui.onCountdown(null);
        this.gameStatus = 'playing';
        this.prepareServe();
      }
    }, 700);
  }

  startMatch() {
    sound.init();
    this.playerScore = 0;
    this.computerScore = 0;
    this.currentRally = 0;
    this.longestMatchRally = 0;
    this.servingSide = 'player';
    this.powerMeter = 0;
    this.powerReady = false;
    this.ui.updateScores(this.playerScore, this.computerScore);
    this.ui.updateRally(this.currentRally, this.personalBest);
    this.startCountdown();
  }

  prepareServe() {
    this.serverReady = false;
    this.ballBouncedNear = false;
    this.ballBouncedFar = false;
    this.lastHitter = this.servingSide;
    this.resetBallToServe();

    if (this.servingSide === 'player') {
      this.serverReady = true;
      this.ui.showInstruction('TAP OR PRESS SPACE TO SERVE');
    } else {
      this.ui.showInstruction('CPU SERVING...');
      setTimeout(() => {
        if (this.gameStatus === 'playing') {
          this.executeServe();
        }
      }, 1000);
    }
  }

  resetBallToServe() {
    if (this.servingSide === 'player') {
      this.ballPos.set(this.targetPlayerX * 0.7, 0.96, 1.35);
    } else {
      this.ballPos.set(this.cpuPaddle.position.x * 0.7, 0.96, -1.35);
    }
    this.ballVel.set(0, 0, 0);
    this.ball.group.position.copy(this.ballPos);
    this.ball.shadowMesh.visible = false;
  }

  executeServe() {
    if (!this.serverReady && this.servingSide === 'player') return;
    this.serverReady = false;
    this.ui.showInstruction('');
    sound.playServe();

    const cfg = this.aiConfig[this.difficulty];
    const isPlayer = this.servingSide === 'player';

    // Serve physics arc: bounces on server's side then crosses net into receiver's side
    if (isPlayer) {
      const targetZ = -0.7; // bounce on player's half first
      const dirX = (Math.random() - 0.5) * 0.6;
      this.ballVel.set(dirX, 2.2, -4.5);
      this.lastHitter = 'player';
    } else {
      const dirX = (Math.random() - 0.5) * 0.6;
      this.ballVel.set(dirX, 2.2, cfg.shotSpeed * 0.85);
      this.lastHitter = 'computer';
    }
  }

  togglePause() {
    this.gameStatus = 'paused';
    this.ui.onPause(true);
  }

  resume() {
    this.gameStatus = 'playing';
    this.ui.onPause(false);
  }

  restartMatch() {
    this.startMatch();
  }

  quitToMenu() {
    this.gameStatus = 'menu';
    this.resetBallToServe();
    this.ui.onQuit();
  }

  // --- PHYSICS & COLLISION LOOP ---
  updatePhysics(dt) {
    // 1. Keyboard horizontal motion (A/D or Arrows)
    const keySpeed = 2.4;
    if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
      this.targetPlayerX = Math.max(-0.92, this.targetPlayerX - keySpeed * dt);
    }
    if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
      this.targetPlayerX = Math.min(0.92, this.targetPlayerX + keySpeed * dt);
    }

    // Smooth paddle lerping with small natural inertia
    const lerpFactor = 1 - Math.exp(-22 * dt);
    this.playerPaddle.position.x += (this.targetPlayerX - this.playerPaddle.position.x) * lerpFactor;
    
    // Slight natural wrist rotation with horizontal velocity
    const paddleVelX = (this.targetPlayerX - this.playerPaddle.position.x);
    this.playerPaddle.rotation.z = -paddleVelX * 0.45;
    this.playerPaddle.rotation.y = paddleVelX * 0.25;

    // Hand recoil animation when hitting
    if (this.currentHandRecoil > 0) {
      this.currentHandRecoil = Math.max(0, this.currentHandRecoil - dt * 5.0);
      this.playerPaddle.position.z = 1.48 + Math.sin(this.currentHandRecoil * Math.PI) * 0.08;
      this.playerPaddle.rotation.x = -Math.sin(this.currentHandRecoil * Math.PI) * 0.18;
    } else {
      this.playerPaddle.position.z = 1.48;
      this.playerPaddle.rotation.x = 0;
    }

    // 2. Power charge mechanic
    if (this.isChargingPower && this.gameStatus === 'playing') {
      this.powerMeter = Math.min(1.0, this.powerMeter + dt * 0.9);
      if (this.powerMeter >= 1.0 && !this.powerReady) {
        this.powerReady = true;
        sound.playPowerReady();
        this.ui.showPowerReady(true);
      }
    } else {
      this.powerMeter = Math.max(0, this.powerMeter - dt * 1.5);
      if (this.powerMeter < 0.2 && this.powerReady) {
        this.powerReady = false;
        this.ui.showPowerReady(false);
      }
    }
    this.ui.updatePowerMeter(this.powerMeter);

    // If ball is waiting to be served, hold in place
    if (this.serverReady) {
      if (this.servingSide === 'player') {
        this.ballPos.set(this.playerPaddle.position.x * 0.7, 0.94, 1.35);
      }
      this.ball.group.position.copy(this.ballPos);
      return;
    }

    // 3. Computer AI opponent movement
    this.updateAI(dt);

    // 4. Ball motion
    const gravity = -9.2;
    this.ballVel.y += gravity * dt;
    this.ballPos.addScaledVector(this.ballVel, dt);

    const tableY = 0.785; // Table surface plane
    const tableHalfW = 1.525 / 2;
    const tableHalfL = 2.74 / 2;

    // Dynamic fake shadow projection on table
    if (Math.abs(this.ballPos.x) < tableHalfW + 0.1 && Math.abs(this.ballPos.z) < tableHalfL + 0.1 && this.ballPos.y >= tableY) {
      this.ball.shadowMesh.visible = true;
      this.ball.shadowMesh.position.set(this.ballPos.x, tableY + 0.002, this.ballPos.z);
      const h = Math.max(0, this.ballPos.y - tableY);
      const shadowScale = THREE.MathUtils.clamp(1.0 - h * 1.1, 0.25, 1.2);
      this.ball.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
    } else {
      this.ball.shadowMesh.visible = false;
    }

    // --- TABLE COLLISION ---
    if (this.ballPos.y <= tableY + this.ball.radius && this.ballVel.y < 0) {
      // Check if within table bounds
      if (Math.abs(this.ballPos.x) <= tableHalfW && Math.abs(this.ballPos.z) <= tableHalfL) {
        this.ballPos.y = tableY + this.ball.radius;
        this.ballVel.y = -this.ballVel.y * 0.84; // Bounce elasticity
        sound.playTableBounce(THREE.MathUtils.clamp(Math.abs(this.ballVel.y) / 4.0, 0.3, 0.9));

        if (this.ballPos.z > 0) {
          this.ballBouncedNear = true;
        } else {
          this.ballBouncedFar = true;
        }
      }
    }

    // --- NET COLLISION ---
    // Net is at z = 0, between -tableHalfW - 0.15 and +tableHalfW + 0.15, y between 0.785 and 0.938
    const netTop = 0.785 + 0.1525;
    if (Math.abs(this.ballPos.z) < 0.04 && this.ballPos.y >= tableY && this.ballPos.y <= netTop) {
      if (Math.abs(this.ballPos.x) <= tableHalfW + 0.15) {
        // Soft net rebound
        this.ballVel.z = -this.ballVel.z * 0.3;
        this.ballVel.y *= 0.5;
        sound.playTableBounce(0.3);
      }
    }

    // --- PLAYER PADDLE COLLISION ---
    // Player paddle at z = 1.48
    const playerZ = 1.48;
    const playerX = this.playerPaddle.position.x;
    const forgivenessRadius = 0.28; // Generous forgiving casual sweetspot

    if (this.ballVel.z > 0 && this.ballPos.z >= playerZ - 0.12 && this.ballPos.z <= playerZ + 0.14) {
      const dist = Math.abs(this.ballPos.x - playerX);
      if (dist < forgivenessRadius && this.ballPos.y > 0.65 && this.ballPos.y < 1.25) {
        // CONTACT! Return the ball
        this.lastHitter = 'player';
        this.ballBouncedNear = false;
        this.ballBouncedFar = false;
        this.currentHandRecoil = 1.0;

        const isPower = this.powerReady;
        if (isPower) {
          this.cameraShake = 0.22;
          this.powerMeter = 0;
          this.powerReady = false;
          this.ui.showPowerReady(false);
        }

        sound.playPaddleHit(isPower, true);
        this.ball.spawnImpact(this.ballPos, isPower);

        // Calculate return trajectory based on offset from paddle center
        const offset = (this.ballPos.x - playerX) / forgivenessRadius;
        const baseSpeed = isPower ? 7.6 : 5.4;
        const returnZ = -baseSpeed;
        const returnX = offset * 2.8 + (Math.random() - 0.5) * 0.4;
        const returnY = isPower ? 2.3 : 2.9;

        this.ballVel.set(returnX, returnY, returnZ);

        // Increment rally
        this.currentRally++;
        if (this.currentRally > this.longestMatchRally) {
          this.longestMatchRally = this.currentRally;
        }
        if (this.currentRally > this.personalBest) {
          this.personalBest = this.currentRally;
          localStorage.setItem('rally_pb', this.personalBest.toString());
          this.ui.celebrateNewBest();
          sound.playNewRecord();
        }
        this.ui.updateRally(this.currentRally, this.personalBest);
      }
    }

    // --- COMPUTER PADDLE COLLISION ---
    // Computer paddle at z = -1.48
    const cpuZ = -1.48;
    const cpuX = this.cpuPaddle.position.x;
    const cpuRadius = 0.24;

    if (this.ballVel.z < 0 && this.ballPos.z <= cpuZ + 0.12 && this.ballPos.z >= cpuZ - 0.14) {
      const dist = Math.abs(this.ballPos.x - cpuX);
      if (dist < cpuRadius && this.ballPos.y > 0.65 && this.ballPos.y < 1.25) {
        // CPU CONTACT!
        this.lastHitter = 'computer';
        this.ballBouncedNear = false;
        this.ballBouncedFar = false;

        sound.playPaddleHit(false, false);
        this.ball.spawnImpact(this.ballPos, false);

        // Subtle CPU paddle punch animation
        this.cpuPaddle.position.z = -1.48 - 0.06;
        setTimeout(() => { this.cpuPaddle.position.z = -1.48; }, 80);

        const cfg = this.aiConfig[this.difficulty];
        // CPU aims across table
        const targetSide = Math.random() > 0.5 ? 0.35 : -0.35;
        const returnX = targetSide + (Math.random() - 0.5) * 0.5;
        this.ballVel.set(returnX, 2.7, cfg.shotSpeed);

        this.currentRally++;
        if (this.currentRally > this.longestMatchRally) {
          this.longestMatchRally = this.currentRally;
        }
        this.ui.updateRally(this.currentRally, this.personalBest);
      }
    }

    // --- OUT OF BOUNDS / POINT EVALUATION ---
    // Ball fell below table level or flew far past baselines
    if (this.ballPos.y < 0.45 || Math.abs(this.ballPos.z) > 2.2 || Math.abs(this.ballPos.x) > 2.0) {
      this.evaluatePoint();
    }

    // Update ball mesh position
    this.ball.group.position.copy(this.ballPos);
  }

  updateAI(dt) {
    const cfg = this.aiConfig[this.difficulty];
    let targetX = 0;

    // If ball is traveling toward computer (vel.z < 0)
    if (this.ballVel.z < -0.1) {
      // Predict ball X when reaching CPU baseline
      const timeToReach = Math.max(0.01, (this.ballPos.z - (-1.48)) / -this.ballVel.z);
      const predictedX = this.ballPos.x + this.ballVel.x * timeToReach;
      
      // Introduce difficulty error margin (CPU occasionally misses!)
      const error = (Math.sin(this.clock.getElapsedTime() * 3.5) * cfg.errorMargin);
      targetX = THREE.MathUtils.clamp(predictedX + error, -0.78, 0.78);
    } else {
      // Settle back toward center
      targetX = 0;
    }

    // Lerp CPU paddle
    const cpuLerp = 1 - Math.exp(-cfg.speed * dt);
    this.cpuPaddle.position.x += (targetX - this.cpuPaddle.position.x) * cpuLerp;
  }

  evaluatePoint() {
    if (this.gameStatus !== 'playing') return;
    this.gameStatus = 'point_over';

    // Did the ball land on the recipient's side before going out?
    let pointWinner = null;

    if (this.lastHitter === 'player') {
      // Player hit it. If it bounced on opponent side (far side), then computer failed to return -> player point!
      if (this.ballBouncedFar) {
        pointWinner = 'player';
      } else {
        // Player hit it out/into net without bouncing on opponent side -> computer point!
        pointWinner = 'computer';
      }
    } else {
      // Computer hit it. If it bounced on player's half (near side), then player missed -> computer point!
      if (this.ballBouncedNear) {
        pointWinner = 'computer';
      } else {
        // Computer hit it out -> player point!
        pointWinner = 'player';
      }
    }

    this.currentRally = 0;
    this.ui.updateRally(this.currentRally, this.personalBest);

    if (pointWinner === 'player') {
      this.playerScore++;
      sound.playCheer();
      this.ui.showPointBanner('POINT — YOU', 'win');
      this.servingSide = 'computer'; // Standard serve alternation
    } else {
      this.computerScore++;
      sound.playBoo();
      this.ui.showPointBanner('POINT — CPU', 'lose');
      this.servingSide = 'player';
    }

    this.ui.updateScores(this.playerScore, this.computerScore);

    // Check match completion: First to 11, win by 2
    if ((this.playerScore >= 11 || this.computerScore >= 11) && Math.abs(this.playerScore - this.computerScore) >= 2) {
      setTimeout(() => this.endMatch(), 1400);
      return;
    }

    // Reset for next rally
    setTimeout(() => {
      if (this.gameStatus === 'point_over') {
        this.gameStatus = 'playing';
        this.prepareServe();
      }
    }, 1500);
  }

  endMatch() {
    this.gameStatus = 'match_over';
    this.winner = this.playerScore > this.computerScore ? 'player' : 'computer';

    if (this.winner === 'player') {
      sound.playVictory();
      confetti({
        particleCount: 110,
        spread: 75,
        origin: { y: 0.6 }
      });
      // Celebratory subtle paddle wave
      this.playerPaddle.position.y = 1.05;
      this.playerPaddle.rotation.z = 0.25;
    } else {
      sound.playDefeat();
      // Subtle downcast paddle slump
      this.playerPaddle.position.y = 0.72;
      this.playerPaddle.rotation.x = 0.35;
    }

    this.ui.onMatchComplete({
      winner: this.winner,
      playerScore: this.playerScore,
      computerScore: this.computerScore,
      longestRally: this.longestMatchRally,
      bestRally: this.personalBest,
    });
  }

  animate() {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05); // Clamp dt to prevent physics tunneling
    const time = this.clock.getElapsedTime();

    // Grass wind displacement animation
    if (this.env && this.env.update) {
      this.env.update(time);
    }

    // Particle system update
    if (this.ball && this.ball.updateParticles) {
      this.ball.updateParticles(dt);
    }

    // Game loop physics
    if (this.gameStatus === 'playing') {
      this.updatePhysics(dt);
    }

    // Camera shake damping
    if (this.cameraShake > 0) {
      this.camera.position.x = this.cameraBasePos.x + (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y = this.cameraBasePos.y + (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake = Math.max(0, this.cameraShake - dt * 1.8);
    } else if (this.cameraBasePos) {
      this.camera.position.copy(this.cameraBasePos);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
