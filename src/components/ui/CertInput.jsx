import { useState } from 'react'

const inputCls = 'flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

export default function CertInput({ value = [], onChange }) {
  const [input, setInput] = useState('')

  function add() {
    const trimmed = input.trim()
    if (!trimmed || value.includes(trimmed)) { setInput(''); return }
    onChange([...value, trimmed])
    setInput('')
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          className={inputCls}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="e.g. CNA, CPR/AED… then press Enter"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex-shrink-0"
        >
          Add
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map(cert => (
            <span key={cert} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full">
              {cert}
              <button
                type="button"
                onClick={() => onChange(value.filter(c => c !== cert))}
                className="text-slate-400 hover:text-slate-700 leading-none ml-0.5"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
