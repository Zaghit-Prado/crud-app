import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { redis } from '@/lib/redis';

const CACHE_KEY = 'all_expenses';

// GET — Leer todos los gastos
export async function GET() {
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) return NextResponse.json({ data: cached, source: 'redis' });

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('due_date', { ascending: true });

    if (error) throw error;

    await redis.set(CACHE_KEY, data, { ex: 60 });
    return NextResponse.json({ data, source: 'supabase' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

// POST — Crear gasto
export async function POST(request: Request) {
  try {
    const { description, amount, due_date } = await request.json();

    if (!description?.trim() || !amount || !due_date) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        description: description.trim(),
        amount: parseFloat(amount),
        due_date,
      }])
      .select()
      .single();

    if (error) throw error;

    await redis.del(CACHE_KEY);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}