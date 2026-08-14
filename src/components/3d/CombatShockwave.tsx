/* ─── Combat Attack VFX — Shockwave Ring + Flash ───
 * Priority C ("Визуальные эффекты атаки: вспышки, ударные волны").
 * Event-driven, zero geometry allocations per hit: a small pool of expanding
 * additive energy rings + a central flash that spawn on `combat:hit`
 * (player attacks only) and die off after ~0.45s.
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { eventBus } from '@/engine/EventBus';
import { useFrameTick } from '@/engine/frame/useFrameTick';
import {
  getSharedCircleGeometry,
  getSharedSphereGeometry,
} from '@/engine/three/moduleGeometryRegistry';

interface Shock {
  id: number;
  age: number;
  /** seconds the effect is alive before being recycled */
  duration: number;
  /** final ring radius (world units) */
  maxRadius: number;
  /** energy color — cyan for player hits, red for player damage */
  color: string;
}

/** Hard cap on concurrent effects — keeps the draw cheap. */
const MAX_EFFECTS = 6;
/** Lighten the load for slow devices: ring step grows with hit size. */
const DURATION = 0.45;

export function CombatShockwave() {
  const [shocks, setShocks] = useState<Shock[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const unsubs = [
      eventBus.on('combat:hit', ({ isPlayerHit, damage }) => {
        if (isPlayerHit) return; // shockwave is for the player's own attacks
        const id = ++idRef.current;
        const dmg = damage ?? 0;
        const maxRadius = 2.2 + Math.min(1.6, dmg * 0.035);
        const color = '#44ffcc'; // energy strike color fits the arena neon palette
        setShocks((prev) => {
          const next = [...prev, { id, age: 0, duration: DURATION, maxRadius, color }];
          return next.length > MAX_EFFECTS ? next.slice(next.length - MAX_EFFECTS) : next;
        });
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  // Advance ages each frame; prune finished effects.
  useFrameTick('misc', ({ delta }) => {
    if (shocks.length === 0) return;
    setShocks((prev) => {
      const next = prev
        .map((s) => ({ ...s, age: s.age + delta }))
        .filter((s) => s.age < s.duration);
      return next.length === prev.length ? prev : next;
    });
  });

  if (shocks.length === 0) return null;

  return (
    <group>
      {shocks.map((s) => {
        const t = Math.min(1, s.age / s.duration); // 0 → 1 progress
        const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic for a punchy start
        const radius = 0.35 + ease * (s.maxRadius - 0.35);
        // Opacity: quick ramp-in then smooth fade-out.
        const opacity = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
        const flashOpacity = (1 - t) * 0.85;

        return (
          <group key={s.id}>
            {/* Expanding energy disc (the main shockwave plane) */}
            <mesh
              rotation-x={-Math.PI / 2}
              position-y={0.06}
              scale={[radius, radius, 1]}
              geometry={getSharedCircleGeometry(1, 40)}
            >
              <meshBasicMaterial
                color={s.color}
                transparent
                opacity={opacity * 0.5}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Thin leading edge ring — the crisp shockwave line */}
            <mesh
              rotation-x={-Math.PI / 2}
              position-y={0.075}
              scale={[radius, radius, 1]}
              geometry={getSharedCircleGeometry(0.98, 48)}
            >
              <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={opacity * 0.9}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Central impact flash (bright core that fades fast) */}
            <mesh
              position-y={0.25}
              scale={[1 + t * 3, 1 + t * 3, 1 + t * 3]}
              geometry={getSharedSphereGeometry(0.09, 12, 12)}
            >
              <meshBasicMaterial
                color="#dffff5"
                transparent
                opacity={flashOpacity}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
