type MiniMetricProps = {
  label: string;
};

export function MiniMetric({ label }: MiniMetricProps) {
  return <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-black text-slate-700">{label}</span>;
}
