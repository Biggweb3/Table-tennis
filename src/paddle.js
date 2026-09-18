import * as THREE from 'three';

/**
 * Creates the Player Hand + Paddle assembly.
 * 
 * V2 Requirements:
 * - Visibly 5 distinct fingers:
 *   1. Thumb (opposed on the side/front of handle collar)
 *   2. Index finger (wrapped along upper handle/collar)
 *   3. Middle finger (firmly curled around center handle)
 *   4. Ring finger (curled around lower handle)
 *   5. Little finger (curled at base)
 * - Clear natural shakehand anatomical grip:
 *   Handle passes through the palm; fingers curl around from the back to the front.
 * - Knuckles, joint segments, soft warm stylized skin material.
 * - Short wrist and forearm terminating cleanly with a dark athletic sweatband / cuff.
 * - NEVER shows elbow, shoulder, arm, or body.
 * - Paddle blade (red rubber front, black rubber back, wooden edge rim, flared wood handle).
 * - Hand + Wrist + Paddle move as one single physical entity.
 */
export function createPlayerHandPaddle() {
  const rootGroup = new THREE.Group();
  rootGroup.name = "playerHandPaddle";

  // Materials
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5b596, // warm stylized animated skin
    roughness: 0.52,
    metalness: 0.04,
  });

  const skinAccentMaterial = new THREE.MeshStandardMaterial({
    color: 0xeb9c7a, // subtle joint / knuckle shading
    roughness: 0.58,
    metalness: 0.04,
  });

  const cuffMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // dark athletic sweatband cleanly terminating the forearm
    roughness: 0.85,
  });

  const bladeWoodMat = new THREE.MeshStandardMaterial({
    color: 0xd4a373, // multi-ply edge wood
    roughness: 0.6,
  });

  const rubberPlayerMat = new THREE.MeshStandardMaterial({
    color: 0xd92d20, // striking red rubber face (facing opponent -Z)
    roughness: 0.35,
    metalness: 0.08,
  });

  const rubberBackMat = new THREE.MeshStandardMaterial({
    color: 0x1d2939, // black rubber face (facing player +Z)
    roughness: 0.35,
    metalness: 0.08,
  });

  const handleWoodMat = new THREE.MeshStandardMaterial({
    color: 0xb07d4b, // natural grip wood
    roughness: 0.5,
  });

  const handleAccentMat = new THREE.MeshStandardMaterial({
    color: 0x78350f, // dark wood accent grip strip
    roughness: 0.5,
  });

  // ================= PADDLE =================
  const paddleGroup = new THREE.Group();
  paddleGroup.name = "paddle";

  // Blade rim (radius ~0.44, centered at Y = 0.42)
  const bladeGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.035, 32);
  bladeGeo.rotateX(Math.PI / 2);
  const bladeRim = new THREE.Mesh(bladeGeo, bladeWoodMat);
  bladeRim.castShadow = true;
  bladeRim.receiveShadow = true;
  bladeRim.position.set(0, 0.42, 0);
  paddleGroup.add(bladeRim);

  // Red rubber face (front facing -Z)
  const redRubberGeo = new THREE.CylinderGeometry(0.425, 0.425, 0.008, 32);
  redRubberGeo.rotateX(Math.PI / 2);
  const redRubber = new THREE.Mesh(redRubberGeo, rubberPlayerMat);
  redRubber.castShadow = true;
  redRubber.position.set(0, 0.42, -0.018);
  paddleGroup.add(redRubber);

  // Black rubber face (back facing +Z)
  const blackRubberGeo = new THREE.CylinderGeometry(0.425, 0.425, 0.008, 32);
  blackRubberGeo.rotateX(Math.PI / 2);
  const blackRubber = new THREE.Mesh(blackRubberGeo, rubberBackMat);
  blackRubber.castShadow = true;
  blackRubber.position.set(0, 0.42, 0.018);
  paddleGroup.add(blackRubber);

  // Flared wood handle: from Y = 0.12 down to Y = -0.32
  const handleGeo = new THREE.CylinderGeometry(0.062, 0.082, 0.44, 20);
  const handleMesh = new THREE.Mesh(handleGeo, handleWoodMat);
  handleMesh.position.set(0, -0.08, 0);
  handleMesh.castShadow = true;
  handleMesh.receiveShadow = true;
  paddleGroup.add(handleMesh);

  // Handle flared side grip wings
  const scaleGeo = new THREE.BoxGeometry(0.125, 0.40, 0.052);
  const handleScale = new THREE.Mesh(scaleGeo, handleAccentMat);
  handleScale.position.set(0, -0.08, 0);
  handleScale.castShadow = true;
  paddleGroup.add(handleScale);

  // Handle end cap
  const capGeo = new THREE.CylinderGeometry(0.084, 0.084, 0.03, 20);
  const capMesh = new THREE.Mesh(capGeo, handleAccentMat);
  capMesh.position.set(0, -0.29, 0);
  paddleGroup.add(capMesh);

  // ================= STYLIZED 5-FINGER HAND =================
  const handGroup = new THREE.Group();
  handGroup.name = "hand";

  // 1. PALM: Ergonomic curved palm resting naturally around the back/side of the handle
  const palmGeo = new THREE.BoxGeometry(0.24, 0.28, 0.16);
  const palmMesh = new THREE.Mesh(palmGeo, skinMaterial);
  palmMesh.position.set(0.06, -0.06, 0.065);
  palmMesh.rotation.set(-0.08, 0.12, -0.08);
  palmMesh.castShadow = true;
  palmMesh.receiveShadow = true;
  handGroup.add(palmMesh);

  // 2. SHORT FOREARM (strictly terminates at mid-forearm, NEVER elbow or shoulder)
  const forearmGeo = new THREE.CylinderGeometry(0.13, 0.155, 0.38, 16);
  const forearmMesh = new THREE.Mesh(forearmGeo, skinMaterial);
  forearmMesh.position.set(0.09, -0.34, 0.16);
  forearmMesh.rotation.set(0.32, 0.08, -0.22);
  forearmMesh.castShadow = true;
  handGroup.add(forearmMesh);

  // Dark athletic sweatband / wristband cleanly finishing the forearm cut
  const cuffGeo = new THREE.CylinderGeometry(0.16, 0.165, 0.09, 16);
  const cuffMesh = new THREE.Mesh(cuffGeo, cuffMaterial);
  cuffMesh.position.set(0.12, -0.48, 0.21);
  cuffMesh.rotation.set(0.32, 0.08, -0.22);
  cuffMesh.castShadow = true;
  handGroup.add(cuffMesh);

  // Knuckle ridge on back of hand
  const knuckleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.22, 12);
  knuckleGeo.rotateZ(Math.PI / 2);
  const knuckleMesh = new THREE.Mesh(knuckleGeo, skinAccentMaterial);
  knuckleMesh.position.set(0.06, 0.07, 0.11);
  handGroup.add(knuckleMesh);

  // Helper function to create an articulated finger with 3 distinct phalanges & knuckles
  function createArticulatedFinger(config) {
    const { length, radius, rootPos, rotX, rotY, rotZ, curl1, curl2 } = config;
    const root = new THREE.Group();
    root.position.copy(rootPos);
    root.rotation.set(rotX, rotY, rotZ);

    // Segment 1 (Proximal phalanx)
    const len1 = length * 0.44;
    const geo1 = new THREE.CylinderGeometry(radius, radius * 0.94, len1, 12);
    geo1.translate(0, 0, -len1 / 2);
    geo1.rotateX(Math.PI / 2);
    const m1 = new THREE.Mesh(geo1, skinMaterial);
    m1.castShadow = true;
    root.add(m1);

    // Joint 1
    const j1 = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.06, 10, 10), skinAccentMaterial);
    root.add(j1);

    // Segment 2 (Middle phalanx curled around handle)
    const mid = new THREE.Group();
    mid.position.set(0, 0, -len1);
    mid.rotation.x = -curl1;

    const j2 = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.02, 10, 10), skinAccentMaterial);
    mid.add(j2);

    const len2 = length * 0.34;
    const geo2 = new THREE.CylinderGeometry(radius * 0.92, radius * 0.84, len2, 12);
    geo2.translate(0, 0, -len2 / 2);
    geo2.rotateX(Math.PI / 2);
    const m2 = new THREE.Mesh(geo2, skinMaterial);
    m2.castShadow = true;
    mid.add(m2);

    // Segment 3 (Distal phalanx / fingertip wrapping around the front)
    const tip = new THREE.Group();
    tip.position.set(0, 0, -len2);
    tip.rotation.x = -curl2;

    const len3 = length * 0.28;
    const tipGeo = new THREE.SphereGeometry(radius * 0.86, 10, 10);
    const tipMesh = new THREE.Mesh(tipGeo, skinMaterial);
    tipMesh.scale.set(1, 0.85, 1.4);
    tipMesh.position.set(0, 0, -len3 * 0.5);
    tipMesh.castShadow = true;
    tip.add(tipMesh);

    mid.add(tip);
    root.add(mid);
    return root;
  }

  // 1. INDEX FINGER (Pointed slightly up along throat / grip collar, clearly visible)
  const indexFinger = createArticulatedFinger({
    length: 0.28,
    radius: 0.038,
    rootPos: new THREE.Vector3(-0.065, 0.08, 0.08),
    rotX: 0.22,
    rotY: -0.32,
    rotZ: 0.24,
    curl1: 1.15,
    curl2: 1.05,
  });
  handGroup.add(indexFinger);

  // 2. MIDDLE FINGER (Curled firmly across upper handle)
  const middleFinger = createArticulatedFinger({
    length: 0.28,
    radius: 0.037,
    rootPos: new THREE.Vector3(-0.055, 0.01, 0.09),
    rotX: 0.16,
    rotY: -0.16,
    rotZ: 0.06,
    curl1: 1.30,
    curl2: 1.15,
  });
  handGroup.add(middleFinger);

  // 3. RING FINGER (Curled firmly across mid handle)
  const ringFinger = createArticulatedFinger({
    length: 0.26,
    radius: 0.035,
    rootPos: new THREE.Vector3(-0.045, -0.06, 0.09),
    rotX: 0.12,
    rotY: -0.06,
    rotZ: -0.04,
    curl1: 1.35,
    curl2: 1.20,
  });
  handGroup.add(ringFinger);

  // 4. LITTLE / PINKY FINGER (Curled around lower flare of handle)
  const pinkyFinger = createArticulatedFinger({
    length: 0.23,
    radius: 0.031,
    rootPos: new THREE.Vector3(-0.035, -0.13, 0.08),
    rotX: 0.06,
    rotY: 0.06,
    rotZ: -0.14,
    curl1: 1.40,
    curl2: 1.25,
  });
  handGroup.add(pinkyFinger);

  // 5. THUMB (Opposed naturally on side/front of handle collar - shakehand grip)
  const thumbGroup = new THREE.Group();
  thumbGroup.position.set(0.08, 0.05, 0.03);
  thumbGroup.rotation.set(-0.2, 0.62, -0.38);

  const thumb1Geo = new THREE.CylinderGeometry(0.045, 0.048, 0.15, 12);
  const thumb1Mesh = new THREE.Mesh(thumb1Geo, skinMaterial);
  thumb1Mesh.position.set(0, 0.05, -0.02);
  thumb1Mesh.rotation.x = -0.4;
  thumb1Mesh.castShadow = true;
  thumbGroup.add(thumb1Mesh);

  const thumbJoint = new THREE.Mesh(new THREE.SphereGeometry(0.046, 10, 10), skinAccentMaterial);
  thumbJoint.position.set(0, 0.1, -0.05);
  thumbGroup.add(thumbJoint);

  const thumbTipGeo = new THREE.SphereGeometry(0.042, 10, 10);
  const thumbTipMesh = new THREE.Mesh(thumbTipGeo, skinMaterial);
  thumbTipMesh.scale.set(1.1, 1.4, 0.9);
  thumbTipMesh.position.set(-0.02, 0.15, -0.08);
  thumbTipMesh.castShadow = true;
  thumbGroup.add(thumbTipMesh);

  handGroup.add(thumbGroup);

  // Combine paddle & hand into unified root
  rootGroup.add(paddleGroup);
  rootGroup.add(handGroup);

  return {
    group: rootGroup,
    paddle: paddleGroup,
    hand: handGroup,
    animateHit: (power = 1.0) => {
      // Subtle tactile wrist/paddle reaction on impact
      rootGroup.position.z -= 0.12 * power;
      rootGroup.rotation.x -= 0.24 * power;
    }
  };
}

/**
 * Creates Computer Paddle (NO HAND ATTACHED - intentional asymmetry).
 * Distinct sport sapphire blue rubber.
 */
export function createCpuPaddle() {
  const paddleGroup = new THREE.Group();
  paddleGroup.name = "cpuPaddle";

  const bladeWoodMat = new THREE.MeshStandardMaterial({
    color: 0xc49a6c,
    roughness: 0.6,
  });

  const cpuRubberMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // sapphire blue rubber
    roughness: 0.35,
    metalness: 0.08,
  });

  const cpuRubberBackMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a, // dark slate rubber back
    roughness: 0.35,
  });

  const handleMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // slate handle
    roughness: 0.45,
  });

  // Blade
  const bladeGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.035, 32);
  bladeGeo.rotateX(Math.PI / 2);
  const bladeRim = new THREE.Mesh(bladeGeo, bladeWoodMat);
  bladeRim.castShadow = true;
  bladeRim.position.set(0, 0.42, 0);
  paddleGroup.add(bladeRim);

  // Blue rubber face (facing player +Z)
  const blueRubberGeo = new THREE.CylinderGeometry(0.425, 0.425, 0.008, 32);
  blueRubberGeo.rotateX(Math.PI / 2);
  const blueRubber = new THREE.Mesh(blueRubberGeo, cpuRubberMat);
  blueRubber.castShadow = true;
  blueRubber.position.set(0, 0.42, 0.018);
  paddleGroup.add(blueRubber);

  // Back rubber face
  const backRubberGeo = new THREE.CylinderGeometry(0.425, 0.425, 0.008, 32);
  backRubberGeo.rotateX(Math.PI / 2);
  const backRubber = new THREE.Mesh(backRubberGeo, cpuRubberBackMat);
  backRubber.castShadow = true;
  backRubber.position.set(0, 0.42, -0.018);
  paddleGroup.add(backRubber);

  // Handle
  const handleGeo = new THREE.CylinderGeometry(0.062, 0.082, 0.44, 20);
  const handleMesh = new THREE.Mesh(handleGeo, handleMat);
  handleMesh.position.set(0, -0.08, 0);
  handleMesh.castShadow = true;
  paddleGroup.add(handleMesh);

  return {
    group: paddleGroup,
    animateHit: () => {
      paddleGroup.position.z += 0.1;
      paddleGroup.rotation.x += 0.2;
    }
  };
}
