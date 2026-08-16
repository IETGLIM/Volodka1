/**
 * Экраны: загрузка, меню, пауза, настройки, о сказке, финал, таблица рекордов.
 * Только русский язык — интерфейс долины.
 */
import { useState } from 'react';
import type { Settings, GameOverData } from '../game/types';

export function BootScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] cursor-pointer select-none" onClick={onEnter}>
      <picture className="absolute inset-0 h-full w-full">
        <source srcSet="art/boot-wide.jpg" media="(min-aspect-ratio: 4/3)" />
        <img src="art/boot.png" alt="Володька" className="boot-zoom absolute inset-0 h-full w-full object-cover" />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-t from-[#05070f] via-[#05070f]/30 to-[#05070f]/60" />
      <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_40%,transparent_60%,rgba(0,0,0,0.55)_100%)]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <div className="rise-in text-[#f2c14e] tracking-[0.6em] text-sm font-semibold mb-5">✦ &nbsp;СКАЗКА О ПОТЕРЯННЫХ СТРОКАХ · РАСШИРЕННОЕ ИЗДАНИЕ&nbsp; ✦</div>
        <h1 className="font-display text-gold-grad rise-in text-6xl md:text-8xl font-bold tracking-wide" style={{ animationDelay: '0.15s' }}>ВОЛОДЬКА</h1>
        <div className="rise-in ornament-line w-64 my-6" style={{ animationDelay: '0.3s' }} />
        <p className="rise-in font-display italic text-xl md:text-2xl text-[#e9e4d4]/90 max-w-[560px]" style={{ animationDelay: '0.4s' }}>Поэт потерял свои стихи. Долина кишит тенями. Остался посох, огонёк и ты.</p>
        <div className="rise-in mt-8 flex flex-wrap justify-center gap-2 text-[11px] text-[#9fb0d8]" style={{ animationDelay: '0.5s' }}>
          <span className="glass rounded-full px-3 py-1">⚔️ Боссы</span>
          <span className="glass rounded-full px-3 py-1">🗺️ Мини-карта</span>
          <span className="glass rounded-full px-3 py-1">📈 Прокачка</span>
          <span className="glass rounded-full px-3 py-1">🎮 Джойстик + клавиатура</span>
          <span className="glass rounded-full px-3 py-1">60 кадр/с</span>
        </div>
        <div className="rise-in mt-12 flex flex-col items-center gap-2" style={{ animationDelay: '0.6s' }}>
          <span className="pulse-soft text-[#f5eeda] text-lg tracking-[0.2em] uppercase">нажми, чтобы войти в сказку</span>
          <span className="text-[#9fb0d8] text-xs">клавиатура, геймпад и сенсор — поддерживаются · лучше в наушниках</span>
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-4 py-1.5 text-[10px] text-[#8fa0c8] backdrop-blur">ВАСД — идти · ЛКМ атака · Пробел прыжок · В кувырок · Е действие · Й журнал · И инвентарь</div>
    </div>
  );
}

export function MainMenu({ hasSave, progress, bestScore, highscores, onContinue, onNewGame, onSettings, onAbout }: { hasSave: boolean; progress: { lines: number; finale: boolean } | null; bestScore: number; highscores: { score: number; day: number; stanzas: number; date: string }[]; onContinue: () => void; onNewGame: () => void; onSettings: () => void; onAbout: () => void; }) {
  const [confirmNew, setConfirmNew] = useState(false);
  const [showScores, setShowScores] = useState(false);
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-gradient-to-r from-[#04060f]/92 via-[#04060f]/55 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_20%_50%,rgba(242,193,78,0.08),transparent_60%)]" />
      <div className="relative z-10 flex h-full flex-col justify-center pl-[6vw] pr-8">
        <div className="fade-in mb-3 flex items-center gap-3 text-[#f2c14e]/80 text-sm tracking-[0.5em]"><span className="ornament-line w-14" /> ПЕРВЫЙ ЭПИЗОД · УЛУЧШЕННОЕ ИЗДАНИЕ</div>
        <h1 className="font-display text-gold-grad fade-in text-6xl md:text-7xl font-bold leading-none tracking-wide drop-shadow-[0_4px_30px_rgba(242,193,78,0.25)]">ВОЛОДЬКА</h1>
        <p className="font-display italic fade-in mt-2 text-xl md:text-2xl text-[#d9cfa8]">сказка о потерянных строках — где боится только тот, кто забыл</p>
        <div className="mt-4 flex flex-wrap gap-2 max-w-[420px]">
          <div className="glass rounded-full px-3 py-1 text-[11px] text-[#f5eeda]">Лучший счёт: <span className="text-[#f2c14e] font-bold">{bestScore.toLocaleString('ru-RU')}</span></div>
          {progress && <div className="glass rounded-full px-3 py-1 text-[11px] text-[#f5eeda]">📜 {progress.lines}/6 {progress.finale?'· финал':''}</div>}
          <div className="glass rounded-full px-3 py-1 text-[11px] text-[#9fb0d8]">⚔️ боссы · карта · прокачка · 60 кадр/с</div>
        </div>
        <div className="mt-8 flex w-80 flex-col gap-3">
          {hasSave && <button className="btn-hero" onClick={onContinue}><span>⟳</span> Продолжить путь {progress && <span className="ml-auto text-[11px] font-normal tracking-normal text-[#e9c97a]/90">{progress.finale ? '✦ финал' : `📜 ${progress.lines}/6`}</span>}</button>}
          {!confirmNew ? <button className="btn-hero" onClick={() => (hasSave ? setConfirmNew(true) : onNewGame())}><span>✦</span> Новая сказка</button> : <div className="glass rounded-xl p-4 fade-in"><p className="text-sm text-[#e9e4d4] leading-snug">Начать с начала? Прежний путь сотрётся безвозвратно.</p><div className="mt-3 flex gap-2"><button className="btn-ghost flex-1 justify-center rounded-full" onClick={() => setConfirmNew(false)}>Отмена</button><button className="btn-ghost flex-1 justify-center !text-[#f2c14e] rounded-full" onClick={onNewGame}>Стереть и начать</button></div></div>}
          <button className="btn-hero" onClick={() => setShowScores(v => !v)}><span>🏆</span> Рекорды {showScores ? '▲' : '▼'}</button>
          <button className="btn-hero" onClick={onSettings}><span>♫</span> Настройки</button>
          <button className="btn-hero" onClick={onAbout}><span>?</span> О сказке</button>
        </div>
        {showScores && <div className="glass mt-4 w-[min(84vw,380px)] rounded-xl p-4 fade-in max-h-[34vh] overflow-y-auto"><div className="text-xs font-bold uppercase tracking-[0.28em] text-[#f2c14e] mb-2">Таблица рекордов</div>{highscores.length===0 ? <div className="text-sm text-[#8fa0c8]">Пока пусто — стань первым!</div> : <div className="flex flex-col gap-1.5">{highscores.map((h,i)=><div key={i} className="flex items-center justify-between rounded-lg bg-black/25 px-3 py-2 text-xs"><span className="font-bold text-[#f2c14e]">#{i+1}</span><span className="text-[#f5eeda] font-bold">{h.score}</span><span className="text-[#8fa0c8]">📜 {h.stanzas} · День {h.day}</span><span className="text-[#5f6d95] text-[10px]">{h.date}</span></div>)}</div>}</div>}
        <div className="fade-in absolute bottom-6 left-[6vw] right-8 flex flex-wrap items-end justify-between gap-3 text-[11px] text-[#8b9ac0]/80" style={{ animationDelay: '0.4s' }}>
          <div className="flex flex-col gap-1 max-w-[520px]"><span>стихи — Владимир Лебедев · мир, код и звук — братский союз · улучшенное издание</span><span className="text-[#5f6d95]">управление: клавиатура + мышь + геймпад + сенсор — плавно, с инерцией и кувырками</span></div>
          <span className="text-[#5f6d95]">издание 5.0 · карта · боссы · комбо · 60 кадр/с</span>
        </div>
      </div>
    </div>
  );
}

export function PauseMenu({ onResume, onSettings, onMenu, onRestart }: { onResume: () => void; onSettings: () => void; onMenu: () => void; onRestart: () => void; }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#04060f]/60 backdrop-blur-[4px]">
      <div className="glass fade-in w-[min(92vw,400px)] rounded-2xl p-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
        <div className="text-[#f2c14e] text-sm tracking-[0.4em] mb-1">❖</div>
        <h2 className="font-display text-3xl text-[#f5eeda] mb-1">Пауза</h2>
        <p className="text-[11px] text-[#9fb0d8] mb-6 tracking-widest uppercase">долина ждёт тебя</p>
        <div className="flex flex-col gap-3">
          <button className="btn-hero justify-center rounded-full" onClick={onResume}><span>▶</span> Вернуться</button>
          <button className="btn-hero justify-center rounded-full" onClick={onRestart}><span>⟲</span> Быстрый рестарт</button>
          <button className="btn-hero justify-center rounded-full" onClick={onSettings}><span>♫</span> Настройки</button>
          <button className="btn-hero justify-center rounded-full" onClick={onMenu}><span>☾</span> В главное меню</button>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2 text-[10px] text-[#8fa0c8]"><span className="glass rounded-full py-1">Й журнал</span><span className="glass rounded-full py-1">И инвентарь</span><span className="glass rounded-full py-1">К навыки</span></div>
      </div>
    </div>
  );
}

export function GameOverScreen({ data, highscores, onRestart, onMenu }: { data: GameOverData; highscores: { score:number; day:number; stanzas:number; date:string }[]; onRestart: () => void; onMenu: () => void; }) {
  const isWin = data.isWin;
  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-[#04060f]/80 backdrop-blur-[6px] p-4">
      <div className="glass fade-in w-[min(96vw,520px)] rounded-[22px] p-7 shadow-[0_30px_120px_rgba(0,0,0,0.7)] border border-[#f2c14e]/20">
        <div className="text-center">
          <div className={`text-5xl ${isWin?'':'animate-bounce'}`}>{isWin?'✦':'💀'}</div>
          <h2 className={`font-display mt-2 text-4xl font-bold ${isWin?'text-gold-grad':'text-[#ff8a9a]'}`}>{isWin?'Сказка рассказана!':'Володька пал...'}</h2>
          <p className="mt-2 text-[13px] uppercase tracking-[0.3em] text-[#8fa0c8]">{isWin?'Долина свободна и помнит тебя':'Тени оказались сильнее — но долина вернёт тебя'}</p>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-black/35 border border-white/10 p-3 text-center"><div className="text-[10px] uppercase tracking-widest text-[#8fa0c8]">Счёт</div><div className="mt-1 text-xl font-black text-[#f2c14e]">{data.score.toLocaleString('ru-RU')}</div><div className="text-[11px] text-[#5f6d95]">лучший {data.best}</div></div>
          <div className="rounded-xl bg-black/35 border border-white/10 p-3 text-center"><div className="text-[10px] uppercase tracking-widest text-[#8fa0c8]">Убито</div><div className="mt-1 text-xl font-bold text-[#f5eeda]">{data.kills}</div><div className="text-[11px] text-[#5f6d95]">теней</div></div>
          <div className="rounded-xl bg-black/35 border border-white/10 p-3 text-center"><div className="text-[10px] uppercase tracking-widest text-[#8fa0c8]">Строки</div><div className="mt-1 text-xl font-bold text-[#f5eeda]">{data.stanzas}/6</div><div className="text-[11px] text-[#5f6d95]">✨ {data.fireflies}</div></div>
        </div>
        <div className="mt-5 flex gap-2"><button className="btn-hero flex-1 justify-center rounded-full text-lg" onClick={onRestart}><span>⟲</span> Рестарт мгновенно</button><button className="btn-ghost flex-1 justify-center rounded-full" onClick={onMenu}>Меню</button></div>
        {highscores.length>0 && <div className="mt-6"><div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#f2c14e] mb-2">Топ рекордов</div><div className="grid max-h-[18vh] gap-1 overflow-y-auto pr-1">{highscores.slice(0,5).map((h,i)=><div key={i} className={`flex justify-between rounded-full px-3 py-1.5 text-xs ${h.score===data.score?'bg-[#f2c14e]/15 border border-[#f2c14e]/30 text-[#ffe9a0]':'bg-black/25 text-[#8fa0c8]'}`}><span>#{i+1} {h.score}</span><span>📜 {h.stanzas}</span><span>{h.date}</span></div>)}</div></div>}
        <div className="mt-4 text-center text-[11px] text-[#5f6d95]">Нажми Р для рестарта · Эск — меню · Пробел — продолжить</div>
      </div>
    </div>
  );
}

export function SettingsModal({ settings, onChange, onClose }: { settings: Settings; onChange: (s: Settings) => void; onClose: () => void; }) {
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#04060f]/60 backdrop-blur-[4px]" onClick={onClose}>
      <div className="glass fade-in w-[min(92vw,440px)] rounded-2xl p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6"><h2 className="font-display text-3xl text-[#f5eeda]">Настройки</h2><button className="btn-ghost rounded-full" onClick={onClose}>✕</button></div>
        <div className="flex flex-col gap-5">
          <label className="block"><span className="text-xs uppercase tracking-[0.25em] text-[#9fb0d8]">Музыка — {Math.round(settings.music * 100)}</span><input type="range" min={0} max={100} value={Math.round(settings.music * 100)} onChange={(e) => set({ music: Number(e.target.value) / 100 })} className="mt-2 w-full accent-[#f2c14e]" /></label>
          <label className="block"><span className="text-xs uppercase tracking-[0.25em] text-[#9fb0d8]">Звуки — {Math.round(settings.sfx * 100)}</span><input type="range" min={0} max={100} value={Math.round(settings.sfx * 100)} onChange={(e) => set({ sfx: Number(e.target.value) / 100 })} className="mt-2 w-full accent-[#f2c14e]" /></label>
          <div><span className="text-xs uppercase tracking-[0.25em] text-[#9fb0d8]">Качество (для 60 кадр/с)</span><div className="mt-2 grid grid-cols-2 gap-2">{(['high','low'] as const).map((q) => (<button key={q} className={`btn-ghost justify-center rounded-full ${settings.quality === q ? '!border-[#f2c14e]/70 !text-[#f2c14e]' : ''}`} onClick={() => set({ quality: q })}>{q === 'high' ? 'Высокое · сияние' : 'Экономное · 60 кадр/с'}</button>))}</div><div className="mt-2 text-[11px] text-[#5f6d95]">Высокое включает сияние, мягкие тени и отражения. Экономное — для слабых устройств и стабильных 60 кадров.</div></div>
          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={settings.hints} onChange={(e) => set({ hints: e.target.checked })} className="accent-[#f2c14e] w-4 h-4" /><span className="text-sm text-[#e9e4d4]">Подсказки управления в начале пути</span></label>
        </div>
        <div className="mt-6 flex justify-end"><button className="btn-ghost rounded-full" onClick={onClose}>Закрыть</button></div>
      </div>
    </div>
  );
}

export function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#04060f]/60 backdrop-blur-[4px]" onClick={onClose}>
      <div className="parchment fade-in w-[min(92vw,600px)] max-h-[88vh] overflow-y-auto rounded-2xl p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between"><h2 className="font-display text-3xl font-bold">О сказке — издание 5</h2><button className="btn-ghost !text-[#3a2c14] !border-[#3a2c14]/30 rounded-full" onClick={onClose}>✕</button></div>
        <div className="mt-4 space-y-3 text-[15px] leading-relaxed">
          <p><b>Володька</b> — поэт, чья баллада разлетелась по долине. Теперь долина живая: тени бродят маршрутами, босс Хранитель Строк охраняет лунную поляну, жители патрулируют и реагируют, а ты — с инерцией и кувырками, комбо и атмосферой.</p>
          <div className="rounded-xl bg-[#3a2c14]/5 border border-[#3a2c14]/15 p-3 text-[13px]"><b>Новое в издании:</b> плавная физика ускорения и торможения, кувырок с неуязвимостью, босс с фазами и волной, опасные зоны (топь, вода, алтарь), мини-карта с компасом, счёт и карма, уровень и очки, инвентарь и навыки, таблица рекордов, джойстик, цифры урона и тряска, достижения, фракции, 60 кадров оптимизация.</div>
        </div>
        <div className="mt-5 ornament-line !bg-[#3a2c14]/30" />
        <h3 className="font-display text-xl font-bold mt-4 mb-2">Управление</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <span><b>ВАСД</b> — идти (инерция)</span><span><b>Шифт / джойстик</b> — бег</span>
          <span><b>Пробел</b> — прыжок</span><span><b>В</b> — кувырок</span>
          <span><b>ЛКМ / Ф / ⚔</b> — комбо x3</span><span><b>Р / ●</b> — рябина +38 здоровья</span>
          <span><b>Мышь / свайп</b> — камера</span><span><b>Колесо / щипок</b> — приближение</span>
          <span><b>Е</b> — действие</span><span><b>Й</b> — журнал</span>
          <span><b>И</b> — инвентарь</span><span><b>К</b> — навыки</span>
          <span><b>Эск</b> — пауза и рестарт</span><span><b>М</b> — карта</span>
        </div>
        <div className="mt-5 ornament-line !bg-[#3a2c14]/30" />
        <p className="mt-4 text-sm italic">Стихи — Владимир Лебедев. Мир собран процедурно, без загрузок, с частицами, туманом, дождём и живым небом. Оптимизировано под веб: маленький пакет, 60 кадров на мобилках.</p>
      </div>
    </div>
  );
}
