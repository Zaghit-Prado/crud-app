import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { redis } from '../../../../lib/redis';

const CACHE_KEY = 'all_notes';
type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { content } = await request.json();

    const { data, error } = await supabase
      .from('calendar_notes')
      .update({ content: content.trim() })
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

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('calendar_notes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await redis.del(CACHE_KEY);
    return NextResponse.json({ message: 'Eliminado correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}