    import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { redis } from '@/lib/redis';

const CACHE_KEY = 'all_notes';

export async function GET() {
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) return NextResponse.json({ data: cached, source: 'redis' });

    const { data, error } = await supabase
      .from('calendar_notes')
      .select('*')
      .order('note_date', { ascending: true });

    if (error) throw error;

    await redis.set(CACHE_KEY, data, { ex: 120 });
    return NextResponse.json({ data, source: 'supabase' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { note_date, content } = await request.json();

    if (!note_date || !content?.trim()) {
      return NextResponse.json({ error: 'Fecha y contenido requeridos' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('calendar_notes')
      .insert([{ note_date, content: content.trim() }])
      .select()
      .single();

    if (error) throw error;

    await redis.del(CACHE_KEY);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}