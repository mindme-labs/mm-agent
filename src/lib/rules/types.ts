/**
 * Canonical rule codes. Single source of truth used by the rule allowlist
 * (`src/lib/classification/rule-allowlist.ts`) and the rules engine.
 *
 * Each value matches the `ruleCode` literal returned by the corresponding
 * implementation file in `src/lib/rules/`.
 */
export type RuleCode =
  | 'ДЗ-1'
  | 'ДЗ-2'
  | 'ДЗ-3'
  | 'КЗ-1'
  | 'ЗАП-1'
  | 'ЗАП-2'
  | 'ПЛ-1'
  | 'ФЦ-1'
  | 'СВС-1'

export const ALL_RULE_CODES: readonly RuleCode[] = [
  'ДЗ-1',
  'ДЗ-2',
  'ДЗ-3',
  'КЗ-1',
  'ЗАП-1',
  'ЗАП-2',
  'ПЛ-1',
  'ФЦ-1',
  'СВС-1',
] as const
