'use client'

import { useState } from 'react'

interface CopyDraftButtonProps {
  text: string
  onCopy?: () => void
  variant?: 'default' | 'link'
  label?: string
}

export function CopyDraftButton({ text, onCopy, variant = 'default', label }: CopyDraftButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    onCopy?.()
    setTimeout(() => setCopied(false), 2000)
  }

  if (variant === 'link') {
    return (
      <button
        onClick={handleCopy}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
          color: copied ? 'var(--mm-green)' : 'var(--mm-green)',
        }}>
        {copied ? 'Скопировано' : (label ?? 'Скопировать текст оффера')}
      </button>
    )
  }

  return (
    <button
      onClick={handleCopy}
      className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
      style={{ color: copied ? 'var(--mm-green)' : 'var(--mm-muted)', background: 'var(--mm-bg)', border: '1px solid var(--mm-border)', fontFamily: 'inherit', cursor: 'pointer' }}>
      {copied ? '✓ Скопировано' : (label ?? 'Скопировать текст для отправки')}
    </button>
  )
}
