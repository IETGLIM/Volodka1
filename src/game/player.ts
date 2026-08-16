/**
 * Володька — процедурный герой с физикой ускорения/торможения AAA-уровня.
 * Улучшено: инерция, рывок, анимации idles, скользящие повороты, хиты стоп.
 */
import * as THREE from 'three';
import { lerp, clamp, TAU } from './utils';
import { deformGeometry, trunkGeo } from './organic';

export interface PlayerInput {
  x: number;
  z: number;
  run: boolean;
  jump: boolean;
  roll: boolean;
  attack: boolean;
}

function softBody(geo: THREE.BufferGeometry, amt: number) {
  return deformGeometry(geo, amt, 1.3, Math.random() * 200);
}
function softSphere(r: number, seg = 32) {
  return softBody(new THREE.SphereGeometry(r, seg, seg * 0.75), r * 0.06);
}
function softCapsule(r: number, h: number, seg = 24) {
  return softBody(new THREE.CapsuleGeometry(r, h, seg, seg + 6), r * 0.07);
}

const _hurtColor = new THREE.Color('#ff4a3a');

export class Player {
  group = new THREE.Group();
  pos = new THREE.Vector3();
  private vel = new THREE.Vector3(); // текущая скорость XZ + кнокбэк
  private targetVel = new THREE.Vector3(); // куда хотим идти
  private yaw = 0;
  private targetYaw = 0;
  private animT = 0;
  private speed = 0;
  private heightAt: (x: number, z: number) => number;

  private head: THREE.Group;
  private armL: THREE.Group;
  private armR: THREE.Group;
  private legL: THREE.Group;
  private legR: THREE.Group;
  private cloakGroup: THREE.Group;
  private staffGroup: THREE.Group;
  private gemSprite: THREE.Sprite;
  private crystal!: THREE.Mesh;
  private crystalMat!: THREE.MeshStandardMaterial;
  private hurtMats: THREE.MeshStandardMaterial[] = [];
  private _hurtWasOn = false;

  // физика
  private airY = 0;
  private vy = 0;
  private grounded = true;
  private rolling = false;
  private rollT = 0;
  private rollDur = 0.52;
  private rollDir = new THREE.Vector3(0, 0, 1);
  private landSquash = 0;
  private coyoteT = 0; // грация прыжка после края
  private jumpBuffer = 0;

  // бой
  hp = 120;
  maxHp = 120;
  private hurtT = 0;
  private attacking = false;
  private attackT = 0;
  private attackCombo = 0;
  private nextComboQueued = false;
  private attackHitSet = new Set<number>();
  private attackDur = [0.38, 0.42, 0.54];
  hitStop = 0;
  private blockStamina = 100;

  private moving = false;
  private idleT = 0;

  // плавность
  private accel = 28; // ускорение
  private decel = 34; // торможение
  private airControl = 0.55;
  private turnSpeed = 14;

  onJump: (() => void) | null = null;
  onLand: ((impact: number) => void) | null = null;
  onRoll: (() => void) | null = null;
  onSwing: ((combo: number) => void) | null = null;
  onHurt: (() => void) | null = null;
  onHit: (() => void) | null = null;

  applyWorldCollision(x: number, z: number, blocked: boolean) {
    this.pos.x = x; this.pos.z = z;
    this.pos.y = this.heightAt(x, z) + this.airY;
    this.group.position.x = x; this.group.position.z = z;
    this.group.position.y = this.pos.y + (this.rolling ? 0.12 : 0);
    if (blocked) {
      this.vel.x *= 0.18; this.vel.z *= 0.18;
      if (this.rolling) {
        this.rolling = false; this.rollT = 0; this.speed *= 0.22;
        const torso = (this as any)._torso as THREE.Group;
        if (torso) { torso.rotation.x = 0; torso.scale.set(1, 1, 1); }
      }
    }
  }

  constructor(heightAt: (x: number, z: number) => number) {
    this.heightAt = heightAt;
    const skin = new THREE.MeshStandardMaterial({ color: '#e4b48a', roughness: 0.78 });
    const cloak = new THREE.MeshStandardMaterial({ color: '#2a3a62', roughness: 0.7 });
    const cloakInner = new THREE.MeshStandardMaterial({ color: '#1c2749', roughness: 0.75 });
    const leather = new THREE.MeshStandardMaterial({ color: '#5a3e28', roughness: 0.85 });
    const boot = new THREE.MeshStandardMaterial({ color: '#3e2f20', roughness: 0.9 });
    const hair = new THREE.MeshStandardMaterial({ color: '#3a2a1a', roughness: 0.8 });
    this.hurtMats = [cloak, cloakInner, skin, leather, boot];
    const wood = new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 0.85 });
    const crystalMat = new THREE.MeshStandardMaterial({ color: '#9fe8ff', emissive: '#7fd8ff', emissiveIntensity: 2, roughness: 0.2 });
    const eyeWhite = new THREE.MeshStandardMaterial({ color: '#eef2f6', roughness: 0.4 });
    const eyeIris = new THREE.MeshStandardMaterial({ color: '#4a7ab5', roughness: 0.3 });
    const eyePupil = new THREE.MeshStandardMaterial({ color: '#0a0e18', roughness: 0.2 });
    const mouth = new THREE.MeshStandardMaterial({ color: '#c48a6e', roughness: 0.6 });
    const nose = new THREE.MeshStandardMaterial({ color: '#d4a478', roughness: 0.7 });
    const brow = new THREE.MeshStandardMaterial({ color: '#3a2a1a', roughness: 0.8 });
    const beltMat = new THREE.MeshStandardMaterial({ color: '#4a3520', roughness: 0.8 });
    const buckle = new THREE.MeshStandardMaterial({ color: '#c9b06a', metalness: 0.5, roughness: 0.35 });

    const torso = new THREE.Group(); this.group.add(torso);
    const chest = new THREE.Mesh(softCapsule(0.38, 0.35, 28), cloak); chest.position.y = 1.45; chest.castShadow = true; torso.add(chest);
    const belly = new THREE.Mesh(softSphere(0.34, 28), cloakInner); belly.scale.set(1, 1.1, 0.85); belly.position.y = 1.12; belly.castShadow = true; torso.add(belly);
    const backCloak = new THREE.Mesh(softBody(new THREE.SphereGeometry(0.42, 32, 24, 0, TAU, 0, Math.PI * 0.45), 0.03), cloakInner);
    backCloak.position.set(0, 1.35, -0.22); backCloak.rotation.x = 0.3; backCloak.castShadow = true; torso.add(backCloak);
    const belt = new THREE.Mesh(softBody(new THREE.TorusGeometry(0.4, 0.065, 12, 32), 0.02), beltMat); belt.position.y = 0.92; belt.rotation.x = Math.PI / 2; torso.add(belt);
    const buck = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.06), buckle); buck.position.set(0, 0.92, 0.4); torso.add(buck);

    this.cloakGroup = new THREE.Group();
    const capeBack = new THREE.Mesh(softBody(new THREE.BoxGeometry(0.85, 1.4, 0.06, 8, 14, 2), 0.04), cloak); capeBack.position.set(0, 0.5, -0.38); capeBack.castShadow = true; this.cloakGroup.add(capeBack);
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(softBody(new THREE.BoxGeometry(0.2, 1.2, 0.06, 4, 12, 2), 0.03), cloakInner);
      side.position.set(s * 0.42, 0.55, -0.28); side.rotation.y = s * 0.25; side.castShadow = true; this.cloakGroup.add(side);
    }
    torso.add(this.cloakGroup);

    this.head = new THREE.Group(); this.head.position.y = 1.72; torso.add(this.head);
    const faceGeo = softBody(new THREE.SphereGeometry(0.2, 32, 28), 0.018);
    const fa = faceGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < fa.count; i++) { const y = fa.getY(i); if (y < -0.02) fa.setY(i, y * 1.25); } faceGeo.computeVertexNormals();
    const face = new THREE.Mesh(faceGeo, skin); face.castShadow = true; this.head.add(face);
    const hoodGeo = softBody(new THREE.SphereGeometry(0.27, 30, 24, 0, TAU, 0, Math.PI * 0.55), 0.025);
    const hood = new THREE.Mesh(hoodGeo, cloakInner); hood.position.set(0, 0.06, -0.02); hood.castShadow = true; this.head.add(hood);
    const hairBack = new THREE.Mesh(softSphere(0.21, 26), hair); hairBack.position.set(0, 0.03, -0.08); hairBack.scale.set(1, 1.05, 1.1); this.head.add(hairBack);
    for (const s of [-1, 1]) {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.032, 14, 10), eyeWhite); white.position.set(s * 0.07, 0.03, 0.17); white.scale.set(1.2, 0.75, 0.6); this.head.add(white);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), eyeIris); iris.position.set(s * 0.07, 0.03, 0.19); this.head.add(iris);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.01, 10, 8), eyePupil); pupil.position.set(s * 0.07, 0.03, 0.2); this.head.add(pupil);
      const browGeo = softBody(new THREE.CapsuleGeometry(0.012, 0.06, 6, 10), 0.004);
      const browMesh = new THREE.Mesh(browGeo, brow); browMesh.position.set(s * 0.07, 0.06, 0.18); browMesh.rotation.z = s * -0.2; this.head.add(browMesh);
    }
    const noseGeo = softBody(new THREE.ConeGeometry(0.028, 0.065, 14), 0.006);
    const noseMesh = new THREE.Mesh(noseGeo, nose); noseMesh.position.set(0, 0.0, 0.21); noseMesh.rotation.x = -0.4; this.head.add(noseMesh);
    const mouthGeo = softBody(new THREE.CapsuleGeometry(0.01, 0.04, 8, 12), 0.004);
    const mouthMesh = new THREE.Mesh(mouthGeo, mouth); mouthMesh.position.set(0, -0.07, 0.19); mouthMesh.rotation.z = Math.PI / 2; this.head.add(mouthMesh);
    for (const s of [-1, 1]) {
      const earGeo = softBody(new THREE.SphereGeometry(0.045, 12, 10), 0.008);
      const ear = new THREE.Mesh(earGeo, skin); ear.position.set(s * 0.19, 0.01, 0.02); ear.scale.set(0.35, 1.1, 0.7); this.head.add(ear);
    }

    const mkArm = (side: number, mat: THREE.Material): THREE.Group => {
      const g = new THREE.Group(); g.position.set(0.46 * side, 1.52, 0);
      const shoulder = new THREE.Mesh(softSphere(0.14, 20), mat); shoulder.scale.set(1, 0.85, 0.9); g.add(shoulder);
      const upper = new THREE.Mesh(softCapsule(0.09, 0.28, 20), mat); upper.position.y = -0.2; g.add(upper);
      const elbow = new THREE.Mesh(softSphere(0.085, 18), mat); elbow.position.y = -0.38; g.add(elbow);
      const forearm = new THREE.Mesh(softCapsule(0.075, 0.25, 18), mat); forearm.position.y = -0.56; forearm.castShadow = true; g.add(forearm);
      const hand = new THREE.Mesh(softSphere(0.065, 20), skin); hand.position.y = -0.78; hand.scale.set(0.85, 0.65, 1.1); hand.castShadow = true; g.add(hand);
      for (let f = -1; f <= 1; f++) {
        const finger = new THREE.Mesh(softBody(new THREE.CapsuleGeometry(0.018, 0.065, 8, 10), 0.004), skin);
        finger.position.set(f * 0.022, -0.84, 0.02); g.add(finger);
      }
      return g;
    };
    this.armL = mkArm(-1, cloak); this.armR = mkArm(1, cloak); torso.add(this.armL, this.armR);

    const mkLeg = (side: number): THREE.Group => {
      const g = new THREE.Group(); g.position.set(0.2 * side, 0.85, 0);
      const thigh = new THREE.Mesh(softCapsule(0.12, 0.32, 22), leather); thigh.position.y = -0.22; thigh.castShadow = true; g.add(thigh);
      const knee = new THREE.Mesh(softSphere(0.1, 18), leather); knee.position.y = -0.46; g.add(knee);
      const shin = new THREE.Mesh(softCapsule(0.095, 0.3, 20), leather); shin.position.y = -0.66; shin.castShadow = true; g.add(shin);
      const bootGeo = softBody(new THREE.BoxGeometry(0.16, 0.16, 0.24, 6, 6, 6), 0.015);
      const bootMesh = new THREE.Mesh(bootGeo, boot); bootMesh.position.set(0, -0.88, 0.03); bootMesh.castShadow = true; g.add(bootMesh);
      const sole = new THREE.Mesh(softBody(new THREE.BoxGeometry(0.15, 0.04, 0.26, 4, 2, 4), 0.01),
        new THREE.MeshStandardMaterial({ color: '#2a1f15', roughness: 0.95 })); sole.position.set(0, -0.97, 0.04); g.add(sole);
      return g;
    };
    this.legL = mkLeg(-1); this.legR = mkLeg(1); torso.add(this.legL, this.legR);

    this.staffGroup = new THREE.Group();
    const staffMesh = new THREE.Mesh(trunkGeo(0.035, 0.05, 1.85), wood); staffMesh.castShadow = true; this.staffGroup.add(staffMesh);
    const wrapGeo = softBody(new THREE.CylinderGeometry(0.055, 0.055, 0.25, 16, 3), 0.01);
    const wrap = new THREE.Mesh(wrapGeo, leather); wrap.position.y = 0.65; this.staffGroup.add(wrap);
    const crystalGeo = softBody(new THREE.OctahedronGeometry(0.11, 2), 0.012);
    this.crystal = new THREE.Mesh(crystalGeo, crystalMat); this.crystal.position.y = 1.05; this.crystal.castShadow = true; this.crystalMat = crystalMat; this.staffGroup.add(this.crystal);
    const gt = document.createElement('canvas'); gt.width = gt.height = 64;
    const g2 = gt.getContext('2d')!; const grad = g2.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, 'rgba(190,240,255,0.95)'); grad.addColorStop(0.4, 'rgba(127,216,255,0.3)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g2.fillStyle = grad; g2.fillRect(0, 0, 64, 64);
    this.gemSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gt), color: '#9fe8ff', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.gemSprite.position.set(0, 1.05, 0); this.gemSprite.scale.setScalar(0.85); this.staffGroup.add(this.gemSprite);
    this.staffGroup.position.set(0.52, 0.75, 0.12); this.staffGroup.rotation.z = 0.08; this.staffGroup.rotation.x = 0.08;
    torso.add(this.staffGroup);
    (this as any)._torso = torso;
  }

  setPosition(x: number, z: number) {
    this.airY = 0; this.vy = 0; this.grounded = true; this.rolling = false; this.rollT = 0;
    this.attacking = false; this.attackT = 0; this.attackCombo = 0; this.nextComboQueued = false; this.attackHitSet.clear();
    this.hurtT = 0; this.hitStop = 0; this.landSquash = 0; this.speed = 0; this.vel.set(0, 0, 0); this.targetVel.set(0, 0, 0);
    this.pos.set(x, this.heightAt(x, z), z); this.group.position.copy(this.pos);
    const torso = (this as any)._torso as THREE.Group | undefined;
    if (torso) { torso.scale.set(1, 1, 1); torso.rotation.set(0, this.yaw, 0); }
    for (const m of this.hurtMats) m.emissiveIntensity = 0; this._hurtWasOn = false;
    this.coyoteT = 0; this.jumpBuffer = 0; this.idleT = 0; this.blockStamina = 100;
  }

  getWeaponWorldPos(out: THREE.Vector3): THREE.Vector3 {
    const off = new THREE.Vector3(0.5, 0.8, 0.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    out.copy(this.pos).add(off); out.y = this.pos.y + 1.5;
    if (this.attacking) {
      const p = this.attackT / this.attackDur[this.attackCombo];
      const swing = Math.sin(p * Math.PI) * 1.25; out.x += Math.sin(this.yaw) * swing * 0.32; out.z += Math.cos(this.yaw) * swing * 0.32;
    }
    return out;
  }
  getForward(): THREE.Vector3 { return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  getAttack() {
    const dur = this.attackDur[this.attackCombo] || 0.42;
    const p = this.attackT / dur;
    const active = this.attacking && p > 0.16 && p < 0.64;
    const power = this.attackCombo === 2 ? 28 : this.attackCombo === 1 ? 18 : 13;
    const range = this.attackCombo === 2 ? 3.1 : 2.45;
    const critChance = this.attackCombo === 2 ? 0.28 : 0.12;
    return {
      active, combo: this.attackCombo, power, range, critChance,
      hasHit: (id: number) => this.attackHitSet.has(id),
      markHit: (id: number) => this.attackHitSet.add(id),
    };
  }
  isInvulnerable(): boolean { return this.rolling || this.hurtT > 0.15; }
  takeDamage(amount: number, dir: THREE.Vector3): boolean {
    if (this.isInvulnerable()) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.hurtT = 0.85;
    this.vel.x = dir.x * 4.2; this.vel.z = dir.z * 4.2;
    if (this.onHurt) this.onHurt();
    return this.hp <= 0;
  }
  private startAttack() { this.attacking = true; this.attackT = 0; this.attackHitSet.clear(); if (this.onSwing) this.onSwing(this.attackCombo); }

  update(dt: number, input: PlayerInput, camYaw: number, t: number) {
    const iz = clamp(input.z, -1, 1); const ix = clamp(input.x, -1, 1);
    const magRaw = Math.hypot(ix, iz);
    const mag = clamp(magRaw, 0, 1);
    const run = input.run && mag > 0.1;
    const targetSpeedVal = mag > 0.05 ? (run ? 7.1 : 3.7) : 0;

    // направление относительно камеры
    const camSin = Math.sin(camYaw), camCos = Math.cos(camYaw);
    const dx = -camSin * iz + camCos * ix;
    const dz = -camCos * iz - camSin * ix;
    const moveDir = new THREE.Vector3(dx, 0, dz);
    if (moveDir.lengthSq() > 0.0001) moveDir.normalize();

    // coyote time
    if (this.grounded) this.coyoteT = 0.14; else this.coyoteT -= dt;
    if (input.jump) this.jumpBuffer = 0.16; else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

    // кувырок — с инерцией и i-frame
    if (input.roll && (this.grounded || this.coyoteT > 0) && !this.rolling && !this.attacking) {
      this.rolling = true; this.rollT = 0;
      this.rollDir.set(mag > 0.1 ? dx : Math.sin(this.yaw), 0, mag > 0.1 ? dz : Math.cos(this.yaw)).normalize();
      if (this.onRoll) this.onRoll();
      this.vel.set(this.rollDir.x * 9.2, 0, this.rollDir.z * 9.2);
    }
    if (this.rolling) {
      this.rollT += dt; const p = this.rollT / this.rollDur;
      if (p >= 1) { this.rolling = false; this.rollT = 0; this.pos.y = this.heightAt(this.pos.x, this.pos.z); this.vel.multiplyScalar(0.25); }
      else {
        const boost = 9.0 * (1 - p * 0.42) + (p < 0.2 ? 2 : 0);
        this.pos.x += this.rollDir.x * boost * dt; this.pos.z += this.rollDir.z * boost * dt;
        this.pos.y = this.heightAt(this.pos.x, this.pos.z) + 0.12;
        this.yaw = Math.atan2(this.rollDir.x, this.rollDir.z); this.animT += dt * 15.5;
      }
    }

    // прыжок с буфером
    if (this.jumpBuffer > 0 && (this.grounded || this.coyoteT > 0) && !this.rolling && !this.attacking) {
      this.vy = 8.2; this.grounded = false; this.coyoteT = 0; this.jumpBuffer = 0; if (this.onJump) this.onJump();
    }
    if (!this.grounded) { this.vy -= 23.5 * dt; this.airY += this.vy * dt; if (this.airY <= 0) { this.airY = 0; this.grounded = true; this.landSquash = 1.2; if (this.onLand) this.onLand(Math.abs(this.vy)); this.vy = 0; } }
    this.landSquash = Math.max(0, this.landSquash - dt * 6.2);
    this.hurtT = Math.max(0, this.hurtT - dt); this.hitStop = Math.max(0, this.hitStop - dt);

    // атака комбо с буфером
    if (input.attack && !this.rolling) {
      if (!this.attacking) { this.attackCombo = 0; this.startAttack(); }
      else { const p = this.attackT / this.attackDur[this.attackCombo]; if (p > 0.38) this.nextComboQueued = true; }
    }
    if (this.attacking) {
      const slowed = this.hitStop > 0 ? 0.10 : 1; this.attackT += dt * slowed;
      const dur = this.attackDur[this.attackCombo];
      if (this.attackT >= dur) {
        if (this.nextComboQueued && this.attackCombo < 2) { this.attackCombo++; this.startAttack(); this.nextComboQueued = false; }
        else { this.attacking = false; this.attackT = 0; this.attackCombo = 0; this.nextComboQueued = false; this.attackHitSet.clear(); }
      }
    }

    const blockedAtk = this.attacking && (this.attackCombo === 2 || (this.attackCombo === 1 && this.attackT / this.attackDur[1] > 0.66));
    const inHitStop = this.hitStop > 0.001;
    const attackAllowsMove = !this.attacking || (this.attackCombo === 0 && this.attackT / this.attackDur[0] < 0.55);
    const canApplyInput = !this.rolling && attackAllowsMove && !blockedAtk && !inHitStop;

    // --- AAA физика ускорения ---
    if (canApplyInput) {
      this.targetVel.set(moveDir.x * targetSpeedVal, 0, moveDir.z * targetSpeedVal);
      const accel = mag > 0.05 ? this.accel : this.decel;
      const ctrl = this.grounded ? 1 : this.airControl;
      const lerpK = 1 - Math.exp(-accel * ctrl * dt);
      this.vel.x = lerp(this.vel.x, this.targetVel.x, lerpK);
      this.vel.z = lerp(this.vel.z, this.targetVel.z, lerpK);
      // трение когда нет ввода
      if (mag < 0.05) { const friction = 1 - Math.min(1, this.decel * dt * 0.35); this.vel.x *= friction; this.vel.z *= friction; if (this.vel.length() < 0.05) this.vel.set(0, 0, 0); }
    } else if (this.hurtT > 0) {
      this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
      this.vel.x *= 1 - dt * 7; this.vel.z *= 1 - dt * 7;
    } else {
      // во время тяжёлой атаки — сильное трение
      this.vel.x *= 1 - dt * 12; this.vel.z *= 1 - dt * 12;
    }

    if (canApplyInput) {
      this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    }
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    this.pos.y = this.heightAt(this.pos.x, this.pos.z) + this.airY;

    this.moving = this.speed > 0.28 || this.rolling;
    if (!this.rolling && this.moving && moveDir.lengthSq() > 0.001 && !this.attacking) {
      this.targetYaw = Math.atan2(moveDir.x, moveDir.z);
      let dy = this.targetYaw - this.yaw; while (dy > Math.PI) dy -= TAU; while (dy < -Math.PI) dy += TAU;
      this.yaw += dy * Math.min(1, this.turnSpeed * dt);
      this.animT += dt * (3.2 + this.speed * 1.72);
      this.idleT = 0;
    } else if (!this.moving && !this.attacking && this.grounded) {
      this.idleT += dt; this.animT += dt * 0.6;
    } else if (!this.moving) this.animT = 0;

    // анимация модели
    const torso = (this as any)._torso as THREE.Group;
    const sf = clamp(this.speed / 7.1, 0, 1);
    const rollP = this.rolling ? this.rollT / this.rollDur : 0;
    const bob = this.moving && this.grounded && !this.attacking ? Math.sin(this.animT * 2) * 0.052 * sf : Math.sin(t * 1.6 + this.idleT) * (0.01 + Math.sin(this.idleT * 0.7) * 0.008);
    const lean = this.moving ? 0.07 * sf : Math.sin(t * 0.8 + this.idleT) * 0.018;
    const swing = this.moving && this.grounded && !this.rolling && !this.attacking ? Math.sin(this.animT) * 0.54 * sf : (this.idleT > 2 ? Math.sin(this.idleT * 0.9) * 0.08 : 0);
    const legSwing = this.moving && this.grounded && !this.attacking ? Math.sin(this.animT) * 0.48 * sf : 0;
    const footL = this.getFootIK(-1); const footR = this.getFootIK(1);

    if (this.attacking) {
      const p = this.attackT / this.attackDur[this.attackCombo];
      const atkCurve = Math.sin(p * Math.PI); const atkPhase = p;
      torso.rotation.y = this.yaw + Math.sin(atkPhase * Math.PI * 1.2) * (0.5 + this.attackCombo * 0.18);
      if (this.attackCombo === 0) {
        this.staffGroup.rotation.x = -0.92 + atkPhase * 2.92; this.staffGroup.rotation.z = 0.62 - atkPhase * 1.78; this.staffGroup.rotation.y = -0.52 + atkCurve * 0.62;
      } else if (this.attackCombo === 1) {
        this.staffGroup.rotation.x = 1.25 - atkPhase * 2.7; this.staffGroup.rotation.z = -0.54 + atkPhase * 1.68; this.staffGroup.rotation.y = 0.62 - atkCurve * 0.74;
      } else {
        this.staffGroup.rotation.x = -0.42 + Math.sin(atkPhase * TAU) * 0.96; this.staffGroup.rotation.z = 0.22 + Math.cos(atkPhase * TAU) * 1.28; this.staffGroup.rotation.y = atkPhase * TAU * 0.92;
      }
      this.staffGroup.position.set(0.45, 0.85 + atkCurve * 0.24, 0.25);
      this.armR.rotation.x = -1.14 + atkPhase * 0.84; this.armL.rotation.x = -1.14 + atkPhase * 0.84;
      this.gemSprite.scale.setScalar(1.02 + atkCurve * (0.62 + this.attackCombo * 0.34)); this.crystalMat.emissiveIntensity = 1.85 + atkCurve * 2.7;
    } else {
      torso.rotation.y = this.yaw;
      torso.rotation.x = lean + rollP * TAU - (this.grounded ? 0 : clamp(this.airY * 0.25, 0, 0.2)) * 0.52;
      torso.scale.y = (1 - Math.sin(Math.PI * rollP) * 0.34) * (1 - this.landSquash * 0.18) * (1 + Math.sin(this.hurtT * 18) * 0.07 * (this.hurtT > 0 ? 1 : 0));
      torso.scale.x = torso.scale.z = 1 + Math.sin(Math.PI * rollP) * 0.11 + this.landSquash * 0.09;

      const ikK = this.grounded ? clamp(1 - sf, 0, 1) : 0;
      this.legL.rotation.x = legSwing; this.legR.rotation.x = -legSwing;
      (this.legL as any).position.y = Math.min(footL, 0) * ikK; (this.legR as any).position.y = Math.min(footR, 0) * ikK;

      const kneeL = this.moving && this.grounded && !this.attacking ? Math.max(0, Math.sin(this.animT)) * 1.25 * sf : 0;
      const kneeR = this.moving && this.grounded && !this.attacking ? Math.max(0, -Math.sin(this.animT)) * 1.25 * sf : 0;
      this.legL.children[1].rotation.x = kneeL; this.legL.children[2].rotation.x = kneeL;
      this.legR.children[1].rotation.x = kneeR; this.legR.children[2].rotation.x = kneeR;

      this.armL.rotation.x = this.rolling ? -2.24 : swing + (this.idleT > 4 ? Math.sin(this.idleT * 0.8) * 0.12 : 0);
      this.armR.rotation.x = this.rolling ? -2.24 : -swing + (this.idleT > 4 ? Math.cos(this.idleT * 0.9) * 0.10 : 0);
      const elbowL = this.moving && this.grounded && !this.rolling && !this.attacking ? -Math.abs(Math.sin(this.animT)) * 0.86 * sf : 0;
      const elbowR = this.moving && this.grounded && !this.rolling && !this.attacking ? -Math.abs(Math.cos(this.animT)) * 0.86 * sf : 0;
      this.armL.children[2].rotation.x = elbowL; this.armL.children[3].rotation.x = elbowL;
      this.armR.children[2].rotation.x = elbowR; this.armR.children[3].rotation.x = elbowR;

      this.cloakGroup.rotation.z = Math.sin(this.animT * 1.8 + 1) * 0.058 * sf + Math.sin(t * 0.9 + this.idleT) * 0.018 + rollP * 0.52;
      this.cloakGroup.rotation.x = Math.sin(t * 0.7) * 0.022 * sf + Math.sin(this.idleT * 0.5) * 0.01;
      this.head.rotation.y = Math.sin(t * 0.5) * 0.04 + (this.idleT > 3 ? Math.sin(this.idleT * 0.6) * 0.18 : 0);
      this.head.rotation.x = Math.sin(t * 0.8) * 0.018;

      this.staffGroup.rotation.x = Math.sin(this.animT) * 0.09 * sf - rollP * 1.25 + Math.sin(this.idleT * 0.7) * 0.05;
      this.staffGroup.rotation.z = 0.08 + Math.cos(this.animT * 0.5) * 0.032;
      this.staffGroup.rotation.y = 0; this.staffGroup.position.set(0.52, 0.75, 0.12);
      this.gemSprite.scale.setScalar(0.88 + Math.sin(t * 2.4) * 0.17 + rollP * 0.52); this.crystalMat.emissiveIntensity = 1.85 + Math.sin(t * 2.2) * 0.32;
    }

    if (this.hurtT > 0) {
      const intensity = this.hurtT * 0.95;
      for (const m of this.hurtMats) { m.emissive.copy(_hurtColor); m.emissiveIntensity = intensity; }
    } else if (this._hurtWasOn) { for (const m of this.hurtMats) m.emissiveIntensity = 0; }
    this._hurtWasOn = this.hurtT > 0;

    torso.position.y = bob; this.group.position.copy(this.pos); this.group.position.y += bob * 0.55;
  }

  getMoving() { return this.moving; }
  getSpeed() { return this.speed; }
  getRolling() { return this.rolling; }
  getAirborne() { return !this.grounded; }
  getAttacking() { return this.attacking; }
  getCameraBob(): THREE.Vector3 {
    if (!this.moving || !this.grounded || this.attacking || this.rolling) return new THREE.Vector3();
    const sf = clamp(this.speed / 7.1, 0, 1); const amp = 0.052 * sf;
    return new THREE.Vector3(Math.cos(this.animT * 2) * amp * 0.48, Math.sin(this.animT * 4) * amp, 0);
  }
  getFootIK(side: number): number {
    const footLocal = new THREE.Vector3(0.2 * side, 0.15, 0.12 * Math.cos(this.animT * 2));
    footLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    return this.heightAt(this.pos.x + footLocal.x, this.pos.z + footLocal.z) - this.pos.y;
  }
  getStamina(): number { return this.blockStamina; }
}
