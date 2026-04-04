'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Download } from 'lucide-react'

interface CsvPreviewDialogProps {
  accountCode: string
  accountName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PREVIEW_LIMIT = 100

export function CsvPreviewDialog({
  accountCode,
  accountName,
  open,
  onOpenChange,
}: CsvPreviewDialogProps) {
  const [rows, setRows] = useState<string[][] | null>(null)
  const [totalLines, setTotalLines] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !accountCode || rows) return
    setLoading(true)
    fetch(`/api/demo/files?account=${accountCode}`)
      .then(res => res.json())
      .then(data => {
        setTotalLines(data.totalLines)
        setRows(data.rows)
      })
      .catch(() => {
        setRows([['Ошибка загрузки файла']])
      })
      .finally(() => setLoading(false))
  }, [open, accountCode, rows])

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setRows(null)
      setTotalLines(0)
    }
    onOpenChange(isOpen)
  }

  const previewRows = rows?.slice(0, PREVIEW_LIMIT) ?? []
  const hasMore = totalLines > PREVIEW_LIMIT

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85dvh] w-[95vw] max-w-5xl overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-base">
                Счёт {accountCode} — {accountName}
              </DialogTitle>
              {totalLines > 0 && (
                <p className="mt-0.5 text-xs text-slate-400">
                  {totalLines} строк в файле
                  {hasMore && ` · показаны первые ${PREVIEW_LIMIT}`}
                </p>
              )}
            </div>
            <a
              href={`/api/demo/files/download?account=${accountCode}`}
              download
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
            >
              <Download className="h-3.5 w-3.5" />
              Скачать CSV
            </a>
          </div>
        </DialogHeader>
        <div className="overflow-auto" style={{ maxHeight: 'calc(85dvh - 100px)' }}>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          )}
          {rows && (
            <>
              <table className="w-full text-left text-xs">
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-slate-100 ${i === 0 ? 'sticky top-0 bg-slate-50 font-semibold' : 'hover:bg-slate-50/50'}`}
                    >
                      <td className="w-8 px-2 py-1.5 text-right text-slate-300">
                        {i + 1}
                      </td>
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className="whitespace-nowrap px-2 py-1.5 text-slate-700"
                        >
                          {cell || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {hasMore && (
                <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-center">
                  <p className="mb-2 text-sm text-slate-500">
                    Показано {PREVIEW_LIMIT} из {totalLines} строк
                  </p>
                  <a
                    href={`/api/demo/files/download?account=${accountCode}`}
                    download
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                  >
                    <Download className="h-4 w-4" />
                    Скачать полный файл
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
