import { Link, useParams } from 'react-router-dom'
import Card from '../components/Card'
import { useFetch } from '../useFetch'

interface Verification {
  valid: boolean
  code?: string
  holder?: string
  credential?: string
  score?: number | null
  issued_at?: string
  first_attempt?: boolean
}

/** Public page (no login): confirms whether a certificate ID is genuine. */
export default function Verify() {
  const { code = '' } = useParams()
  const result = useFetch<Verification>(`/verify/${encodeURIComponent(code)}`)
  const v = result.data

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-center text-2xl font-bold text-indigo-600">SkillTrack</h1>
        <Card title="Certificate verification">
          {result.loading && <p className="text-sm text-slate-500">Checking…</p>}
          {result.error && <p className="text-sm text-red-600">{result.error}</p>}
          {v && !v.valid && (
            <>
              <p className="text-lg font-semibold text-red-600">Not found</p>
              <p className="mt-1 text-sm text-slate-500">No certificate with the ID <span className="font-mono">{code}</span> exists.</p>
            </>
          )}
          {v?.valid && (
            <>
              <p className="text-lg font-semibold text-emerald-600">✓ Valid certificate</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div><dt className="text-xs uppercase text-slate-500">Awarded to</dt><dd className="font-medium">{v.holder}</dd></div>
                <div><dt className="text-xs uppercase text-slate-500">Credential</dt><dd className="font-medium">{v.credential}</dd></div>
                {v.score != null && <div><dt className="text-xs uppercase text-slate-500">Score</dt><dd>{v.score}%</dd></div>}
                <div>
                  <dt className="text-xs uppercase text-slate-500">Issued</dt>
                  <dd>{new Date(v.issued_at!).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}{v.first_attempt && ' · cleared on the first attempt 🏅'}</dd>
                </div>
                <div><dt className="text-xs uppercase text-slate-500">Certificate ID</dt><dd className="font-mono">{v.code}</dd></div>
              </dl>
            </>
          )}
        </Card>
        <p className="text-center text-sm"><Link to="/login" className="text-indigo-600 hover:underline">Go to SkillTrack</Link></p>
      </div>
    </div>
  )
}
