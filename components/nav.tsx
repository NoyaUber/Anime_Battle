'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/use-user';
import { Swords, LayoutGrid, Sparkles, Users, BookOpen, Shield, UserRound, DoorOpen, Medal, UserPlus, MessageSquare } from 'lucide-react';
const links = [
  {href:'/',label:'Dashboard',icon:LayoutGrid},
  {href:'/characters',label:'Fighters',icon:Users},
  {href:'/gacha',label:'Summon',icon:Sparkles},
  {href:'/battle',label:'Battle Lab',icon:Swords},
  {href:'/multiplayer',label:'Multiplayer',icon:DoorOpen},
  {href:'/collection',label:'Collection',icon:BookOpen},
  {href:'/profile',label:'Profile & Rank',icon:Medal},
  {href:'/friends',label:'Friends',icon:UserPlus},
  {href:'/chat',label:'Global Chat',icon:MessageSquare},
  {href:'/account',label:'Account',icon:UserRound}
];
export default function Nav(){
 const path=usePathname();
 const {user}=useUser();
 const [pending,setPending]=useState(0);
 useEffect(()=>{
  const sb=supabase; if(!sb||!user){setPending(0);return;}
  let alive=true;
  const run=async()=>{const {count}=await sb.from('friendships').select('id',{count:'exact',head:true}).eq('addressee_id',user.id).eq('status','pending'); if(alive)setPending(count??0);};
  run(); const t=setInterval(run,30000);
  return()=>{alive=false;clearInterval(t)};
 },[user,path]);
 return <aside className="sidebar"><Link href="/" className="brand"><span className="brand-mark"><Swords size={22}/></span><span>ANIME<span className="brand-accent"> ARENA</span><small>FIGHTER ARCHIVE</small></span></Link><div className="nav-label">MAIN MENU</div><nav>{links.map(({href,label,icon:Icon})=><Link key={href} href={href} className={`nav-link ${path===href?'active':''}`}><Icon size={18}/><span>{label}</span>{label==='Summon'&&<span className="nav-dot"/>}{label==='Friends'&&pending>0&&<span className="nav-badge">{pending}</span>}</Link>)}</nav><div className="sidebar-bottom"><div className="status-icon"><Shield size={17}/></div><div><b>Account Ready</b><small>Sign in to sync progress</small></div><span className="online-dot"/></div><div className="sidebar-foot">POWER IS A QUESTION<br/>OF RULES & CONTEXT.</div></aside>
}
