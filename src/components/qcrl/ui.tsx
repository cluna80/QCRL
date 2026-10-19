import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", type = "button", ...rest } = props;
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center bg-brass px-4 text-sm font-medium text-brass-ink transition-opacity duration-200 hover:opacity-90 disabled:opacity-50 ${className}`}
      {...rest}
    />
  );
}

export function QuietButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", type = "button", ...rest } = props;
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center border border-line bg-panel px-4 text-sm text-paper transition-colors duration-200 hover:border-brass disabled:opacity-50 ${className}`}
      {...rest}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm">
      <span className="font-mono text-xs tracking-widest text-muted">{label}</span>
      {children}
    </label>
  );
}

const controlClass = "min-h-11 w-full border border-line bg-ink px-3 font-mono text-sm text-paper";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input className={`${controlClass} ${className}`} {...rest} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props;
  return (
    <select className={`${controlClass} ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-ink px-3 py-3">
      <p className="font-mono text-xs tracking-widest text-muted">{label}</p>
      <p className="mt-2 font-mono text-lg tabular-nums text-paper">{value}</p>
    </div>
  );
}

export function Callout({
  tone,
  title,
  children,
}: {
  tone: "sage" | "oxide" | "brass" | "muted";
  title: string;
  children: ReactNode;
}) {
  const toneClass =
    tone === "sage" ? "text-sage" : tone === "oxide" ? "text-oxide" : tone === "brass" ? "text-brass" : "text-muted";
  return (
    <aside className="border border-line bg-panel-2 p-4">
      <p className={`font-mono text-xs tracking-widest ${toneClass}`}>{title}</p>
      <div className="mt-2 text-sm text-paper">{children}</div>
    </aside>
  );
}

export function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="border border-line bg-panel-2 px-3 py-3 text-sm text-oxide">
      {message}
    </p>
  );
}

export function SectionIntro({ kicker, title, children }: { kicker: string; title: string; children: ReactNode }) {
  return (
    <header className="max-w-3xl">
      <p className="font-mono text-xs tracking-widest text-brass">{kicker}</p>
      <h2 className="mt-2 text-2xl font-medium tracking-tight text-paper">{title}</h2>
      <div className="mt-3 text-sm text-muted">{children}</div>
    </header>
  );
}

export function readInt(text: string, label: string): number {
  const trimmed = text.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    throw new Error(`${label} must be an integer.`);
  }
  return Number(trimmed);
}
