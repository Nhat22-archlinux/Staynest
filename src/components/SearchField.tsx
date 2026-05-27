import type { ReactNode } from "react";

type SearchFieldProps = {
  icon: ReactNode;
  label: string;
  children: ReactNode;
};

export function SearchField({ icon, label, children }: SearchFieldProps) {
  return (
    <label className="flex min-h-14 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4">
      <span className="text-ocean">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
        {children}
      </span>
    </label>
  );
}
