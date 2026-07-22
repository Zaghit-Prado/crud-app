import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { redis } from '../../../../lib/redis';

const CACHE_KEY = 'all_tasks';

// Funciona en Next.js 14 y 15
type RouteContext = { params: Promise<{ id: string }> };

// UPDATE — Actualizar título y/o estado
export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params; // ← FIX: await obligatorio en Next.js 15

    const body = await request.json();
    const { completed, title } = body;

    // Solo actualizar los campos que lleguen
    const updateData: Record<string, unknown> = {};
    if (completed !== undefined) updateData.completed = completed;
    if (title !== undefined) updateData.title = title;

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await redis.del(CACHE_KEY);
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

// DELETE — Eliminar tarea
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params; // ← FIX

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await redis.del(CACHE_KEY);
    return NextResponse.json({ message: 'Eliminado correctamente' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}