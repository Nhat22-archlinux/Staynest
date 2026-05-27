type DashboardStatProps = {
  label: string;
  value: string;
};

export function DashboardStat({ label, value }: DashboardStatProps) {
  return (
    <div className="rounded-lg bg-white/12 p-4 backdrop-blur">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/70">{label}</p>
    </div>
  );
}
