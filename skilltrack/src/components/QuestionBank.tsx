import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage } from '../api'

type Difficulty = 'easy' | 'medium' | 'hard'
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

interface QuestionRow {
  id: number
  text: string
  options: string[]
  answer_index: number
  difficulty: Difficulty
  topic: string | null
}

const inputClass = 'rounded border border-slate-300 px-2 py-1 text-sm'
const blankForm = { text: '', options: ['', '', '', ''], answer: 0, difficulty: 'medium' as Difficulty, topic: '' }

/** List, add and delete the questions of one level. Used by track owners and admins. */
export default function QuestionBank({ levelId, levelName, onChanged }: {
  levelId: number
  levelName: string
  onChanged?: () => Promise<unknown> | void
}) {
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [error, setError] = useState('')
  const [form, setForm] = useState(blankForm)

  const load = useCallback(async () => {
    const res = await api.get<QuestionRow[]>(`/owner/levels/${levelId}/questions`)
    setQuestions(res.data)
  }, [levelId])

  useEffect(() => { load().catch((err) => setError(errorMessage(err))) }, [load])

  async function add() {
    setError('')
    const options = form.options.map((o) => o.trim()).filter(Boolean)
    if (options.length < 2) return setError('Enter at least two options')
    if (!form.options[form.answer]?.trim()) return setError('The correct answer must be one of the filled options')
    const answerIndex = form.options.slice(0, form.answer + 1).filter((o) => o.trim()).length - 1
    try {
      await api.post(`/owner/levels/${levelId}/questions`, {
        text: form.text, options, answer_index: answerIndex, difficulty: form.difficulty, topic: form.topic,
      })
      setForm(blankForm)
      await Promise.all([load(), onChanged?.()])
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function remove(id: number) {
    try {
      await api.delete(`/owner/questions/${id}`)
      await Promise.all([load(), onChanged?.()])
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <>
      <div className="mt-4 rounded border border-slate-200 p-3">
        <p className="mb-2 text-sm font-medium">Add a question to {levelName}</p>
        <textarea
          value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} rows={2} placeholder="Question text"
          className={`${inputClass} w-full`}
        />
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {form.options.map((opt, i) => (
            <label key={i} className="flex items-center gap-2 text-sm">
              <input type="radio" name="correct" checked={form.answer === i} onChange={() => setForm({ ...form, answer: i })} title="Correct answer" />
              <input
                value={opt} placeholder={`Option ${i + 1}`} className={`${inputClass} flex-1`}
                onChange={(e) => setForm({ ...form, options: form.options.map((o, j) => (j === i ? e.target.value : o)) })}
              />
            </label>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })} className={inputClass}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Topic (for skill-gap analysis)" className={`${inputClass} flex-1`} />
          <button onClick={add} className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700">Add question</button>
        </div>
        <p className="mt-1 text-xs text-slate-400">Select the radio button next to the correct answer.</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <p className="mt-4 text-sm font-medium">Question bank ({questions.length})</p>
      {questions.length === 0 && <p className="text-sm text-slate-500">No questions yet for this level.</p>}
      <ul className="divide-y divide-slate-100 text-sm">
        {questions.map((q) => (
          <li key={q.id} className="flex items-start justify-between gap-3 py-2">
            <div>
              <div>{q.text}</div>
              <div className="text-xs text-slate-500">
                <span className="capitalize">{q.difficulty}</span>{q.topic && ` · ${q.topic}`} · Answer: {q.options[q.answer_index]}
              </div>
            </div>
            <button onClick={() => remove(q.id)} className="shrink-0 text-xs text-red-600 hover:underline">Delete</button>
          </li>
        ))}
      </ul>
    </>
  )
}
