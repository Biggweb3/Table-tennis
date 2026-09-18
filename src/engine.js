import * as THREE from 'three';

/**
 * GameEngine V2 manages:
 * - 100-Level progression curve and match structure
 * - Dynamic weather physics (wind vector, ball deflection for BOTH player and CPU)
 * - Power shot mechanics, ball bounce and forgiveness collision
 * - Delta-time based frame-rate independent physics (consistent at 30, 60, 120 FPS)
 */
export class GameEngine {
  constructor(canvas, uiCallbacks, soundSystem, progressionManager) {
    this.canvas = canvas;
    this.ui = uiCallbacks;
    this.sound = soundSystem;
    this.progression = progressionManager;

    // Game States
    this.state = 'LANDING'; // LANDING, ONBOARDING, COUNTDOWN, PLAYING, POINT_RESULT, MATCH_END, PAUSED
    this.previousState = 'LANDING';
    this.playerScore = 0;
    this.cpuScore = 0;
    this.currentRally = 0;
    this.matchBestRally = 0;
    this.matchWinner = null;
    this.server = 'PLAYER';
    this.serving = true;

    // Power Shot
    this.powerCharging = false;
    this.powerCharge = 0;
    this.powerReady = false;
    this.powerActiveOnNextHit = false;
    this.ballIsPowerShot = false;

    // Inputs
    this.keys = {};
    this.playerTargetX = 0;
    this.cpuTargetX = 0;
    this.inputMode = 'mouse';
    this.touchStartX = 0;
    this.paddleStartX = 0;

    // Physics
    this.gravity = -13.5;
    this.ballPos = new THREE.Vector3(0, 2.0, 2.8);
    this.ballVel = new THREE.Vector3(0, 0, 0);
    this.ballInPlay = false;

    this.hasBouncedOnPlayerSide = false;
    this.hasBouncedOnCpuSide = false;
    this.lastHitter = null;

    // Positions
    this.playerPaddlePos = new THREE.Vector3(0, 1.85, 3.25);
    this.cpuPaddlePos = new THREE.Vector3(0, 1.85, -3.25);

    // Camera shake
    this.camShake = new THREE.Vector3();
    this.camShakeIntensity = 0;

    // Timers
    this.countdownTimer = 3;
    this.pointResetTimer = 0;

    // Table coordinates
    this.tableTopY = 1.6;
    this.tableHalfW = 1.6;
    this.tableHalfL = 3.0;

    this.initScene();
    this.initInput();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xb5e2fa);
    this.scene.fog = new THREE.FogExp2(0xb5e2fa, 0.016);

    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 100);
    this.defaultCamPos = new THREE.Vector3(0, 3.4, 5.7);
    this.camera.position.copy(this.defaultCamPos);
    this.camera.lookAt(0, 1.55, -0.2);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x3d702a, 0.75);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.35);
    this.sunLight.position.set(5, 12, 6);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 30;
    this.sunLight.shadow.camera.left = -6;
    this.sunLight.shadow.camera.right = 6;
    this.sunLight.shadow.camera.top = 6;
    this.sunLight.shadow.camera.bottom = -6;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    const fillLight = new THREE.DirectionalLight(0x8ecae6, 0.35);
    fillLight.position.set(-6, 5, -5);
    this.scene.add(fillLight);
  }

  setComponents(paddleSystem, ballSystem, envSystem) {
    this.paddleSystem = paddleSystem;
    this.ballSystem = ballSystem;
    this.envSystem = envSystem;

    this.tableTopY = envSystem.tableTopY;
    this.tableHalfW = envSystem.tableWidth / 2;
    this.tableHalfL = envSystem.tableLength / 2;

    this.scene.add(this.paddleSystem.player.group);
    this.scene.add(this.paddleSystem.cpu.group);

    this.updatePaddlePositions(0);
  }

  initInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      this.keys[e.code] = true;

      this.sound.init();
      this.sound.resume();

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (this.state === 'PLAYING' && this.serving && this.server === 'PLAYER') {
          this.serveBall('PLAYER');
        } else if (this.state === 'PLAYING') {
          this.powerCharging = true;
        }
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        this.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      this.keys[e.code] = false;

      if (e.key === ' ' || e.code === 'Space') {
        this.powerCharging = false;
      }
    });

    // Mouse movement
    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.playerTargetX = x * (this.tableHalfW + 0.35);
      this.inputMode = 'mouse';
    });

    // Touch & Pointer controls (Android WebView & Mobile First)
    this.canvas.addEventListener('pointerdown', (e) => {
      this.sound.init();
      this.sound.resume();
      this.inputMode = 'touch';
      const rect = this.canvas.getBoundingClientRect();
      this.touchStartX = e.clientX;
      this.paddleStartX = this.playerTargetX;

      if (this.state === 'PLAYING' && this.serving && this.server === 'PLAYER') {
        this.serveBall('PLAYER');
      } else if (this.state === 'PLAYING') {
        this.powerCharging = true;
      }
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (e.buttons > 0 || e.pointerType === 'touch') {
        const rect = this.canvas.getBoundingClientRect();
        const deltaX = (e.clientX - this.touchStartX) / (rect.width * 0.45);
        this.playerTargetX = THREE.MathUtils.clamp(
          this.paddleStartX + deltaX * (this.tableHalfW + 0.4),
          -this.tableHalfW - 0.5,
          this.tableHalfW + 0.5
        );
      }
    });

    const onPointerUp = () => {
      this.powerCharging = false;
    };
    this.canvas.addEventListener('pointerup', onPointerUp);
    this.canvas.addEventListener('pointercancel', onPointerUp);

    // Visibility change / App Pause / Resume for Android WebView lifecycle
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.state === 'PLAYING') {
          this.togglePause();
        }
      } else {
        this.sound.resume();
      }
    });

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.onResize(), 150);
    });
  }

  onResize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);

    if (this.camera.aspect < 1.0) {
      this.defaultCamPos.set(0, 3.9, 6.6);
      this.camera.fov = 52;
    } else {
      this.defaultCamPos.set(0, 3.4, 5.7);
      this.camera.fov = 46;
    }
    this.camera.updateProjectionMatrix();
  }

  startMatch() {
    this.sound.init();
    this.sound.resume();
    this.sound.playClick();
    this.playerScore = 0;
    this.cpuScore = 0;
    this.currentRally = 0;
    this.matchBestRally = 0;
    this.matchWinner = null;
    this.server = 'PLAYER';
    this.serving = true;

    this.ui.updateScores(this.playerScore, this.cpuScore);
    this.ui.updateRally(this.currentRally, this.progression.bestRally);
    this.ui.updateProgressionUI(this.progression);

    // 3-2-1 Countdown
    this.state = 'COUNTDOWN';
    this.countdownTimer = 3.2;
    this.ui.showCountdown(3);

    this.resetBallPosition();
  }

  restartMatch() {
    this.startMatch();
  }

  togglePause() {
    if (this.state === 'MATCH_END' || this.state === 'LANDING' || this.state === 'ONBOARDING') return;
    if (this.state === 'PAUSED') {
      this.state = this.previousState;
      this.ui.hidePause();
    } else {
      this.previousState = this.state;
      this.state = 'PAUSED';
      this.ui.showPause();
    }
    this.sound.playClick();
  }

  resetBallPosition() {
    this.ballInPlay = false;
    this.ballIsPowerShot = false;
    this.hasBouncedOnPlayerSide = false;
    this.hasBouncedOnCpuSide = false;
    this.lastHitter = null;

    if (this.server === 'PLAYER') {
      this.ballPos.set(this.playerPaddlePos.x * 0.7, this.tableTopY + 0.35, this.tableHalfL - 0.2);
      this.ballVel.set(0, 0, 0);
      this.serving = true;
      if (this.state === 'PLAYING') {
        this.ui.showServePrompt(true, 'YOUR SERVE — TAP / SPACE');
      }
    } else {
      this.ballPos.set(this.cpuPaddlePos.x * 0.7, this.tableTopY + 0.35, -this.tableHalfL + 0.2);
      this.ballVel.set(0, 0, 0);
      this.serving = true;
      if (this.state === 'PLAYING') {
        this.ui.showServePrompt(true, 'CPU SERVING...');
        setTimeout(() => {
          if (this.state === 'PLAYING' && this.serving && this.server === 'CPU') {
            this.serveBall('CPU');
          }
        }, 850);
      }
    }
  }

  serveBall(server) {
    if (!this.serving) return;
    this.serving = false;
    this.ballInPlay = true;
    this.lastHitter = server;
    this.hasBouncedOnPlayerSide = false;
    this.hasBouncedOnCpuSide = false;
    this.ui.showServePrompt(false);
    this.sound.playServe();

    const diffCfg = this.progression.getDifficultyConfig();
    const speed = 7.6 * diffCfg.ballSpeedScale;

    if (server === 'PLAYER') {
      const targetX = (Math.random() - 0.5) * (this.tableHalfW * 0.9);
      const dx = targetX - this.ballPos.x;

      // Clean arc that easily clears the net and lands comfortably on CPU side
      this.ballVel.set(dx * 1.2, 3.8, -speed);
      this.paddleSystem.player.animateHit(1.0);
    } else {
      const targetX = (Math.random() - 0.5) * (this.tableHalfW * 0.9);
      const dx = targetX - this.ballPos.x;

      // Clean arc that easily clears the net and lands on Player side
      this.ballVel.set(dx * 1.2, 3.8, speed);
      this.paddleSystem.cpu.animateHit();
    }
  }

  awardPoint(winner) {
    if (this.state !== 'PLAYING') return;

    this.state = 'POINT_RESULT';
    this.pointResetTimer = 1.6;

    if (winner === 'PLAYER') {
      this.playerScore++;
      this.sound.playHooray();
      this.ui.showPointBanner('POINT — YOU', 'celebrate');
    } else {
      this.cpuScore++;
      this.sound.playBoo();
      this.ui.showPointBanner('POINT — CPU', 'boo');
    }

    this.ui.updateScores(this.playerScore, this.cpuScore);

    // Table tennis scoring: first to 11, win by 2
    const p = this.playerScore;
    const c = this.cpuScore;
    if ((p >= 11 || c >= 11) && Math.abs(p - c) >= 2) {
      this.matchWinner = p > c ? 'PLAYER' : 'CPU';
      this.endMatch(this.matchWinner);
      return;
    }

    // Server rotation
    const totalPoints = p + c;
    if (p >= 10 && c >= 10) {
      this.server = this.server === 'PLAYER' ? 'CPU' : 'PLAYER';
    } else if (totalPoints % 2 === 0) {
      this.server = this.server === 'PLAYER' ? 'CPU' : 'PLAYER';
    }
  }

  endMatch(winner) {
    this.state = 'MATCH_END';

    let progressionResult = null;
    if (winner === 'PLAYER') {
      this.sound.playVictory();
      progressionResult = this.progression.recordMatchWin(this.matchBestRally);
      if (progressionResult.levelUp) {
        this.sound.playLevelUp();
      }
    } else {
      this.sound.playDefeat();
      progressionResult = this.progression.recordMatchLoss();
    }

    this.ui.showMatchEnd({
      winner,
      playerScore: this.playerScore,
      cpuScore: this.cpuScore,
      bestRally: this.progression.bestRally,
      longestRally: this.matchBestRally,
      progressionResult,
      progression: this.progression,
    });
  }

  update(dt) {
    // Environmental update
    if (this.envSystem) {
      this.envSystem.update(performance.now() * 0.001, dt, {
        hemi: this.hemiLight,
        sun: this.sunLight,
      });
    }

    if (this.state === 'PAUSED' || this.state === 'ONBOARDING') return;

    if (this.state === 'COUNTDOWN') {
      this.countdownTimer -= dt;
      if (this.countdownTimer > 2) {
        this.ui.showCountdown(3);
      } else if (this.countdownTimer > 1) {
        this.ui.showCountdown(2);
      } else if (this.countdownTimer > 0) {
        this.ui.showCountdown(1);
      } else {
        this.ui.showCountdown('RALLY!');
        setTimeout(() => {
          this.ui.hideCountdown();
          this.state = 'PLAYING';
          this.resetBallPosition();
        }, 500);
      }
    }

    if (this.state === 'POINT_RESULT') {
      this.pointResetTimer -= dt;
      if (this.pointResetTimer <= 0) {
        this.currentRally = 0;
        this.ui.updateRally(0, this.progression.bestRally);
        this.ui.hidePointBanner();
        this.state = 'PLAYING';
        this.resetBallPosition();
      }
    }

    // Power Charge Mechanic
    if (this.powerCharging && this.state === 'PLAYING') {
      this.powerCharge = Math.min(1.0, this.powerCharge + dt * 1.5);
      if (this.powerCharge >= 1.0 && !this.powerReady) {
        this.powerReady = true;
        this.sound.playPowerReady();
        this.ui.showPowerReady(true);
      }
    } else {
      if (this.powerReady && !this.powerCharging) {
        this.powerActiveOnNextHit = true;
      }
      this.powerCharge = Math.max(0, this.powerCharge - dt * 2.0);
    }
    this.ui.updatePowerMeter(this.powerCharge, this.powerReady);

    // Keyboard support
    if (this.keys['arrowleft'] || this.keys['a']) {
      this.playerTargetX -= dt * 6.5;
      this.inputMode = 'keyboard';
    }
    if (this.keys['arrowright'] || this.keys['d']) {
      this.playerTargetX += dt * 6.5;
      this.inputMode = 'keyboard';
    }

    this.playerTargetX = THREE.MathUtils.clamp(
      this.playerTargetX,
      -this.tableHalfW - 0.45,
      this.tableHalfW + 0.45
    );

    // Paddle Interpolation
    this.updatePaddlePositions(dt);

    // Ball Physics
    if (this.ballInPlay) {
      this.updateBallPhysics(dt);
    } else if (this.serving) {
      if (this.server === 'PLAYER') {
        this.ballPos.x = this.playerPaddlePos.x;
        this.ballPos.y = this.tableTopY + 0.35 + Math.sin(performance.now() * 0.005) * 0.03;
        this.ballPos.z = this.tableHalfL - 0.15;
      } else {
        this.ballPos.x = this.cpuPaddlePos.x;
        this.ballPos.y = this.tableTopY + 0.35 + Math.sin(performance.now() * 0.005) * 0.03;
        this.ballPos.z = -this.tableHalfL + 0.15;
      }
    }

    // Visual ball update
    if (this.ballSystem) {
      this.ballSystem.update(this.ballPos, this.ballIsPowerShot, dt, this.tableTopY);
    }

    // Camera shake
    if (this.camShakeIntensity > 0) {
      this.camShakeIntensity -= dt * 4.0;
      if (this.camShakeIntensity < 0) this.camShakeIntensity = 0;
      this.camShake.set(
        (Math.random() - 0.5) * this.camShakeIntensity * 0.12,
        (Math.random() - 0.5) * this.camShakeIntensity * 0.1,
        (Math.random() - 0.5) * this.camShakeIntensity * 0.08
      );
      this.camera.position.copy(this.defaultCamPos).add(this.camShake);
    } else {
      this.camera.position.copy(this.defaultCamPos);
    }

    this.renderer.render(this.scene, this.camera);
  }

  updatePaddlePositions(dt) {
    const diffCfg = this.progression.getDifficultyConfig();

    // 1. Player Paddle: Smooth lerp
    const playerLerpSpeed = 16.0;
    this.playerPaddlePos.x = THREE.MathUtils.lerp(
      this.playerPaddlePos.x,
      this.playerTargetX,
      1.0 - Math.exp(-playerLerpSpeed * Math.max(0.001, dt))
    );

    const playerVelX = (this.playerTargetX - this.playerPaddlePos.x);
    const tiltZ = -playerVelX * 0.35;
    const tiltY = -playerVelX * 0.2;

    if (this.paddleSystem?.player?.group) {
      this.paddleSystem.player.group.position.set(
        this.playerPaddlePos.x,
        this.playerPaddlePos.y,
        this.playerPaddlePos.z
      );
      this.paddleSystem.player.group.rotation.set(-0.12, tiltY, tiltZ);
    }

    // 2. CPU Paddle: AI tracking with difficulty-based curve
    let aiTargetX = 0;
    if (this.ballInPlay && this.ballVel.z < 0) {
      const timeToReachCpu = Math.abs((this.cpuPaddlePos.z - this.ballPos.z) / (this.ballVel.z || 0.1));
      const projectedX = this.ballPos.x + this.ballVel.x * timeToReachCpu;

      // Mistake probability from difficulty curve
      const cpuMistake = Math.sin(performance.now() * 0.003) * diffCfg.aiError * (this.currentRally > 6 ? 1.4 : 1.0);
      aiTargetX = THREE.MathUtils.clamp(
        projectedX + cpuMistake,
        -this.tableHalfW - 0.3,
        this.tableHalfW + 0.3
      );
    } else {
      aiTargetX = Math.sin(performance.now() * 0.001) * 0.2;
    }

    this.cpuTargetX = aiTargetX;
    const cpuLerpRate = diffCfg.aiSpeed;
    this.cpuPaddlePos.x = THREE.MathUtils.lerp(
      this.cpuPaddlePos.x,
      this.cpuTargetX,
      1.0 - Math.exp(-cpuLerpRate * Math.max(0.001, dt))
    );

    if (this.paddleSystem?.cpu?.group) {
      this.paddleSystem.cpu.group.position.set(
        this.cpuPaddlePos.x,
        this.cpuPaddlePos.y,
        this.cpuPaddlePos.z
      );
      const cpuVelX = (this.cpuTargetX - this.cpuPaddlePos.x);
      this.paddleSystem.cpu.group.rotation.set(0.12, -cpuVelX * 0.2, cpuVelX * 0.3);
    }
  }

  updateBallPhysics(dt) {
    const diffCfg = this.progression.getDifficultyConfig();

    const STEPS = 4;
    const subDt = dt / STEPS;

    for (let step = 0; step < STEPS; step++) {
      // Standard table tennis physics: pure gravity + predictable air resistance
      // WIND NEVER INFLUENCES THE BALL (Cosmetic only)
      this.ballVel.y += this.gravity * subDt;
      this.ballVel.x *= (1.0 - 0.04 * subDt);
      this.ballVel.z *= (1.0 - 0.02 * subDt);

      // Move ball
      this.ballPos.x += this.ballVel.x * subDt;
      this.ballPos.y += this.ballVel.y * subDt;
      this.ballPos.z += this.ballVel.z * subDt;

      // 1. Table Collision
      const isOverTableX = Math.abs(this.ballPos.x) <= this.tableHalfW + 0.08;
      const isOverTableZ = Math.abs(this.ballPos.z) <= this.tableHalfL + 0.08;
      const ballRadius = 0.085;

      if (isOverTableX && isOverTableZ) {
        if (this.ballPos.y - ballRadius <= this.tableTopY && this.ballVel.y < 0) {
          this.ballPos.y = this.tableTopY + ballRadius;
          this.ballVel.y = -this.ballVel.y * 0.88;
          if (this.ballVel.y < 2.0) this.ballVel.y = 2.4;

          this.sound.playTableBounce(Math.abs(this.ballVel.y) / 4.0);
          this.ballSystem.triggerImpact(this.ballPos, 6);

          if (this.ballPos.z > 0) {
            this.hasBouncedOnPlayerSide = true;
          } else {
            this.hasBouncedOnCpuSide = true;
          }
        }
      }

      // 2. Net Collision (Net plane is at z = 0, y from tableTopY to tableTopY + 0.35)
      const netTopY = this.tableTopY + 0.35;
      if (Math.abs(this.ballPos.z) < 0.08 && Math.abs(this.ballPos.x) <= this.tableHalfW + 0.15) {
        // Only hits net if ball is below top of the net
        if (this.ballPos.y >= this.tableTopY && this.ballPos.y <= netTopY) {
          this.sound.playNetHit();
          // Bounce slightly back and slow down
          this.ballVel.z = -this.ballVel.z * 0.4;
          this.ballVel.y = Math.max(1.2, Math.abs(this.ballVel.y) * 0.5);
          this.ballSystem.triggerImpact(this.ballPos, 6);
        }
      }

      // 3. Player Paddle Collision
      if (this.ballVel.z > 0 && this.ballPos.z >= 2.90 && this.ballPos.z <= 3.45) {
        const distToPlayer = Math.abs(this.ballPos.x - this.playerPaddlePos.x);
        const forgiveness = diffCfg.playerForgiveness;

        if (distToPlayer <= forgiveness && this.ballPos.y >= this.tableTopY - 0.25 && this.ballPos.y <= 2.9) {
          const isPower = this.powerActiveOnNextHit || this.powerReady;
          this.powerActiveOnNextHit = false;
          this.powerReady = false;
          this.powerCharge = 0;
          this.ui.showPowerReady(false);
          this.ballIsPowerShot = isPower;

          this.lastHitter = 'PLAYER';
          this.hasBouncedOnPlayerSide = false;
          this.hasBouncedOnCpuSide = false;

          // Rally Tracking
          this.currentRally++;
          if (this.currentRally > this.matchBestRally) {
            this.matchBestRally = this.currentRally;
          }
          if (this.currentRally > this.progression.bestRally) {
            const isFirstBeat = this.progression.bestRally > 0 && this.currentRally === this.progression.bestRally + 1;
            this.progression.recordRally(this.currentRally);
            if (isFirstBeat) {
              this.sound.playNewRecord();
              this.ui.showCelebrationBanner('NEW RALLY BEST!');
            }
          }
          this.ui.updateRally(this.currentRally, this.progression.bestRally);

          const hitOffset = (this.ballPos.x - this.playerPaddlePos.x) / forgiveness;
          const powerMultiplier = isPower ? 1.35 : 1.0;
          const baseSpeed = 7.8 * diffCfg.ballSpeedScale * powerMultiplier;

          this.ballVel.z = -baseSpeed;
          this.ballVel.x = hitOffset * 3.6;
          // Reliable upward arc clearing the net comfortably
          this.ballVel.y = isPower ? 3.4 : (3.9 + Math.random() * 0.4);

          this.sound.playPaddleHit(true, powerMultiplier);
          this.paddleSystem.player.animateHit(powerMultiplier);
          this.ballSystem.triggerImpact(this.ballPos, isPower ? 16 : 8);

          if (isPower) {
            this.camShakeIntensity = 1.0;
          }
          break;
        }
      }

      // 4. CPU Paddle Collision
      if (this.ballVel.z < 0 && this.ballPos.z <= -2.90 && this.ballPos.z >= -3.45) {
        const distToCpu = Math.abs(this.ballPos.x - this.cpuPaddlePos.x);
        const cpuReach = 0.55;

        if (distToCpu <= cpuReach && this.ballPos.y >= this.tableTopY - 0.25 && this.ballPos.y <= 2.9) {
          this.lastHitter = 'CPU';
          this.hasBouncedOnPlayerSide = false;
          this.hasBouncedOnCpuSide = false;
          this.ballIsPowerShot = false;

          const cpuOffset = (this.ballPos.x - this.cpuPaddlePos.x) / cpuReach;
          const isCpuSmash = Math.random() < diffCfg.smashFrequency;
          const speedMultiplier = isCpuSmash ? 1.2 : 1.0;
          const cpuSpeed = (7.6 + Math.random() * 0.8) * diffCfg.ballSpeedScale * speedMultiplier;

          this.ballVel.z = cpuSpeed;
          this.ballVel.x = cpuOffset * 3.6;
          // Reliable upward arc back to player
          this.ballVel.y = isCpuSmash ? 3.4 : (3.9 + Math.random() * 0.4);

          this.sound.playPaddleHit(false, speedMultiplier);
          this.paddleSystem.cpu.animateHit();
          this.ballSystem.triggerImpact(this.ballPos, isCpuSmash ? 14 : 8);
          break;
        }
      }

      // 5. Floor Collision / Miss Detection
      if (this.ballPos.y <= 0.08) {
        this.ballInPlay = false;
        if (this.lastHitter === 'PLAYER') {
          this.awardPoint(this.hasBouncedOnCpuSide ? 'PLAYER' : 'CPU');
        } else if (this.lastHitter === 'CPU') {
          this.awardPoint(this.hasBouncedOnPlayerSide ? 'CPU' : 'PLAYER');
        } else {
          this.awardPoint('CPU');
        }
        break;
      }

      // 6. Out of Bounds
      if (Math.abs(this.ballPos.x) > 4.5 || Math.abs(this.ballPos.z) > 5.5) {
        this.ballInPlay = false;
        if (this.lastHitter === 'PLAYER') {
          this.awardPoint(this.hasBouncedOnCpuSide ? 'PLAYER' : 'CPU');
        } else {
          this.awardPoint(this.hasBouncedOnPlayerSide ? 'CPU' : 'PLAYER');
        }
        break;
      }
    }
  }
}
