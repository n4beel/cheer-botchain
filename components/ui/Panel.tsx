import { HTMLAttributes, ReactNode } from "react";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  highlight?: boolean;
  padded?: boolean;
  children: ReactNode;
}

/**
 * Thermometer glass-morphic containment panel for Cheer
 */
export default function Panel({
  elevated = false,
  highlight = false,
  padded = true,
  children,
  className = "",
  style,
  ...props
}: PanelProps) {
  const bg = elevated ? "var(--bg-elevated)" : "var(--bg-surface)";
  const border = highlight ? "var(--accent)" : "var(--border-subtle)";
  const paddingClass = padded ? "p-5 sm:p-6" : "";

  return (
    <section
      className={`rounded-md shadow-sm transition-colors duration-150 ${paddingClass} ${className}`}
      style={{
        backgroundColor: bg,
        border: `1.5px solid ${border}`,
        boxShadow: highlight ? "0 0 12px rgba(255, 201, 60, 0.15)" : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </section>
  );
}
