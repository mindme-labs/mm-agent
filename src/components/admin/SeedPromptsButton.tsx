'use client'

import { useState } from 'react'

export default function SeedPromptsButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState('')

  const handleSeed = async () => {
    setStatus('loading')
    setResult('')
    try {
      const res = await fetch('/api/ai/seed-prompts', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setResult(data.error || 'Ошибка')
        return
      }
      setStatus('done')
      setResult(`Создано: ${data.created}, пропущено: ${data.skipped}`)
    } catch (err) {
      setStatus('error')
      setResult(err instanceof Error ? err.message : 'Сетевая ошибка')
    }
  }

  return (
    <div style={{
      margin: '0 0 24px',
      padding: '20px 24px',
      background: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: 8,
    }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>
        AI-промпты
      </h3>
      <p style={{ margin: '0 0 12px', fontSize: 14, color: '#666' }}>
        Загрузить 4 стандартных промпта для AI-сервиса (file_recognition, data_extraction, recommendation_text, audit_working_capital). Существующие промпты не перезаписываются.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleSeed}
          disabled={status === 'loading'}
          style={{
            padding: '8px 20px',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'inherit',
            background: status === 'loading' ? '#ccc' : '#0F7B5C',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: status === 'loading' ? 'wait' : 'pointer',
          }}>
          {status === 'loading' ? 'Загрузка...' : 'Загрузить промпты'}
        </button>
        {result && (
          <span style={{
            fontSize: 13,
            color: status === 'error' ? '#C0392B' : '#0F7B5C',
            fontWeight: 500,
          }}>
            {result}
          </span>
        )}
      </div>
    </div>
  )
}
