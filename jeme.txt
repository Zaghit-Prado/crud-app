cat > /home/claude/api-dni-route.ts << 'EOF'
// Ruta: /app/api/dni/route.ts
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
        "Authorization": `Bearer ${process.env.APIPERU_TOKEN}`,
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
EOF
echo "OK"