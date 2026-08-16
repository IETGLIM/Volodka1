/**
 * ВОЛОДЬКА v5 AAA — оркестрация	canvas + HUD + новые системы.
 * Старт, счёт, пауза, game-over с рестартом, рекорды, инвентарь, навыки, сенсор.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Game, loadSettings } from './game/engine';
import type { GameEvents, HudState, DialogueView, CutsceneView, ToastMsg, Settings, JournalData, GameOverData, AchievementToast } from './game/types';
import { BootScreen, MainMenu, PauseMenu, SettingsModal, AboutModal, GameOverScreen } from './ui/screens';
import { HUD, DialogueBox, CutsceneOverlay, Toasts, BannerView, JournalModal, ControlsHint, TouchControls, Achievements, InventoryModal, SkillsModal } from './ui/hud';

type Phase = 'boot' | 'menu' | 'game';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);

  const [phase, setPhase] = useState<Phase>('boot');
  const [hud, setHud] = useState<HudState | null>(null);
  const [dialogue, setDialogue] = useState<DialogueView | null>(null);
  const [cutscene, setCutscene] = useState<CutsceneView | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [achieves, setAchieves] = useState<{ id:number; title:string; desc:string; icon:string }[]>([]);
  const [banner, setBanner] = useState<{ text:string; id:number }|null>(null);
  const [fade, setFade] = useState(0);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalData, setJournalData] = useState<JournalData|null>(null);
  const [invOpen, setInvOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [gameOver, setGameOver] = useState<GameOverData|null>(null);
  const [settings, setSettings] = useState<Settings>(()=>loadSettings());
  const [hasSave, setHasSave] = useState(false);
  const [menuProgress, setMenuProgress] = useState<{ lines:number; finale:boolean }|null>(null);
  const [bestScore, setBestScore] = useState(0);
  const [highscores, setHighscores] = useState<{score:number; day:number; stanzas:number; date:string}[]>([]);
  const [shake, setShake] = useState<{x:number;y:number}>({x:0,y:0});
  const toastId = useRef(0);

  const refreshMenuMeta = useCallback(()=>{
    const g=gameRef.current; if(!g) return;
    setHasSave(g.hasSave()); setMenuProgress(g.hasSave()?g.getMenuProgress():null);
    setBestScore(g.getBestScore?.()??0); setHighscores(g.getHighscores?.()??[]);
  },[]);

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const events: GameEvents = {
      hud: setHud,
      dialogue: setDialogue,
      cutscene: setCutscene,
      toast: (t)=>{
        const id=++toastId.current;
        setToasts(prev=>[...prev.slice(-4), {...t, id}]);
        window.setTimeout(()=>setToasts(prev=>prev.filter(x=>x.id!==id)), 4000);
      },
      achievement: (a: AchievementToast)=>{
        setAchieves(prev=>[...prev.slice(-2), { id:a.id, title:a.title, desc:a.desc, icon:a.icon }]);
        window.setTimeout(()=>setAchieves(prev=>prev.filter(x=>x.id!==a.id)), 5500);
      },
      banner: (text)=>setBanner({ text, id:Date.now() }),
      fade: setFade,
      pause: setPauseOpen,
      journal: (open)=>{
        setJournalOpen(open);
        if(open) setJournalData(gameRef.current?.getJournalData()??null);
      },
      gameOver: (data)=>{
        setGameOver(data);
        setBestScore(data.best);
        setHighscores(gameRef.current?.getHighscores?.()??[]);
      },
      screenShake: (intensity, duration)=>{
        const start=performance.now();
        const tick=()=>{
          const elapsed=(performance.now()-start)/1000;
          if(elapsed>=duration){ setShake({x:0,y:0}); return; }
          const falloff=1-elapsed/duration;
          const x=(Math.random()*2-1)*intensity*22*falloff;
          const y=(Math.random()*2-1)*intensity*18*falloff;
          setShake({x,y});
          requestAnimationFrame(tick);
        };
        tick();
      },
      damageNumber: (_)=>{ /* handled via hud miniMap array */ },
    };
    const game=new Game(canvas, events);
    gameRef.current=game;
    refreshMenuMeta();
    return ()=>{ game.dispose(); gameRef.current=null; };
  }, [refreshMenuMeta]);

  // Esc и глобальные хоткеи
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if(e.code==='KeyI' && phase==='game' && !gameOver && !cutscene){ setInvOpen(v=>!v); if(!invOpen) gameRef.current?.audio.click(); }
      if(e.code==='KeyK' && phase==='game' && !gameOver && !cutscene){ setSkillsOpen(v=>!v); if(!skillsOpen) gameRef.current?.audio.click(); }
      if(e.code==='KeyR' && gameOver){ doRestart(); }
      if(e.code==='Escape'){
        if(journalOpen){ setJournalOpen(false); gameRef.current?.setJournalOpen(false); return; }
        if(invOpen){ setInvOpen(false); return; }
        if(skillsOpen){ setSkillsOpen(false); return; }
        if(gameOver){ setGameOver(null); gameRef.current?.toMenu(); setPhase('menu'); refreshMenuMeta(); return; }
      }
    };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  }, [phase, journalOpen, invOpen, skillsOpen, gameOver, refreshMenuMeta]);

  const enterBoot=()=>{
    const g=gameRef.current; if(!g) return; g.audio.unlock(); g.startMenu(); setPhase('menu'); refreshMenuMeta();
  };
  const newGame=()=>{
    const g=gameRef.current; if(!g) return; g.newGame(); setPhase('game'); setHasSave(true); setGameOver(null); setInvOpen(false); setSkillsOpen(false); setHighscores(g.getHighscores?.()??[]);
  };
  const continueGame=()=>{
    const g=gameRef.current; if(!g) return; g.continueGame(); setPhase('game'); setGameOver(null);
  };
  const doRestart=()=>{
    const g=gameRef.current; if(!g) return;
    if(gameOver){ setGameOver(null); g.newGame(); setPhase('game'); }
    else { g.restartQuick?.(); setPauseOpen(false); }
  };
  const toMenu=()=>{
    gameRef.current?.toMenu(); setPhase('menu'); setPauseOpen(false); setGameOver(null); setJournalOpen(false); setInvOpen(false); setSkillsOpen(false); refreshMenuMeta();
  };
  const updateSettings=(s:Settings)=>{ setSettings(s); gameRef.current?.setSettings(s); };
  const openSettings=()=>{ setSettingsOpen(true); gameRef.current?.audio.click(); };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0b0f1e] touch-manipulation">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ transform:`translate(${shake.x}px, ${shake.y}px)`, transition: shake.x===0&&shake.y===0 ? 'transform 0.12s ease-out' : 'none' }} />

      <div className="vignette" />
      <div className="pointer-events-none fixed inset-0 z-[70] bg-black" style={{ opacity: fade }} />

      {/* игра */}
      {phase==='game' && !cutscene && !gameOver && <HUD hud={hud} onInteract={()=>gameRef.current?.doInteract()} />}
      {phase==='game' && <ControlsHint visible={phase==='game' && !cutscene && !gameOver} />}
      {phase==='game' && !cutscene && !gameOver && !journalOpen && !invOpen && !skillsOpen && (
        <TouchControls onMove={(x,z)=>gameRef.current?.setTouchMove(x,z)} onCam={(dx,dy)=>gameRef.current?.setTouchCam(dx,dy)} onAction={(a)=>gameRef.current?.touchAction(a)} />
      )}

      <Toasts toasts={toasts} />
      <Achievements items={achieves} />
      <BannerView banner={banner} />

      {/* диалог */}
      {dialogue && !cutscene && !gameOver && <DialogueBox view={dialogue} onNext={()=>gameRef.current?.dialogueNext()} onChoose={(i)=>gameRef.current?.dialogueChoose(i)} />}

      {/* катсцена */}
      {cutscene && <CutsceneOverlay view={cutscene} onNext={()=>gameRef.current?.cutsceneNext()} onSkip={()=>gameRef.current?.cutsceneSkip()} />}

      {/* журнал */}
      {journalOpen && journalData && <JournalModal data={journalData} onClose={()=>{ setJournalOpen(false); gameRef.current?.setJournalOpen(false); }} />}

      {/* инвентарь */}
      {invOpen && hud && <InventoryModal hud={hud} onClose={()=>setInvOpen(false)} onUseBerry={()=>gameRef.current?.touchAction('berry')} />}

      {/* навыки */}
      {skillsOpen && hud && <SkillsModal hud={hud} onClose={()=>setSkillsOpen(false)} />}

      {/* пауза */}
      {phase==='game' && pauseOpen && !journalOpen && !invOpen && !skillsOpen && !gameOver && (
        <PauseMenu onResume={()=>gameRef.current?.resume()} onSettings={openSettings} onMenu={toMenu} onRestart={doRestart} />
      )}

      {/* game over */}
      {gameOver && <GameOverScreen data={gameOver} highscores={highscores} onRestart={doRestart} onMenu={toMenu} />}

      {/* настройки */}
      {settingsOpen && <SettingsModal settings={settings} onChange={updateSettings} onClose={()=>setSettingsOpen(false)} />}

      {/* о сказке */}
      {aboutOpen && <AboutModal onClose={()=>setAboutOpen(false)} />}

      {/* меню */}
      {phase==='menu' && <MainMenu hasSave={hasSave} progress={menuProgress} bestScore={bestScore} highscores={highscores} onContinue={continueGame} onNewGame={newGame} onSettings={openSettings} onAbout={()=>setAboutOpen(true)} />}

      {/* загрузка */}
      {phase==='boot' && <BootScreen onEnter={enterBoot} />}

      {/* версия и подсказка */}
      {phase==='game' && !cutscene && !gameOver && (
        <div className="pointer-events-none fixed bottom-1 left-1/2 -translate-x-1/2 z-20 hidden md:flex rounded-full bg-black/35 px-3 py-1 text-[10px] text-white/35 backdrop-blur">
          изд.5 · счёт {hud?.score ?? 0} · Й подсказки · И инвентарь · К навыки · Эск пауза · мышь + сенсор + 60 кадр/с
        </div>
      )}
    </div>
  );
}
