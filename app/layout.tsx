import type { Metadata } from 'next';
import './globals.css';
import Shell from '@/components/shell';
export const metadata: Metadata = { title:'Anime Battle Arena', description:'A fan-made character collection and 1v1 battle simulation prototype.' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body><Shell>{children}</Shell></body></html> }
