import type { ReactNode } from "react";

type FactProps = {
  icon: ReactNode;
  label: string;
};

export function Fact({ icon, label }: FactProps) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-mint/10 text-mint">{icon}</div>
      <p className="text-sm font-black">{label}</p>
    </div>
  );
}
