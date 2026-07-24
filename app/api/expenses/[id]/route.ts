import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { redis } from '../../../../lib/redis';

const CACHE_KEY = 'all_expenses';

type RouteContext = { params: Promise<{ id: string }> };

// PUT — Actualizar gasto
export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { description, amount, due_date, paid } = await request.json();

    const updateData: Record<string, unknown> = {};
    if (description !== undefined) updateData.description = description.trim();
    if (amount     !== undefined) updateData.amount    = parseFloat(amount);
    if (due_date   !== undefined) updateData.due_date  = due_date;
    if (paid       !== undefined) updateData.paid      = paid;

    const { data, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await redis.del(CACHE_KEY);
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

// DELETE — Eliminar gasto
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await redis.del(CACHE_KEY);
    return NextResponse.json({ message: 'Eliminado correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}