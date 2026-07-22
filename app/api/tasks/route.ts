import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { redis } from '@/lib/redis';

const CACHE_KEY = 'all_tasks';

// READ
export async function GET() {
  try {
    const cachedTasks = await redis.get(CACHE_KEY);
    if (cachedTasks) {
      return NextResponse.json({ data: cachedTasks, source: 'redis' });
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    await redis.set(CACHE_KEY, data, { ex: 60 });
    return NextResponse.json({ data, source: 'supabase' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

// CREATE
export async function POST(request: Request) {
  try {
    const { title } = await request.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: 'El título es requerido' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ title: title.trim() }])
      .select()
      .single();

    if (error) throw error;

    await redis.del(CACHE_KEY);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}