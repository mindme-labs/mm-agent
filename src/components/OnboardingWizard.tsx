'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FileSpreadsheet, Check, Loader2, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CsvPreviewDialog } from './CsvPreviewDialog'

const DEMO_FILES = [
  { code: '10', name: 'Материалы' },
  { code: '41', name: 'Товары' },
  { code: '45', name: 'Товары отгруженные' },
  { code: '60', name: 'Расчёты с поставщиками' },
  { code: '62', name: 'Расчёты с покупателями' },
  { code: '90.01', name: 'Выручка' },
  { code: '90.02', name: 'Себестоимость продаж' },
]

const ANALYSIS_STEPS = [
  'Загрузка данных из 1С...',
  'Анализ дебиторской задолженности...',
  'Проверка складских остатков...',
  'Формирование рекомендаций...',
]

export function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [recommendationCount, setRecommendationCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [previewFile, setPreviewFile] = useState<{ code: string; name: string } | null>(null)

  const runAnalysis = useCallback(async () => {
    if (seeding) return
    setSeeding(true)
    setError(null)

    for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
      setAnalysisStep(i)
      setAnalysisProgress(((i + 1) / ANALYSIS_STEPS.length) * 100)

      if (i === ANALYSIS_STEPS.length - 1) {
        try {
          const res = await fetch('/api/demo/seed', { method: 'POST' })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Seed failed')
          setRecommendationCount(data.recommendationCount)
        } catch (err) {
          setError((err as Error).message)
          setSeeding(false)
          return
        }
      } else {
        await new Promise(r => setTimeout(r, 1000))
      }
    }

    await new Promise(r => setTimeout(r, 500))
    setStep(3)
    setSeeding(false)
  }, [seeding])

  useEffect(() => {
    if (step === 2 && !seeding && analysisStep === 0) {
      runAnalysis()
    }
  }, [step, seeding, analysisStep, runAnalysis])

  const completeOnboarding = async () => {
    try {
      await fetch('/api/onboarding/complete', { method: 'POST' })
      window.location.href = '/app/inbox'
    } catch {
      setError('Не удалось завершить онбординг')
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-lg p-6 md:max-w-2xl md:p-8 lg:max-w-3xl lg:p-10">
        {step === 0 && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
              <Sparkles className="h-8 w-8 text-indigo-600" />
            </div>
            <h1 className="mb-2 text-xl font-bold text-slate-900">
              Добро пожаловать в MMLabs
            </h1>
            <p className="mb-6 text-sm text-slate-600">
              Сейчас мы покажем, как сервис находит проблемы в ваших финансах
              и предлагает решения.
            </p>
            <Button
              onClick={() => setStep(1)}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              size="lg"
            >
              Начать демонстрацию
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="mb-1 text-lg font-bold text-slate-900">
              Демонстрационные данные
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              Загружены ОСВ из 1С:Бухгалтерии за 2025 г.
            </p>
            <div className="mb-6 grid grid-cols-1 gap-2 md:grid-cols-2">
              {DEMO_FILES.map((file) => (
                <button
                  key={file.code}
                  onClick={() => setPreviewFile({ code: file.code, name: file.name })}
                  className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/50"
                >
                  <FileSpreadsheet className="h-5 w-5 shrink-0 text-green-600" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-700">
                      Счёт {file.code}
                    </div>
                    <div className="truncate text-xs text-slate-500">{file.name}</div>
                  </div>
                  <span className="shrink-0 text-xs text-indigo-500">Просмотреть</span>
                </button>
              ))}
            </div>

            {previewFile && (
              <CsvPreviewDialog
                accountCode={previewFile.code}
                accountName={previewFile.name}
                open={!!previewFile}
                onOpenChange={(open) => { if (!open) setPreviewFile(null) }}
              />
            )}
            <Button
              onClick={() => setStep(2)}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              size="lg"
            >
              Начать анализ
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              Анализ данных
            </h2>
            <Progress value={analysisProgress} className="mx-auto mb-6 h-2 max-w-md" />
            <div className="mx-auto max-w-md space-y-3">
              {ANALYSIS_STEPS.map((label, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-sm ${
                    i < analysisStep
                      ? 'text-green-600'
                      : i === analysisStep
                        ? 'font-medium text-indigo-600'
                        : 'text-slate-400'
                  }`}
                >
                  {i < analysisStep ? (
                    <Check className="h-4 w-4" />
                  ) : i === analysisStep ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <div className="h-4 w-4" />
                  )}
                  {label}
                </div>
              ))}
            </div>
            {error && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mb-2 text-lg font-bold text-slate-900">
              Диагностика завершена
            </h2>
            <p className="mb-6 text-sm text-slate-600">
              Найдено <span className="font-bold text-indigo-600">{recommendationCount}</span>{' '}
              {recommendationCount === 1
                ? 'проблема'
                : recommendationCount < 5
                  ? 'проблемы'
                  : 'проблем'}
              , требующих внимания.
            </p>
            <Button
              onClick={completeOnboarding}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              size="lg"
            >
              Перейти к результатам
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="mt-6 flex justify-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-300'
              }`}
            />
          ))}
        </div>
      </Card>
    </div>
  )
}
