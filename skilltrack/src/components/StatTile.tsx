import type { ReactNode } from 'react'

/** Glass tile used on the gradient hero banners. */
export default function StatTile({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur transition hover:bg-white/25">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/25">{icon}</span>
      <div>
        <div className="text-xl font-bold leading-none">{value}</div>
        <div className="mt-1 text-xs text-white/80">{label}</div>
      </div>
    </div>
  )
}
