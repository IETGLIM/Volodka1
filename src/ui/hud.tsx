/**
 * HUD и оверлеи — AAA-уровень: мини-карта, счёт, карма, комбо, босс-бар,
 * урон-цифры, сенсорное управление, инвентарь, навыки, достижения.
 */
import { useEffect, useRef, useState } from 'react';
import type { HudState, DialogueView, CutsceneView, ToastMsg, JournalData, DamageNumber } from '../game/types';
import { POEM_TITLE } from '../game/poems';

/* ---------- typewriter ---------- */
function useTypewriter(text: string, speed = 18) {
  const [len, setLen] = useState(0);
  const complete = len >= text.length;
  useEffect(() => {
    setLen(0);
    if (speed <= 0) { setLen(text.length); return; }
    const iv = window.setInterval(() => {
      setLen((l) => { if (l >= text.length) { window.clearInterval(iv); return l; } return l + 1; });
    }, speed);
    return () => window.clearInterval(iv);
  }, [text, speed]);
  return { text: text.slice(0, len), complete, skip: () => setLen(text.length) };
}

/* ---------- Minimap ---------- */
export function MiniMap({ miniMap, objectiveDist }: { miniMap: HudState['miniMap']; objectiveDist: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
    const size = 132; c.width = size; c.height = size;
    ctx.clearRect(0, 0, size, size);
    // фон
    const bg = ctx.createRadialGradient(size/2, size/2, 10, size/2, size/2, 64);
    bg.addColorStop(0, 'rgba(20,28,56,0.96)'); bg.addColorStop(1, 'rgba(10,14,30,0.88)');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(size/2, size/2, 62, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(242,193,78,0.35)'; ctx.lineWidth = 2; ctx.stroke();
    // сетка
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(size/2 + i*18, 14); ctx.lineTo(size/2 + i*18, size-14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14, size/2 + i*18); ctx.lineTo(size-14, size/2 + i*18); ctx.stroke();
    }
    if (miniMap.length === 0) return;
    const player = miniMap.find(m => m.kind === 'player'); if (!player) return;
    const scale = 2.2; // meters to px
    const px = (x:number)=> size/2 + (x - player.x)*scale;
    const pz = (z:number)=> size/2 + (z - player.z)*scale;
    // зоны
    miniMap.forEach(ent=>{
      if(ent.kind==='loot'){ const x=px(ent.x), z=pz(ent.z); if(Math.hypot(x-size/2, z-size/2)>58) return;
        ctx.fillStyle='#ffe9a0'; ctx.globalAlpha=0.85; ctx.beginPath(); ctx.arc(x, z, 2.2,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
      }
    });
    // objective
    miniMap.forEach(ent=>{
      if(ent.kind==='objective'){ const x=px(ent.x), z=pz(ent.z); const inside=Math.hypot(x-size/2,z-size/2)<=60;
        if(inside){ ctx.fillStyle='#7fd8ff'; ctx.shadowColor='#7fd8ff'; ctx.shadowBlur=8; ctx.beginPath(); ctx.arc(x,z,5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
          ctx.fillStyle='#0b0f1e'; ctx.font='bold 8px sans-serif'; ctx.fillText('◈',x-4,z+3);
        } else {
          // стрелка на краю
          const ang=Math.atan2(ent.z-player.z, ent.x-player.x); const edgeX=size/2+Math.cos(ang)*56; const edgeZ=size/2+Math.sin(ang)*56;
          ctx.fillStyle='#7fd8ff'; ctx.beginPath(); ctx.arc(edgeX, edgeZ,4,0,Math.PI*2); ctx.fill();
        }
      }
    });
    // NPCs
    miniMap.forEach(ent=>{
      if(ent.kind==='npc'){ const x=px(ent.x), z=pz(ent.z); if(Math.hypot(x-size/2,z-size/2)>60) return;
        ctx.fillStyle='#9acb80'; ctx.beginPath(); ctx.arc(x,z,3.2,0,Math.PI*2); ctx.fill();
      }
    });
    // enemies
    miniMap.forEach(ent=>{
      if(ent.kind==='enemy' && ent.alive){ const x=px(ent.x), z=pz(ent.z); if(Math.hypot(x-size/2,z-size/2)>62) return;
        ctx.fillStyle='#ff6a6a'; ctx.beginPath(); ctx.arc(x,z,2.8,0,Math.PI*2); ctx.fill();
      }
      if(ent.kind==='boss' && ent.alive){ const x=px(ent.x), z=pz(ent.z); if(Math.hypot(x-size/2,z-size/2)>62) return;
        ctx.fillStyle='#ff2040'; ctx.shadowColor='#ff2040'; ctx.shadowBlur=10; ctx.beginPath(); ctx.arc(x,z,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      }
    });
    // player
    ctx.fillStyle='#f2c14e'; ctx.shadowColor='#f2c14e'; ctx.shadowBlur=12; ctx.beginPath(); ctx.arc(size/2, size/2,5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    // компас
    ctx.strokeStyle='rgba(242,193,78,0.6)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(size/2, size/2-7); ctx.lineTo(size/2, size/2-12); ctx.stroke();
  }, [miniMap, objectiveDist]);
  return (
    <div className="glass rounded-full p-1.5 shadow-[0_0_20px_rgba(242,193,78,0.18)]">
      <canvas ref={ref} width={132} height={132} className="rounded-full" style={{ width: 132, height: 132 }} />
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f2c14e] px-1.5 py-0.5 text-[9px] font-bold text-black">С</div>
    </div>
  );
}

/* ---------- Damage Numbers ---------- */
export function DamageNumbers({ numbers }: { numbers: DamageNumber[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[32]">
      {numbers.map(d=>(
        <div key={d.id}
          className={`absolute select-none font-black ${d.crit?'text-[#ff4a6a] text-xl':'text-[#ffe9a0] text-sm'}`}
          style={{
            left: `${50 + (d.x % 40)}%`,
            top: `${45 + (d.z % 30)}%`,
            transform: `translate(-50%, ${-d.t*55}px) scale(${d.crit?1.35:1})`,
            opacity: Math.max(0, d.t/1.1),
            textShadow: d.crit ? '0 0 12px rgba(255,60,90,0.9), 0 2px 0 rgba(0,0,0,0.8)' : '0 0 8px rgba(242,193,78,0.9), 0 1px 0 rgba(0,0,0,0.8)',
            transition: 'transform 0.08s linear',
          }}
        >
          {d.crit ? '💥' : ''} {d.crit ? `${d.value}!` : `-${d.value}`}
        </div>
      ))}
    </div>
  );
}

/* ---------- HUD ---------- */
export function HUD({ hud, onInteract }: { hud: HudState | null; onInteract: () => void }) {
  if (!hud) return null;
  const degCl = Math.max(-80, Math.min(80, hud.objDeg));
  const hpPct = hud.maxHp > 0 ? hud.hp / hud.maxHp : 1;
  const xpPct = hud.xpToNext > 0 ? hud.xp / hud.xpToNext : 0;
  const karmaTone = hud.karma > 10 ? '#8fd8ff' : hud.karma < -10 ? '#ff6a6a' : '#f2c14e';
  return (
    <div className="pointer-events-none fixed inset-0 z-30 select-none">
      {/* левый стек квестов + прогрессия */}
      <div className="absolute left-4 top-4 flex flex-col gap-2.5 max-w-[320px]">
        <div className="glass rounded-xl px-4 py-3 quest-card">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#f2c14e]">{hud.objectiveTitle}</div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#f2c14e]/15 px-2 py-0.5 text-[10px] font-bold text-[#f2c14e]">УР {hud.level}</span>
              <span className="text-[10px] text-[#8fa0c8]">{hud.timeLabel} · день {hud.day}</span>
            </div>
          </div>
          <div className="mt-1.5 text-sm leading-snug text-[#efe9d8]">{hud.objectiveText}</div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-black/45">
            <div className="h-full bg-gradient-to-r from-[#f2c14e] to-[#ffe9a0] transition-all duration-700" style={{ width: `${xpPct*100}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-[#8fa0c8]">
            <span>✦ Опыт {hud.xp}/{hud.xpToNext}</span>
            {hud.skillPoints>0 && <span className="text-[#f2c14e] font-bold animate-pulse">● {hud.skillPoints} очков</span>}
          </div>
        </div>

        {/* очки и карма */}
        <div className="flex gap-2">
          <div className="glass flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-[#f5eeda]">
            <span className="text-[#f2c14e]">◈</span> {hud.score.toLocaleString('ru-RU')}
            <span className="ml-1 text-[10px] text-[#8fa0c8]">лучший {hud.bestScore}</span>
          </div>
          <div className="glass rounded-full px-3 py-1.5 text-xs font-bold" style={{ color: karmaTone }}>
            ☯ {hud.karma>0?'+':''}{hud.karma}
          </div>
          {hud.combo>1 && (
            <div className="glass rounded-full bg-[#ff4a6a]/15 border-[#ff4a6a]/40 px-3 py-1.5 text-xs font-black text-[#ff6a6a] animate-pulse">
              КОМБО x{hud.combo} {hud.comboTimer.toFixed(1)}с
            </div>
          )}
        </div>

        {/* фракции */}
        <div className="glass flex gap-2 rounded-full px-3 py-1 text-[10px] text-[#9fb0d8]">
          {Object.entries(hud.factionReps).map(([k,v])=>(
            <span key={k} className={v>10?'text-[#8fd8ff]': v<-5?'text-[#ff6a6a]':''}>{k}: {v>0?'+':''}{v}</span>
          ))}
        </div>
      </div>

      {/* правый стек — HP, лут, мини-карта */}
      <div className="absolute right-4 top-4 flex flex-col items-end gap-2.5">
        <div className="relative">
          <MiniMap miniMap={hud.miniMap} objectiveDist={hud.objDist} />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-[#f5eeda]">{Math.round(hud.objDist)}м до цели</div>
        </div>

        <div className="glass flex w-[200px] flex-col gap-1.5 rounded-xl px-3.5 py-2.5">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-[#8fa0c8]">
            <span>Здоровье</span><span className={hpPct<0.3?'text-[#ff6a6a] animate-pulse':''}>{Math.round(hud.hp)}/{hud.maxHp}</span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-black/55">
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
            <div className="h-full transition-all duration-300 ease-out" style={{ width: `${hpPct*100}%`, background: hpPct>0.5? 'linear-gradient(90deg,#f2c14e,#ffe9a0)' : hpPct>0.25? 'linear-gradient(90deg,#e88a4a,#f2c14e)' : 'linear-gradient(90deg,#e84a4a,#ff6a6a)', boxShadow: hpPct<0.3? '0 0 12px rgba(255,60,80,0.7)':'' }} />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.35)_50%,transparent_100%)] opacity-40" style={{ transform:`translateX(${hpPct*180-10}px)`, transition:'transform 0.3s' }} />
          </div>
          <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] font-semibold text-[#f5eeda]">
            <span>📜 {hud.stanzas}/{hud.totalStanzas}</span>
            <span>✨ {hud.fireflies}/{hud.totalFireflies}</span>
            <span>🏮 {hud.lanterns}/{hud.totalLanterns}</span>
          </div>
        </div>

        {hud.enemies>0 && (
          <div className={`glass rounded-full px-3.5 py-1.5 text-xs font-semibold ${hud.isBossFight?'bg-[#ff2040]/15 border-[#ff4a6a]/50 text-[#ff6a7a] animate-pulse':'text-[#ff8a6a]'}`}>
            {hud.isBossFight ? '👑 БОСС' : '👁 ТЕНИ'} {hud.enemies}
          </div>
        )}

        {(hud.lootEssence>0 || hud.lootBerries>0 || hud.lootShards>0 || hud.lootBark>0) && (
          <div className="glass flex flex-wrap gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#f5eeda]">
            <span className="text-[#8fd8ff]">✦ {hud.lootEssence}</span>
            <span className="text-[#e87970]">● {hud.lootBerries}</span>
            <span className="text-[#b7a8ff]">◆ {hud.lootShards}</span>
            <span className="text-[#9acb80]">❧ {hud.lootBark}</span>
          </div>
        )}

        <div className="glass rounded-full px-2.5 py-1 text-[10px] text-[#8fa0c8]">⚙ {hud.weather} · {hud.fps} кадр/с · {hud.dangerLevel>0.5?'🌧 дождь':''}</div>
      </div>

      {/* компас */}
      {hud.objDist>4 && (
        <div className="absolute left-1/2 top-4 flex -translate-x-1/2 flex-col items-center">
          <div className="relative h-9 w-[280px] rounded-full bg-black/25 backdrop-blur">
            <div className="absolute inset-x-3 top-1/2 h-px bg-white/12" />
            <div className="absolute left-1/2 top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-[#f2c14e]/70" />
            <div className="absolute top-1/2 -translate-y-1/2 transition-transform duration-300" style={{ left:`calc(50% + ${(degCl/90)*42}% - 6px)` }}>
              <div className="h-3 w-3 rotate-45 bg-[#f2c14e] shadow-[0_0_10px_rgba(242,193,78,0.9)]" style={{ clipPath:'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
            </div>
          </div>
        </div>
      )}

      {/* босс-бар внизу */}
      {hud.isBossFight && (
        <div className="absolute bottom-24 left-1/2 flex w-[min(88vw,560px)] -translate-x-1/2 flex-col items-center gap-2">
          <div className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-[0.2em]">
            <span className="text-[#ff4a6a]">{hud.bossName}</span>
            <span className="text-[#ff8a9a]">{Math.round(hud.bossHp)}/{hud.bossMax}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-black/60 p-0.5">
            <div className="h-full rounded-full bg-gradient-to-r from-[#ff1a3a] to-[#ff8a4a] transition-all duration-200" style={{ width:`${(hud.bossHp/hud.bossMax)*100}%`, boxShadow:'0 0 16px rgba(255,40,70,0.6)' }} />
          </div>
        </div>
      )}

      {/* управление */}
      <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-2">
        <div className="glass rounded-full px-3 py-1.5 text-[11px] text-[#e9e4d4]">🪄 <b>ЛКМ</b>/<b>F</b> атака</div>
        <div className="glass rounded-full px-3 py-1.5 text-[11px] text-[#e9e4d4]"><b>Space</b> прыжок · <b>V</b> кувырок · <b>R</b> рябина</div>
        <div className="glass hidden md:flex rounded-full px-3 py-1.5 text-[11px] text-[#8fa0c8]">Shift бег · J журнал · I инвентарь · K навыки</div>
      </div>

      {/* рыбалка */}
      {hud.fishing && (
        <div className="pointer-events-none absolute bottom-28 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5">
          <div className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 backdrop-blur-sm transition-colors ${hud.fishing.phase==='bite'?'border-[#ff6a5a] bg-[#ff6a5a]/20':'border-[#7fd8ff]/60 bg-[#7fd8ff]/10'}`}>
            <span className={`text-2xl ${hud.fishing.phase==='bite'?'animate-ping text-[#ff8a7a]':'text-[#7fd8ff]'}`}>🎣</span>
            {hud.fishing.phase==='bite' && <span className="absolute inset-0 animate-ping rounded-full border-2 border-[#ff6a5a]/60" />}
          </div>
          {hud.fishing.phase==='bite' && <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#ff8a7a]">Клюёт! Жми E</span>}
        </div>
      )}

      {/* подсказка взаимодействия */}
      {hud.prompt && (
        <button onClick={onInteract} className="prompt-pill pointer-events-auto absolute bottom-24 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full px-5 py-2.5 text-[#f5eeda] hover:scale-[1.03] transition-transform">
          <span className="text-lg leading-none">{hud.prompt.icon}</span>
          <span className="text-sm font-semibold tracking-wide">{hud.prompt.text}</span>
          <span className="keycap">E</span>
        </button>
      )}

      <DamageNumbers numbers={hud.damageNumbers} />
    </div>
  );
}

/* ---------- Управление подсказка ---------- */
export function ControlsHint({ visible }: { visible: boolean }) {
  const [show, setShow] = useState(visible);
  useEffect(() => { if (!visible) return; const t = setTimeout(() => setShow(false), 28000); return () => clearTimeout(t); }, [visible]);
  if (!visible || !show) return null;
  return (
    <div className="glass fade-in pointer-events-none absolute bottom-4 right-4 z-30 hidden md:block rounded-xl px-4 py-3 text-[11px] leading-relaxed text-[#b9c4e0] max-w-[420px]">
      <div className="mb-1 font-bold text-[#f2c14e] text-[10px] tracking-widest uppercase">Управление — AAA-раскладка</div>
      <div className="flex flex-wrap gap-1.5 text-[#f5eeda]">
        <span className="keycap">WASD</span> идти <span className="keycap">⇧</span> бег <span className="keycap">Space</span> прыжок <span className="keycap">V</span> кувырок
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        <span className="keycap">ЛКМ</span>/<span className="keycap">F</span> комбо x3 <span className="keycap">R</span> рябина <span className="keycap">E</span> действие <span className="keycap">J</span> журнал
      </div>
      <div className="mt-1 text-[#8fa0c8]">Мышь — камера · Колесо — дистанция · Тап — сенсорное управление внизу</div>
    </div>
  );
}

/* ---------- Touсh Controls (мобилки) ---------- */
export function TouchControls({
  onMove, onCam, onAction,
}: {
  onMove: (x: number, z: number) => void;
  onCam: (dx: number, dy: number) => void;
  onAction: (a: 'jump' | 'roll' | 'attack' | 'interact' | 'berry') => void;
}) {
  const joyRef = useRef<HTMLDivElement>(null);
  const [joyActive, setJoyActive] = useState(false);
  const joyCenter = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = joyRef.current; if (!el) return;
    const rect = () => el.getBoundingClientRect();
    const handleMove = (clientX: number, clientY: number) => {
      const r = rect(); const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
      let dx = clientX - cx; let dy = clientY - cy; const dist = Math.hypot(dx, dy); const max = 48;
      if (dist > max) { dx = (dx / dist) * max; dy = (dy / dist) * max; }
      const nx = dx / max; const nz = dy / max;
      onMove(nx, -nz);
      const knob = el.querySelector('.joy-knob') as HTMLElement; if (knob) { knob.style.transform = `translate(${dx}px, ${dy}px)`; }
    };
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]; if (!t) return; setJoyActive(true); joyCenter.current = { x: t.clientX, y: t.clientY }; handleMove(t.clientX, t.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]; if (!t) return; e.preventDefault(); handleMove(t.clientX, t.clientY);
      // камера если свайп справа
      if (t.clientX > window.innerWidth * 0.55) { onCam((t.clientX - joyCenter.current.x) * 0.02, (t.clientY - joyCenter.current.y) * 0.02); }
    };
    const onTouchEnd = () => {
      setJoyActive(false); onMove(0, 0); const knob = el.querySelector('.joy-knob') as HTMLElement; if (knob) knob.style.transform = 'translate(0,0)';
    };
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => { el.removeEventListener('touchstart', onTouchStart); el.removeEventListener('touchmove', onTouchMove); el.removeEventListener('touchend', onTouchEnd); el.removeEventListener('touchcancel', onTouchEnd); };
  }, [onMove, onCam]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-between gap-2 p-3 md:hidden">
      <div ref={joyRef} className={`pointer-events-auto relative h-[110px] w-[110px] rounded-full border ${joyActive ? 'border-[#f2c14e]/60 bg-[#f2c14e]/10' : 'border-white/15 bg-black/30'} backdrop-blur-sm`}>
        <div className="joy-knob absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-white/20 to-white/5 border border-white/20 shadow-[0_4px_18px_rgba(0,0,0,0.4)] transition-transform" />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-white/40">ДВИЖЕНИЕ</div>
      </div>
      <div className="pointer-events-auto flex flex-col gap-2">
        <div className="flex gap-2">
          <button onTouchStart={() => onAction('roll')} className="h-12 w-12 rounded-full bg-black/45 border border-[#8fd8ff]/40 text-[#8fd8ff] font-bold backdrop-blur">⤿</button>
          <button onTouchStart={() => onAction('jump')} className="h-12 w-12 rounded-full bg-black/45 border border-white/20 text-white font-bold backdrop-blur">↑</button>
        </div>
        <div className="flex gap-2">
          <button onTouchStart={() => onAction('interact')} className="h-12 w-12 rounded-full bg-[#f2c14e]/15 border border-[#f2c14e]/40 text-[#f2c14e] font-bold backdrop-blur">E</button>
          <button onTouchStart={() => onAction('attack')} className="h-14 w-14 rounded-full bg-[#ff4a6a]/20 border border-[#ff4a6a]/50 text-[#ff8a9a] text-xl font-black shadow-[0_0_18px_rgba(255,60,90,0.35)] backdrop-blur">⚔</button>
        </div>
        <button onTouchStart={() => onAction('berry')} className="h-9 w-full rounded-full bg-[#e87970]/15 border border-[#e87970]/30 text-[#e87970] text-[11px] font-bold backdrop-blur">● Рябина</button>
      </div>
    </div>
  );
}

/* ---------- тосты ---------- */
export function Toasts({ toasts }: { toasts: ToastMsg[] }) {
  return (
    <div className="pointer-events-none fixed bottom-5 left-5 z-30 flex flex-col gap-2 max-w-[84vw]">
      {toasts.map((t) => (
        <div key={t.id} className="toast-anim glass flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-[#f5eeda] shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          <span className="text-lg leading-none">{t.icon}</span><span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- достижения ---------- */
export function Achievements({ items }: { items: { id: number; title: string; desc: string; icon: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-20 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {items.map(a => (
        <div key={a.id} className="glass flex items-center gap-3 rounded-full border-[#f2c14e]/50 bg-[#f2c14e]/10 px-5 py-2.5 text-sm text-[#ffe9a0] animate-[toastIn_0.5s_both, bannerIn_4s_1s_both] shadow-[0_0_24px_rgba(242,193,78,0.35)]">
          <span className="text-xl">{a.icon}</span>
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-bold uppercase tracking-widest text-[#f2c14e]">Достижение</span>
            <span className="font-semibold">{a.title} — {a.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BannerView({ banner }: { banner: { text: string; id: number } | null }) {
  if (!banner) return null;
  return (
    <div key={banner.id} className="pointer-events-none fixed inset-x-0 top-[22%] z-40 flex justify-center">
      <div className="banner-anim flex flex-col items-center gap-3 px-6 text-center">
        <div className="text-[#f2c14e] tracking-[0.6em] text-sm">✦ ✦ ✦</div>
        <h2 className="font-display text-gold-grad text-4xl md:text-6xl font-bold tracking-[0.28em] uppercase drop-shadow-[0_4px_24px_rgba(242,193,78,0.35)]">{banner.text}</h2>
        <div className="ornament-line w-56" />
      </div>
    </div>
  );
}

export function DialogueBox({ view, onNext, onChoose }: { view: DialogueView; onNext: () => void; onChoose: (idx: number) => void; }) {
  const { text, complete, skip } = useTypewriter(view.text, 18);
  const handleClick = () => { if (!complete) { skip(); return; } if (view.choices.length === 0) onNext(); };
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-6">
      <div className="glass pointer-events-auto w-full max-w-2xl cursor-pointer rounded-2xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]" onClick={handleClick}>
        <div className="flex items-start gap-4">
          {view.portrait ? <img src={view.portrait} alt={view.speaker} className="h-16 w-16 shrink-0 rounded-full border-2 border-[#f2c14e]/50 object-cover shadow-[0_0_20px_rgba(242,193,78,0.25)]" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[#f2c14e]/40 bg-[#1a2140] text-2xl">✦</div>}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-[#f2c14e]">{view.speaker}</div>
            <p className="font-display mt-1.5 min-h-[3.4em] text-lg leading-relaxed text-[#f5eeda] md:text-xl">{text}{!complete && <span className="caret" />}</p>
          </div>
        </div>
        {complete && view.choices.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-white/10 pt-3">
            {view.choices.map((c, i) => (
              <button key={i} className="btn-ghost !text-[#f2c14e] !border-[#f2c14e]/40 hover:!bg-[#f2c14e]/10 rounded-full" onClick={(e) => { e.stopPropagation(); onChoose(c.idx); }}>{c.label} →</button>
            ))}
          </div>
        )}
        {complete && view.choices.length === 0 && <div className="mt-2 text-right text-[11px] uppercase tracking-[0.25em] text-[#8fa0c8]">кликни, чтобы продолжить ▸</div>}
      </div>
    </div>
  );
}

export function CutsceneOverlay({ view, onNext, onSkip }: { view: CutsceneView; onNext: () => void; onSkip: () => void; }) {
  const { text, complete, skip } = useTypewriter(view.text, 22);
  const { text: verseText, complete: verseDone, skip: verseSkip } = useTypewriter(view.verse ?? '', 30);
  const handleClick = () => { if (view.verse) { if (!verseDone) { verseSkip(); return; } } else if (!complete) { skip(); return; } onNext(); };
  return (
    <div className="letterbox-on fixed inset-0 z-[60] cursor-pointer" onClick={handleClick}>
      <div className="letterbox-top" /><div className="letterbox-bottom" />
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 pt-5">
        <div className="flex items-center gap-1.5">{Array.from({ length: view.total }).map((_, i) => (<span key={i} className={`h-1.5 w-6 rounded-full ${i <= view.idx ? 'bg-[#f2c14e]' : 'bg-white/20'}`} />))}</div>
        <button className="btn-ghost rounded-full" onClick={(e) => { e.stopPropagation(); onSkip(); }}>Пропустить ⏭</button>
      </div>
      {view.verse ? (
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div className="parchment rise-in w-full max-w-lg rounded-2xl px-8 py-7 text-center shadow-[0_30px_90px_rgba(0,0,0,0.7)]">
            <div className="text-[11px] uppercase tracking-[0.4em] text-[#8a6a2e]">✦ {POEM_TITLE} ✦</div>
            <div className="mt-1 text-[11px] italic tracking-widest text-[#8a6a2e]">— {view.speaker} —</div>
            <p className="font-display mt-4 whitespace-pre-line text-xl leading-relaxed font-medium text-[#3a2c14]">{verseText}{!verseDone && <span className="caret" />}</p>
            <div className="mt-5 text-[10px] uppercase tracking-[0.3em] text-[#8a6a2e]/70">{view.idx + 1} / {view.total}</div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center px-6 pb-14">
          <div className="max-w-3xl text-center">
            {view.portrait ? <img src={view.portrait} alt={view.speaker} className="mx-auto mb-3 h-14 w-14 rounded-full border-2 border-[#f2c14e]/50 object-cover" /> : <div className="font-display text-sm uppercase tracking-[0.4em] text-[#f2c14e]">{view.speaker}</div>}
            <p className="font-display text-xl leading-relaxed text-[#f5eeda] drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] md:text-2xl">{text}{!complete && <span className="caret" />}</p>
            <div className="mt-4 text-[10px] uppercase tracking-[0.3em] text-white/40">{view.idx + 1} / {view.total} · клик — дальше</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function JournalModal({ data, onClose }: { data: JournalData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#04060f]/60 backdrop-blur-[3px]" onClick={onClose}>
      <div className="parchment fade-in flex max-h-[88vh] w-[min(94vw,760px)] flex-col rounded-2xl shadow-[0_40px_120px_rgba(0,0,0,0.7)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-[#3a2c14]/20 px-8 pb-4 pt-6">
          <div><h2 className="font-display text-3xl font-bold">Журнал странника</h2><p className="mt-1 text-xs uppercase tracking-[0.3em] text-[#8a6a2e]">{data.timeLabel} · день {data.day}</p></div>
          <button className="btn-ghost !border-[#3a2c14]/30 !text-[#3a2c14] rounded-full" onClick={onClose}>✕ (Esc)</button>
        </div>
        <div className="overflow-y-auto px-8 py-6">
          <h3 className="font-display text-2xl font-bold text-[#5a3f16]">{POEM_TITLE}</h3>
          <div className="mt-4 flex flex-col gap-4">
            {data.stanzas.map((s, i) => (
              <div key={i} className={`rounded-xl border p-4 ${s.found ? 'border-[#3a2c14]/25 bg-[#3a2c14]/5' : 'border-dashed border-[#3a2c14]/20 bg-transparent'}`}>
                <div className="flex items-center justify-between gap-3"><span className="font-display text-lg font-semibold text-[#5a3f16]">{s.found ? s.title : 'Строка ещё в долине'}</span><span className="text-[11px] italic text-[#8a6a2e]">{s.found ? s.place : '· · ·'}</span></div>
                {s.found ? <p className="font-display mt-2 whitespace-pre-line text-[17px] leading-relaxed italic text-[#3a2c14]">{s.lines.join('\n')}</p> : <p className="font-display mt-2 text-[17px] italic text-[#8a6a2e]/60">«...скоро здесь зазвучат строки...»</p>}
              </div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#3a2c14]/20 p-4"><h4 className="text-xs font-bold uppercase tracking-[0.25em] text-[#8a6a2e]">Дары долины</h4><p className="mt-2 text-sm">✨ Светлячки — {data.fireflies}/{data.totalFireflies}</p><p className="mt-1 text-sm">🏮 Фонари — {data.lanterns}/{data.totalLanterns}</p><p className="mt-2 text-xs italic text-[#8a6a2e]">Собери 12 огоньков — Милица приготовила награду.</p></div>
            <div className="rounded-xl border border-[#3a2c14]/20 p-4"><h4 className="text-xs font-bold uppercase tracking-[0.25em] text-[#8a6a2e]">Спутники</h4><p className="mt-2 text-sm">{data.metStarets ? '☀ Старец — благословил путь' : '☀ Старец — ждёт у дуба'}</p><p className="mt-1 text-sm">{data.catBack ? '🐱 Барсик — дома, мурчит' : '🐱 Барсик — гуляет у пруда'}</p><p className="mt-1 text-sm">🐐 Маланья — страж мельничного холма</p></div>
          </div>
          {data.finale && <div className="mt-5 rounded-xl border border-[#3a2c14]/30 bg-[#f2c14e]/15 p-4 text-center"><p className="font-display text-lg italic">«Сказка рассказана. Строки снова вместе — и теперь они навсегда твои.»</p></div>}
        </div>
      </div>
    </div>
  );
}

export function InventoryModal({ hud, onClose, onUseBerry }: { hud: HudState; onClose: () => void; onUseBerry: () => void }) {
  return (
    <div className="fixed inset-0 z-[52] flex items-center justify-center bg-[#04060f]/60 backdrop-blur-[3px]" onClick={onClose}>
      <div className="glass fade-in w-[min(94vw,560px)] rounded-2xl p-6 shadow-[0_30px_90px_rgba(0,0,0,0.6)]" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="font-display text-2xl font-bold text-[#f5eeda]">Инвентарь странника</h2><button className="btn-ghost rounded-full" onClick={onClose}>✕</button></div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-black/25 p-4 border border-white/10">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#8fa0c8]">Ресурсы</div>
            <div className="mt-3 flex flex-col gap-2 text-sm text-[#f5eeda]">
              <div className="flex justify-between"><span>✦ Эхо строки</span><span className="font-bold text-[#8fd8ff]">{hud.lootEssence}</span></div>
              <div className="flex justify-between"><span>● Рябина</span><span className="font-bold text-[#e87970]">{hud.lootBerries}</span></div>
              <div className="flex justify-between"><span>◆ Лунный осколок</span><span className="font-bold text-[#b7a8ff]">{hud.lootShards}</span></div>
              <div className="flex justify-between"><span>❧ Живая кора</span><span className="font-bold text-[#9acb80]">{hud.lootBark}</span></div>
            </div>
            <button onClick={onUseBerry} className="btn-hero mt-4 justify-center !py-2 text-base"><span>●</span> Съесть рябину (+38 HP)</button>
          </div>
          <div className="rounded-xl bg-black/25 p-4 border border-white/10">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#8fa0c8]">Снаряжение</div>
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center gap-3 rounded-lg bg-[#1a2140]/60 p-2.5 border border-[#f2c14e]/20">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#2a3a62] to-[#1c2749] flex items-center justify-center text-[#9fe8ff]">🪄</div>
                <div><div className="text-sm font-semibold text-[#f5eeda]">Посох сказаний</div><div className="text-[11px] text-[#8fa0c8]">Урон +{12+hud.level*2} · крит {12+Math.min(20,hud.combo)}%</div></div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-black/20 p-2.5 border border-white/10">
                <div className="h-10 w-10 rounded-lg bg-black/40 flex items-center justify-center">🧥</div>
                <div><div className="text-sm font-semibold text-[#f5eeda]">Плащ странника</div><div className="text-[11px] text-[#8fa0c8]">Защита +{hud.level*1.5} · карма {hud.karma}</div></div>
              </div>
            </div>
            <div className="mt-4 text-[11px] text-[#8fa0c8] leading-relaxed">Навыки растут с уровнем. Собирай эхо строк, чтобы усиливать посох. Рябина — твой хил.</div>
          </div>
        </div>
        <div className="mt-4 flex justify-end"><button className="btn-ghost rounded-full" onClick={onClose}>Закрыть (I)</button></div>
      </div>
    </div>
  );
}

export function SkillsModal({ hud, onClose }: { hud: HudState; onClose: () => void }) {
  const skills = [
    { id:'fury', name:'Ярость строк', icon:'⚔️', desc:'+8% урон за комбо-ур.', lvl: Math.floor(hud.combo/3), max:5 },
    { id:'ward', name:'Кокон света', icon:'🛡️', desc:'+6% защита, пока светлячков >6', lvl: hud.fireflies>6? Math.min(3,Math.floor(hud.fireflies/4)):0, max:3 },
    { id:'fleet', name:'Ветроступ', icon:'💨', desc:'+4% скорость, ускорение бега', lvl: Math.min(5, hud.level-1), max:5 },
    { id:'lore', name:'Память долины', icon:'📜', desc:'+10% опыт за строки', lvl: hud.stanzas, max:6 },
  ];
  return (
    <div className="fixed inset-0 z-[52] flex items-center justify-center bg-[#04060f]/60 backdrop-blur-[3px]" onClick={onClose}>
      <div className="glass fade-in w-[min(94vw,620px)] rounded-2xl p-6" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="font-display text-2xl font-bold text-[#f5eeda]">Навыки Володьки</h2><div className="flex items-center gap-2"><span className="rounded-full bg-[#f2c14e]/20 px-3 py-1 text-xs font-bold text-[#f2c14e]">Очков: {hud.skillPoints}</span><button className="btn-ghost rounded-full" onClick={onClose}>✕</button></div></div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {skills.map(s=>(
            <div key={s.id} className="rounded-xl bg-black/30 border border-white/10 p-4">
              <div className="flex items-center gap-3"><span className="text-xl">{s.icon}</span><span className="font-semibold text-[#f5eeda]">{s.name}</span><span className="ml-auto text-[11px] text-[#8fa0c8]">{s.lvl}/{s.max}</span></div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/50"><div className="h-full bg-[#f2c14e] transition-all" style={{ width:`${(s.lvl/s.max)*100}%` }} /></div>
              <div className="mt-2 text-[11px] leading-snug text-[#b9c4e0]">{s.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-xl bg-[#f2c14e]/10 border border-[#f2c14e]/20 p-3 text-[11px] text-[#e9d9ae]">Уровень {hud.level} · Опыт {hud.xp}/{hud.xpToNext} · Очков осталось {hud.skillPoints}. Навыки пассивно усиливают Володьку — играй, чтобы прокачать.</div>
      </div>
    </div>
  );
}
