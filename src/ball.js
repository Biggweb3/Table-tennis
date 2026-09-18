import * as THREE from 'three';

/**
 * Creates the competition 40mm Table Tennis Ball.
 * Features:
 * - High-visibility smooth matte white finish with subtle sheen.
 * - Tiny dynamic contact shadow beneath ball on the table.
 * - Restrained impact particle burst generator for paddle hits & power shots.
 */
export function createBall() {
  const ballGroup = new THREE.Group();
  ballGroup.name = 'TableTennisBall';

  // ITTF official diameter: 40mm => scene radius ~ 0.024 for game clarity
  const radius = 0.025;
  const ballGeo = new THREE.SphereGeometry(radius, 32, 24);
  const ballMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.02,
    emissive: 0x222222,
  });

  const mesh = new THREE.Mesh(ballGeo, ballMat);
  mesh.castShadow = true;
  ballGroup.add(mesh);

  // Dedicated soft fake shadow on table surface for crisp visual depth
  const shadowGeo = new THREE.PlaneGeometry(radius * 2.8, radius * 2.8);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 64;
  shadowCanvas.height = 64;
  const sCtx = shadowCanvas.getContext('2d');
  const grad = sCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 64, 64);

  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });

  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.786; // Just above tabletop surface
  shadowMesh.visible = false;

  // Impact particle system
  const particleCount = 20;
  const pGeo = new THREE.SphereGeometry(0.007, 8, 8);
  const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    const p = new THREE.Mesh(pGeo, pMat.clone());
    p.visible = false;
    particles.push({
      mesh: p,
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 0.25,
    });
  }

  function spawnImpact(pos, isPower = false) {
    const count = isPower ? 18 : 8;
    for (let i = 0; i < count; i++) {
      const p = particles[i % particleCount];
      p.mesh.position.copy(pos);
      p.mesh.visible = true;
      p.life = 0;
      p.maxLife = isPower ? 0.35 : 0.22;
      p.mesh.material.color.setHex(isPower ? 0xffea00 : 0xffffff);
      p.vel.set(
        (Math.random() - 0.5) * (isPower ? 3.5 : 2.0),
        Math.random() * (isPower ? 2.5 : 1.5) + 0.5,
        (Math.random() - 0.5) * (isPower ? 3.5 : 2.0)
      );
    }
  }

  function updateParticles(dt) {
    particles.forEach(p => {
      if (!p.mesh.visible) return;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
      } else {
        p.mesh.position.addScaledVector(p.vel, dt);
        p.vel.y -= 9.8 * dt; // gravity
        p.mesh.material.opacity = 1 - (p.life / p.maxLife);
      }
    });
  }

  return {
    group: ballGroup,
    mesh: mesh,
    radius: radius,
    shadowMesh: shadowMesh,
    spawnImpact: spawnImpact,
    updateParticles: updateParticles,
    getParticleMeshes: () => particles.map(p => p.mesh),
  };
}
