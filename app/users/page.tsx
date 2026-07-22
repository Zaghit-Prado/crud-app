"use client";

import { useState, useEffect } from "react";

type Usuario = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  dni: string | null;
  created_at: string;
};

type ModalMode = "add" | "edit" | null;
type DniFeedback = { type: "ok" | "error"; msg: string } | null;

export default function Usuarios() {
  const [usuarios, setUsuarios]   = useState<Usuario[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [isDark, setIsDark]       = useState<boolean | undefined>(undefined);

  const [modalMode, setModalMode]     = useState<ModalMode>(null);
  const [editUsuario, setEditUsuario] = useState<Usuario | null>(null);
  const [formNombre, setFormNombre]   = useState("");
  const [formEmail, setFormEmail]     = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [formDni, setFormDni]         = useState("");
  const [saving, setSaving]           = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [error, setError]             = useState("");

  // ── DNI lookup ──
  const [loadingDni, setLoadingDni]   = useState(false);
  const [dniFeedback, setDniFeedback] = useState<DniFeedback>(null);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = saved ? saved === "dark" : prefersDark;
    setIsDark(dark);
    const currentlyDark = document.documentElement.classList.contains("dark");
    if (currentlyDark !== dark) document.documentElement.classList.toggle("dark", dark);
    fetchUsuarios();
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  // ── API helpers ──
  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/users");
      const json = await res.json();
      if (json.data) setUsuarios(json.data);
    } catch (e) {
      console.error("Error al cargar usuarios:", e);
    } finally {
      setLoading(false);
    }
  };

  // ── Buscar por DNI ──
  const buscarDni = async () => {
    if (formDni.length !== 8) return;
    setLoadingDni(true);
    setDniFeedback(null);
    try {
      const res  = await fetch("/api/dni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: formDni }),
      });
      const json = await res.json();

      if (!res.ok) {
        setDniFeedback({ type: "error", msg: json.error || "DNI no encontrado." });
        return;
      }

      // Auto-completar nombre completo
      setFormNombre(json.data.nombre_completo);
      setDniFeedback({ type: "ok", msg: `✓ ${json.data.nombre_completo}` });
    } catch (e) {
      setDniFeedback({ type: "error", msg: "Error al consultar el DNI." });
    } finally {
      setLoadingDni(false);
    }
  };

  const handleSave = async () => {
    setError("");
    if (!formNombre.trim() || !formEmail.trim()) {
      setError("Nombre y email son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        nombre:   formNombre.trim(),
        email:    formEmail.trim(),
        telefono: formTelefono.trim() || null,
        dni:      formDni.trim() || null,
      };

      const url    = modalMode === "add" ? "/api/users" : `/api/users/${editUsuario!.id}`;
      const method = modalMode === "add" ? "POST" : "PUT";

      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok) { setError(json?.error || "Error al guardar."); return; }

      closeModal();
      await fetchUsuarios();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Confirmas que deseas eliminar este usuario?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/users/${id}`, { method: "DELETE" });
      await fetchUsuarios();
    } finally {
      setDeletingId(null);
    }
  };

  // ── Modal helpers ──
  const openAdd = () => {
    setFormNombre(""); setFormEmail(""); setFormTelefono(""); setFormDni("");
    setEditUsuario(null); setError(""); setDniFeedback(null);
    setModalMode("add");
  };
  const openEdit = (u: Usuario) => {
    setEditUsuario(u);
    setFormNombre(u.nombre);
    setFormEmail(u.email);
    setFormTelefono(u.telefono ?? "");
    setFormDni(u.dni ?? "");
    setError(""); setDniFeedback(null);
    setModalMode("edit");
  };
  const closeModal = () => {
    setModalMode(null); setEditUsuario(null); setError(""); setDniFeedback(null);
  };

  // ── Filtro ──
  const filtered = usuarios.filter((u) =>
    [u.nombre, u.email, u.telefono, u.dni]
      .filter(Boolean)
      .some((v) => v!.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    total:       usuarios.length,
    conDni:      usuarios.filter((u) => u.dni).length,
    conTelefono: usuarios.filter((u) => u.telefono).length,
  };

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const shortId = (id: string) => id?.split("-")[0].toUpperCase() ?? "—";

  const statCards = [
    {
      label: "Total", value: stats.total, icon: "fa-users",
      val:   "text-blue-600   dark:text-blue-400",
      badge: "text-blue-500   dark:text-blue-500",
      bg:    "bg-blue-50  dark:bg-blue-950/50  border-blue-200  dark:border-blue-900",
    },
    {
      label: "Con DNI", value: stats.conDni, icon: "fa-id-card",
      val:   "text-green-600  dark:text-green-400",
      badge: "text-green-500  dark:text-green-500",
      bg:    "bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-900",
    },
    {
      label: "Con Teléfono", value: stats.conTelefono, icon: "fa-phone",
      val:   "text-purple-600 dark:text-purple-400",
      badge: "text-purple-500 dark:text-purple-500",
      bg:    "bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-900",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-white p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <i className="fa-solid fa-users text-blue-500 dark:text-blue-400"></i>
              Registro de Usuarios
            </h1>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-0.5">
              Next.js · Supabase · Redis · Vercel
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDark !== undefined && (
              <button
                onClick={toggleTheme}
                title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                className="w-9 h-9 flex items-center justify-center rounded-xl
                           border border-gray-200 dark:border-slate-700
                           bg-white dark:bg-slate-800
                           text-slate-500 dark:text-slate-400
                           hover:border-blue-500 hover:text-blue-500
                           dark:hover:border-blue-400 dark:hover:text-blue-400
                           transition-colors"
              >
                <i className={`fa-solid ${isDark ? "fa-sun" : "fa-moon"} text-sm`}></i>
              </button>
            )}
            <a
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm
                         border border-gray-200 dark:border-slate-700
                         bg-white dark:bg-slate-800
                         text-slate-600 dark:text-slate-300
                         hover:border-blue-500 hover:text-blue-500
                         dark:hover:border-blue-400 dark:hover:text-blue-400
                         transition-all"
            >
              <i className="fa-solid fa-list-check"></i>
              Tareas
            </a>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95
                         px-4 py-2.5 rounded-xl font-semibold text-sm text-white
                         shadow-lg shadow-blue-500/20 dark:shadow-blue-900/30 transition-all"
            >
              <i className="fa-solid fa-user-plus"></i>
              Nuevo Usuario
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          {statCards.map((s) => (
            <div key={s.label} className={`rounded-xl border p-4 transition-colors ${s.bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <i className={`fa-solid ${s.icon} ${s.badge} text-xs`}></i>
                <span className={`${s.badge} text-xs uppercase tracking-wider`}>{s.label}</span>
              </div>
              <p className={`text-2xl font-bold ${s.val}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Tabla ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl
                        border border-gray-200 dark:border-slate-800
                        overflow-hidden shadow-sm dark:shadow-xl transition-colors">

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3
                          px-5 py-4 border-b border-gray-100 dark:border-slate-800">
            <h2 className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2 text-sm">
              <i className="fa-solid fa-table-list text-slate-400 dark:text-slate-500"></i>
              Listado de usuarios
            </h2>
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2
                             text-slate-400 dark:text-slate-500 text-xs pointer-events-none"></i>
              <input
                type="text"
                placeholder="Buscar por nombre, email, DNI..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm w-64
                           bg-gray-100 dark:bg-slate-800
                           border border-gray-200 dark:border-slate-700
                           rounded-lg focus:outline-none focus:border-blue-500
                           text-slate-900 dark:text-white
                           placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 uppercase text-xs tracking-wider bg-gray-50 dark:bg-slate-950/50">
                  {["#", "ID", "Nombre", "Email", "Teléfono", "DNI", "Registrado", "Acciones"].map((h, i) => (
                    <th key={h} className={`px-5 py-3 ${i === 7 ? "text-center" : "text-left"} ${i === 0 ? "w-10" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400 dark:text-slate-500">
                      <i className="fa-solid fa-spinner fa-spin text-xl mb-2 block"></i>
                      Cargando usuarios...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400 dark:text-slate-500">
                      <i className="fa-solid fa-users text-2xl mb-2 block"></i>
                      {search ? "Sin resultados para la búsqueda" : "No hay usuarios. ¡Registra el primero!"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((u, i) => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="px-5 py-3.5 text-slate-400 dark:text-slate-600 font-mono text-xs">{i + 1}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs px-2 py-1 rounded-md
                                         bg-gray-100 dark:bg-slate-800
                                         text-slate-500 dark:text-slate-400
                                         border border-gray-200 dark:border-slate-700">
                          {shortId(u.id)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">{u.nombre}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs">{u.email}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                        {u.telefono ?? <span className="text-slate-300 dark:text-slate-600 italic">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {u.dni ? (
                          <span className="font-mono text-xs px-2 py-1 rounded-md
                                           bg-purple-50 dark:bg-purple-950/50
                                           text-purple-600 dark:text-purple-400
                                           border border-purple-200 dark:border-purple-900">
                            {u.dni}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 italic text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">
                        <i className="fa-regular fa-calendar mr-1.5"></i>
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEdit(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5
                                       bg-amber-500 hover:bg-amber-400 text-slate-950
                                       text-xs rounded-lg transition-colors font-semibold"
                          >
                            <i className="fa-solid fa-pen-to-square"></i> Editar
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            disabled={deletingId === u.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5
                                       bg-red-600 hover:bg-red-500 text-white
                                       text-xs rounded-lg transition-colors font-semibold disabled:opacity-40"
                          >
                            <i className={`fa-solid ${deletingId === u.id ? "fa-spinner fa-spin" : "fa-trash"}`}></i>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer tabla */}
          {!loading && usuarios.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800
                            bg-gray-50 dark:bg-slate-950/30
                            text-slate-400 dark:text-slate-600 text-xs flex items-center gap-1">
              <i className="fa-solid fa-circle-info"></i>
              Mostrando{" "}
              <span className="text-slate-600 dark:text-slate-400 font-medium mx-1">{filtered.length}</span>
              de{" "}
              <span className="text-slate-600 dark:text-slate-400 font-medium mx-1">{usuarios.length}</span>
              usuarios
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Add / Edit ── */}
      {modalMode && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm
                     flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700
                          rounded-2xl w-full max-w-md shadow-2xl transition-colors">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <i className={`fa-solid ${
                  modalMode === "add"
                    ? "fa-user-plus text-blue-500 dark:text-blue-400"
                    : "fa-pen-to-square text-amber-500 dark:text-amber-400"
                }`}></i>
                {modalMode === "add" ? "Nuevo Usuario" : "Editar Usuario"}
              </h3>
              <button
                onClick={closeModal}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors
                           text-slate-400 dark:text-slate-500
                           hover:text-slate-900 dark:hover:text-white
                           hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">

              {/* Error banner */}
              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm
                                bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400
                                border border-red-200 dark:border-red-900">
                  <i className="fa-solid fa-circle-exclamation shrink-0"></i>
                  {error}
                </div>
              )}

              {/* ── Campo DNI con búsqueda RENIEC ── */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-2
                                   text-slate-500 dark:text-slate-400">
                  DNI
                  <span className="ml-2 normal-case tracking-normal font-normal text-slate-400 dark:text-slate-500">
                    — ingresa 8 dígitos para auto-completar
                  </span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <i className="fa-solid fa-id-card absolute left-3 top-1/2 -translate-y-1/2
                                   text-slate-400 dark:text-slate-500 text-xs pointer-events-none"></i>
                    <input
                      type="text"
                      value={formDni}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                        setFormDni(v);
                        setDniFeedback(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && formDni.length === 8 && buscarDni()}
                      placeholder="Ej: 12345678"
                      maxLength={8}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm transition-colors
                                 bg-gray-50 dark:bg-slate-800
                                 border border-gray-200 dark:border-slate-700
                                 focus:outline-none focus:border-blue-500
                                 text-slate-900 dark:text-white
                                 placeholder-slate-400 dark:placeholder-slate-500"
                    />
                  </div>
                  <button
                    onClick={buscarDni}
                    disabled={formDni.length !== 8 || loadingDni}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold
                               bg-blue-600 hover:bg-blue-500 text-white
                               disabled:opacity-40 disabled:cursor-not-allowed
                               transition-all whitespace-nowrap"
                  >
                    <i className={`fa-solid ${loadingDni ? "fa-spinner fa-spin" : "fa-magnifying-glass"}`}></i>
                    {loadingDni ? "Buscando..." : "Buscar"}
                  </button>
                </div>

                {/* Feedback DNI */}
                {dniFeedback && (
                  <p className={`mt-1.5 text-xs flex items-center gap-1.5 ${
                    dniFeedback.type === "ok"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-500 dark:text-red-400"
                  }`}>
                    <i className={`fa-solid ${dniFeedback.type === "ok" ? "fa-circle-check" : "fa-circle-xmark"}`}></i>
                    {dniFeedback.msg}
                  </p>
                )}
              </div>

              {/* ── Campo Nombre completo ── */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-2
                                   text-slate-500 dark:text-slate-400">
                  Nombre completo <span className="text-red-400 normal-case tracking-normal">*</span>
                </label>
                <div className="relative">
                  <i className="fa-solid fa-user absolute left-3 top-1/2 -translate-y-1/2
                                 text-slate-400 dark:text-slate-500 text-xs pointer-events-none"></i>
                  <input
                    type="text"
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    placeholder="Ej: Juan Pérez García"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm transition-colors
                               bg-gray-50 dark:bg-slate-800
                               border border-gray-200 dark:border-slate-700
                               focus:outline-none focus:border-blue-500
                               text-slate-900 dark:text-white
                               placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>

              {/* ── Campo Email ── */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-2
                                   text-slate-500 dark:text-slate-400">
                  Email <span className="text-red-400 normal-case tracking-normal">*</span>
                </label>
                <div className="relative">
                  <i className="fa-solid fa-envelope absolute left-3 top-1/2 -translate-y-1/2
                                 text-slate-400 dark:text-slate-500 text-xs pointer-events-none"></i>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    placeholder="Ej: juan@email.com"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm transition-colors
                               bg-gray-50 dark:bg-slate-800
                               border border-gray-200 dark:border-slate-700
                               focus:outline-none focus:border-blue-500
                               text-slate-900 dark:text-white
                               placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>

              {/* ── Campo Teléfono ── */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-2
                                   text-slate-500 dark:text-slate-400">
                  Teléfono
                </label>
                <div className="relative">
                  <i className="fa-solid fa-phone absolute left-3 top-1/2 -translate-y-1/2
                                 text-slate-400 dark:text-slate-500 text-xs pointer-events-none"></i>
                  <input
                    type="tel"
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    placeholder="Ej: 987654321"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm transition-colors
                               bg-gray-50 dark:bg-slate-800
                               border border-gray-200 dark:border-slate-700
                               focus:outline-none focus:border-blue-500
                               text-slate-900 dark:text-white
                               placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm rounded-xl transition-colors
                           text-slate-500 dark:text-slate-400
                           hover:text-slate-900 dark:hover:text-white
                           bg-gray-100 dark:bg-slate-800
                           hover:bg-gray-200 dark:hover:bg-slate-700"
              >
                <i className="fa-solid fa-xmark mr-1.5"></i>
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formNombre.trim() || !formEmail.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl
                           bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-40"
              >
                <i className={`fa-solid ${
                  saving ? "fa-spinner fa-spin" : modalMode === "add" ? "fa-user-plus" : "fa-floppy-disk"
                }`}></i>
                {modalMode === "add" ? "Registrar" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}