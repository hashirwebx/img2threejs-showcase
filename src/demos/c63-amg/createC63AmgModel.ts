import * as THREE from 'three';

/**
 * 2009 Mercedes-Benz C63 AMG (W204, "Special Edition") — rebuilt from a set of the
 * owner's own phone photos rather than a single studio sheet: exterior 3/4 and rear
 * shots, plus close-ups of the AMG dash badge, gauge cluster, door card, memory-seat
 * buttons, shifter, sill plate and twin carbon-tipped exhaust.
 *
 * This is a hand-authored, code-only reconstruction in the img2threejs house style
 * (named parts, a runtime hierarchy, canvas-baked badge/gauge/sill textures standing
 * in for details primitives can't render) — not an automated img2threejs generation
 * run. No side-profile or straight-on front/rear reference was supplied, so exact
 * panel curvature is inferred from the 3/4 angles and W204 proportions, not measured.
 * A future automated pass with the real skill's screenshot-review loop, or the two
 * missing angles, would materially improve on this.
 *
 * Action-ready: exposes root.userData.sculptRuntime with named nodes, sockets and
 * openable panels (hood / trunk / both doors) via toggle(name).
 */

export interface C63AmgOptions {
  /** overall scale multiplier (default 1) */
  scale?: number;
  /** enable cast/receive shadows (default true) */
  shadows?: boolean;
  /** body paint colour override (default the reference car's silver) */
  paint?: number;
}

// ---------------------------------------------------------------------------
// palette (sampled from the reference photos)
// ---------------------------------------------------------------------------
const PAINT_SILVER = 0xc9ccd1;
const GLASS = 0x0c1014;
const CHROME = 0xdfe3e6;
const BLACK_TRIM = 0x0c0d0f;
const TIRE = 0x0a0a0a;
const RIM = 0x9aa0a6;
const CARBON = 0x141414;
const TAIL_RED = 0x8f0d1a;
const AMBER = '#e8963c'; // AMG instrument-cluster amber, reused for baked-texture accents

function canvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGaugeTexture(): THREE.CanvasTexture {
  return canvasTexture(1024, 384, (ctx, w, h) => {
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, w, h);
    const dial = (cx: number, r: number, label: string) => {
      ctx.strokeStyle = '#e8e8ea';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, h / 2, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = AMBER;
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(label, cx, h / 2 + r * 0.55);
    };
    dial(200, 150, 'km/h');
    dial(w - 200, 150, 'AMG');
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 170, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#c9cdd2';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('P R N D', w / 2, h / 2 + 40);
    ctx.font = 'bold 30px Arial';
    ctx.fillStyle = '#e2e4e7';
    ctx.fillText('AMG', w / 2, h - 30);
  });
}

function makeSillTexture(): THREE.CanvasTexture {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = '#cfd3d8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.font = 'italic bold 90px Georgia';
    ctx.fillText('AMG', w / 2, 110);
    ctx.font = '22px Arial';
    ctx.fillText('AFFALTERBACH \u00b7 GERMANY', w / 2, 155);
    ctx.font = 'italic 34px Georgia';
    ctx.fillText('Special Edition', w / 2, 210);
  });
}

function makeAmgBadgeTexture(): THREE.CanvasTexture {
  return canvasTexture(512, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#2b2b2e';
    ctx.textAlign = 'center';
    ctx.font = 'italic bold 70px Arial';
    ctx.fillText('AMG', w / 2, h / 2 + 25);
  });
}

function makeMemoryButtonsTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = AMBER;
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ['3', '2', '1', 'M'].forEach((t, i) => ctx.fillText(t, (w * (i + 0.5)) / 4, h / 2 + 10));
  });
}

function makeStarTexture(): THREE.CanvasTexture {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#c9ccd1';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    ctx.translate(w / 2, h / 2);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -w * 0.4);
      ctx.stroke();
      ctx.rotate((Math.PI * 2) / 3);
    }
  });
}

function makeWoodTexture(): THREE.CanvasTexture {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#6b4a30';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      const r = 40 + Math.random() * 40;
      const g = 20 + Math.random() * 20;
      const b = 10 + Math.random() * 10;
      ctx.strokeStyle = `rgba(${r},${g},${b},0.35)`;
      ctx.lineWidth = 1 + Math.random() * 2;
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + 30, y + 10, x - 20, y + 40, x + 10, y + 60);
      ctx.stroke();
    }
  });
}

export function createC63AmgModel(options: C63AmgOptions = {}): THREE.Group {
  const { scale = 1, shadows = true, paint = PAINT_SILVER } = options;

  const bodyMat = new THREE.MeshStandardMaterial({ color: paint, metalness: 0.75, roughness: 0.28 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: GLASS,
    metalness: 0.2,
    roughness: 0.05,
    transparent: true,
    opacity: 0.85,
  });
  const chromeMat = new THREE.MeshStandardMaterial({ color: CHROME, metalness: 1, roughness: 0.12 });
  const blackMat = new THREE.MeshStandardMaterial({ color: BLACK_TRIM, metalness: 0.4, roughness: 0.5 });
  const tireMat = new THREE.MeshStandardMaterial({ color: TIRE, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: RIM, metalness: 0.9, roughness: 0.25 });
  const carbonMat = new THREE.MeshStandardMaterial({ color: CARBON, metalness: 0.6, roughness: 0.35 });
  const tailMat = new THREE.MeshStandardMaterial({
    color: TAIL_RED,
    emissive: 0x4a0209,
    emissiveIntensity: 0.6,
    metalness: 0.3,
    roughness: 0.4,
  });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xbfc7d0, emissiveIntensity: 0.3, roughness: 0.2 });
  const woodMat = new THREE.MeshStandardMaterial({ map: makeWoodTexture(), roughness: 0.4, metalness: 0.15 });
  const badgeMat = new THREE.MeshStandardMaterial({ map: makeAmgBadgeTexture(), transparent: true, roughness: 0.5 });

  const root = new THREE.Group();
  root.name = 'c63-amg';
  const nodes: Record<string, THREE.Object3D> = {};
  const panels: Record<string, THREE.Group> = {};

  const setShadow = (o: THREE.Mesh) => {
    if (!shadows) return;
    o.castShadow = true;
    o.receiveShadow = true;
  };

  // ---- body shell: side-profile extrusion, W204 proportions ----
  const profile = new THREE.Shape();
  profile.moveTo(-2.05, 0.28);
  profile.lineTo(-2.02, 0.42);
  profile.quadraticCurveTo(-1.95, 0.55, -1.75, 0.58);
  profile.lineTo(-1.15, 0.6);
  profile.quadraticCurveTo(-0.85, 0.98, -0.35, 1.02);
  profile.lineTo(0.55, 1.03);
  profile.quadraticCurveTo(0.95, 1.0, 1.05, 0.72);
  profile.lineTo(1.85, 0.62);
  profile.quadraticCurveTo(2.05, 0.58, 2.08, 0.42);
  profile.lineTo(2.1, 0.22);
  profile.lineTo(2.1, 0.12);
  profile.lineTo(1.95, 0.12);
  profile.lineTo(1.9, 0.28);
  profile.lineTo(-1.9, 0.28);
  profile.lineTo(-1.95, 0.12);
  profile.lineTo(-2.1, 0.12);
  profile.lineTo(-2.1, 0.22);
  profile.closePath();
  const bodyGeo = new THREE.ExtrudeGeometry(profile, { depth: 1.62, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 });
  bodyGeo.translate(0, 0, -0.81);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  setShadow(bodyMesh);
  root.add(bodyMesh);
  nodes.body = bodyMesh;

  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.42, 1.5), glassMat);
  glass.position.set(-0.1, 0.85, 0);
  root.add(glass);
  nodes.glass = glass;

  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.62), blackMat);
  grille.position.set(2.12, 0.5, 0);
  root.add(grille);
  const grilleBar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.62), chromeMat);
  grilleBar.position.set(2.155, 0.5, 0);
  root.add(grilleBar);
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), chromeMat);
  badge.position.set(2.16, 0.5, 0);
  badge.rotation.y = Math.PI / 2;
  root.add(badge);

  [-0.28, 0.28].forEach((z) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.24), headMat);
    hl.position.set(2.08, 0.52, z);
    root.add(hl);
  });
  [-0.55, 0.55].forEach((z) => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.32), tailMat);
    tl.position.set(-2.09, 0.55, z);
    root.add(tl);
  });
  [-0.85, 0.85].forEach((z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.16), bodyMat);
    m.position.set(0.55, 0.92, z * 0.98);
    root.add(m);
  });
  [-0.35, 0.35].forEach((z) => {
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.14, 16), chromeMat);
    tip.rotation.z = Math.PI / 2;
    tip.position.set(-2.12, 0.2, z);
    root.add(tip);
    const surround = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.095, 0.03, 16), carbonMat);
    surround.rotation.z = Math.PI / 2;
    surround.position.set(-2.16, 0.2, z);
    root.add(surround);
  });

  // ---- openable panels ----
  function makePanel(w: number, h: number, d: number, pos: THREE.Vector3, hingeX: number, name: string): THREE.Group {
    const grp = new THREE.Group();
    grp.position.set(pos.x - hingeX, pos.y, pos.z);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
    mesh.position.set(hingeX, 0, 0);
    setShadow(mesh);
    grp.add(mesh);
    grp.name = name;
    grp.userData.open = false;
    root.add(grp);
    panels[name] = grp;
    nodes[name] = grp;
    return grp;
  }
  makePanel(1.05, 0.08, 1.55, new THREE.Vector3(1.55, 0.56, 0), -0.5, 'hood');
  makePanel(0.85, 0.08, 1.5, new THREE.Vector3(-1.55, 0.6, 0), 0.4, 'trunk');
  makePanel(1.1, 0.55, 0.06, new THREE.Vector3(0.05, 0.55, 0.79), -0.5, 'door_L');
  makePanel(1.1, 0.55, 0.06, new THREE.Vector3(0.05, 0.55, -0.79), -0.5, 'door_R');

  const openAngles: Record<string, number> = { hood: -1.15, trunk: 0.9, door_L: 1.3, door_R: 1.3 };
  function toggle(name: string): void {
    const grp = panels[name];
    if (!grp) return;
    grp.userData.open = !grp.userData.open;
    const target = grp.userData.open ? openAngles[name] : 0;
    grp.userData.animTarget = target;
  }

  // ---- wheels ----
  const wheelPositions: Array<{ x: number; z: number; name: string }> = [
    { x: 1.35, z: 0.85, name: 'wheel_FR' },
    { x: 1.35, z: -0.85, name: 'wheel_FL' },
    { x: -1.35, z: 0.85, name: 'wheel_RR' },
    { x: -1.35, z: -0.85, name: 'wheel_RL' },
  ];
  wheelPositions.forEach((wp) => {
    const wheel = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 24), tireMat);
    tire.rotation.x = Math.PI / 2;
    setShadow(tire);
    wheel.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.25, 20), rimMat);
    rim.rotation.x = Math.PI / 2;
    wheel.add(rim);
    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.26), rimMat);
      spoke.rotation.x = Math.PI / 2;
      spoke.rotation.z = (i / 5) * Math.PI * 2;
      wheel.add(spoke);
    }
    wheel.position.set(wp.x, 0.34, wp.z);
    wheel.name = wp.name;
    root.add(wheel);
    nodes[wp.name] = wheel;
  });

  // ---- interior ----
  const interior = new THREE.Group();
  interior.name = 'interior';
  root.add(interior);
  nodes.interior = interior;

  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 1.5), blackMat);
  dash.position.set(0.55, 0.78, 0);
  interior.add(dash);

  const gaugeMat = new THREE.MeshStandardMaterial({ map: makeGaugeTexture(), roughness: 0.3 });
  const gauge = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.24), gaugeMat);
  gauge.position.set(1.02, 0.92, 0.22);
  gauge.rotation.y = -0.35;
  interior.add(gauge);

  const wheelGrp = new THREE.Group();
  wheelGrp.add(new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.028, 12, 32), blackMat));
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.02), blackMat);
    const a = (i / 3) * Math.PI * 2;
    spoke.rotation.z = a;
    spoke.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0);
    wheelGrp.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 24), blackMat);
  hub.rotation.x = Math.PI / 2;
  wheelGrp.add(hub);
  const badgeDisc = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24), badgeMat);
  badgeDisc.position.z = 0.011;
  wheelGrp.add(badgeDisc);
  wheelGrp.position.set(0.95, 0.78, 0.22);
  wheelGrp.rotation.y = -0.35;
  wheelGrp.rotation.z = 0.05;
  interior.add(wheelGrp);
  nodes.steeringWheel = wheelGrp;

  const consoleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.5, 0.35), blackMat);
  consoleMesh.position.set(0.15, 0.42, 0);
  interior.add(consoleMesh);
  const shifterStem = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.16, 16), rimMat);
  shifterStem.position.set(0.18, 0.66, 0);
  interior.add(shifterStem);
  const shifterKnob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 20), rimMat);
  shifterKnob.position.set(0.18, 0.75, 0);
  interior.add(shifterKnob);
  const starMat = new THREE.MeshStandardMaterial({ map: makeStarTexture() });
  const starCap = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), starMat);
  starCap.position.set(0.18, 0.795, 0);
  starCap.rotation.x = -Math.PI / 2;
  interior.add(starCap);

  const seatPositions: Array<[number, number]> = [
    [-0.35, 0.55],
    [-0.35, -0.55],
  ];
  seatPositions.forEach(([x, z]) => {
    const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), blackMat);
    seatBase.position.set(x, 0.28, z);
    interior.add(seatBase);
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.65, 0.12), blackMat);
    seatBack.position.set(x - 0.2, 0.62, z);
    interior.add(seatBack);
    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.14), blackMat);
    headrest.position.set(x - 0.2, 1.0, z);
    interior.add(headrest);
    const hBadge = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.07), badgeMat);
    hBadge.position.set(x - 0.261, 1.02, z);
    hBadge.rotation.y = Math.PI / 2;
    interior.add(hBadge);
  });

  const memTexMat = new THREE.MeshStandardMaterial({ map: makeMemoryButtonsTexture() });
  [0.79, -0.79].forEach((z) => {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.02), woodMat);
    trim.position.set(0.15, 0.7, z * 0.94);
    interior.add(trim);
    const memPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.05), memTexMat);
    memPanel.position.set(0.15, 0.62, z * 0.945);
    memPanel.rotation.y = z > 0 ? -0.05 : Math.PI + 0.05;
    interior.add(memPanel);
  });

  const sillMat = new THREE.MeshStandardMaterial({ map: makeSillTexture(), metalness: 0.6, roughness: 0.35 });
  [0.78, -0.78].forEach((z) => {
    const sill = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.08), sillMat);
    sill.rotation.x = -Math.PI / 2;
    sill.position.set(0.1, 0.285, z * 0.9);
    interior.add(sill);
  });

  interior.visible = false;

  root.scale.setScalar(scale);

  const tick = (dt: number): void => {
    Object.values(panels).forEach((grp) => {
      const target = grp.userData.animTarget as number | undefined;
      if (target === undefined) return;
      grp.rotation.y += (target - grp.rotation.y) * Math.min(1, dt * 6);
    });
  };
  root.userData.tick = tick;

  root.userData.sculptRuntime = {
    nodes,
    sockets: { interior },
    materials: { bodyMat, glassMat, chromeMat, blackMat, tireMat, rimMat },
    destructionGroups: ['hood', 'trunk', 'door_L', 'door_R'],
    toggle,
  };

  return root;
}

// ---------------------------------------------------------------------------
// look-dev lighting rig — garage-studio, echoing the driveway/carport reference shots
// ---------------------------------------------------------------------------
export function createC63AmgLookDevLights(): THREE.Group {
  const lights = new THREE.Group();
  lights.name = 'lookdev-lights';

  const hemi = new THREE.HemisphereLight(0x9aa4b2, 0x141210, 0.55);
  lights.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(6, 9, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const kc = key.shadow.camera as THREE.OrthographicCamera;
  kc.left = -8;
  kc.right = 8;
  kc.top = 8;
  kc.bottom = -8;
  lights.add(key);

  const rim = new THREE.DirectionalLight(0xc8102e, 0.25);
  rim.position.set(-6, 3, -6);
  lights.add(rim);

  const fill = new THREE.PointLight(0xe8963c, 0.4, 20);
  fill.position.set(-3, 2, 4);
  lights.add(fill);

  return lights;
}

/** Radial dark-garage background, nodding to the driveway/carport in the reference photos. */
export function makeC63AmgBackground(): THREE.CanvasTexture {
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.46, h * 0.1, w * 0.5, h * 0.5, h * 0.72);
    g.addColorStop(0, '#2a2c30');
    g.addColorStop(0.55, '#1c1e22');
    g.addColorStop(1, '#101114');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}
