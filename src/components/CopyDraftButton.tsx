'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyDraftButtonProps {
  text: string
  onCopy?: () => void
}

export function CopyDraftButton({ text, onCopy }: CopyDraftButtonProps) {
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

  return (
    <button
      onClick={handleCopy}
      className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-green-600">Скопировано</span>
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          <span>Скопировать текст для отправки</span>
        </>
      )}
    </button>
  )
}
