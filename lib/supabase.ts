import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = url && key && !url.includes('YOUR_PROJECT') && !key.includes('YOUR_SUPABASE') ? createClient(url, key) : null;
