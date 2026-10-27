'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Swords, LayoutGrid, Sparkles, Users, BookOpen, Shield } from 'lucide-react';
const links = [
  {href:'/',label:'Dashboard',icon:LayoutGrid},
  {href:'/characters',label:'Fighters',icon:Users},
  {href:'/gacha',label:'Summon',icon:Sparkles},
  {href:'/battle',label:'Battle Lab',icon:Swords},
  {href:'/collection',label:'Collection',icon:BookOpen}
];
export default function Nav(){
 const path=usePathname();
 return <aside className="sidebar"><Link href="/" className="brand"><span className="brand-mark"><Swords size={22}/></span><span>ANIME<span className="brand-accent"> ARENA</span><small>FIGHTER ARCHIVE</small></span></Link><div className="nav-label">MAIN MENU</div><nav>{links.map(({href,label,icon:Icon})=><Link key={href} href={href} className={`nav-link ${path===href?'active':''}`}><Icon size={18}/><span>{label}</span>{label==='Summon'&&<span className="nav-dot"/>}</Link>)}</nav><div className="sidebar-bottom"><div className="status-icon"><Shield size={17}/></div><div><b>Demo Protocol</b><small>Local preview enabled</small></div><span className="online-dot"/></div><div className="sidebar-foot">POWER IS A QUESTION<br/>OF RULES & CONTEXT.</div></aside>
}
