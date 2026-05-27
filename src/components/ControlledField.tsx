type ControlledFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

export function ControlledField({ label, value, onChange, placeholder }: ControlledFieldProps) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-ocean"
      />
    </label>
  );
}
