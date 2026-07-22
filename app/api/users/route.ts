// Ruta: /app/api/users/route.ts
import { supabase } from "@/lib/supabase";
import { redis }    from "@/lib/redis";
import { NextResponse } from "next/server";

const CACHE_KEY = "usuarios:all";
const CACHE_TTL = 60; // segundos

// ── GET /api/users ──
export async function GET() {
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return NextResponse.json({ data: cached, cached: true });
    }
  } catch (e) {
    console.error("Redis GET error:", e);
  }

  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await redis.set(CACHE_KEY, data, { ex: CACHE_TTL });
  } catch (e) {
    console.error("Redis SET error:", e);
  }

  return NextResponse.json({ data });
}

// ── POST /api/users ──
export async function POST(req: Request) {
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
    .insert([{
      nombre:   nombre.trim(),
      email:    email.trim(),
      telefono: telefono || null,
      dni:      dni || null,
    }])
    .select()
    .single();

  if (error) {
    const msg =
      error.code === "23505"
        ? "El email o DNI ya está registrado."
        : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    await redis.del(CACHE_KEY);
  } catch (e) {
    console.error("Redis DEL error:", e);
  }

  return NextResponse.json({ data }, { status: 201 });
}