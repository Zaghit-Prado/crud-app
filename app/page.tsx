"use client";

import { useState, useEffect } from "react";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
};

type ModalMode = "add" | "edit" | null;

export default function Home() {
  const [tasks, setTasks]           = useState<Task[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "done">("all");
  const [isDark, setIsDark]         = useState<boolean | undefined>(undefined);

  const [modalMode, setModalMode]   = useState<ModalMode>(null);
  const [editTask, setEditTask]     = useState<Task | null>(null);
  const [formTitle, setFormTitle]   = useState("");
  const [formCompleted, setFormCompleted] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

useEffect(() => {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = saved ? saved === "dark" : prefersDark;
  setIsDark(dark);
  // NO llamar classList.toggle aquí — el script inline ya lo hizo
  // Solo sincronizamos el estado de React con lo que hay en el DOM
  const currentlyDark = document.documentElement.classList.contains("dark");
  if (currentlyDark !== dark) {
    document.documentElement.classList.toggle("dark", dark);
  }

  fetchTasks();
}, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  // ── API helpers ──
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/tasks");
      const json = await res.json();
      if (json.data) setTasks(json.data);
    } catch (e) {
      console.error("Error al cargar tareas:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      if (modalMode === "add") {
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: formTitle.trim() }),
        });
      } else if (modalMode === "edit" && editTask) {
        await fetch(`/api/tasks/${editTask.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: formTitle.trim(), completed: formCompleted }),
        });
      }
      closeModal();
      await fetchTasks();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Confirmas que deseas eliminar esta tarea?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      await fetchTasks();
    } finally {
      setDeletingId(null);
    }
  };

  // ── Modal helpers ──
  const openAdd = () => {
    setFormTitle(""); setFormCompleted(false); setEditTask(null);
    setModalMode("add");
  };
  const openEdit = (task: Task) => {
    setEditTask(task); setFormTitle(task.title); setFormCompleted(task.completed);
    setModalMode("edit");
  };
  const closeModal = () => { setModalMode(null); setEditTask(null); };

  // ── Filtros ──
  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "done"    && t.completed) ||
      (filterStatus === "pending" && !t.completed);
    return matchSearch && matchStatus;
  });

  const stats = {
    total:   tasks.length,
    done:    tasks.filter((t) => t.completed).length,
    pending: tasks.filter((t) => !t.completed).length,
  };

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const shortId = (id: string) => id?.split("-")[0].toUpperCase() ?? "—";

  // ── Paletas de stats ──
  const statCards = [
    {
      label: "Total", value: stats.total, icon: "fa-layer-group",
      val:   "text-blue-600   dark:text-blue-400",
      badge: "text-blue-500   dark:text-blue-500",
      bg:    "bg-blue-50  dark:bg-blue-950/50  border-blue-200  dark:border-blue-900",
    },
    {
      label: "Completadas", value: stats.done, icon: "fa-circle-check",
      val:   "text-green-600  dark:text-green-400",
      badge: "text-green-500  dark:text-green-500",
      bg:    "bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-900",
    },
    {
      label: "Pendientes", value: stats.pending, icon: "fa-clock",
      val:   "text-amber-600  dark:text-amber-400",
      badge: "text-amber-500  dark:text-amber-500",
      bg:    "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-white p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <i className="fa-solid fa-list-check text-blue-500 dark:text-blue-400"></i>
              Gestión de Tareas
            </h1>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-0.5">
              Next.js · Supabase · Redis · Vercel
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle tema — solo se muestra cuando isDark está definido */}
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

            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95
                         px-4 py-2.5 rounded-xl font-semibold text-sm text-white
                         shadow-lg shadow-blue-500/20 dark:shadow-blue-900/30 transition-all"
            >
              <i className="fa-solid fa-plus"></i>
              Nueva Tarea
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
              Listado de tareas
            </h2>

            <div className="flex items-center gap-2">
              {/* Filtro */}
              <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 text-xs">
                {(["all", "pending", "done"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterStatus(f)}
                    className={`px-3 py-1.5 transition-colors ${
                      filterStatus === f
                        ? "bg-gray-200 dark:bg-slate-700 text-slate-900 dark:text-white font-medium"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {{ all: "Todos", pending: "Pendientes", done: "Hechas" }[f]}
                  </button>
                ))}
              </div>

              {/* Búsqueda */}
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2
                               text-slate-400 dark:text-slate-500 text-xs pointer-events-none"></i>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm w-44
                             bg-gray-100 dark:bg-slate-800
                             border border-gray-200 dark:border-slate-700
                             rounded-lg focus:outline-none focus:border-blue-500
                             text-slate-900 dark:text-white
                             placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 uppercase text-xs tracking-wider bg-gray-50 dark:bg-slate-950/50">
                  {["#", "ID", "Título", "Estado", "Creado", "Acciones"].map((h, i) => (
                    <th key={h} className={`px-5 py-3 ${i === 5 ? "text-center" : "text-left"} ${i === 0 ? "w-10" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400 dark:text-slate-500">
                      <i className="fa-solid fa-spinner fa-spin text-xl mb-2 block"></i>
                      Cargando tareas...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400 dark:text-slate-500">
                      <i className="fa-solid fa-inbox text-2xl mb-2 block"></i>
                      {search || filterStatus !== "all"
                        ? "Sin resultados para los filtros aplicados"
                        : "No hay tareas. ¡Crea la primera!"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((task, i) => (
                    <tr
                      key={task.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      {/* # */}
                      <td className="px-5 py-3.5 text-slate-400 dark:text-slate-600 font-mono text-xs">
                        {i + 1}
                      </td>

                      {/* ID */}
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs px-2 py-1 rounded-md
                                         bg-gray-100 dark:bg-slate-800
                                         text-slate-500 dark:text-slate-400
                                         border border-gray-200 dark:border-slate-700">
                          {shortId(task.id)}
                        </span>
                      </td>

                      {/* Título */}
                      <td className="px-5 py-3.5 max-w-xs">
                        <span className={`font-medium ${
                          task.completed
                            ? "line-through text-slate-400 dark:text-slate-500"
                            : "text-slate-800 dark:text-slate-200"
                        }`}>
                          {task.title}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="px-5 py-3.5">
                        {task.completed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                                           bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400
                                           border border-green-200 dark:border-green-900">
                            <i className="fa-solid fa-circle-check"></i> Completada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                                           bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400
                                           border border-amber-200 dark:border-amber-900">
                            <i className="fa-solid fa-clock"></i> Pendiente
                          </span>
                        )}
                      </td>

                      {/* Fecha */}
                      <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">
                        <i className="fa-regular fa-calendar mr-1.5"></i>
                        {formatDate(task.created_at)}
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEdit(task)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5
                                       bg-amber-500 hover:bg-amber-400 text-slate-950
                                       text-xs rounded-lg transition-colors font-semibold"
                          >
                            <i className="fa-solid fa-pen-to-square"></i> Editar
                          </button>
                          <button
                            onClick={() => handleDelete(task.id)}
                            disabled={deletingId === task.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5
                                       bg-red-600 hover:bg-red-500 text-white
                                       text-xs rounded-lg transition-colors font-semibold disabled:opacity-40"
                          >
                            <i className={`fa-solid ${deletingId === task.id ? "fa-spinner fa-spin" : "fa-trash"}`}></i>
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
          {!loading && tasks.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800
                            bg-gray-50 dark:bg-slate-950/30
                            text-slate-400 dark:text-slate-600 text-xs flex items-center gap-1">
              <i className="fa-solid fa-circle-info"></i>
              Mostrando{" "}
              <span className="text-slate-600 dark:text-slate-400 font-medium mx-1">{filtered.length}</span>
              de{" "}
              <span className="text-slate-600 dark:text-slate-400 font-medium mx-1">{tasks.length}</span>
              tareas
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
                    ? "fa-circle-plus text-blue-500 dark:text-blue-400"
                    : "fa-pen-to-square text-amber-500 dark:text-amber-400"
                }`}></i>
                {modalMode === "add" ? "Nueva Tarea" : "Editar Tarea"}
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
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-2
                                   text-slate-500 dark:text-slate-400">
                  Título de la tarea
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder="¿Qué necesitas hacer?"
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl text-sm transition-colors
                             bg-gray-50 dark:bg-slate-800
                             border border-gray-200 dark:border-slate-700
                             focus:outline-none focus:border-blue-500
                             text-slate-900 dark:text-white
                             placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              {modalMode === "edit" && (
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider mb-2
                                     text-slate-500 dark:text-slate-400">
                    Estado
                  </label>
                  <button
                    onClick={() => setFormCompleted((v) => !v)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all
                      ${formCompleted
                        ? "bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-800 text-green-700 dark:text-green-400"
                        : "bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                      }`}
                  >
                    <i className={`fa-solid ${formCompleted ? "fa-circle-check" : "fa-clock"}`}></i>
                    {formCompleted ? "Completada" : "Pendiente"}
                    <span className="ml-auto text-xs opacity-60">Click para cambiar</span>
                  </button>
                </div>
              )}
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
                disabled={saving || !formTitle.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl
                           bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-40"
              >
                <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : modalMode === "add" ? "fa-plus" : "fa-floppy-disk"}`}></i>
                {modalMode === "add" ? "Agregar" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}