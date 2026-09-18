import * as THREE from 'three';

/**
 * Creates the competition Table Tennis Table:
 * Standard tournament proportions (scaled to scene units):
 * - Length: 2.74 m (scene: 2.74)
 * - Width: 1.525 m (scene: 1.525)
 * - Height: 0.76 m (scene: 0.76)
 * - Net Height: 0.1525 m (scene: 0.15)
 * Distinct sophisticated dark teal/marine blue sports surface, clean painted white border & center lines,
 * realistic beveled edge, crossbeams, sturdy metal legs, and woven net with side posts.
 */
export function createTableTennisTable() {
  const tableGroup = new THREE.Group();
  tableGroup.name = 'TableTennisTable';

  const tableLength = 2.74;
  const tableWidth = 1.525;
  const tableThickness = 0.05;
  const tableHeight = 0.76;

  // Materials
  // Sophisticated deep matte navy/teal sports tabletop
  const tableTopMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f4c5c, // Deep tournament marine teal/blue
    roughness: 0.45,
    metalness: 0.08,
  });

  const tableEdgeMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a323d,
    roughness: 0.5,
  });

  const whiteLineMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });

  const metalLegsMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Dark anthracite steel legs
    roughness: 0.35,
    metalness: 0.8,
  });

  const footPadsMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.8,
  });

  // 1. Tabletop slab (two halves with center separation)
  const halfLength = tableLength / 2 - 0.005; // tiny gap at net
  
  // Near half (Player side: Z > 0)
  const nearHalfGeo = new THREE.BoxGeometry(tableWidth, tableThickness, halfLength);
  const nearHalf = new THREE.Mesh(nearHalfGeo, tableTopMaterial);
  nearHalf.position.set(0, tableHeight, halfLength / 2 + 0.0025);
  nearHalf.castShadow = true;
  nearHalf.receiveShadow = true;
  tableGroup.add(nearHalf);

  // Far half (Computer side: Z < 0)
  const farHalfGeo = new THREE.BoxGeometry(tableWidth, tableThickness, halfLength);
  const farHalf = new THREE.Mesh(farHalfGeo, tableTopMaterial);
  farHalf.position.set(0, tableHeight, -(halfLength / 2 + 0.0025));
  farHalf.castShadow = true;
  farHalf.receiveShadow = true;
  tableGroup.add(farHalf);

  // 2. White Tournament Markings (Lines)
  const lineWidth = 0.02;
  const lineElevation = tableHeight + tableThickness / 2 + 0.0005;

  // Outer border lines:
  // Left border line
  const leftLineGeo = new THREE.PlaneGeometry(lineWidth, tableLength);
  const leftLine = new THREE.Mesh(leftLineGeo, whiteLineMaterial);
  leftLine.rotation.x = -Math.PI / 2;
  leftLine.position.set(-tableWidth / 2 + lineWidth / 2, lineElevation, 0);
  tableGroup.add(leftLine);

  // Right border line
  const rightLineGeo = new THREE.PlaneGeometry(lineWidth, tableLength);
  const rightLine = new THREE.Mesh(rightLineGeo, whiteLineMaterial);
  rightLine.rotation.x = -Math.PI / 2;
  rightLine.position.set(tableWidth / 2 - lineWidth / 2, lineElevation, 0);
  tableGroup.add(rightLine);

  // Player baseline
  const playerBaseLineGeo = new THREE.PlaneGeometry(tableWidth, lineWidth);
  const playerBaseLine = new THREE.Mesh(playerBaseLineGeo, whiteLineMaterial);
  playerBaseLine.rotation.x = -Math.PI / 2;
  playerBaseLine.position.set(0, lineElevation, tableLength / 2 - lineWidth / 2);
  tableGroup.add(playerBaseLine);

  // Opponent baseline
  const cpuBaseLineGeo = new THREE.PlaneGeometry(tableWidth, lineWidth);
  const cpuBaseLine = new THREE.Mesh(cpuBaseLineGeo, whiteLineMaterial);
  cpuBaseLine.rotation.x = -Math.PI / 2;
  cpuBaseLine.position.set(0, lineElevation, -tableLength / 2 + lineWidth / 2);
  tableGroup.add(cpuBaseLine);

  // Center line (dividing service courts)
  const centerLineGeo = new THREE.PlaneGeometry(0.008, tableLength);
  const centerLine = new THREE.Mesh(centerLineGeo, whiteLineMaterial);
  centerLine.rotation.x = -Math.PI / 2;
  centerLine.position.set(0, lineElevation, 0);
  tableGroup.add(centerLine);

  // 3. NET & POSTS
  const netOverhang = 0.15; // Net extends 15cm beyond table on both sides
  const netWidth = tableWidth + netOverhang * 2;
  const netHeight = 0.1525;
  const netY = tableHeight + tableThickness / 2 + netHeight / 2;

  // Procedural woven net texture
  const netCanvas = document.createElement('canvas');
  netCanvas.width = 64;
  netCanvas.height = 64;
  const ctx = netCanvas.getContext('2d');
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 64; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 64);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(64, i);
    ctx.stroke();
  }
  const netTexture = new THREE.CanvasTexture(netCanvas);
  netTexture.wrapS = THREE.RepeatWrapping;
  netTexture.wrapT = THREE.RepeatWrapping;
  netTexture.repeat.set(24, 3);

  const netMaterial = new THREE.MeshStandardMaterial({
    map: netTexture,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
    roughness: 0.8,
  });

  const netGeo = new THREE.PlaneGeometry(netWidth, netHeight);
  const netMesh = new THREE.Mesh(netGeo, netMaterial);
  netMesh.position.set(0, netY, 0);
  netMesh.castShadow = true;
  tableGroup.add(netMesh);

  // White tape across top of net
  const netTapeGeo = new THREE.BoxGeometry(netWidth, 0.015, 0.01);
  const netTapeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const netTape = new THREE.Mesh(netTapeGeo, netTapeMat);
  netTape.position.set(0, tableHeight + tableThickness / 2 + netHeight, 0);
  netTape.castShadow = true;
  tableGroup.add(netTape);

  // Net posts
  const postGeo = new THREE.CylinderGeometry(0.016, 0.016, netHeight + 0.05, 16);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
  
  const leftPost = new THREE.Mesh(postGeo, postMat);
  leftPost.position.set(-netWidth / 2, tableHeight + tableThickness / 2 + netHeight / 2, 0);
  leftPost.castShadow = true;
  tableGroup.add(leftPost);

  const rightPost = new THREE.Mesh(postGeo, postMat);
  rightPost.position.set(netWidth / 2, tableHeight + tableThickness / 2 + netHeight / 2, 0);
  rightPost.castShadow = true;
  tableGroup.add(rightPost);

  // 4. UNDERCARRIAGE, APRON & LEGS
  // Sturdy apron rim underneath
  const apronMaterial = new THREE.MeshStandardMaterial({ color: 0x092b34, roughness: 0.6 });
  const apronLongGeo = new THREE.BoxGeometry(0.03, 0.06, tableLength - 0.1);
  const leftApron = new THREE.Mesh(apronLongGeo, apronMaterial);
  leftApron.position.set(-tableWidth / 2 + 0.04, tableHeight - tableThickness / 2 - 0.03, 0);
  tableGroup.add(leftApron);

  const rightApron = new THREE.Mesh(apronLongGeo, apronMaterial);
  rightApron.position.set(tableWidth / 2 - 0.04, tableHeight - tableThickness / 2 - 0.03, 0);
  tableGroup.add(rightApron);

  // Steel legs (4 outer legs + 2 center truss legs)
  const legPositions = [
    [-tableWidth / 2 + 0.12, tableLength / 2 - 0.25],
    [tableWidth / 2 - 0.12, tableLength / 2 - 0.25],
    [-tableWidth / 2 + 0.12, -tableLength / 2 + 0.25],
    [tableWidth / 2 - 0.12, -tableLength / 2 + 0.25],
    [-tableWidth / 2 + 0.15, 0],
    [tableWidth / 2 - 0.15, 0],
  ];

  const legGeo = new THREE.BoxGeometry(0.045, tableHeight - tableThickness / 2, 0.045);
  const padGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.02, 16);

  legPositions.forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, metalLegsMaterial);
    leg.position.set(x, (tableHeight - tableThickness / 2) / 2, z);
    leg.castShadow = true;
    tableGroup.add(leg);

    const pad = new THREE.Mesh(padGeo, footPadsMaterial);
    pad.position.set(x, 0.01, z);
    tableGroup.add(pad);
  });

  // Cross brace support rods
  const braceMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
  const frontBraceGeo = new THREE.CylinderGeometry(0.015, 0.015, tableWidth - 0.24, 12);
  const frontBrace = new THREE.Mesh(frontBraceGeo, braceMat);
  frontBrace.rotation.z = Math.PI / 2;
  frontBrace.position.set(0, 0.2, tableLength / 2 - 0.25);
  tableGroup.add(frontBrace);

  const backBrace = new THREE.Mesh(frontBraceGeo, braceMat);
  backBrace.rotation.z = Math.PI / 2;
  backBrace.position.set(0, 0.2, -tableLength / 2 + 0.25);
  tableGroup.add(backBrace);

  return {
    mesh: tableGroup,
    dimensions: {
      width: tableWidth,
      length: tableLength,
      height: tableHeight,
      surfaceY: tableHeight + tableThickness / 2,
      netHeight: netHeight,
    }
  };
}
