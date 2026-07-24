"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/",       label: "Tareas",  icon: "fa-list-check" },
  { href: "/gastos", label: "Gastos",  icon: "fa-wallet"     },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    // Leer el estado actual que ya aplicó el script inline del layout
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <nav className="sticky top-0 z-40 h-14
                    bg-white/80 dark:bg-slate-900/80 backdrop-blur-md
                    border-b border-gray-200 dark:border-slate-800
                    transition-colors">
      <div className="max-w-5xl mx-auto px-6 h-full flex items-center justify-between">

        {/* Brand + links */}
        <div className="flex items-center gap-6">
          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2 select-none">
            <i className="fa-solid fa-bolt text-blue-500"></i>
            TaskManager
          </span>

          <div className="flex items-center gap-1">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${active
                      ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800"
                    }`}
                >
                  <i className={`fa-solid ${l.icon} text-xs`}></i>
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Theme toggle */}
        {isDark !== undefined && (
          <button
            onClick={toggleTheme}
            title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors
                       border border-gray-200 dark:border-slate-700
                       bg-white dark:bg-slate-800
                       text-slate-500 dark:text-slate-400
                       hover:border-blue-500 hover:text-blue-500
                       dark:hover:border-blue-400 dark:hover:text-blue-400"
          >
            <i className={`fa-solid ${isDark ? "fa-sun" : "fa-moon"} text-sm`}></i>
          </button>
        )}
      </div>
    </nav>
  );
}