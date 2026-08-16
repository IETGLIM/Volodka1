/**
 * Мобы и боёвка — тени, кустовые стражники и боссы.
 * AAA-апгрейд: боссы с фазами, патрульные маршруты, реакции, эффекты.
 */
import * as THREE from 'three';
import { rand, TAU, clamp } from './utils';
import { deformGeometry, crownGeo, trunkGeo } from './organic';

const _dir = new THREE.Vector3();
const _worldPos = new THREE.Vector3();

export type EnemyKind = 'ten' | 'kust' | 'boss' | 'specter';

export interface PatrolRoute {
  points: [number, number][];
  loop: boolean;
}

export class Enemy {
  group = new THREE.Group();
  kind: EnemyKind;
  home: THREE.Vector3;
  radius: number;
  pos: THREE.Vector3;
  private target = new THREE.Vector3();
  private wait = 0;
  private walkT = 0;
  private yaw = 0;
  private body: THREE.Group;
  private head: THREE.Group;
  private armL: THREE.Group;
  private armR: THREE.Group;
  private eyes: THREE.Mesh[] = [];
  private aura: THREE.Sprite | null = null;
  private state: 'idle' | 'patrol' | 'chase' | 'attack' | 'hurt' | 'dead' | 'windup' | 'special' = 'patrol';
  private stateT = 0;
  hp = 36;
  maxHp = 36;
  private heightAt: (x: number, z: number) => number;
  private detectionR: number;
  private attackR: number;
  private speedWalk: number;
  private speedChase: number;
  private attackCooldown = 0;
  private hurtT = 0;
  private deadT = 0;
  private knock = new THREE.Vector3();
  private scaleBase = 1;
  private patrolRoute: PatrolRoute | null = null;
  private patrolIdx = 0;
  private patrolForward = true;
  private specialCd = 0;
  private phase = 1;

  private healthBar: THREE.Group;
  private healthFill: THREE.Mesh;
  private shockwaveMesh: THREE.Mesh | null = null;
  private shockT = 0;

  canDamagePlayer = false;
  lastDamage = 0;
  isBoss = false;

  constructor(kind: EnemyKind, home: THREE.Vector3, radius: number, heightAt: (x: number, z: number) => number, scale = 1, route?: PatrolRoute) {
    this.kind = kind;
    this.home = home.clone();
    this.radius = radius;
    this.pos = home.clone();
    this.heightAt = heightAt;
    this.scaleBase = scale;
    this.patrolRoute = route ?? null;
    this.body = new THREE.Group();
    this.head = new THREE.Group();
    this.armL = new THREE.Group();
    this.armR = new THREE.Group();
    this.group.add(this.body);
    this.body.add(this.head);
    this.body.add(this.armL);
    this.body.add(this.armR);
    this.target.copy(home);
    this.wait = rand(0, 2);

    if (kind === 'ten') {
      this.maxHp = 42; this.hp = 42;
      this.detectionR = 15; this.attackR = 2.0;
      this.speedWalk = 1.2; this.speedChase = 3.4;
      this.buildTen();
    } else if (kind === 'kust') {
      this.maxHp = 30; this.hp = 30;
      this.detectionR = 13; this.attackR = 1.8;
      this.speedWalk = 1.4; this.speedChase = 3.8;
      this.buildKust();
    } else if (kind === 'boss') {
      this.maxHp = 180; this.hp = 180;
      this.detectionR = 22; this.attackR = 3.2;
      this.speedWalk = 0.9; this.speedChase = 2.8;
      this.isBoss = true;
      this.buildBoss();
    } else { // specter
      this.maxHp = 55; this.hp = 55;
      this.detectionR = 18; this.attackR = 2.4;
      this.speedWalk = 1.6; this.speedChase = 4.2;
      this.buildSpecter();
    }

    this.healthBar = new THREE.Group();
    const bgMat = new THREE.MeshBasicMaterial({ color: '#10121a', transparent: true, opacity: 0.85, depthWrite: false });
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(this.isBoss ? 1.8 : 0.9, this.isBoss ? 0.18 : 0.12), bgMat);
    const fillCol = this.isBoss ? '#ff3a5a' : '#f2c14e';
    this.healthFill = new THREE.Mesh(new THREE.PlaneGeometry(this.isBoss ? 1.76 : 0.86, this.isBoss ? 0.12 : 0.08),
      new THREE.MeshBasicMaterial({ color: fillCol, transparent: true, opacity: 0.98, depthWrite: false }));
    this.healthFill.position.z = 0.012;
    this.healthBar.add(bg, this.healthFill);
    this.healthBar.position.y = this.isBoss ? 3.4 : (kind === 'ten' ? 2.5 : 1.7);
    this.healthBar.visible = false;
    this.group.add(this.healthBar);

    // босс-аура
    if (this.isBoss) {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d')!;
      const gr = g.createRadialGradient(64, 64, 5, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,60,90,0.9)'); gr.addColorStop(0.4, 'rgba(255,60,90,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), color: '#ff4a5a', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
      spr.scale.setScalar(6.5); spr.position.y = 1.2;
      this.group.add(spr); this.aura = spr;

      const ringGeo = new THREE.RingGeometry(0.1, 3.2, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: '#ff3a5a', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
      this.shockwaveMesh = new THREE.Mesh(ringGeo, ringMat);
      this.shockwaveMesh.rotation.x = -Math.PI / 2;
      this.shockwaveMesh.position.y = 0.05;
      this.shockwaveMesh.visible = false;
      this.group.add(this.shockwaveMesh);
    }

    this.group.position.copy(this.pos);
    this.group.position.y = heightAt(this.pos.x, this.pos.z);
    this.group.scale.setScalar(scale);
  }

  private mat(col: string, em?: string, ei = 0) {
    const m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.88, flatShading: false });
    if (em) { m.emissive = new THREE.Color(em); m.emissiveIntensity = ei; }
    return m;
  }

  private buildTen() {
    const bodyGeo = new THREE.CapsuleGeometry(0.36, 1.0, 8, 14);
    deformGeometry(bodyGeo, 0.09, 1.8, rand(0, 100));
    const body = new THREE.Mesh(bodyGeo, this.mat('#191d30', '#252a45', 0.2));
    body.position.y = 1.0; body.castShadow = true; this.body.add(body);
    const shGeo = new THREE.SphereGeometry(0.36, 12, 10);
    deformGeometry(shGeo, 0.05, 2, rand(0, 100));
    const sh = new THREE.Mesh(shGeo, this.mat('#1d2238', '#2a2f4a', 0.15));
    sh.scale.set(1.3, 0.72, 1.05); sh.position.y = 1.6; this.body.add(sh);
    const mkArm = (side: number) => {
      const g = new THREE.Group(); g.position.set(0.48 * side, 1.48, 0);
      const armGeo = new THREE.CapsuleGeometry(0.085, 0.62, 6, 10);
      deformGeometry(armGeo, 0.02, 2, side * 17 + 3);
      const arm = new THREE.Mesh(armGeo, this.mat('#1a1e2e', '#252a45', 0.12));
      arm.position.y = -0.36; arm.castShadow = true; g.add(arm);
      const handGeo = new THREE.SphereGeometry(0.12, 8, 8);
      deformGeometry(handGeo, 0.03, 2, side * 19);
      const hand = new THREE.Mesh(handGeo, this.mat('#23273d'));
      hand.position.y = -0.8; hand.scale.set(1, 0.7, 1.2); g.add(hand);
      return g;
    };
    this.armL = mkArm(-1); this.armR = mkArm(1);
    this.body.add(this.armL, this.armR);
    const headGeo = new THREE.SphereGeometry(0.22, 14, 12);
    deformGeometry(headGeo, 0.045, 1.8, rand(0, 100));
    const head = new THREE.Mesh(headGeo, this.mat('#1b2032', '#252a45', 0.22));
    head.position.y = 1.92; head.castShadow = true; this.head.add(head);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 8),
        new THREE.MeshStandardMaterial({ color: '#8fb8ff', emissive: '#6ea0ff', emissiveIntensity: 1.3 }));
      eye.position.set(0.072 * s, 1.94, 0.18); this.head.add(eye); this.eyes.push(eye);
    }
    const ragGeo = new THREE.PlaneGeometry(0.62, 0.95, 3, 4);
    deformGeometry(ragGeo, 0.08, 1.5, rand(0, 100));
    const rag = new THREE.Mesh(ragGeo, new THREE.MeshStandardMaterial({ color: '#1a1e2e', side: THREE.DoubleSide, roughness: 1, transparent: true, opacity: 0.72 }));
    rag.position.set(0, 1.15, -0.34); rag.rotation.x = 0.2; this.body.add(rag);
  }

  private buildKust() {
    const bodyCols = ['#3d5a3a', '#4a6a44', '#355030'];
    const comps: [number, number, number, number][] = [[0, 0.56, 0, 0.44], [0.23, 0.46, 0.13, 0.30], [-0.21, 0.52, -0.11, 0.28], [0, 0.77, 0.09, 0.35], [0.13, 0.36, -0.19, 0.24]];
    comps.forEach(([x, y, z, r], i) => {
      const m = new THREE.Mesh(crownGeo(r, 10), this.mat(bodyCols[i % 3]));
      m.position.set(x, y, z); m.castShadow = true; this.body.add(m);
    });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + rand(-0.2, 0.2);
      const thornGeo = new THREE.ConeGeometry(0.048, 0.24, 5);
      deformGeometry(thornGeo, 0.01, 2, i * 13 + 7);
      const thorn = new THREE.Mesh(thornGeo, this.mat('#2b3b28'));
      thorn.position.set(Math.cos(a) * 0.44, 0.62 + rand(-0.1, 0.2), Math.sin(a) * 0.44);
      thorn.lookAt(thorn.position.clone().multiplyScalar(2)); this.body.add(thorn);
    }
    const head = new THREE.Mesh(crownGeo(0.21, 10), this.mat('#4d6c48'));
    head.position.set(0, 1.07, 0.13); head.castShadow = true; this.head.add(head);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8),
        new THREE.MeshStandardMaterial({ color: '#a8ff8a', emissive: '#7aff5a', emissiveIntensity: 0.95 }));
      eye.position.set(0.082 * s, 1.10, 0.28); this.head.add(eye); this.eyes.push(eye);
    }
    const mkBranch = (side: number) => {
      const g = new THREE.Group(); g.position.set(0.34 * side, 0.68, 0);
      const bGeo = trunkGeo(0.052, 0.084, 0.58);
      const b = new THREE.Mesh(bGeo, this.mat('#5a4630')); b.position.y = -0.1; b.rotation.z = 0.62 * side; b.castShadow = true; g.add(b); return g;
    };
    this.armL = mkBranch(-1); this.armR = mkBranch(1); this.body.add(this.armL, this.armR);
  }

  private buildBoss() {
    // босс — Хранитель Забытых Строк: огромный, с плащом из страниц
    const bodyGeo = new THREE.CapsuleGeometry(0.58, 1.35, 10, 16);
    deformGeometry(bodyGeo, 0.13, 1.6, 42);
    const body = new THREE.Mesh(bodyGeo, this.mat('#241a30', '#4a2a6a', 0.35));
    body.position.y = 1.25; body.castShadow = true; this.body.add(body);

    const shoulderGeo = new THREE.SphereGeometry(0.52, 14, 12);
    deformGeometry(shoulderGeo, 0.08, 1.8, 7);
    const sh = new THREE.Mesh(shoulderGeo, this.mat('#2a1f3a', '#5a2a7a', 0.3));
    sh.scale.set(1.45, 0.78, 1.15); sh.position.y = 2.1; this.body.add(sh);

    const mkBigArm = (side: number) => {
      const g = new THREE.Group(); g.position.set(0.72 * side, 2.0, 0);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.9, 8, 12), this.mat('#241a30', '#4a2a6a', 0.25));
      arm.position.y = -0.45; arm.castShadow = true; g.add(arm);
      const claw = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), this.mat('#3a2a4a', '#6a3a9a', 0.35));
      claw.position.y = -1.05; claw.scale.set(1, 0.6, 1.35); g.add(claw);
      // когти
      for (let i = -1; i <= 1; i++) {
        const nail = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.28, 6), this.mat('#1a1220'));
        nail.position.set(i * 0.07, -1.22, 0.08); nail.rotation.x = -0.6; g.add(nail);
      }
      return g;
    };
    this.armL = mkBigArm(-1); this.armR = mkBigArm(1);
    this.body.add(this.armL, this.armR);

    const headGeo = new THREE.SphereGeometry(0.38, 16, 14);
    deformGeometry(headGeo, 0.07, 1.7, 99);
    const head = new THREE.Mesh(headGeo, this.mat('#2a1f3a', '#6a3a9a', 0.45));
    head.position.y = 2.55; head.castShadow = true; this.head.add(head);

    // венец из страниц
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      const page = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.32, 2, 3),
        new THREE.MeshStandardMaterial({ color: '#f2c14e', side: THREE.DoubleSide, transparent: true, opacity: 0.85, emissive: '#f2c14e', emissiveIntensity: 0.25 }));
      page.position.set(Math.cos(a) * 0.38, 2.8 + Math.sin(a * 2) * 0.06, Math.sin(a) * 0.38);
      page.lookAt(head.position); this.head.add(page);
    }

    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10),
        new THREE.MeshStandardMaterial({ color: '#ff5a8a', emissive: '#ff2a6a', emissiveIntensity: 1.8 }));
      eye.position.set(0.12 * s, 2.57, 0.32); this.head.add(eye); this.eyes.push(eye);
    }

    const rag = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.6, 4, 6),
      new THREE.MeshStandardMaterial({ color: '#1a1424', side: THREE.DoubleSide, roughness: 1, transparent: true, opacity: 0.62 }));
    rag.position.set(0, 1.4, -0.58); rag.rotation.x = 0.22; this.body.add(rag);
  }

  private buildSpecter() {
    // Призрак-чтец — полупрозрачный летающий
    const bodyGeo = new THREE.CapsuleGeometry(0.28, 0.9, 8, 12);
    deformGeometry(bodyGeo, 0.07, 1.8, 55);
    const body = new THREE.Mesh(bodyGeo, this.mat('#1a2240', '#3a4a9a', 0.25));
    body.position.y = 1.1; body.castShadow = true; this.body.add(body);
    const headGeo = new THREE.SphereGeometry(0.2, 12, 10);
    const head = new THREE.Mesh(headGeo, this.mat('#1e2848', '#4a5aba', 0.3));
    head.position.y = 1.78; this.head.add(head);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8),
        new THREE.MeshStandardMaterial({ color: '#7fc8ff', emissive: '#5ab0ff', emissiveIntensity: 1.2, transparent: true, opacity: 0.9 }));
      eye.position.set(0.066 * s, 1.8, 0.17); this.head.add(eye); this.eyes.push(eye);
    }
    const mkArm = (side: number) => {
      const g = new THREE.Group(); g.position.set(0.4 * side, 1.4, 0);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.5, 6, 8), this.mat('#1e2848', '#3a4a9a', 0.2));
      arm.position.y = -0.28; g.add(arm);
      return g;
    };
    this.armL = mkArm(-1); this.armR = mkArm(1);
    this.body.add(this.armL, this.armR);

    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d')!; const grd = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    grd.addColorStop(0, 'rgba(140,180,255,0.9)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 64, 64);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), color: '#8fb4ff', transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(2.8); glow.position.y = 1.0; this.group.add(glow);
  }

  takeDamage(amount: number, dir: THREE.Vector3, crit = false) {
    if (this.state === 'dead') return { dead: false, dmg: 0 };
    const finalDmg = crit ? amount * 1.8 : amount;
    this.hp -= finalDmg;
    this.knock.copy(dir).setY(0).normalize().multiplyScalar(this.isBoss ? 0.9 : 2.9);
    this.knock.y = 0.45;
    this.hurtT = 0.5;
    this.state = 'hurt';
    this.stateT = 0;
    this.healthBar.visible = true;
    this.lastDamage = finalDmg;
    if (this.hp <= 0) {
      this.hp = 0; this.state = 'dead'; this.stateT = 0; this.canDamagePlayer = false;
      return { dead: true, dmg: finalDmg };
    }
    // босс фазы
    if (this.isBoss) {
      if (this.hp < this.maxHp * 0.5 && this.phase === 1) {
        this.phase = 2; this.speedChase = 3.2; this.detectionR = 26;
      }
    }
    return { dead: false, dmg: finalDmg };
  }

  isDead(): boolean { return this.state === 'dead' && this.deadT > 0.95; }
  isAlive(): boolean { return this.state !== 'dead'; }
  getPos(): THREE.Vector3 { return this.pos; }

  reset() {
    this.hp = this.maxHp; this.state = 'patrol'; this.stateT = 0; this.hurtT = 0; this.deadT = 0; this.wait = rand(0, 2);
    this.pos.copy(this.home); this.target.copy(this.home);
    this.group.position.copy(this.pos); this.group.position.y = this.heightAt(this.pos.x, this.pos.z);
    this.group.visible = true; this.group.scale.setScalar(this.scaleBase);
    this.healthBar.visible = false; this.canDamagePlayer = false; this.knock.set(0, 0, 0);
    this.patrolIdx = 0; this.patrolForward = true; this.specialCd = 0; this.phase = 1; this.shockT = 0;
    if (this.shockwaveMesh) { this.shockwaveMesh.visible = false; (this.shockwaveMesh.material as THREE.MeshBasicMaterial).opacity = 0; this.shockwaveMesh.scale.setScalar(0.1); }
    if (this.aura) this.aura.material.opacity = 0.9;
  }

  update(dt: number, playerPos: THREE.Vector3, playerRolling: boolean, heightAt: (x: number, z: number) => number, t: number): number {
    if (this.state === 'dead') {
      this.deadT += dt;
      this.group.position.y = heightAt(this.pos.x, this.pos.z) - this.deadT * 0.35 - (this.isBoss ? 0 : 0);
      this.group.scale.setScalar(this.scaleBase * (1 - this.deadT * (this.isBoss ? 0.28 : 0.62)));
      this.group.rotation.z = this.deadT * (this.isBoss ? 0.2 : 0.85);
      this.healthBar.visible = false;
      if (this.aura) this.aura.material.opacity = Math.max(0, 0.9 - this.deadT);
      if (this.deadT > 1.15) this.group.visible = false;
      return 0;
    }

    if (this.knock.lengthSq() > 0.001) {
      this.pos.x += this.knock.x * dt * 5.4;
      this.pos.z += this.knock.z * dt * 5.4;
      this.knock.multiplyScalar(1 - dt * 7.2);
      if (this.knock.length() < 0.06) this.knock.set(0, 0, 0);
    }

    const dist = this.pos.distanceTo(playerPos);
    const canSee = dist < this.detectionR && dist > 0.5;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.specialCd = Math.max(0, this.specialCd - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.shockT = Math.max(0, this.shockT - dt);

    if (this.shockwaveMesh && this.shockT > 0) {
      const prog = 1 - this.shockT / 1.1;
      this.shockwaveMesh.scale.setScalar(0.2 + prog * 8);
      (this.shockwaveMesh.material as THREE.MeshBasicMaterial).opacity = (1 - prog) * 0.55;
    }

    if (this.state === 'hurt') {
      this.stateT += dt;
      if (this.stateT > 0.38) { this.state = canSee ? 'chase' : 'patrol'; this.stateT = 0; }
    } else if (this.state === 'windup') {
      this.stateT += dt;
      if (this.stateT > (this.isBoss ? 0.85 : 0.45)) {
        this.state = 'attack'; this.stateT = 0; this.canDamagePlayer = false;
      }
    } else if (this.state === 'special') {
      this.stateT += dt;
      if (this.stateT > 0.2 && this.stateT < 0.9 && this.shockwaveMesh) {
        // урон по площади
        if (dist < 5.5 && !playerRolling) this.canDamagePlayer = true; else this.canDamagePlayer = false;
      } else this.canDamagePlayer = false;
      if (this.stateT > 1.35) {
        this.state = canSee ? 'chase' : 'patrol'; this.stateT = 0; this.canDamagePlayer = false; this.attackCooldown = 1.0; this.specialCd = this.isBoss ? 6.5 : 9;
      }
    } else if (canSee && dist < this.attackR + 0.35 && this.attackCooldown <= 0 && this.state !== 'attack') {
      // босс иногда делает спецатаку вместо обычной
      if (this.isBoss && this.specialCd <= 0 && dist < 5 && Math.random() < (this.phase === 2 ? 0.65 : 0.38)) {
        this.state = 'special'; this.stateT = 0; this.shockT = 1.1;
        if (this.shockwaveMesh) { this.shockwaveMesh.visible = true; this.shockwaveMesh.scale.setScalar(0.2); (this.shockwaveMesh.material as THREE.MeshBasicMaterial).opacity = 0.6; }
      } else {
        this.state = 'windup'; this.stateT = 0; this.canDamagePlayer = false;
      }
    } else if (this.state === 'attack') {
      this.stateT += dt;
      if (this.stateT > 0.22 && this.stateT < 0.52) {
        this.canDamagePlayer = !playerRolling && dist < this.attackR + 0.6;
      } else this.canDamagePlayer = false;
      if (this.stateT > 0.82) {
        this.state = canSee ? 'chase' : 'patrol'; this.stateT = 0;
        this.attackCooldown = this.kind === 'ten' ? 1.35 : this.isBoss ? 1.1 : 0.88;
        this.canDamagePlayer = false;
      }
    } else if (canSee) {
      this.state = 'chase'; _dir.set(playerPos.x - this.pos.x, 0, playerPos.z - this.pos.z).normalize();
      this.pos.x += _dir.x * this.speedChase * dt; this.pos.z += _dir.z * this.speedChase * dt;
      this.yaw = Math.atan2(_dir.x, _dir.z); this.walkT += dt * (this.isBoss ? 6.5 : 10.5);
    } else {
      // патруль по маршруту или рандом
      if (this.patrolRoute && this.patrolRoute.points.length > 0) {
        const pts = this.patrolRoute.points;
        const tgtPt = pts[this.patrolIdx];
        _dir.set(tgtPt[0] - this.pos.x, 0, tgtPt[1] - this.pos.z).normalize();
        const d = Math.hypot(tgtPt[0] - this.pos.x, tgtPt[1] - this.pos.z);
        if (d < 0.8) {
          if (this.patrolRoute.loop) this.patrolIdx = (this.patrolIdx + 1) % pts.length;
          else {
            if (this.patrolForward) {
              if (this.patrolIdx >= pts.length - 1) { this.patrolForward = false; this.patrolIdx--; } else this.patrolIdx++;
            } else {
              if (this.patrolIdx <= 0) { this.patrolForward = true; this.patrolIdx++; } else this.patrolIdx--;
            }
          }
          this.wait = 0.25;
        } else {
          this.pos.x += _dir.x * this.speedWalk * dt; this.pos.z += _dir.z * this.speedWalk * dt;
          this.yaw = Math.atan2(_dir.x, _dir.z); this.walkT += dt * 7.5;
        }
      } else {
        if (this.wait > 0) { this.wait -= dt; this.walkT *= 0.92; }
        else {
          const d = Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z);
          if (d < 0.6) {
            this.wait = rand(0.9, 3.6);
            const a = rand(0, TAU); const r = rand(0, this.radius);
            this.target.set(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r);
          } else {
            _dir.set(this.target.x - this.pos.x, 0, this.target.z - this.pos.z).normalize();
            this.pos.x += _dir.x * this.speedWalk * dt; this.pos.z += _dir.z * this.speedWalk * dt;
            this.yaw = Math.atan2(_dir.x, _dir.z); this.walkT += dt * 7.2;
          }
        }
      }
      this.state = (this.wait > 0.05) ? 'idle' : 'patrol';
    }

    this.pos.y = heightAt(this.pos.x, this.pos.z) + (this.kind === 'specter' ? 0.6 + Math.sin(t * 2.2) * 0.25 : 0);
    this.group.position.copy(this.pos); if (this.kind === 'specter') this.group.position.y += 0.6;

    const moving = this.state === 'patrol' || this.state === 'chase';
    const bob = moving ? Math.abs(Math.sin(this.walkT)) * (this.isBoss ? 0.11 : 0.075) : Math.sin(t * 1.2) * 0.012;
    this.body.position.y = bob; this.body.rotation.y = this.yaw;
    const lean = this.state === 'chase' ? 0.2 : 0;
    this.body.rotation.x = lean + (this.state === 'attack' ? Math.sin(this.stateT * 12) * 0.2 : 0) + (this.state === 'special' ? Math.sin(this.stateT * 9) * 0.35 : 0);

    if (this.state === 'attack' || this.state === 'windup') {
      const s = Math.sin(this.stateT * (this.isBoss ? 14 : 18));
      this.armL.rotation.x = -0.9 + s * 1.1; this.armR.rotation.x = -0.9 - s * 1.1;
    } else if (this.state === 'special') {
      const prog = this.stateT / 1.35;
      this.armL.rotation.x = -1.2 + Math.sin(prog * Math.PI) * 2.0;
      this.armR.rotation.x = -1.2 + Math.sin(prog * Math.PI) * 2.0;
      this.armL.rotation.z = Math.sin(prog * Math.PI) * 0.5; this.armR.rotation.z = -Math.sin(prog * Math.PI) * 0.5;
    } else if (moving) {
      const sw = Math.sin(this.walkT * 2) * (this.isBoss ? 0.38 : 0.52); this.armL.rotation.x = sw; this.armR.rotation.x = -sw;
    } else { this.armL.rotation.x *= 0.92; this.armR.rotation.x *= 0.92; }

    if (this.state === 'hurt') {
      this.body.rotation.z = Math.sin(this.stateT * 22) * 0.28;
      this.eyes.forEach(e => (e.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.8);
    } else {
      this.body.rotation.z *= 0.88;
      const ei = this.kind === 'ten' ? 1.25 : this.isBoss ? 1.9 : 0.92;
      this.eyes.forEach(e => {
        (e.material as THREE.MeshStandardMaterial).emissiveIntensity = ei + Math.sin(t * 3 + e.position.x * 10) * 0.25 + (this.phase === 2 ? 0.6 : 0);
      });
    }

    if (this.aura) {
      this.aura.material.opacity = 0.6 + Math.sin(t * 3.5) * 0.32;
      (this.aura.material as any).color = new THREE.Color(this.phase === 2 ? '#ff2a4a' : '#ff4a6a');
    }

    if (this.healthBar.visible) {
      this.healthBar.getWorldPosition(_worldPos);
      this.healthBar.lookAt(playerPos.x, _worldPos.y + 2, playerPos.z);
      const pct = clamp(this.hp / this.maxHp, 0, 1);
      const mat = this.healthFill.material as THREE.MeshBasicMaterial;
      if (this.isBoss) mat.color.set(pct > 0.5 ? '#ff4a6a' : pct > 0.25 ? '#ff8a4a' : '#ff1a3a');
      else mat.color.set(pct > 0.5 ? '#f2c14e' : pct > 0.25 ? '#e88a4a' : '#e84a4a');
      this.healthFill.scale.x = pct; this.healthFill.position.x = -(1 - pct) * (this.isBoss ? 0.88 : 0.43);
    }

    if (this.canDamagePlayer) {
      if (this.state === 'special') return this.isBoss ? 32 : 20;
      return this.kind === 'ten' ? 18 : this.isBoss ? 34 : 12;
    }
    return 0;
  }
}
