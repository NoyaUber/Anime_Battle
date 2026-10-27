'use client';

import FighterPortrait from '@/components/fighter-portrait';
import { characters, type Fighter } from '@/lib/characters';
import { getSkills, type BattleSkill } from '@/lib/skills';
import { useEffect, useMemo, useState } from 'react';
import { Swords, RotateCcw, ShieldCheck, Zap, Trophy, X, Heart, Shield, Sparkles } from 'lucide-react';

type LogEntry = { text: string; side: 'player' | 'enemy' | 'system' };
type Outcome = 'win' | 'loss' | null;
const MAX_HP = 100;

export default function Battle() {
  const [a, setA] = useState(characters[1]?.id ?? characters[0].id);
  const [b, setB] = useState(characters[3]?.id ?? characters[1].id);
  const [hpA, setHpA] = useState(MAX_HP);
  const [hpB, setHpB] = useState(MAX_HP);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [turn, setTurn] = useState(1);
  const [winner, setWinner] = useState<Fighter | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [rewardEarned, setRewardEarned] = useState(0);
  const [guardA, setGuardA] = useState(false);
  const [guardB, setGuardB] = useState(false);
  const [cooldownsA, setCooldownsA] = useState<Record<string, number>>({});
  const [cooldownsB, setCooldownsB] = useState<Record<string, number>>({});
  const first = useMemo(() => characters.find(c => c.id === a) ?? characters[0], [a]);
  const second = useMemo(() => characters.find(c => c.id === b) ?? characters[1], [b]);
  const skillsA = useMemo(() => getSkills(first), [first]);
  const skillsB = useMemo(() => getSkills(second), [second]);
  const finished = Boolean(winner);

  function reset(nextA = a, nextB = b) {
    setA(nextA); setB(nextB); setHpA(MAX_HP); setHpB(MAX_HP); setLogs([]); setTurn(1);
    setWinner(null); setOutcome(null); setRewardEarned(0); setGuardA(false); setGuardB(false); setCooldownsA({}); setCooldownsB({});
  }
  useEffect(() => { reset(a, b); // reset the match when either selected fighter changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, b]);

  function finish(winningFighter: Fighter, result: Exclude<Outcome, null>, finalLogs: LogEntry[]) {
    setWinner(winningFighter); setOutcome(result); setLogs(finalLogs);
    if (result === 'win') {
      const reward = 200;
      try {
        const saved = JSON.parse(localStorage.getItem('aba-demo-save') || '{}');
        const credits = typeof saved.credits === 'number' ? saved.credits : 1200;
        localStorage.setItem('aba-demo-save', JSON.stringify({ ...saved, credits: credits + reward }));
        setRewardEarned(reward);
      } catch { setRewardEarned(0); }
    }
  }

  function play(skill: BattleSkill) {
    if (finished || a === b) return;
    if ((cooldownsA[skill.id] ?? 0) > 0) return;
    let nextHpA = hpA, nextHpB = hpB, nextGuardA = guardA, nextGuardB = guardB;
    let nextCooldownsA = { ...cooldownsA }, nextCooldownsB = { ...cooldownsB };
    const nextLogs = [...logs];
    const landed = Math.random() <= skill.accuracy;
    if (skill.kind === 'guard') {
      nextGuardA = true;
      nextLogs.push({ side: 'player', text: `${first.name} takes a defensive stance. The next incoming hit is reduced. ${skill.description}` });
    } else if (!landed) {
      nextLogs.push({ side: 'player', text: `${first.name} uses ${skill.name}, but ${second.name} avoids the attack.` });
    } else {
      let damage = Math.max(4, Math.round(skill.damage * (0.82 + Math.random() * 0.36)));
      if (nextGuardB) { damage = Math.max(2, Math.round(damage * 0.45)); nextGuardB = false; nextLogs.push({ side: 'system', text: `${second.name}'s defensive stance reduces the incoming damage.` }); }
      nextHpB = Math.max(0, nextHpB - damage);
      nextLogs.push({ side: 'player', text: `${first.name} uses ${skill.name} and deals ${damage} damage to ${second.name}.` });
    }
    if (skill.cooldown > 0) nextCooldownsA[skill.id] = skill.cooldown;
    if (nextHpB <= 0) {
      setHpA(nextHpA); setHpB(0); setCooldownsA(nextCooldownsA); setLogs(nextLogs); finish(first, 'win', nextLogs); return;
    }

    // Opponent AI selects a usable attack or guard; no player input is needed for the response.
    const usable = skillsB.filter(s => (nextCooldownsB[s.id] ?? 0) === 0);
    const aiSkill = usable[Math.floor(Math.random() * usable.length)] ?? skillsB[0];
    if (aiSkill.kind === 'guard') {
      nextGuardB = true;
      nextLogs.push({ side: 'enemy', text: `${second.name} uses ${aiSkill.name} and braces for the next hit.` });
    } else if (Math.random() > aiSkill.accuracy) {
      nextLogs.push({ side: 'enemy', text: `${second.name} tries ${aiSkill.name}, but the move misses.` });
    } else {
      let damage = Math.max(4, Math.round(aiSkill.damage * (0.82 + Math.random() * 0.36)));
      if (nextGuardA) { damage = Math.max(2, Math.round(damage * 0.45)); nextGuardA = false; nextLogs.push({ side: 'system', text: `${first.name}'s defensive stance reduces the incoming damage.` }); }
      nextHpA = Math.max(0, nextHpA - damage);
      nextLogs.push({ side: 'enemy', text: `${second.name} answers with ${aiSkill.name} and deals ${damage} damage to ${first.name}.` });
    }
    if (aiSkill.cooldown > 0) nextCooldownsB[aiSkill.id] = aiSkill.cooldown;
    nextCooldownsA = Object.fromEntries(Object.entries(nextCooldownsA).map(([k,v]) => [k, Math.max(0, v - 1)]));
    nextCooldownsB = Object.fromEntries(Object.entries(nextCooldownsB).map(([k,v]) => [k, Math.max(0, v - 1)]));
    setHpA(nextHpA); setHpB(nextHpB); setGuardA(nextGuardA); setGuardB(nextGuardB);
    setCooldownsA(nextCooldownsA); setCooldownsB(nextCooldownsB); setLogs(nextLogs); setTurn(t => t + 1);
    if (nextHpA <= 0) finish(second, 'loss', nextLogs);
  }

  function chooseFighter(which: 'a' | 'b', id: string) {
    if (which === 'a') { setA(id); if (id === b) setB(a); }
    else { setB(id); if (id === a) setA(b); }
  }

  function fighterCard(c: Fighter, side: 'a' | 'b') {
    const isA = side === 'a';
    const hp = isA ? hpA : hpB;
    return <article className={`fighter-select-card ${isA ? 'arena-player' : 'arena-enemy'}`}>
      <div className="select-card-top"><span>{isA ? 'PLAYER FIGHTER' : 'CPU OPPONENT'}</span><span className="side-tag">{isA ? 'SIDE A' : 'SIDE B'}</span></div>
      <label>Choose fighter<select value={isA ? a : b} onChange={e => chooseFighter(side, e.target.value)} disabled={turn > 1 || finished}>{characters.map(x => <option key={x.id} value={x.id}>{x.name} — {x.universe}</option>)}</select></label>
      <FighterPortrait fighter={c} className="battle-avatar" />
      <h2>{c.name}</h2><p>{c.ability}</p>
      <div className="hp-heading"><span><Heart size={13}/> HP</span><b>{hp} / {MAX_HP}</b></div><div className="hp-track"><i style={{ width: `${hp}%` }} /></div>
      <div className="battle-bars">{[['Power',c.power],['Speed',c.speed],['Durability',c.durability]].map(([n,v]) => <div key={n as string}><span>{n}</span><b>{v}</b><i><em style={{ width: `${v}%` }} /></i></div>)}</div>
      {!isA && guardB && <small className="guard-status"><Shield size={12}/> Defensive stance active</small>}
    </article>;
  }

  return <>
    <div className="page-heading"><div><div className="eyebrow">TURN-BASED COMBAT / MATCH ROOM 001</div><h1>Battle <span>Lab</span></h1><p>Choose one of four skills each turn. The opponent responds automatically. Reduce the other fighter's HP to zero to win.</p></div><div className="battle-mode"><Swords size={18}/><div><small>ACTIVE RULESET</small><b>SKILL DUEL · 1V1</b></div></div></div>
    <div className="battle-config">{fighterCard(first, 'a')}<div className="versus"><div className="versus-line"/><span>VS</span><div className="versus-line"/><small>TURN {turn}</small></div>{fighterCard(second, 'b')}</div>
    <section className="skill-panel"><div className="section-head"><div><div className="eyebrow">PLAYER COMMANDS</div><h2>Choose a <span>Skill</span></h2></div><span className="turn-counter">TURN {turn}</span></div>
      {a === b ? <p className="error-note">Choose two different fighters to start a duel.</p> : <div className="skill-grid">{skillsA.map((skill, i) => { const cd = cooldownsA[skill.id] ?? 0; const Icon = skill.kind === 'guard' ? Shield : skill.kind === 'ultimate' ? Sparkles : skill.kind === 'special' ? Zap : Swords; return <button key={skill.id} className={`skill-card skill-${skill.kind}`} onClick={() => play(skill)} disabled={finished || cd > 0}><span className="skill-card-top"><Icon size={18}/><small>SKILL 0{i + 1}</small></span><b>{skill.name}</b><p>{skill.description}</p><span className="skill-card-footer">{skill.kind === 'guard' ? 'DEFENSE' : `${skill.damage} BASE DMG`}<em>{cd > 0 ? `COOLDOWN ${cd}` : `${Math.round(skill.accuracy * 100)}% HIT`}</em></span></button>; })}</div>}
      <div className="battle-actions"><div className="rules-note"><ShieldCheck size={17}/><span><b>Prototype skill combat</b><small>Skill damage and accuracy are game-balance values, not official VSBW statistics.</small></span></div><button className="button button-ghost" onClick={() => reset()}><RotateCcw size={16}/> Restart duel</button></div>
    </section>
    <section className="log-panel"><div className="log-header"><div><div className="eyebrow">MATCH TELEMETRY</div><h2>Battle <span>Log</span></h2></div><span className={`log-status ${finished ? 'complete' : ''}`}><i/>{finished ? 'MATCH COMPLETE' : 'READY FOR ACTION'}</span></div><div className="log-lines">{logs.length ? logs.slice().reverse().map((line,i) => <div className={`log-line log-${line.side}`} key={`${turn}-${i}`}><span>{String(logs.length - i).padStart(2,'0')}</span><p>{line.text}</p></div>) : <div className="log-empty"><Swords size={23}/><p>Choose a skill above to start the first turn.</p></div>}</div></section>
    <p className="disclaimer">Character source links point to VS Battles Wiki profiles. Skill names and descriptions must be checked against the exact profile/version; generic guard and game mechanics are adaptations, not source quotations.</p>
    {outcome && winner && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="battle-result-title"><div className={`result-modal battle-result-modal ${outcome === 'win' ? 'result-win' : 'result-loss'}`}><button className="modal-close" aria-label="Close result" onClick={() => setOutcome(null)}><X size={19}/></button><div className="result-spark">{outcome === 'win' ? <Trophy size={34}/> : <Swords size={34}/>}</div><div className="eyebrow result-eyebrow">MATCH COMPLETE · TURN {turn}</div><h2 id="battle-result-title">{outcome === 'win' ? 'VICTORY' : 'DEFEAT'}</h2><p>{outcome === 'win' ? `${first.name} wins the duel!` : `${first.name} was defeated by ${second.name}.`}</p>{outcome === 'win' && <div className="battle-coin-reward"><span>+{rewardEarned || 200}</span> COINS EARNED</div>}<FighterPortrait fighter={winner} className="result-avatar"/><h3>{winner.name}</h3><p className="result-subtitle">{winner.universe}</p><div className="result-modal-actions"><button className="button button-primary" onClick={() => { reset(); setOutcome(null); }}>Rematch</button><button className="button button-ghost" onClick={() => setOutcome(null)}>View battle log</button></div></div></div>}
  </>;
}
