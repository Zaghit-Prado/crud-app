import { supabase } from "@/lib/supabase";
import { redis }    from "@/lib/redis";
import { NextResponse } from "next/server";

const CACHE_KEY = "usuarios:all";

async function invalidateCache() {
  try {
    await redis.del(CACHE_KEY);
  } catch (e) {
    console.error("Redis invalidate error:", e);
  }
}

// Declaramos el tipo correcto para Next.js 15
type RouteContext = { params: Promise<{ id: string }> };

// ── PUT /api/users/[id] ──
export async function PUT(req: Request, { params }: RouteContext) {
  // Extraemos el id usando await
  const { id } = await params; 

  const body = await req.json();
  const { nombre, email, telefono, dni } = body;

  if (!nombre?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: "Nombre y email son obligatorios." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("usuarios")
    .update({
      nombre:   nombre.trim(),
      email:    email.trim(),
      telefono: telefono || null,
      dni:      dni || null,
    })
    .eq("id", id) // Usamos la variable id extraída arriba
    .select()
    .single();

  if (error) {
    const msg =
      error.code === "23505"
        ? "El email o DNI ya está registrado."
        : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  await invalidateCache();
  return NextResponse.json({ data });
}

// ── DELETE /api/users/[id] ──
export async function DELETE(_: Request, { params }: RouteContext) {
  // Extraemos el id usando await
  const { id } = await params;

  const { error } = await supabase
    .from("usuarios")
    .delete()
    .eq("id", id); // Usamos la variable id extraída arriba

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await invalidateCache();
  return NextResponse.json({ success: true });
}