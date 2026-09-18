import * as THREE from 'three';

/**
 * Creates the Ball, its contact shadow, and ball trail particles.
 */
export function createBallSystem(scene) {
  const BALL_RADIUS = 0.085; // highly readable white table-tennis ball

  // Ball Mesh
  const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 24, 24);
  const ballMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.05,
    emissive: 0x111111,
  });
  const ballMesh = new THREE.Mesh(ballGeo, ballMat);
  ballMesh.castShadow = true;
  scene.add(ballMesh);

  // Dynamic Contact Shadow on Tabletop / Grass
  const shadowGeo = new THREE.PlaneGeometry(BALL_RADIUS * 2.8, BALL_RADIUS * 2.8);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 64;
  shadowCanvas.height = 64;
  const sCtx = shadowCanvas.getContext('2d');
  const grad = sCtx.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 64, 64);

  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  scene.add(shadowMesh);

  // Ball Trail for Power shots
  const TRAIL_MAX = 12;
  const trailMeshes = [];
  const trailGeo = new THREE.SphereGeometry(BALL_RADIUS * 0.8, 12, 12);
  for (let i = 0; i < TRAIL_MAX; i++) {
    const alpha = (1 - i / TRAIL_MAX) * 0.5;
    const tMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15, // golden power streak
      transparent: true,
      opacity: alpha,
    });
    const tMesh = new THREE.Mesh(trailGeo, tMat);
    tMesh.visible = false;
    scene.add(tMesh);
    trailMeshes.push(tMesh);
  }

  const trailHistory = [];

  // Impact burst particles
  const BURST_COUNT = 16;
  const burstGeo = new THREE.BufferGeometry();
  const burstPositions = new Float32Array(BURST_COUNT * 3);
  const burstVelocities = [];
  for (let i = 0; i < BURST_COUNT; i++) {
    burstVelocities.push(new THREE.Vector3());
  }
  burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPositions, 3));
  const burstMat = new THREE.PointsMaterial({
    color: 0xfef08a,
    size: 0.05,
    transparent: true,
    opacity: 0,
  });
  const burstPoints = new THREE.Points(burstGeo, burstMat);
  scene.add(burstPoints);

  let burstTimer = 0;

  return {
    mesh: ballMesh,
    radius: BALL_RADIUS,
    update: (pos, isPower, dt, tableTopY) => {
      ballMesh.position.copy(pos);

      // Shadow position & scale
      // If above table (tableTopY), shadow stays on table surface
      const shadowY = pos.y >= tableTopY - 0.05 ? tableTopY + 0.003 : 0.02;
      const heightAboveSurface = Math.max(0.01, pos.y - shadowY);
      shadowMesh.position.set(pos.x, shadowY, pos.z);

      const shadowScale = THREE.MathUtils.clamp(1.0 - heightAboveSurface * 0.35, 0.3, 1.2);
      shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
      shadowMat.opacity = THREE.MathUtils.clamp(0.65 - heightAboveSurface * 0.3, 0.05, 0.65);

      // Trail update
      trailHistory.unshift(pos.clone());
      if (trailHistory.length > TRAIL_MAX) trailHistory.pop();

      for (let i = 0; i < TRAIL_MAX; i++) {
        if (isPower && i < trailHistory.length) {
          trailMeshes[i].position.copy(trailHistory[i]);
          const scale = (1 - i / TRAIL_MAX) * 0.8;
          trailMeshes[i].scale.set(scale, scale, scale);
          trailMeshes[i].visible = true;
        } else {
          trailMeshes[i].visible = false;
        }
      }

      // Burst particle update
      if (burstTimer > 0) {
        burstTimer -= dt;
        const posAttr = burstGeo.attributes.position;
        const pArray = posAttr.array;
        for (let i = 0; i < BURST_COUNT; i++) {
          pArray[i * 3 + 0] += burstVelocities[i].x * dt;
          pArray[i * 3 + 1] += burstVelocities[i].y * dt;
          pArray[i * 3 + 2] += burstVelocities[i].z * dt;
        }
        posAttr.needsUpdate = true;
        burstMat.opacity = THREE.MathUtils.clamp(burstTimer * 3.5, 0, 0.9);
      } else {
        burstMat.opacity = 0;
      }
    },
    triggerImpact: (pos, count = 12) => {
      burstTimer = 0.28;
      const posAttr = burstGeo.attributes.position;
      const pArray = posAttr.array;
      for (let i = 0; i < BURST_COUNT; i++) {
        pArray[i * 3 + 0] = pos.x;
        pArray[i * 3 + 1] = pos.y;
        pArray[i * 3 + 2] = pos.z;

        burstVelocities[i].set(
          (Math.random() - 0.5) * 3.5,
          Math.random() * 2.5 + 0.8,
          (Math.random() - 0.5) * 3.5
        );
      }
      posAttr.needsUpdate = true;
      burstMat.opacity = 0.9;
    }
  };
}
