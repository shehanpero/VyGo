import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/client'
import { today } from '../utils/dates'
import { FaMoneyBillWave, FaPlus, FaMinus, FaEdit, FaTrash, FaTimes, FaFilter } from 'react-icons/fa'

const CATEGORIES = ['FUEL', 'MAINTENANCE', 'SALARY', 'TOLL', 'INSURANCE', 'OTHER']

const categoryBadge = {
  FUEL: 'bg-amber-500/15 text-amber-400',
  MAINTENANCE: 'bg-sky-500/15 text-sky-400',
  SALARY: 'bg-violet-500/15 text-violet-400',
  TOLL: 'bg-emerald-500/15 text-emerald-400',
  INSURANCE: 'bg-blue-500/15 text-blue-400',
  OTHER: 'bg-slate-500/15 text-slate-300',
}

const fmtLKR = (n) => 'LKR ' + Number(n || 0).toLocaleString()

const emptyForm = { busId: '', category: 'FUEL', amount: '', description: '', expenseDate: today() }

export default function OperatorExpenses() {
  const [expenses, setExpenses] = useState([])
  const [buses, setBuses] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  const loadExpenses = async () => {
    try {
      const res = await api.get('/operator/expenses')
      setExpenses(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(errorMessage(err, 'Failed to load expenses'))
    } finally {
      setLoading(false)
    }
  }

  const loadBuses = async () => {
    try {
      const res = await api.get('/operator/buses')
      setBuses(Array.isArray(res.data) ? res.data : [])
    } catch {
      /* non-fatal: expense form still allows unassigned expenses */
    }
  }

  useEffect(() => {
    loadExpenses()
    loadBuses()
  }, [])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setOpen(true)
  }

  const openEdit = (exp) => {
    setEditing(exp)
    setForm({
      busId: exp.busId != null ? String(exp.busId) : '',
      category: exp.category || 'FUEL',
      amount: exp.amount != null ? String(exp.amount) : '',
      description: exp.description || '',
      expenseDate: exp.expenseDate || today(),
    })
    setFormError('')
    setOpen(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    const payload = {
      busId: form.busId ? Number(form.busId) : null,
      category: form.category,
      amount: Number(form.amount),
      description: form.description,
      expenseDate: form.expenseDate,
    }
    try {
      if (editing) {
        await api.put(`/operator/expenses/${editing.id}`, payload)
      } else {
        await api.post('/operator/expenses', payload)
      }
      setOpen(false)
      setEditing(null)
      setForm(emptyForm)
      await loadExpenses()
    } catch (err) {
      setFormError(errorMessage(err, editing ? 'Failed to update expense' : 'Failed to add expense'))
    } finally {
      setSaving(false)
    }
  }

  const removeExpense = async (exp) => {
    if (!window.confirm(`Delete ${exp.category} expense of ${fmtLKR(exp.amount)}?`)) return
    try {
      await api.delete(`/operator/expenses/${exp.id}`)
      await loadExpenses()
    } catch (err) {
      setError(errorMessage(err, 'Failed to delete expense'))
    }
  }

  const visible = filterCategory ? expenses.filter((e) => e.category === filterCategory) : expenses
  const total = visible.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold gradient-text">Expenses</h1>
          <p className="text-sm text-slate-400">
            {visible.length} entr{visible.length === 1 ? 'y' : 'ies'} · {fmtLKR(total)}
          </p>
          <div className="scan-divider mt-3 w-40" />
        </div>
        <button type="button" onClick={() => (open ? setOpen(false) : openAdd())} className="btn-nexus">
          {open ? <><FaMinus /> Close form</> : <><FaPlus /> Add expense</>}
        </button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

      {open && (
        <form onSubmit={submit} className="glass-strong glow-border space-y-4 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white">{editing ? 'Edit expense' : 'Record an expense'}</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-slate-400 hover:text-white" title="Close">
              <FaTimes />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label" htmlFor="exp-category">Category</label>
              <select id="exp-category" className="input" value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="exp-amount">Amount (LKR)</label>
              <input id="exp-amount" type="number" min="0.01" step="0.01" className="input" value={form.amount} onChange={set('amount')} placeholder="15000" required />
            </div>
            <div>
              <label className="label" htmlFor="exp-date">Date</label>
              <input id="exp-date" type="date" className="input" value={form.expenseDate} onChange={set('expenseDate')} required />
            </div>
            <div>
              <label className="label" htmlFor="exp-bus">Bus (optional)</label>
              <select id="exp-bus" className="input" value={form.busId} onChange={set('busId')}>
                <option value="">Unassigned</option>
                {buses.map((b) => (
                  <option key={b.id} value={b.id}>{b.registrationNo}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="exp-description">Description</label>
              <input id="exp-description" className="input" value={form.description} onChange={set('description')} placeholder="e.g. Diesel top-up at Kadawatha" />
            </div>
          </div>
          {formError && <p role="alert" className="text-sm text-red-400">{formError}</p>}
          <div className="flex gap-3">
            <button type="submit" className="btn-nexus" disabled={saving}>
              <FaMoneyBillWave /> {saving ? 'Saving…' : editing ? 'Update expense' : 'Add expense'}
            </button>
            {editing && (
              <button type="button" className="btn-holo" onClick={openAdd}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-400">
          <FaFilter className="text-nexus-400" /> Category
        </label>
        <select className="input !w-auto" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} aria-label="Filter by category">
          <option value="">All</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="glass-strong glow-border overflow-hidden rounded-2xl">
        {loading ? (
          <div className="p-10 text-center text-slate-400">Loading expenses…</div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center text-slate-400">No expenses recorded{filterCategory ? ' for this category' : ''}.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Bus</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((exp) => (
                  <tr key={exp.id} className="border-b border-slate-800/60 last:border-0">
                    <td className="px-5 py-3 text-slate-300">{exp.expenseDate || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${categoryBadge[exp.category] || 'bg-slate-500/15 text-slate-300'}`}>{exp.category || '—'}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-300">{exp.busRegistration || '—'}</td>
                    <td className="px-5 py-3 text-slate-300">{exp.description || '—'}</td>
                    <td className="px-5 py-3 text-right font-semibold text-white">{fmtLKR(exp.amount)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openEdit(exp)} className="btn-holo !px-3 !py-1.5 text-xs">
                          <FaEdit /> Edit
                        </button>
                        <button type="button" onClick={() => removeExpense(exp)} className="btn-danger !px-3 !py-1.5 text-xs">
                          <FaTrash /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
