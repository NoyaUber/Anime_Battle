'use client';
import Nav from './nav';
import Link from 'next/link';
import { UserRound } from 'lucide-react';
import PresenceBeacon from './presence-beacon';
export default function Shell({children}:{children:React.ReactNode}) { return <div className="app-shell"><PresenceBeacon/><Nav/><main className="main-content"><header className="topbar"><div className="breadcrumb">ARENA <span>/</span> <b>CONTROL CENTER</b></div><div className="topbar-right"><span className="status-pill"><i/> SYSTEM ONLINE</span><Link href="/account" className="account-top-link"><UserRound size={15}/><span>Account</span></Link></div></header><div className="page-content">{children}</div><footer className="footer">ANIME BATTLE ARENA <span>•</span> FAN-MADE SIMULATION PROTOTYPE <span className="footer-right">BUILD 0.1.0</span></footer></main></div> }
