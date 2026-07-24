"use client";

import { useState, useEffect } from "react";

type Expense = {
  id: string;
  description: string;
  amount: number;
  due_date: string;   // "YYYY-MM-DD"
  paid: boolean;
  created_at: string; // timestamptz
};

type ModalMode = "add" | "edit" | null;

// ── Formatters ──────────────────────────────────────────
const formatAmount = (n: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(n);

// DATE viene como "YYYY-MM-DD" (sin hora), parseamos local para evitar desfase UTC
const formatDate = (d: string) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("es-PE", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

// created_at viene con hora UTC → mostrar en horario peruano (UTC-5)
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
  const [y, m, d] = due.split("-").map(Number);
  return new Date(y, m - 1, d) < today;
};

const shortId = (id: string) => id?.split("-")[0].toUpperCase() ?? "—";
// ────────────────────────────────────────────────────────

export default function GastosPage() {
  const [expenses, setExpenses]   = useState<Expense[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState<"all" | "pending" | "paid">("all");

  const [modalMode, setModalMode]       = useState<ModalMode>(null);
  const [editExpense, setEditExpense]   = useState<Expense | null>(null);
  const [formDesc, setFormDesc]         = useState("");
  const [formAmount, setFormAmount]     = useState("");
  const [formDueDate, setFormDueDate]   = useState("");
  const [formPaid, setFormPaid]         = useState(false);
  const [saving, setSaving]             = useState(false);
  const [deletingId, setDeletingId]     = useState<string | null>(null);

  useEffect(() => { fetchExpenses(); }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/expenses");
      const json = await res.json();
      if (json.data) setExpenses(json.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ── CRUD ──
  const handleSave = async () => {
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

  const handleDelete = async (id: string) => {
    if (!confirm("¿Confirmas que deseas eliminar este gasto?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      await fetchExpenses();
    } finally { setDeletingId(null); }
  };

  // ── Modal ──
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

  // ── Filtros ──
  const filtered = expenses.filter((e) => {
    const matchSearch = e.description.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "paid"    &&  e.paid) ||
      (filter === "pending" && !e.paid);
    return matchSearch && matchFilter;
  });

  // ── Resumen financiero ──
  const totalAmt   = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const paidAmt    = expenses.filter(e => e.paid).reduce((s, e) => s + Number(e.amount), 0);
  const pendingAmt = expenses.filter(e => !e.paid).reduce((s, e) => s + Number(e.amount), 0);
  const overdueCount = expenses.filter(e => isOverdue(e.due_date, e.paid)).length;

  const statCards = [
    {
      label: "Total registrado", value: formatAmount(totalAmt),
      icon: "fa-money-bill-wave",
      val:  "text-blue-600   dark:text-blue-400",
      sub:  "text-blue-500",
      bg:   "bg-blue-50   dark:bg-blue-950/50  border-blue-200  dark:border-blue-900",
    },
    {
      label: "Pagado", value: formatAmount(paidAmt),
      icon: "fa-circle-check",
      val:  "text-green-600  dark:text-green-400",
      sub:  "text-green-500",
      bg:   "bg-green-50  dark:bg-green-950/50 border-green-200 dark:border-green-900",
    },
    {
      label: "Pendiente", value: formatAmount(pendingAmt),
      icon: "fa-clock",
      val:  "text-amber-600  dark:text-amber-400",
      sub:  "text-amber-500",
      bg:   "bg-amber-50  dark:bg-amber-950/50 border-amber-200 dark:border-amber-900",
    },
    {
      label: "Vencidos", value: String(overdueCount),
      icon: "fa-triangle-exclamation",
      val:  overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400",
      sub:  overdueCount > 0 ? "text-red-500" : "text-slate-500",
      bg:   overdueCount > 0
              ? "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900"
              : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-white p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Header ── */}
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

        {/* ── Stats ── */}
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

        {/* ── Tabla ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl
                        border border-gray-200 dark:border-slate-800
                        overflow-hidden shadow-sm dark:shadow-xl transition-colors">

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3
                          px-5 py-4 border-b border-gray-100 dark:border-slate-800">
            <h2 className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2 text-sm">
              <i className="fa-solid fa-table-list text-slate-400 dark:text-slate-500"></i>
              Listado de gastos
            </h2>
            <div className="flex items-center gap-2">
              {/* Filtro */}
              <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 text-xs">
                {(["all", "pending", "paid"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 transition-colors ${
                      filter === f
                        ? "bg-gray-200 dark:bg-slate-700 text-slate-900 dark:text-white font-medium"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {{ all: "Todos", pending: "Pendientes", paid: "Pagados" }[f]}
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
                             rounded-lg focus:outline-none focus:border-emerald-500
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
                  <th className="px-4 py-3 text-left w-8">#</th>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-left">Fecha de Pago</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Registrado (PE)</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400 dark:text-slate-500">
                      <i className="fa-solid fa-spinner fa-spin text-xl mb-2 block"></i>
                      Cargando gastos...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400 dark:text-slate-500">
                      <i className="fa-solid fa-inbox text-2xl mb-2 block"></i>
                      {search || filter !== "all"
                        ? "Sin resultados para los filtros aplicados"
                        : "No hay gastos registrados. ¡Agrega el primero!"}
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
                        {/* # */}
                        <td className="px-4 py-3.5 text-slate-400 dark:text-slate-600 font-mono text-xs">
                          {i + 1}
                        </td>
                        {/* ID */}
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs px-2 py-1 rounded-md
                                           bg-gray-100 dark:bg-slate-800
                                           text-slate-500 dark:text-slate-400
                                           border border-gray-200 dark:border-slate-700">
                            {shortId(exp.id)}
                          </span>
                        </td>
                        {/* Descripción */}
                        <td className="px-4 py-3.5 max-w-[200px]">
                          <span className={`font-medium ${
                            exp.paid
                              ? "line-through text-slate-400 dark:text-slate-500"
                              : "text-slate-800 dark:text-slate-200"
                          }`}>
                            {exp.description}
                          </span>
                        </td>
                        {/* Monto */}
                        <td className="px-4 py-3.5 text-right">
                          <span className={`font-bold font-mono text-sm ${
                            exp.paid
                              ? "text-slate-400 dark:text-slate-500"
                              : "text-slate-800 dark:text-slate-200"
                          }`}>
                            {formatAmount(exp.amount)}
                          </span>
                        </td>
                        {/* Fecha de pago */}
                        <td className="px-4 py-3.5">
                          <span className={`flex items-center gap-1.5 text-xs whitespace-nowrap ${
                            overdue
                              ? "text-red-600 dark:text-red-400 font-semibold"
                              : "text-slate-500 dark:text-slate-400"
                          }`}>
                            <i className={`fa-regular ${overdue ? "fa-calendar-xmark" : "fa-calendar"}`}></i>
                            {formatDate(exp.due_date)}
                          </span>
                        </td>
                        {/* Estado */}
                        <td className="px-4 py-3.5">
                          {exp.paid ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                                             bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400
                                             border border-green-200 dark:border-green-900">
                              <i className="fa-solid fa-circle-check"></i> Pagado
                            </span>
                          ) : overdue ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                                             bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400
                                             border border-red-200 dark:border-red-900">
                              <i className="fa-solid fa-triangle-exclamation"></i> Vencido
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                                             bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400
                                             border border-amber-200 dark:border-amber-900">
                              <i className="fa-solid fa-clock"></i> Pendiente
                            </span>
                          )}
                        </td>
                        {/* Registrado PE */}
                        <td className="px-4 py-3.5 text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">
                          <i className="fa-regular fa-clock mr-1.5"></i>
                          {formatPE(exp.created_at)}
                        </td>
                        {/* Acciones */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEdit(exp)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5
                                         bg-amber-500 hover:bg-amber-400 text-slate-950
                                         text-xs rounded-lg transition-colors font-semibold"
                            >
                              <i className="fa-solid fa-pen-to-square"></i> Editar
                            </button>
                            <button
                              onClick={() => handleDelete(exp.id)}
                              disabled={deletingId === exp.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5
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

          {/* Footer tabla */}
          {!loading && expenses.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800
                            bg-gray-50 dark:bg-slate-950/30
                            text-slate-400 dark:text-slate-600 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1">
                <i className="fa-solid fa-circle-info"></i>
                Mostrando{" "}
                <span className="text-slate-600 dark:text-slate-400 font-medium mx-1">{filtered.length}</span>
                de{" "}
                <span className="text-slate-600 dark:text-slate-400 font-medium mx-1">{expenses.length}</span>
                registros
              </span>
              {/* Total visible filtrado */}
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                Subtotal:{" "}
                <span className="text-emerald-600 dark:text-emerald-400">
                  {formatAmount(filtered.reduce((s, e) => s + Number(e.amount), 0))}
                </span>
              </span>
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
                    ? "fa-circle-plus text-emerald-500 dark:text-emerald-400"
                    : "fa-pen-to-square text-amber-500 dark:text-amber-400"
                }`}></i>
                {modalMode === "add" ? "Nuevo Gasto" : "Editar Gasto"}
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

              {/* Descripción */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-2
                                   text-slate-500 dark:text-slate-400">
                  <i className="fa-solid fa-tag mr-1.5"></i>Descripción
                </label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Ej: Alquiler, Internet, Electricidad..."
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl text-sm transition-colors
                             bg-gray-50 dark:bg-slate-800
                             border border-gray-200 dark:border-slate-700
                             focus:outline-none focus:border-emerald-500
                             text-slate-900 dark:text-white
                             placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              {/* Monto */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-2
                                   text-slate-500 dark:text-slate-400">
                  <i className="fa-solid fa-coins mr-1.5"></i>Monto
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2
                                   text-slate-500 dark:text-slate-400 text-sm font-bold select-none">
                    S/
                  </span>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-colors
                               bg-gray-50 dark:bg-slate-800
                               border border-gray-200 dark:border-slate-700
                               focus:outline-none focus:border-emerald-500
                               text-slate-900 dark:text-white
                               placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Fecha de pago */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-2
                                   text-slate-500 dark:text-slate-400">
                  <i className="fa-regular fa-calendar mr-1.5"></i>Fecha de Pago
                </label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm transition-colors
                             bg-gray-50 dark:bg-slate-800
                             border border-gray-200 dark:border-slate-700
                             focus:outline-none focus:border-emerald-500
                             text-slate-900 dark:text-white
                             [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>

              {/* Estado — solo en edición */}
              {modalMode === "edit" && (
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider mb-2
                                     text-slate-500 dark:text-slate-400">
                    <i className="fa-solid fa-circle-check mr-1.5"></i>Estado de Pago
                  </label>
                  <button
                    onClick={() => setFormPaid((v) => !v)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all
                      ${formPaid
                        ? "bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-800 text-green-700 dark:text-green-400"
                        : "bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                      }`}
                  >
                    <i className={`fa-solid ${formPaid ? "fa-circle-check" : "fa-clock"}`}></i>
                    {formPaid ? "Pagado" : "Pendiente"}
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
                           bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700"
              >
                <i className="fa-solid fa-xmark mr-1.5"></i>Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formDesc.trim() || !formAmount || !formDueDate}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl
                           bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-40"
              >
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