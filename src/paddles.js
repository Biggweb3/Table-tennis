import * as THREE from 'three';

/**
 * Creates the Player Hand + Paddle model.
 * Requirements:
 * - Hand must visibly contain FIVE distinct fingers (Thumb, Index, Middle, Ring, Pinky).
 * - All five fingers wrap naturally around the handle.
 * - Thumb positioned naturally opposite the other fingers.
 * - Only a short portion of wrist/mid-forearm visible (terminated smoothly, no elbow, no shoulder, no body).
 * - Stylized animated-film proportions: soft skin material, rounded knuckle joints, warm friendly cartoon shading.
 * - Hand + Paddle move together as one rigid unit.
 */
export function createPlayerHandAndPaddle() {
  const root = new THREE.Group();
  root.name = 'PlayerPaddleAndHand';

  // Materials
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0xffcb9d, // Soft stylized animated movie skin tone
    roughness: 0.62,
    metalness: 0.04,
  });

  const paddleRubberRed = new THREE.MeshStandardMaterial({
    color: 0xdd2c38, // Rich tournament red rubber
    roughness: 0.38,
    metalness: 0.05,
  });

  const paddleRubberBlack = new THREE.MeshStandardMaterial({
    color: 0x242426, // Backside rubber
    roughness: 0.42,
    metalness: 0.05,
  });

  const woodRimMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4a373, // Plywood blade rim
    roughness: 0.7,
  });

  const handleWoodMaterial = new THREE.MeshStandardMaterial({
    color: 0xc68b59, // Ergonomic flare wooden handle
    roughness: 0.6,
  });

  const gripTapeMaterial = new THREE.MeshStandardMaterial({
    color: 0x334155, // Subtle bottom grip ring
    roughness: 0.8,
  });

  // --- 1. PADDLE BLADE ---
  // Blade face (oval/rounded table tennis racket shape)
  // Dimensions in scene units: width ~ 0.30, height ~ 0.33, thickness ~ 0.02
  const bladeGroup = new THREE.Group();

  const bladeCoreGeo = new THREE.CylinderGeometry(0.145, 0.145, 0.016, 32);
  bladeCoreGeo.scale(1.0, 1.0, 1.15); // Slight oblong shape
  const bladeCoreMesh = new THREE.Mesh(bladeCoreGeo, woodRimMaterial);
  bladeCoreMesh.rotation.x = Math.PI / 2;
  bladeCoreMesh.castShadow = true;
  bladeCoreMesh.receiveShadow = true;
  bladeGroup.add(bladeCoreMesh);

  // Front rubber (Facing opponent/ball: +Z)
  const frontRubberGeo = new THREE.CylinderGeometry(0.142, 0.142, 0.004, 32);
  frontRubberGeo.scale(1.0, 1.0, 1.15);
  const frontRubberMesh = new THREE.Mesh(frontRubberGeo, paddleRubberRed);
  frontRubberMesh.rotation.x = Math.PI / 2;
  frontRubberMesh.position.z = -0.009; // Face ball traveling from -Z
  frontRubberMesh.castShadow = true;
  bladeGroup.add(frontRubberMesh);

  // Back rubber (-Z or +Z depending on perspective)
  const backRubberGeo = new THREE.CylinderGeometry(0.142, 0.142, 0.004, 32);
  backRubberGeo.scale(1.0, 1.0, 1.15);
  const backRubberMesh = new THREE.Mesh(backRubberGeo, paddleRubberBlack);
  backRubberMesh.rotation.x = Math.PI / 2;
  backRubberMesh.position.z = 0.009;
  backRubberMesh.castShadow = true;
  bladeGroup.add(backRubberMesh);

  // Blade sits on top of handle: blade center at y = 0.18
  bladeGroup.position.set(0, 0.18, 0);
  root.add(bladeGroup);

  // --- 2. HANDLE ---
  // Flare ergonomic handle extending down from y = 0.05 to y = -0.16
  const handleGeo = new THREE.BoxGeometry(0.046, 0.22, 0.038);
  const handleMesh = new THREE.Mesh(handleGeo, handleWoodMaterial);
  handleMesh.position.set(0, -0.01, 0);
  handleMesh.castShadow = true;
  handleMesh.receiveShadow = true;
  root.add(handleMesh);

  // Bottom handle flare cap
  const handleCapGeo = new THREE.BoxGeometry(0.052, 0.024, 0.044);
  const handleCap = new THREE.Mesh(handleCapGeo, gripTapeMaterial);
  handleCap.position.set(0, -0.115, 0);
  handleCap.castShadow = true;
  root.add(handleCap);

  // --- 3. STYLIZED HAND WITH 5 DISTINCT FINGERS ---
  const handGroup = new THREE.Group();
  handGroup.name = 'StylizedHand';

  // Short Forearm (smoothly tapering, terminating mid-forearm)
  // Angled toward the camera/bottom right naturally
  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.06, -0.05, 0.06), // wrist
    new THREE.Vector3(0.12, -0.16, 0.14), // upper wrist / lower forearm
    new THREE.Vector3(0.20, -0.32, 0.26), // mid forearm termination
  ]);
  const forearmGeo = new THREE.TubeGeometry(armCurve, 16, 0.045, 16, false);
  const forearmMesh = new THREE.Mesh(forearmGeo, skinMaterial);
  forearmMesh.castShadow = true;
  forearmMesh.receiveShadow = true;
  handGroup.add(forearmMesh);

  // End cap on mid-forearm to give clean animated styling (like a sporty cuff or clean hemisphere)
  const armCapGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.02, 16);
  const cuffMaterial = new THREE.MeshStandardMaterial({
    color: 0x3b82f6, // Vibrant sporty blue wristband/cuff trim
    roughness: 0.6,
  });
  const armCapMesh = new THREE.Mesh(armCapGeo, cuffMaterial);
  armCapMesh.position.set(0.19, -0.30, 0.25);
  armCapMesh.rotation.set(0.4, 0.2, -0.5);
  armCapMesh.castShadow = true;
  handGroup.add(armCapMesh);

  // Palm Mesh (soft rounded box at the back of the handle)
  const palmGeo = new THREE.BoxGeometry(0.075, 0.088, 0.048);
  const palmMesh = new THREE.Mesh(palmGeo, skinMaterial);
  palmMesh.position.set(0.035, -0.04, 0.036);
  palmMesh.rotation.set(-0.08, 0.15, -0.12);
  palmMesh.castShadow = true;
  palmMesh.receiveShadow = true;
  handGroup.add(palmMesh);

  // Helper function to build a multi-jointed curved finger
  function createCurvedFinger(segments, radius = 0.013) {
    const fingerGroup = new THREE.Group();
    for (let i = 0; i < segments.length - 1; i++) {
      const p1 = segments[i];
      const p2 = segments[i + 1];
      const dir = new THREE.Vector3().subVectors(p2, p1);
      const len = dir.length();

      // Knuckle joint sphere
      const jointGeo = new THREE.SphereGeometry(radius * 1.05, 12, 12);
      const joint = new THREE.Mesh(jointGeo, skinMaterial);
      joint.position.copy(p1);
      joint.castShadow = true;
      fingerGroup.add(joint);

      // Phalanx bone cylinder
      const boneGeo = new THREE.CylinderGeometry(radius * 0.9, radius, len, 12);
      const bone = new THREE.Mesh(boneGeo, skinMaterial);
      bone.position.copy(p1).add(dir.clone().multiplyScalar(0.5));
      bone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      bone.castShadow = true;
      fingerGroup.add(bone);

      if (i === segments.length - 2) {
        // Finger tip rounded dome
        const tipGeo = new THREE.SphereGeometry(radius * 0.95, 12, 12);
        const tip = new THREE.Mesh(tipGeo, skinMaterial);
        tip.position.copy(p2);
        tip.castShadow = true;
        fingerGroup.add(tip);
      }
    }
    return fingerGroup;
  }

  // 1. INDEX FINGER (Top finger wrapping around upper handle & blade base)
  const indexPoints = [
    new THREE.Vector3(0.03, 0.02, 0.03),     // Base knuckle
    new THREE.Vector3(0.032, 0.025, -0.01),   // wraps over side
    new THREE.Vector3(0.015, 0.02, -0.03),    // across front
    new THREE.Vector3(-0.018, 0.015, -0.026), // fingertip curling back
  ];
  handGroup.add(createCurvedFinger(indexPoints, 0.0135));

  // 2. MIDDLE FINGER (Main grip across upper middle of handle)
  const middlePoints = [
    new THREE.Vector3(0.032, -0.015, 0.032),  // Base
    new THREE.Vector3(0.033, -0.015, -0.01),  // Side wrap
    new THREE.Vector3(0.012, -0.016, -0.032), // Front wrap
    new THREE.Vector3(-0.02, -0.018, -0.025), // Tip curling inward
  ];
  handGroup.add(createCurvedFinger(middlePoints, 0.0138));

  // 3. RING FINGER (Mid-lower grip)
  const ringPoints = [
    new THREE.Vector3(0.03, -0.048, 0.03),
    new THREE.Vector3(0.031, -0.049, -0.01),
    new THREE.Vector3(0.01, -0.05, -0.03),
    new THREE.Vector3(-0.018, -0.052, -0.022),
  ];
  handGroup.add(createCurvedFinger(ringPoints, 0.0132));

  // 4. PINKY FINGER (Lowest finger, wrapping near handle bottom flare)
  const pinkyPoints = [
    new THREE.Vector3(0.028, -0.082, 0.028),
    new THREE.Vector3(0.029, -0.084, -0.008),
    new THREE.Vector3(0.008, -0.085, -0.028),
    new THREE.Vector3(-0.016, -0.087, -0.02),
  ];
  handGroup.add(createCurvedFinger(pinkyPoints, 0.012));

  // 5. THUMB (Opposite side, pressing firmly against the paddle face / handle joint)
  const thumbPoints = [
    new THREE.Vector3(0.015, -0.04, 0.038),   // Base of thumb at palm side
    new THREE.Vector3(-0.005, -0.02, 0.04),   // First joint angling upward
    new THREE.Vector3(-0.024, 0.005, 0.032),  // Opposite side knuckle
    new THREE.Vector3(-0.028, 0.022, 0.015),  // Thumb tip resting securely on front neck
  ];
  handGroup.add(createCurvedFinger(thumbPoints, 0.0155));

  root.add(handGroup);

  // Scale entire assembly slightly to fit the table scale perfectly
  root.scale.set(1.2, 1.2, 1.2);

  return root;
}

/**
 * Creates the Computer Paddle (NO hand, distinctly styled as requested).
 */
export function createComputerPaddle() {
  const root = new THREE.Group();
  root.name = 'ComputerPaddleOnly';

  // Distinct color palette for CPU: striking electric cyan/cobalt rubber with dark ash handle
  const cpuRubberBlue = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Vibrant athletic sky/cyan blue
    roughness: 0.36,
    metalness: 0.05,
  });

  const cpuRubberBlack = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.42,
  });

  const woodRimMaterial = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.6,
  });

  const handleMaterial = new THREE.MeshStandardMaterial({
    color: 0x334155, // High-tech matte dark graphite handle
    roughness: 0.5,
  });

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.3,
  });

  // Blade core
  const bladeCoreGeo = new THREE.CylinderGeometry(0.145, 0.145, 0.016, 32);
  bladeCoreGeo.scale(1.0, 1.0, 1.15);
  const bladeCoreMesh = new THREE.Mesh(bladeCoreGeo, woodRimMaterial);
  bladeCoreMesh.rotation.x = Math.PI / 2;
  bladeCoreMesh.castShadow = true;
  root.add(bladeCoreMesh);

  // Front rubber (facing player: +Z)
  const frontRubberGeo = new THREE.CylinderGeometry(0.142, 0.142, 0.004, 32);
  frontRubberGeo.scale(1.0, 1.0, 1.15);
  const frontRubberMesh = new THREE.Mesh(frontRubberGeo, cpuRubberBlue);
  frontRubberMesh.rotation.x = Math.PI / 2;
  frontRubberMesh.position.z = 0.009;
  frontRubberMesh.castShadow = true;
  root.add(frontRubberMesh);

  // Back rubber
  const backRubberGeo = new THREE.CylinderGeometry(0.142, 0.142, 0.004, 32);
  backRubberGeo.scale(1.0, 1.0, 1.15);
  const backRubberMesh = new THREE.Mesh(backRubberGeo, cpuRubberBlack);
  backRubberMesh.rotation.x = Math.PI / 2;
  backRubberMesh.position.z = -0.009;
  backRubberMesh.castShadow = true;
  root.add(backRubberMesh);

  // Handle
  const handleGeo = new THREE.BoxGeometry(0.046, 0.22, 0.038);
  const handleMesh = new THREE.Mesh(handleGeo, handleMaterial);
  handleMesh.position.set(0, -0.19, 0);
  handleMesh.castShadow = true;
  root.add(handleMesh);

  const handleStripeGeo = new THREE.BoxGeometry(0.048, 0.02, 0.04);
  const handleStripe = new THREE.Mesh(handleStripeGeo, accentMaterial);
  handleStripe.position.set(0, -0.19, 0);
  root.add(handleStripe);

  root.position.set(0, 0, 0);
  root.scale.set(1.2, 1.2, 1.2);

  return root;
}
