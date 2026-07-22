import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { dni } = await req.json();

  if (!dni || !/^\d{8}$/.test(dni)) {
    return NextResponse.json(
      { error: "El DNI debe tener exactamente 8 dígitos." },
      { status: 400 }
    );
  }

  try {
    const res = await fetch("https://apiperu.dev/api/dni", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Accept":        "application/json",
        "Authorization": `Bearer 7893f41cd0c354fe5b291a75d2d0ed70053e8679bc970a169a28b3e8ecf548bf`,
      },
      body: JSON.stringify({ dni }),
    });

    const json = await res.json();

    if (!json.success) {
      return NextResponse.json(
        { error: "DNI no encontrado en el RENIEC." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: json.data });
  } catch (e) {
    console.error("Error API DNI:", e);
    return NextResponse.json(
      { error: "Error al conectar con el servicio de DNI." },
      { status: 500 }
    );
  }
}