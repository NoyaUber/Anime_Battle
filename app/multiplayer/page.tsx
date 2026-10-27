'use client';

import FighterPortrait from '@/components/fighter-portrait';
import { characters, type Fighter } from '@/lib/characters';
import { getSkills, type BattleSkill } from '@/lib/skills';
import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DoorOpen, Copy, Users, Swords, Trophy, Coins, RefreshCw } from 'lucide-react';

type RoomState = {
  hostFighter: string; guestFighter: string | null; hostHp: number; guestHp: number;
  currentTurnUserId: string; turn: number; logs: string[]; hostGuard: boolean; guestGuard: boolean;
};
type Room = { id: string; room_code: string; host_id: string; guest_id: string | null; status: 'waiting'|'active'|'finished'; state: RoomState; winner_id: string | null; reward_claimed: boolean };

const initialState = (fighter: string, userId: string): RoomState => ({hostFighter:fighter,guestFighter:null,hostHp:100,guestHp:100,currentTurnUserId:userId,turn:1,logs:['Room dibuat. Menunggu teman bergabung.'],hostGuard:false,guestGuard:false});
const makeCode = () => Math.random().toString(36).slice(2,8).toUpperCase();

export default function MultiplayerPage() {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [fighterId, setFighterId] = useState(characters[0].id);
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState<Room|null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [coinsEarned, setCoinsEarned] = useState(0);
  const rewardAttempted = useRef<string>('');
  const fighter = useMemo(() => characters.find(c=>c.id===fighterId) ?? characters[0],[fighterId]);
  const hostFighter = useMemo(() => characters.find(c=>c.id===room?.state.hostFighter) ?? characters[0],[room]);
  const guestFighter = useMemo(() => characters.find(c=>c.id===room?.state.guestFighter) ?? null,[room]);
  const mySide = room ? (room.host_id===userId?'host':'guest') : null;
  const myFighter = mySide==='host' ? hostFighter : guestFighter;
  const enemyFighter = mySide==='host' ? guestFighter : hostFighter;
  const myHp = room ? (mySide==='host'?room.state.hostHp:room.state.guestHp) : 100;
  const enemyHp = room ? (mySide==='host'?room.state.guestHp:room.state.hostHp) : 100;
  const myTurn = Boolean(room && room.status==='active' && room.state.currentTurnUserId===userId);

  const refreshRoom = useCallback(async (id: string) => {
    if (!supabase) return;
    const {data,error:fetchError}=await supabase.from('multiplayer_rooms').select('*').eq('id',id).single();
    if (!fetchError && data) setRoom(data as Room);
  },[]);

  useEffect(() => {
    if (!supabase) return;
    let mounted=true;
    supabase.auth.getSession().then(({data})=>{ if(mounted){setUserId(data.session?.user.id??'');setEmail(data.session?.user.email??'');} });
    const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{setUserId(session?.user.id??'');setEmail(session?.user.email??'');});
    return ()=>{mounted=false;listener.subscription.unsubscribe();};
  },[]);

  useEffect(() => {
    if(!room || !supabase) return;
    const channel=supabase.channel(`aba-room-${room.id}`).on('postgres_changes',{event:'*',schema:'public',table:'multiplayer_rooms',filter:`id=eq.${room.id}`},payload=>{
      if(payload.new) setRoom(payload.new as Room);
    }).subscribe();
    return ()=>{supabase?.removeChannel(channel);};
  },[room?.id]);

  useEffect(() => {
    if(!room || room.status!=='finished' || room.winner_id!==userId || !supabase || rewardAttempted.current===room.id) return;
    rewardAttempted.current=room.id;
    supabase.rpc('claim_multiplayer_reward',{p_room_id:room.id}).then(({data,error:rpcError})=>{
      if(rpcError){setError(`Pertandingan selesai, tetapi hadiah koin gagal diklaim: ${rpcError.message}`);return;}
      setCoinsEarned(Number(data)||0);
      if (Number(data)>0) {
        try { const saved = JSON.parse(localStorage.getItem('aba-demo-save') || '{}'); const credits = typeof saved.credits === 'number' ? saved.credits : 1200; localStorage.setItem('aba-demo-save', JSON.stringify({ ...saved, credits: credits + Number(data) })); } catch {}
      }
      setMessage(Number(data)>0 ? `Menang! ${Number(data)} koin telah ditambahkan ke dompet akun.` : 'Hadiah pertandingan ini sudah pernah diklaim.');
      refreshRoom(room.id);
    });
  },[room?.id,room?.status,room?.winner_id,userId,refreshRoom]);

  async function createRoom(){
    if(!supabase||!userId)return;
    setBusy(true);setError('');setMessage('');
    try{
      let code=makeCode();
      for(let i=0;i<4;i++){
        const {data,error:insertError}=await supabase.from('multiplayer_rooms').insert({room_code:code,host_id:userId,status:'waiting',state:initialState(fighterId,userId)}).select('*').single();
        if(!insertError&&data){setRoom(data as Room);setMessage('Room dibuat. Kirim kode ini kepada temanmu.');return;}
        if(!/duplicate|unique/i.test(insertError?.message||'')) throw insertError||new Error('Gagal membuat room.');
        code=makeCode();
      }
      throw new Error('Tidak berhasil membuat kode unik. Coba lagi.');
    }catch(e){setError(e instanceof Error?e.message:'Gagal membuat room. Pastikan migration multiplayer sudah dijalankan.');}
    finally{setBusy(false);}
  }

  async function joinRoom(){
    if(!supabase||!userId)return;
    setBusy(true);setError('');setMessage('');
    try{
      const {data,error:joinError}=await supabase.rpc('join_multiplayer_room',{p_code:joinCode.trim().toUpperCase(),p_fighter_id:fighterId});
      if(joinError)throw joinError;
      if(!data)throw new Error('Room tidak ditemukan atau sudah penuh.');
      await refreshRoom(String(data));setMessage('Berhasil masuk room. Tunggu giliranmu.');
    }catch(e){setError(e instanceof Error?e.message:'Gagal bergabung. Periksa kode room.');}
    finally{setBusy(false);}
  }

  async function playSkill(skill: BattleSkill){
    if(!room||!supabase||!myTurn||!myFighter||!enemyFighter||room.status!=='active')return;
    setError('');
    const state={...room.state,logs:[...room.state.logs]};
    const mine=mySide==='host'?'host':'guest'; const other=mine==='host'?'guest':'host';
    const hpKey=mine==='host'?'hostHp':'guestHp'; const enemyHpKey=other==='host'?'hostHp':'guestHp';
    const guardKey=mine==='host'?'hostGuard':'guestGuard'; const enemyGuardKey=other==='host'?'hostGuard':'guestGuard';
    let damage=0;
    if(skill.kind==='guard'){
      state[guardKey]=true;state.logs.push(`${myFighter.name} menggunakan ${skill.name} dan bersiap bertahan.`);
    }else if(Math.random()>skill.accuracy){
      state.logs.push(`${myFighter.name} menggunakan ${skill.name}, tetapi serangannya meleset.`);
    }else{
      damage=Math.max(4,Math.round(skill.damage*(0.82+Math.random()*0.36)));
      if(state[enemyGuardKey]){damage=Math.max(2,Math.round(damage*0.45));state[enemyGuardKey]=false;state.logs.push(`${enemyFighter.name} mengurangi damage dengan pertahanan.`);}
      state[enemyHpKey]=Math.max(0,state[enemyHpKey]-damage);
      state.logs.push(`${myFighter.name} menggunakan ${skill.name} dan memberikan ${damage} damage.`);
    }
    state.turn+=1;
    const won=state[enemyHpKey]<=0;
    const update:any={state,status:won?'finished':'active',winner_id:won?userId:null};
    if(!won)state.currentTurnUserId=room.host_id===userId?room.guest_id!:room.host_id;
    else state.logs.push(`${myFighter.name} memenangkan pertandingan!`);
    const {data,error:updateError}=await supabase.from('multiplayer_rooms').update(update).eq('id',room.id).eq('status','active').eq('state->>currentTurnUserId',userId).select('*').maybeSingle();
    if(updateError){setError(updateError.message);return;}
    if(data)setRoom(data as Room);else{setError('Giliran sudah berubah. Room disinkronkan ulang.');await refreshRoom(room.id);}
  }

  async function leaveRoom(){setRoom(null);setMessage('');setError('');setCoinsEarned(0);rewardAttempted.current='';}
  const skills=myFighter?getSkills(myFighter):[];

  return <>
    <div className="page-heading"><div><div className="eyebrow">ONLINE PLAY / PRIVATE MATCH</div><h1>Multi<span>player</span></h1><p>Buat room privat, bagikan kode enam karakter, lalu bergiliran memilih skill melawan teman secara online.</p></div><div className="battle-mode"><Users size={18}/><div><small>GAME MODE</small><b>ONLINE 1V1</b></div></div></div>
    {!supabase ? <section className="room-panel"><h2>Supabase belum dikonfigurasi</h2><p>Isi URL dan anon key Supabase pada environment variables Vercel untuk mengaktifkan room online.</p></section> : !userId ? <section className="room-panel"><h2>Masuk untuk bermain</h2><p>Multiplayer membutuhkan akun Supabase. Masuk atau buat akun terlebih dahulu.</p><a className="button button-primary" href="/account">Buka Account</a></section> : !room ? <div className="room-create-layout">
      <section className="room-panel"><div className="room-icon"><DoorOpen size={24}/></div><div className="eyebrow">HOST A MATCH</div><h2>Create a <span>Room</span></h2><p>Pilih karakter yang akan kamu gunakan. Setelah room dibuat, bagikan kode kepada teman.</p><label className="room-field">Your fighter<select value={fighterId} onChange={e=>setFighterId(e.target.value)}>{characters.map(c=><option value={c.id} key={c.id}>{c.name} — {c.universe}</option>)}</select></label><div className="room-preview"><FighterPortrait fighter={fighter} className="room-fighter-avatar"/><div><b>{fighter.name}</b><small>{fighter.universe} · {fighter.rarity}</small></div></div><button className="button button-primary" disabled={busy} onClick={createRoom}><DoorOpen size={16}/>{busy?'Creating…':'Create private room'}</button></section>
      <section className="room-panel"><div className="room-icon cyan"><Users size={24}/></div><div className="eyebrow">JOIN A MATCH</div><h2>Join with <span>Code</span></h2><p>Masukkan kode room dari teman. Pilih karakter yang ingin kamu gunakan setelah itu.</p><label className="room-field">Your fighter<select value={fighterId} onChange={e=>setFighterId(e.target.value)}>{characters.map(c=><option value={c.id} key={c.id}>{c.name} — {c.universe}</option>)}</select></label><label className="room-field">Room code<input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase().slice(0,6))} placeholder="ABC123" maxLength={6}/></label><button className="button button-ghost" disabled={busy||joinCode.trim().length!==6} onClick={joinRoom}><Users size={16}/>{busy?'Joining…':'Join room'}</button></section>
    </div> : <>
      <section className="room-panel room-active-panel"><div className="room-active-top"><div><div className="eyebrow">PRIVATE ROOM CODE</div><h2>{room.room_code}</h2><p>{room.status==='waiting'?'Waiting for your friend to join…':room.status==='active'?'Both players connected. Take turns using your four skills.':'Match complete.'}</p></div><button className="button button-ghost" onClick={()=>navigator.clipboard?.writeText(room.room_code)}><Copy size={15}/> Copy code</button></div>
        {room.status==='waiting'&&<div className="room-waiting"><RefreshCw size={18}/><span>Bagikan kode <b>{room.room_code}</b> kepada temanmu. Halaman ini akan diperbarui otomatis ketika teman bergabung.</span></div>}
        {room.status!=='waiting'&&<><div className="online-fighters"><article className="online-fighter"><div className="eyebrow">{mySide==='host'?'YOU · HOST':'YOU · GUEST'}</div>{myFighter&&<FighterPortrait fighter={myFighter} className="room-fighter-avatar"/>}<h3>{myFighter?.name??'Loading fighter…'}</h3><div className="online-hp"><i style={{width:`${myHp}%`}}/></div><b>{myHp} / 100 HP</b></article><div className="online-vs">VS<small>TURN {room.state.turn}</small></div><article className="online-fighter enemy"><div className="eyebrow">FRIEND</div>{enemyFighter&&<FighterPortrait fighter={enemyFighter} className="room-fighter-avatar"/>}<h3>{enemyFighter?.name??'Loading fighter…'}</h3><div className="online-hp"><i style={{width:`${enemyHp}%`}}/></div><b>{enemyHp} / 100 HP</b></article></div>
          {room.status==='active'&&<div className="online-skill-area"><div className="section-head"><div><div className="eyebrow">YOUR COMMANDS</div><h2>{myTurn?'Your turn':'Opponent’s turn'}</h2></div><span className="turn-counter">{myTurn?'CHOOSE SKILL':'WAITING'}</span></div>{myTurn?<div className="skill-grid">{skills.map((s,i)=><button key={s.id} className={`skill-card skill-${s.kind}`} onClick={()=>playSkill(s)}><span className="skill-card-top"><Swords size={17}/><small>SKILL 0{i+1}</small></span><b>{s.name}</b><p>{s.description}</p><span className="skill-card-footer">{s.kind==='guard'?'DEFENSE':`${s.damage} BASE DMG`}<em>{Math.round(s.accuracy*100)}% HIT</em></span></button>)}</div>:<div className="room-waiting"><RefreshCw size={18}/><span>Tunggu lawan menyelesaikan gilirannya. Status akan tersinkron otomatis.</span></div>}</div>}
          {room.status==='finished'&&<div className={`room-result ${room.winner_id===userId?'room-victory':'room-defeat'}`}><Trophy size={24}/><div><h3>{room.winner_id===userId?'VICTORY!':'DEFEAT'}</h3><p>{room.winner_id===userId?(coinsEarned>0?`${coinsEarned} koin sudah diklaim.`:'Memproses hadiah koin atau hadiah sudah diklaim.'):'Pertandingan selesai. Coba lagi dengan room baru.'}</p></div><Coins size={20}/></div>}
          <div className="room-log"><div className="eyebrow">LIVE BATTLE LOG</div>{room.state.logs.slice().reverse().map((line,i)=><p key={`${i}-${line}`}>{line}</p>)}</div>
        </>}
        <button className="button button-ghost" onClick={leaveRoom}>Leave room view</button>
      </section>
    </>}
    {(error||message)&&<p className={`account-message ${error?'account-error':'account-success'}`}>{error||message}</p>}
    <p className="disclaimer">Multiplayer membutuhkan migration SQL terbaru dan Supabase Realtime. Ini prototipe kompetitif: game state dikirim melalui database, jadi jangan gunakan sebagai sistem ranking atau ekonomi anti-cheat produksi tanpa validasi aksi di server.</p>
  </>;
}
