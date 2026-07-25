"use client";

import { useState, useEffect } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────
type Expense = {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  paid: boolean;
  created_at: string;
};

type CalendarNote = {
  id: string;
  note_date: string;
  content: string;
  created_at: string;
};

type ModalMode = "add" | "edit" | null;

// ─── Helpers ────────────────────────────────────────────────────────────────
const toLocalDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const toDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const todayStr = () => toDateStr(new Date());

const getDaysUntil = (dateStr: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = toLocalDate(dateStr);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

const formatAmount = (n: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(n);

const formatDate = (d: string) => {
  if (!d) return "—";
  return toLocalDate(d).toLocaleDateString("es-PE", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const formatPE = (d: string) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

const isOverdue = (due: string, paid: boolean) => {
  if (paid) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return toLocalDate(due) < today;
};

const shortId = (id: string) => id?.split("-")[0].toUpperCase() ?? "—";

// ─── Calendar helpers ────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DAY_NAMES = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

const getCalendarDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);

  // Convert Sunday (0) → 7 so week starts on Monday
  let startDow = firstDay.getDay();
  if (startDow === 0) startDow = 7;
  const paddingStart = startDow - 1;

  const days: { dateStr: string; isCurrentMonth: boolean }[] = [];

  // Previous month padding
  for (let i = paddingStart - 1; i >= 0; i--) {
    days.push({ dateStr: toDateStr(new Date(year, month, -i)), isCurrentMonth: false });
  }
  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ dateStr: toDateStr(new Date(year, month, d)), isCurrentMonth: true });
  }
  // Next month padding (always 6 rows)
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({ dateStr: toDateStr(new Date(year, month + 1, d)), isCurrentMonth: false });
  }

  return days;
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function GastosPage() {
  // Expenses
  const [expenses,   setExpenses]   = useState<Expense[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState<"all"|"pending"|"paid">("all");

  // Expense modal
  const [modalMode,   setModalMode]   = useState<ModalMode>(null);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [formDesc,    setFormDesc]    = useState("");
  const [formAmount,  setFormAmount]  = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formPaid,    setFormPaid]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);

  // Calendar & notes
  const [notes,          setNotes]          = useState<CalendarNote[]>([]);
  const [calYear,        setCalYear]        = useState(new Date().getFullYear());
  const [calMonth,       setCalMonth]       = useState(new Date().getMonth());
  const [selectedDay,    setSelectedDay]    = useState(todayStr());
  const [noteInput,      setNoteInput]      = useState("");
  const [editingNote,    setEditingNote]    = useState<CalendarNote | null>(null);
  const [editNoteText,   setEditNoteText]   = useState("");
  const [savingNote,     setSavingNote]     = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // Notifications
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchExpenses();
    fetchNotes();
    const stored = JSON.parse(localStorage.getItem("dismissedNoteNotifs") || "[]");
    setDismissedIds(stored);
  }, []);

  // ── API: Expenses ──────────────────────────────────────────────────────────
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/expenses");
      const json = await res.json();
      if (json.data) setExpenses(json.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSaveExpense = async () => {
    if (!formDesc.trim() || !formAmount || !formDueDate) return;
    setSaving(true);
    try {
      if (modalMode === "add") {
        await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: formDesc.trim(), amount: formAmount, due_date: formDueDate }),
        });
      } else if (modalMode === "edit" && editExpense) {
        await fetch(`/api/expenses/${editExpense.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: formDesc.trim(), amount: formAmount, due_date: formDueDate, paid: formPaid }),
        });
      }
      closeModal();
      await fetchExpenses();
    } finally { setSaving(false); }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("¿Confirmas que deseas eliminar este gasto?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      await fetchExpenses();
    } finally { setDeletingId(null); }
  };

  // ── API: Notes ─────────────────────────────────────────────────────────────
  const fetchNotes = async () => {
    try {
      const res  = await fetch("/api/notes");
      const json = await res.json();
      if (json.data) setNotes(json.data);
    } catch (e) { console.error(e); }
  };

  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    setSavingNote(true);
    try {
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note_date: selectedDay, content: noteInput.trim() }),
      });
      setNoteInput("");
      await fetchNotes();
    } finally { setSavingNote(false); }
  };

  const handleUpdateNote = async (id: string) => {
    if (!editNoteText.trim()) return;
    setSavingNote(true);
    try {
      await fetch(`/api/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editNoteText.trim() }),
      });
      setEditingNote(null);
      await fetchNotes();
    } finally { setSavingNote(false); }
  };

  const handleDeleteNote = async (id: string) => {
    setDeletingNoteId(id);
    try {
      await fetch(`/api/notes/${id}`, { method: "DELETE" });
      await fetchNotes();
    } finally { setDeletingNoteId(null); }
  };

  // ── Notifications ──────────────────────────────────────────────────────────
  const dismiss = (id: string) => {
    const next = [...dismissedIds, id];
    setDismissedIds(next);
    localStorage.setItem("dismissedNoteNotifs", JSON.stringify(next));
  };

  const visibleNotifs = notes.filter((n) => {
    const d = getDaysUntil(n.note_date);
    return d >= 0 && d <= 3 && !dismissedIds.includes(n.id);
  });

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openAdd = () => {
    setFormDesc(""); setFormAmount(""); setFormDueDate(""); setFormPaid(false);
    setEditExpense(null); setModalMode("add");
  };
  const openEdit = (e: Expense) => {
    setEditExpense(e); setFormDesc(e.description);
    setFormAmount(String(e.amount)); setFormDueDate(e.due_date); setFormPaid(e.paid);
    setModalMode("edit");
  };
  const closeModal = () => { setModalMode(null); setEditExpense(null); };

  // ── Filters & stats ────────────────────────────────────────────────────────
  const filtered = expenses.filter((e) => {
    const matchSearch = e.description.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "paid"    &&  e.paid) ||
      (filter === "pending" && !e.paid);
    return matchSearch && matchFilter;
  });

  const totalAmt     = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const paidAmt      = expenses.filter(e =>  e.paid).reduce((s, e) => s + Number(e.amount), 0);
  const pendingAmt   = expenses.filter(e => !e.paid).reduce((s, e) => s + Number(e.amount), 0);
  const overdueCount = expenses.filter(e => isOverdue(e.due_date, e.paid)).length;

  // ── Calendar ───────────────────────────────────────────────────────────────
  const calDays = getCalendarDays(calYear, calMonth);

  const notesByDate = notes.reduce((acc, n) => {
    if (!acc[n.note_date]) acc[n.note_date] = [];
    acc[n.note_date].push(n);
    return acc;
  }, {} as Record<string, CalendarNote[]>);

  const selectedDayNotes = notesByDate[selectedDay] || [];
  const today = todayStr();

  const upcomingNotes = notes
    .filter((n) => { const d = getDaysUntil(n.note_date); return d >= 0 && d <= 7; })
    .sort((a, b) => a.note_date.localeCompare(b.note_date));

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const handleDayClick = (dateStr: string, isCurrentMonth: boolean) => {
    setSelectedDay(dateStr);
    if (!isCurrentMonth) {
      const [y, m] = dateStr.split("-").map(Number);
      setCalYear(y); setCalMonth(m - 1);
    }
  };

  // ─── Stat cards ─────────────────────────────────────────────────────────
  const statCards = [
    {
      label: "Total registrado", value: formatAmount(totalAmt), icon: "fa-money-bill-wave",
      val: "text-blue-600 dark:text-blue-400", sub: "text-blue-500",
      bg:  "bg-blue-50  dark:bg-blue-950/50  border-blue-200  dark:border-blue-900",
    },
    {
      label: "Pagado", value: formatAmount(paidAmt), icon: "fa-circle-check",
      val: "text-green-600 dark:text-green-400", sub: "text-green-500",
      bg:  "bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-900",
    },
    {
      label: "Pendiente", value: formatAmount(pendingAmt), icon: "fa-clock",
      val: "text-amber-600 dark:text-amber-400", sub: "text-amber-500",
      bg:  "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900",
    },
    {
      label: "Vencidos", value: String(overdueCount), icon: "fa-triangle-exclamation",
      val: overdueCount > 0 ? "text-red-600 dark:text-red-400"   : "text-slate-500 dark:text-slate-400",
      sub: overdueCount > 0 ? "text-red-500"                     : "text-slate-500",
      bg:  overdueCount > 0
        ? "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900"
        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800",
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ── Notification banners ─────────────────────────────────────── */}
        {visibleNotifs.length > 0 && (
          <div className="space-y-2">
            {visibleNotifs.map((n) => {
              const d = getDaysUntil(n.note_date);
              const isToday    = d === 0;
              const isTomorrow = d === 1;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-sm
                    ${isToday
                      ? "bg-red-50   dark:bg-red-950/50  border-red-200   dark:border-red-800"
                      : isTomorrow
                        ? "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800"
                        : "bg-blue-50  dark:bg-blue-950/50  border-blue-200  dark:border-blue-800"
                    }`}
                >
                  <i className={`fa-solid fa-bell text-sm mt-0.5 flex-shrink-0
                    ${isToday ? "text-red-500 animate-bounce" : isTomorrow ? "text-amber-500" : "text-blue-500"}`}>
                  </i>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${isToday ? "text-red-700 dark:text-red-300" : isTomorrow ? "text-amber-700 dark:text-amber-300" : "text-blue-700 dark:text-blue-300"}`}>
                      {isToday ? "¡Recordatorio para hoy!" : isTomorrow ? "Recordatorio para mañana" : `Recordatorio en ${d} días`}
                      <span className="ml-2 font-normal text-slate-500 dark:text-slate-400 text-xs">
                        · {formatDate(n.note_date)}
                      </span>
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-1">{n.content}</p>
                  </div>
                  <button
                    onClick={() => dismiss(n.id)}
                    className="flex-shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    <i className="fa-solid fa-xmark text-xs"></i>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <i className="fa-solid fa-wallet text-emerald-500 dark:text-emerald-400"></i>
              Cuadro de Gastos
            </h1>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-0.5">
              Registro de pagos y egresos · Hora Peruana (UTC−5)
            </p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95
                       px-4 py-2.5 rounded-xl font-semibold text-sm text-white
                       shadow-lg shadow-emerald-500/20 dark:shadow-emerald-900/30 transition-all"
          >
            <i className="fa-solid fa-plus"></i>
            Nuevo Gasto
          </button>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((s) => (
            <div key={s.label} className={`rounded-xl border p-4 transition-colors ${s.bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <i className={`fa-solid ${s.icon} ${s.sub} text-xs`}></i>
                <span className={`${s.sub} text-xs uppercase tracking-wider`}>{s.label}</span>
              </div>
              <p className={`text-lg font-bold truncate ${s.val}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── 2-column layout ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

          {/* ══ LEFT: Expenses Table ════════════════════════════════════ */}
          <div className="xl:col-span-3 bg-white dark:bg-slate-900 rounded-2xl
                          border border-gray-200 dark:border-slate-800
                          overflow-hidden shadow-sm dark:shadow-xl transition-colors flex flex-col">

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3
                            px-5 py-4 border-b border-gray-100 dark:border-slate-800">
              <h2 className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2 text-sm">
                <i className="fa-solid fa-table-list text-slate-400 dark:text-slate-500"></i>
                Listado de gastos
              </h2>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 text-xs">
                  {(["all","pending","paid"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 transition-colors ${
                        filter === f
                          ? "bg-gray-200 dark:bg-slate-700 text-slate-900 dark:text-white font-medium"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {{ all:"Todos", pending:"Pendientes", paid:"Pagados" }[f]}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2
                                 text-slate-400 dark:text-slate-500 text-xs pointer-events-none"></i>
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-sm w-36
                               bg-gray-100 dark:bg-slate-800
                               border border-gray-200 dark:border-slate-700
                               rounded-lg focus:outline-none focus:border-emerald-500
                               text-slate-900 dark:text-white
                               placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 uppercase text-xs tracking-wider bg-gray-50 dark:bg-slate-950/50">
                    <th className="px-4 py-3 text-left w-8">#</th>
                    <th className="px-4 py-3 text-left">Descripción</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3 text-left">Vence</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Registro (PE)</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center text-slate-400 dark:text-slate-500">
                        <i className="fa-solid fa-spinner fa-spin text-xl mb-2 block"></i>
                        Cargando gastos...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center text-slate-400 dark:text-slate-500">
                        <i className="fa-solid fa-inbox text-2xl mb-2 block"></i>
                        {search || filter !== "all" ? "Sin resultados" : "No hay gastos. ¡Agrega el primero!"}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((exp, i) => {
                      const overdue = isOverdue(exp.due_date, exp.paid);
                      return (
                        <tr
                          key={exp.id}
                          className={`hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors
                            ${overdue ? "bg-red-50/40 dark:bg-red-950/10" : ""}`}
                        >
                          <td className="px-4 py-3 text-slate-400 dark:text-slate-600 font-mono text-xs">{i + 1}</td>
                          <td className="px-4 py-3">
                            <p className={`font-medium text-xs leading-snug ${exp.paid ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200"}`}>
                              {exp.description}
                            </p>
                            <p className="text-slate-400 dark:text-slate-600 font-mono text-xs">{shortId(exp.id)}</p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-bold font-mono text-xs ${exp.paid ? "text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200"}`}>
                              {formatAmount(exp.amount)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs whitespace-nowrap flex items-center gap-1 ${overdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-slate-500 dark:text-slate-400"}`}>
                              <i className={`fa-regular ${overdue ? "fa-calendar-xmark" : "fa-calendar"}`}></i>
                              {formatDate(exp.due_date)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {exp.paid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                                               bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400
                                               border border-green-200 dark:border-green-900">
                                <i className="fa-solid fa-circle-check"></i> Pagado
                              </span>
                            ) : overdue ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                                               bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400
                                               border border-red-200 dark:border-red-900">
                                <i className="fa-solid fa-triangle-exclamation"></i> Vencido
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                                               bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400
                                               border border-amber-200 dark:border-amber-900">
                                <i className="fa-solid fa-clock"></i> Pendiente
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">
                            <i className="fa-regular fa-clock mr-1"></i>{formatPE(exp.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEdit(exp)}
                                className="inline-flex items-center gap-1 px-2.5 py-1
                                           bg-amber-500 hover:bg-amber-400 text-slate-950
                                           text-xs rounded-lg transition-colors font-semibold"
                              >
                                <i className="fa-solid fa-pen-to-square"></i> Editar
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(exp.id)}
                                disabled={deletingId === exp.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1
                                           bg-red-600 hover:bg-red-500 text-white
                                           text-xs rounded-lg transition-colors font-semibold disabled:opacity-40"
                              >
                                <i className={`fa-solid ${deletingId === exp.id ? "fa-spinner fa-spin" : "fa-trash"}`}></i>
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            {!loading && expenses.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800
                              bg-gray-50 dark:bg-slate-950/30
                              text-slate-400 dark:text-slate-600 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <i className="fa-solid fa-circle-info"></i>
                  Mostrando <span className="text-slate-600 dark:text-slate-400 font-medium mx-1">{filtered.length}</span>
                  de <span className="text-slate-600 dark:text-slate-400 font-medium mx-1">{expenses.length}</span>
                  registros
                </span>
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  Subtotal:{" "}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {formatAmount(filtered.reduce((s, e) => s + Number(e.amount), 0))}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* ══ RIGHT: Calendar + Notes ══════════════════════════════════ */}
          <div className="xl:col-span-2 space-y-4">

            {/* ── Calendar ─────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl
                            border border-gray-200 dark:border-slate-800
                            overflow-hidden shadow-sm dark:shadow-xl transition-colors">

              {/* Month nav */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-slate-800">
                <button
                  onClick={prevMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors
                             text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <i className="fa-solid fa-chevron-left text-xs"></i>
                </button>
                <div className="text-center">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {MONTH_NAMES[calMonth]} {calYear}
                  </h3>
                </div>
                <button
                  onClick={nextMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors
                             text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <i className="fa-solid fa-chevron-right text-xs"></i>
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 px-3 pt-3 gap-0.5">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500 py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 px-3 pb-4 gap-0.5">
                {calDays.map(({ dateStr, isCurrentMonth }) => {
                  const hasNotes    = Boolean(notesByDate[dateStr]?.length);
                  const isToday     = dateStr === today;
                  const isSelected  = dateStr === selectedDay;
                  const dUntil      = getDaysUntil(dateStr);
                  const isUpcoming  = hasNotes && dUntil >= 0 && dUntil <= 3 && isCurrentMonth;
                  const dayNum      = toLocalDate(dateStr).getDate();

                  return (
                    <button
                      key={dateStr}
                      onClick={() => handleDayClick(dateStr, isCurrentMonth)}
                      className={`
                        relative aspect-square flex flex-col items-center justify-center
                        rounded-xl text-xs font-medium transition-all
                        ${!isCurrentMonth ? "opacity-25 pointer-events-none" : ""}
                        ${isSelected
                          ? "bg-emerald-500 dark:bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900"
                          : isToday
                            ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400 dark:ring-blue-600 font-bold"
                            : "hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }
                      `}
                    >
                      {dayNum}
                      {hasNotes && isCurrentMonth && (
                        <span className={`
                          absolute bottom-1 w-1 h-1 rounded-full
                          ${isSelected ? "bg-white"
                            : isUpcoming ? "bg-amber-400 dark:bg-amber-400"
                            : "bg-emerald-500 dark:bg-emerald-400"}
                        `} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 px-4 pb-3 text-xs text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>Con nota
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>Próxima (&le;3d)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>Hoy
                </span>
              </div>
            </div>

            {/* ── Notes for selected day ────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl
                            border border-gray-200 dark:border-slate-800
                            overflow-hidden shadow-sm dark:shadow-xl transition-colors">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-slate-800">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
                  <i className="fa-regular fa-note-sticky text-emerald-500"></i>
                  {formatDate(selectedDay)}
                </h3>
                <div className="flex items-center gap-1.5">
                  {getDaysUntil(selectedDay) === 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950
                                     text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-medium">
                      Hoy
                    </span>
                  )}
                  {getDaysUntil(selectedDay) === 1 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950
                                     text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-medium">
                      Mañana
                    </span>
                  )}
                  <span className="text-xs text-slate-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800
                                   px-2 py-0.5 rounded-full border border-gray-200 dark:border-slate-700">
                    {selectedDayNotes.length} nota{selectedDayNotes.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Note list */}
              <div className="px-4 py-3 space-y-2 max-h-52 overflow-y-auto">
                {selectedDayNotes.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 dark:text-slate-500">
                    <i className="fa-regular fa-note-sticky text-2xl mb-2 block opacity-40"></i>
                    <p className="text-xs">Sin notas para este día</p>
                    <p className="text-xs opacity-60 mt-0.5">Escribe algo abajo para agregar</p>
                  </div>
                ) : (
                  selectedDayNotes.map((note) => (
                    <div
                      key={note.id}
                      className="group flex items-start gap-2 p-3 rounded-xl
                                 bg-gray-50 dark:bg-slate-800
                                 border border-gray-200 dark:border-slate-700 transition-colors"
                    >
                      {editingNote?.id === note.id ? (
                        <div className="flex-1 space-y-2">
                          <textarea
                            value={editNoteText}
                            onChange={(e) => setEditNoteText(e.target.value)}
                            rows={3}
                            autoFocus
                            className="w-full px-3 py-2 text-xs rounded-lg resize-none
                                       bg-white dark:bg-slate-900
                                       border border-gray-200 dark:border-slate-600
                                       focus:outline-none focus:border-emerald-500
                                       text-slate-900 dark:text-white transition-colors"
                          />
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleUpdateNote(note.id)}
                              disabled={savingNote || !editNoteText.trim()}
                              className="flex-1 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white
                                         rounded-lg font-medium transition-colors disabled:opacity-40"
                            >
                              {savingNote ? <i className="fa-solid fa-spinner fa-spin"></i> : "Guardar"}
                            </button>
                            <button
                              onClick={() => setEditingNote(null)}
                              className="flex-1 py-1.5 text-xs bg-gray-200 dark:bg-slate-700
                                         text-slate-600 dark:text-slate-300 rounded-lg font-medium
                                         transition-colors hover:bg-gray-300 dark:hover:bg-slate-600"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <i className="fa-solid fa-circle-dot text-emerald-400 text-xs mt-1 flex-shrink-0"></i>
                          <p className="flex-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{note.content}</p>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                              onClick={() => { setEditingNote(note); setEditNoteText(note.content); }}
                              className="w-6 h-6 flex items-center justify-center rounded
                                         text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                            >
                              <i className="fa-solid fa-pen-to-square text-xs"></i>
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              disabled={deletingNoteId === note.id}
                              className="w-6 h-6 flex items-center justify-center rounded
                                         text-red-500 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors disabled:opacity-40"
                            >
                              <i className={`fa-solid ${deletingNoteId === note.id ? "fa-spinner fa-spin" : "fa-trash"} text-xs`}></i>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add note */}
              <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/30">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                    placeholder={`Nota para ${formatDate(selectedDay)}...`}
                    className="flex-1 px-3 py-2 text-xs rounded-lg
                               bg-white dark:bg-slate-800
                               border border-gray-200 dark:border-slate-700
                               focus:outline-none focus:border-emerald-500
                               text-slate-900 dark:text-white
                               placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={savingNote || !noteInput.trim()}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs
                               rounded-lg font-semibold transition-colors disabled:opacity-40
                               inline-flex items-center gap-1 flex-shrink-0"
                  >
                    {savingNote
                      ? <i className="fa-solid fa-spinner fa-spin"></i>
                      : <i className="fa-solid fa-plus"></i>
                    }
                    Añadir
                  </button>
                </div>
              </div>
            </div>

            {/* ── Upcoming notes (next 7 days) ─────────────────────────── */}
            {upcomingNotes.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl
                              border border-gray-200 dark:border-slate-800
                              overflow-hidden shadow-sm dark:shadow-xl transition-colors">
                <div className="px-5 py-3.5 border-b border-gray-100 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
                    <i className="fa-solid fa-calendar-week text-amber-500"></i>
                    Próximos 7 días
                    <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800
                                     px-2 py-0.5 rounded-full border border-gray-200 dark:border-slate-700 font-normal">
                      {upcomingNotes.length}
                    </span>
                  </h3>
                </div>
                <div className="px-4 py-3 space-y-2.5">
                  {upcomingNotes.map((note) => {
                    const d = getDaysUntil(note.note_date);
                    return (
                      <button
                        key={note.id}
                        onClick={() => {
                          const [y, m] = note.note_date.split("-").map(Number);
                          setCalYear(y); setCalMonth(m - 1); setSelectedDay(note.note_date);
                        }}
                        className="w-full flex items-start gap-3 text-left group"
                      >
                        <span className={`flex-shrink-0 w-10 text-center py-0.5 rounded-lg text-xs font-bold border
                          ${d === 0
                            ? "bg-red-100   dark:bg-red-950   text-red-600   dark:text-red-400   border-red-200   dark:border-red-800"
                            : d === 1
                              ? "bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                              : "bg-blue-100  dark:bg-blue-950  text-blue-600  dark:text-blue-400  border-blue-200  dark:border-blue-800"
                          }`}>
                          {d === 0 ? "Hoy" : d === 1 ? "Mañ." : `+${d}d`}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(note.note_date)}</p>
                          <p className="text-xs text-slate-700 dark:text-slate-300 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {note.content}
                          </p>
                        </div>
                        <i className="fa-solid fa-arrow-right text-xs text-slate-300 dark:text-slate-600
                                       group-hover:text-emerald-500 transition-colors mt-3 flex-shrink-0"></i>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Expense Modal ────────────────────────────────────────────────── */}
      {modalMode && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm
                     flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700
                          rounded-2xl w-full max-w-md shadow-2xl transition-colors">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <i className={`fa-solid ${modalMode === "add" ? "fa-circle-plus text-emerald-500 dark:text-emerald-400" : "fa-pen-to-square text-amber-500 dark:text-amber-400"}`}></i>
                {modalMode === "add" ? "Nuevo Gasto" : "Editar Gasto"}
              </h3>
              <button onClick={closeModal} className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-2 text-slate-500 dark:text-slate-400">
                  <i className="fa-solid fa-tag mr-1.5"></i>Descripción
                </label>
                <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Ej: Alquiler, Internet, Electricidad..." autoFocus
                  className="w-full px-4 py-2.5 rounded-xl text-sm transition-colors bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500" />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-2 text-slate-500 dark:text-slate-400">
                  <i className="fa-solid fa-coins mr-1.5"></i>Monto
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-sm font-bold select-none">S/</span>
                  <input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0.00" min="0" step="0.01"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-colors bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-2 text-slate-500 dark:text-slate-400">
                  <i className="fa-regular fa-calendar mr-1.5"></i>Fecha de Pago
                </label>
                <input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm transition-colors bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]" />
              </div>
              {modalMode === "edit" && (
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider mb-2 text-slate-500 dark:text-slate-400">
                    <i className="fa-solid fa-circle-check mr-1.5"></i>Estado de Pago
                  </label>
                  <button onClick={() => setFormPaid((v) => !v)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all
                      ${formPaid ? "bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-800 text-green-700 dark:text-green-400" : "bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400"}`}>
                    <i className={`fa-solid ${formPaid ? "fa-circle-check" : "fa-clock"}`}></i>
                    {formPaid ? "Pagado" : "Pendiente"}
                    <span className="ml-auto text-xs opacity-60">Click para cambiar</span>
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-slate-800">
              <button onClick={closeModal}
                className="px-4 py-2 text-sm rounded-xl transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700">
                <i className="fa-solid fa-xmark mr-1.5"></i>Cancelar
              </button>
              <button onClick={handleSaveExpense}
                disabled={saving || !formDesc.trim() || !formAmount || !formDueDate}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-40">
                <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : modalMode === "add" ? "fa-plus" : "fa-floppy-disk"}`}></i>
                {modalMode === "add" ? "Registrar Gasto" : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}