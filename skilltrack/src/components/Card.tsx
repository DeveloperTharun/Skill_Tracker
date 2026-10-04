import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  /** Optional icon shown in a tinted chip before the title */
  icon?: ReactNode
  children: ReactNode
  className?: string
}

export default function Card({ title, icon, children, className = '' }: CardProps) {
  return (
    <section className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-lg shadow-indigo-100/40 ${className}`}>
      {title && (
        <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-slate-800">
          {icon && <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">{icon}</span>}
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}
