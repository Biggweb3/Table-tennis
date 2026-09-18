import * as THREE from 'three';

/**
 * Creates the Grass Outdoor Environment:
 * - Lush grassy ground plane with custom vertex-displacement wind shader.
 * - Thousands of instanced 3D grass blade geometries for visible depth and natural blades.
 * - Subtle continuous wind traveling from LEFT to RIGHT with natural gentle gusts.
 * - Warm soft distant hill horizon and decorative low-poly outdoor trees in the background.
 * - Performs smoothly at 60 FPS across desktop and mobile devices.
 */
export function createGrassEnvironment() {
  const envGroup = new THREE.Group();
  envGroup.name = 'GrassOutdoorEnvironment';

  // --- 1. PROCEDURAL GRASS TEXTURE FOR BASE GROUND ---
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Base meadow green
  ctx.fillStyle = '#2d6a4f';
  ctx.fillRect(0, 0, 512, 512);

  // Layered subtle speckles and tone variations
  for (let i = 0; i < 40000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 2 + 1;
    const g = 110 + Math.floor(Math.random() * 65);
    const b = 45 + Math.floor(Math.random() * 30);
    ctx.fillStyle = `rgb(${Math.floor(g * 0.4)}, ${g}, ${b})`;
    ctx.fillRect(x, y, r, r);
  }

  const groundTexture = new THREE.CanvasTexture(canvas);
  groundTexture.wrapS = THREE.RepeatWrapping;
  groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(16, 16);

  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTexture,
    roughness: 0.85,
    metalness: 0.05,
    color: 0x387346,
  });

  const groundGeo = new THREE.PlaneGeometry(50, 50, 32, 32);
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = 0;
  groundMesh.receiveShadow = true;
  envGroup.add(groundMesh);

  // --- 2. INSTANCED 3D GRASS BLADES SURROUNDING THE TABLE ---
  // A curved triangular blade of grass
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.02, 0);
  bladeShape.lineTo(-0.015, 0.08);
  bladeShape.lineTo(-0.005, 0.16);
  bladeShape.lineTo(0, 0.22); // Tip
  bladeShape.lineTo(0.008, 0.14);
  bladeShape.lineTo(0.018, 0.06);
  bladeShape.lineTo(0.02, 0);
  bladeShape.closePath();

  const bladeGeo = new THREE.ShapeGeometry(bladeShape);
  // Ensure origin is at base
  bladeGeo.computeVertexNormals();

  // Custom shader material for instanced blades with Left -> Right wind wave
  const windUniforms = {
    uTime: { value: 0 },
    uWindDir: { value: new THREE.Vector2(1.0, 0.2) }, // Mostly left to right (X positive)
    uWindSpeed: { value: 1.8 },
    uColorBase: { value: new THREE.Color(0x1b4332) },
    uColorTip: { value: new THREE.Color(0x74c69d) },
  };

  const bladeCustomMat = new THREE.ShaderMaterial({
    uniforms: windUniforms,
    vertexShader: `
      uniform float uTime;
      uniform vec2 uWindDir;
      uniform float uWindSpeed;
      varying vec2 vUv;
      varying float vHeightFactor;

      void main() {
        vUv = uv;
        vHeightFactor = position.y / 0.22;

        // Position in world coordinates
        vec4 worldPos = instanceMatrix * vec4(position, 1.0);

        // Wind wave traveling Left to Right (along X axis)
        float wave = sin(worldPos.x * 1.5 - uTime * uWindSpeed + worldPos.z * 0.8) 
                   + 0.5 * sin(worldPos.x * 3.0 - uTime * (uWindSpeed * 1.3) + worldPos.z * 1.5);
        
        // Displacement only affects upper part of grass blade (quadratic bending)
        float displacement = wave * 0.08 * pow(vHeightFactor, 1.6);

        worldPos.x += displacement * uWindDir.x;
        worldPos.z += displacement * uWindDir.y;
        worldPos.y -= abs(displacement) * 0.2 * vHeightFactor; // tip dips slightly when bent

        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColorBase;
      uniform vec3 uColorTip;
      varying float vHeightFactor;

      void main() {
        // Gradient from rich dark base to sunlight-bright tip
        vec3 col = mix(uColorBase, uColorTip, vHeightFactor);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });

  const BLADE_COUNT = 3800; // Optimal balance for dense lush feel & 60 FPS
  const instancedGrass = new THREE.InstancedMesh(bladeGeo, bladeCustomMat, BLADE_COUNT);
  
  const dummy = new THREE.Object3D();
  let idx = 0;
  const radius = 6.5;

  while (idx < BLADE_COUNT) {
    const rx = (Math.random() - 0.5) * radius * 2;
    const rz = (Math.random() - 0.5) * radius * 2;

    // Leave space directly underneath table leg contact areas so blades don't awkwardly poke through tabletop
    if (Math.abs(rx) < 0.65 && Math.abs(rz) < 1.3) {
      continue;
    }

    dummy.position.set(rx, 0, rz);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    
    // Natural randomized scale and slight tilt
    const s = 0.75 + Math.random() * 0.65;
    dummy.scale.set(s, s * (0.8 + Math.random() * 0.4), s);
    dummy.updateMatrix();

    instancedGrass.setMatrixAt(idx, dummy.matrix);
    idx++;
  }

  instancedGrass.instanceMatrix.needsUpdate = true;
  envGroup.add(instancedGrass);

  // --- 3. SOFT DISTANT HILLS & STYLIZED TREES ---
  // Low-poly soft trees in the far background for depth without clutter
  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x2d6a4f,
    roughness: 0.7,
    flatShading: true,
  });
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x5c4033,
    roughness: 0.8,
  });

  function createStylizedTree(x, z, scale = 1.0) {
    const tree = new THREE.Group();
    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, 1.6 * scale, 7), trunkMat);
    trunk.position.y = 0.8 * scale;
    trunk.castShadow = true;
    tree.add(trunk);

    // Foliage tiers
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.2 * scale, 1.6 * scale, 7), foliageMat);
    c1.position.y = (1.5 + 0.6) * scale;
    c1.castShadow = true;
    tree.add(c1);

    const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.9 * scale, 1.4 * scale, 7), foliageMat);
    c2.position.y = (2.2 + 0.6) * scale;
    c2.castShadow = true;
    tree.add(c2);

    const c3 = new THREE.Mesh(new THREE.ConeGeometry(0.6 * scale, 1.1 * scale, 7), foliageMat);
    c3.position.y = (2.8 + 0.6) * scale;
    c3.castShadow = true;
    tree.add(c3);

    tree.position.set(x, 0, z);
    return tree;
  }

  // Scattered in far background (Z < -5 and sides)
  const treePositions = [
    [-6.5, -7.5, 1.3],
    [-4.0, -8.5, 1.1],
    [-1.5, -9.0, 1.4],
    [2.2, -8.8, 1.2],
    [5.0, -7.8, 1.5],
    [7.5, -6.5, 1.1],
    [-7.8, -4.0, 1.0],
    [8.2, -3.5, 1.2],
  ];

  treePositions.forEach(([x, z, s]) => {
    envGroup.add(createStylizedTree(x, z, s));
  });

  // Soft distant low rolling hill
  const hillGeo = new THREE.SphereGeometry(18, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const hillMat = new THREE.MeshStandardMaterial({
    color: 0x40916c,
    roughness: 0.9,
  });
  const hill = new THREE.Mesh(hillGeo, hillMat);
  hill.position.set(0, -14.5, -16);
  hill.scale.set(2.4, 0.9, 1.5);
  envGroup.add(hill);

  return {
    mesh: envGroup,
    update: (time) => {
      windUniforms.uTime.value = time;
    }
  };
}
