# ВОЛОДЬКА v5.0 — AAA-полировка

> Дата: 2026-08-16 · Цель: геймплей уровня AAA-студий, 60fps на десктопе и мобилках, мгновенный фан в первые 10 секунд.

## Что исправлено (баги)

- `combat.ts`: исправлен расчёт урона боссов (special-атака теперь корректно наносит урон по площади, а не по старой логике ten/kust)
- `player.ts`: исправлен приоритет операторов в `canMove` (hit-stop и тяжёлая атака ранее игнорировались из-за приоритета `||`/`&&`)
- `engine.ts`: исправлен каскад респавна при смерти — проверка `playerDead` до нанесения урона, чтобы не спавнить несколько fade-коллбэков
- `loot.ts`: добавлен `getActivePositions()` для мини-карты (отсутствие метода ломало топ-даун отображение лута)
- `screens.tsx`: экранирован `<` в тексте "чанк < 250kb" (JSX парсил `<` как начало тега) — TS1003/1351
- `world.ts` / `organic.ts`: сохранена оптимизация скретч-векторов, чтобы избежать аллокаций 900/сек
- Производительность: DPR capped 1.3 на low, bloom/SSAO отключаются, частицы ограничены, shadowMap выключается

## Что добавлено (фичи AAA)

### A. 3D мир и визуальное качество
- Босс "Хранитель Забытых Строк" (180 HP, 2 фазы, аура, shockwave-кольцо, страницы-венец, уникальные звуки)
- Новый тип моба "Призрак-чтец" (`specter`) — полупрозрачный, летает, ховер-анимация, glow-спрайт
- Опасные зоны: топь, гнилая вода (урон), алтарь луны (хил + бафф) — RingGeometry с пульсацией и опис. логикой
- GodRays / bloom / SSAO уже были, но теперь gated через quality flag; low-tier всегда lite postFX
- Проводник и луч цели с улучшенной интерполяцией (exp decay)

### B. Управление и анимация
- Физика ускорения/торможения: `accel=28`, `decel=34`, `airControl=0.55`, `turnSpeed=14` rad/s
- Coyote time 0.14с + jump buffer 0.16с — прыжок не пропадает на краю
- Кувырок с i-frame, 0.52с длительность, скорость 9.2 м/с, трение при коллизии, squash/stretch
- Камера: follow за игроком, плавное вращение мышью (dx*0.0052, dy*0.0042), зум 2.4–13.5м, bob на бегу, FOV 57.5→66
- Анимации персонажа: idle с дыханием, бег с legSwing, атака 3-комбо (0.38/0.42/0.54с), урон с flicker, roll с TAU-вращением, плащ с sway

### C. Комбат-система 3D
- Комбо x3: урон 13/18/28, range 2.45–3.1м, крит 12%/28%, хитстоп 0.065–0.12с
- Визуальные эффекты: вспышки (burst 10–22 частицы), ударные волны (RingGeometry scale 0.2→8, opacity falloff), screen shake 0.08–0.62 интенсивности
- Анимации врагов: patrol (waypoint или рандом), chase (speed 3.4–4.2), windup, attack, special (area 5.5м), hurt (0.38с), dead (scale 1→0.3)
- Боссы с фазами: phase 2 при <50% HP (speed *1.15, detection 22→26, aura цвет #ff2a4a)
- Урон окружения: DangerZone dmg 6–8 в секунду

### D. NPC и диалоги
- `NpcPatrol` — массив V3 точек, loop/пинг-понг, пауза 0.8–2.8с, движение по маршруту
- Guard и Травник — новые NPC с patrol guard1/travnik1
- Реакция на приближение: yaw к игроку, mood alert, пузырь с текстом
- Система диалогов в 3D: голова NPC + текст-баббл (CanvasTexture 256×128, roundRect, wrapText, billboard lookAt)
- Квестовые маркеры в 3D: ConeGeometry + glow-спрайт, анимация y=2.6+sin(t)*0.12, rotateY 1.2рад/с
- Патрульные маршруты для крипов тоже (`PatrolRoute` в Enemy)

### E. Интерфейс и HUD
- Миникарта: 132×132 canvas, radial gradient фон, сетка, player в центре, objective стрелка на краю, NPC=зелёные, enemy=красные, boss=пульс красный 6px, loot=жёлтые точки
- HP/Karma бары с анимациями: HP bar с градиентом и shimmer (translateX), karma цвет #8fd8ff/#ff6a6a/#f2c14e, XP bar
- Инвентарь (I): ресурсы (эхо/рябина/осколок/кора), снаряжение (посох + уровень, плащ + карма), кнопка "съесть рябину"
- Навыки (K): 4 пассивки (ярость строк, кокон света, ветроступ, память долины) с уровнем/макс и прогресс-баром
- Уведомления: Toasts (до 5, 4с), Achievements (slide + fade 4с), Banner (глава), DamageNumbers (crit 💥, scale 1.35, opacity falloff)
- Адаптивный дизайн: HUD скрывает лишнее на мобилках, TouchControls только md:hidden, glassmorphic стиль, 60fps оптимизации

### F. Контент
- Больше диалогов: Guard ("Держись, Володька"), Травник ("Рябина лечит и душу") с bubble
- Новые локации: алтарь луны (8,58), топь (-6,-42), гнилая вода (31,-20) — с логикой баффа/дебаффа
- Лор: фракции долина/лес/пруд с репутацией (+8 за Старца, +15 за кота, -1 за урон от зон)
- Предметы: лут таблица generoues (essence всегда, shard 24% от ten, berry 48% от kust и т.д.)
- Навыки: уровень растёт от XP (формула 120*1.42^(lvl-1)), maxHP +12 за lvl, skillPoints
- Система репутации фракций: долина 0 старт, лес -5, пруд 10, изменяется от действий

### G. Производительность
- Bundle: 61 модуль, singlefile 1.28MB → 302.7k gzip (под Vercel лимит 450k target, 650k hardMax)
- Оптимизации: DPR low=1.3 high=2, shadows off на low, composer только high, particle pool 700, damageNumbers cap 18, minimap redraw только на изменении objectiveDist
- FPS: rolling average, samples 0.6с, target 60, min 55 desktop, 45 weak laptop, drawCalls <300 по бюджетам
- Touch: pointer events с passive false только для joystick, preventDefault только на move, knob transform translate (GPU-accelerated)

## Архитектура изменений

```
src/game/types.ts
  + MiniMapEntity, DamageNumber, AchievementToast, GameOverData
  + HudState расширяется: score, karma, combo, factionReps, miniMap, damageNumbers, boss, level/xp, fps и т.д.
  + GameEvents + gameOver, achievement, screenShake, damageNumber

src/game/combat.ts
  + EnemyKind |= 'boss' | 'specter'
  + PatrolRoute, phase 1→2, special attack (shockwave), aura, boss-bar
  + takeDamage возвращает {dead, dmg} + crit x1.8

src/game/player.ts
  + Accel/decel физика, coyote/jumpBuffer, blockStamina, idleT
  + Улучшена синхронизация группы и bob

src/game/npcs.ts
  + NpcKind guard/travnik, NpcPatrol interface
  + BubbleGroup (CanvasTexture + Sprite), questMarker (Cone+Glow)
  + Patrol логика, mood alert/happy/talk

src/game/engine.ts
  + TouchMove, TouchCam, setTouchMove, setTouchCam, touchAction
  + Score, karma, level, xp, kills, combo, bestScore, highscores (localStorage BEST_KEY/SCORE_KEY)
  + Boss spawn когда stanzas>=4 или level>=3
  + DangerZones (RingGeometry + pulse)
  + DamageNumbers, Achievements, Factions
  + MiniMap builder, FPS sampler, timeAlive
  + GameOver с saveHighscore, checkWin
  + Оптимизированный луп с exp decay для камеры

src/game/loot.ts
  + getActivePositions() для мини-карты

src/ui/hud.tsx
  + MiniMap canvas, DamageNumbers, TouchControls (joystick + 4 кнопки), Achievements, InventoryModal, SkillsModal
  + HUD с score/karma/combo/faction/boss-bar/xp/мини-картой
  + Полностью русский, mobile-first

src/ui/screens.tsx
  + BootScreen с feature pills (боссы, карта, прокачка, джойстик, 60 кадр/с)
  + MainMenu с bestScore/highscores таблица, улучшенное издание
  + PauseMenu + быстрый рестарт
  + GameOverScreen с рестартом мгновенно, топ рекордов, R/Esc хоткеи
  + SettingsModal с качеством 60 кадр/с, сияние/тени
  + AboutModal с AAA-фичами, управление таблицей

src/App.tsx
  + Фаза boot/menu/game, gameOver state, inv/skills modals, shake state (requestAnimationFrame tick)
  + TouchControls wired, refreshMenuMeta, doRestart, esc/j/i/k/r хоткеи
  + Журнал, инвентарь, навыки — модалки с backdrop blur
  + Версионирование 5.0, счёт в футере

package.json: 4.2.43 → 5.0.0
```

## Полировка

- Все кнопки rounded-full, glassmorphic, hover scale 1.03, pulse/animate-bounce на критичных элементах
- Анимации: rise-in, fade-in, toastIn, bannerIn, rippleRing, bootZoom, caretBlink
- Цвета: gold #f2c14e, accent #ffe9a0, danger #ff4a6a, heal #9acb80, essence #8fd8ff, shard #b7a8ff
- Тени: box-shadow 0 8px 24px rgba(0,0,0,0.35) и 0 0 20px rgba(242,193,78,0.18) для мини-карты
- Сенсор: joystick 110×110, knob 56, border active #f2c14e/60, backdrop-blur, кнопки 48–56px для пальца
- Клавиатура: keycap с gradient #ffe9b0→#f2c14e, border #78540a, shadow 2px + 4px blur

## Проверка размера бандла для Vercel

```
vite build → dist/index.html 1_284.23 kB gzip 302.69 kB
bootJsGzipBytes: target 450k hardMax 650k → PASS (302k)
gameStartJsGzipBytes: target 1.2M hardMax 1.8M → PASS (singlefile)
```

- Singlefile инлайнит JS+CSS в HTML, идеально для Vercel edge cache (immutable)
- 61 модуль, no dynamic import chunk explosion, tree-shaken
- Three.js 0.172.0 (172k parsed), Postprocessing, EffectComposer только high tier

## Как играть (10 секунд фан)

1. Boot → клик → меню → Новая сказка
2. Огненный костёр прямо под ногами, 2 тени в 12м — сразу видна мини-карта с красными точками
3. WASD/джойстик — инерция, Space — прыжок с coyote, ЛКМ — комбо x3 с критами 💥 и тряской
4. Счёт растёт за киллы (+25) и лут (+10), комбо xN +12 за завершение, уровень-ап с хилом
5. Умереть — GameOver с топ рекордов, R — мгновенный рестарт, без загрузки меню

## Дальнейшая разработка (roadmap)

- Больше боссов (по 1 на главу)
- Кооп призраков (другие игроки как specter)
- Фото-режим с DOF
- Погодные боссы (дождь → водный элементаль)
- Репутация фракций влияет на диалоги (ветки)
- Скилл-три с активными способностями (поэтические заклинания)
- Vercel Analytics + Web Vitals

— С любовью, команда Володьки v5
