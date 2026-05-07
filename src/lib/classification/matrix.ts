/**
 * Business model matrix — 13 models × 7 indicators.
 *
 * Source of truth: `docs/bizmodel_matrix_final.html` and v3.3.1 requirements §6.1.
 *
 * Strength legend:
 *   - 'strong'      — defining positive signal for the model
 *   - 'moderate'    — supporting positive signal
 *   - 'weak'        — small positive / compatible (does not rule out, does not strongly support)
 *   - 'contradicts' — defining absence (if present, signals a different model)
 *
 * Hybrid models inherit max-strength from their two base components for
 * indicators where they overlap; trash-artifact warnings (when signals look
 * like a hybrid but don't form a coherent business story) are emitted by the
 * AI classifier, not encoded here.
 */

export type BusinessModel =
  | 'project'
  | 'trading'
  | 'production'
  | 'subscription'
  | 'consulting'
  | 'agency'
  | 'project_trading'
  | 'production_project'
  | 'consulting_subscription'
  | 'trading_agency'
  | 'subscription_consulting'
  | 'production_trading'
  | 'clinic'

export const ALL_BUSINESS_MODELS: readonly BusinessModel[] = [
  'project',
  'trading',
  'production',
  'subscription',
  'consulting',
  'agency',
  'project_trading',
  'production_project',
  'consulting_subscription',
  'trading_agency',
  'subscription_consulting',
  'production_trading',
  'clinic',
] as const

export type IndicatorKey =
  | 'inventory_balance_41'
  | 'wip_balance_20'
  | 'finished_goods_43'
  | 'revenue_regularity_score'
  | 'fot_share_in_cogs'
  | 'agency_transit_share'
  | 'account_26_destination'

export const ALL_INDICATOR_KEYS: readonly IndicatorKey[] = [
  'inventory_balance_41',
  'wip_balance_20',
  'finished_goods_43',
  'revenue_regularity_score',
  'fot_share_in_cogs',
  'agency_transit_share',
  'account_26_destination',
] as const

export type IndicatorStrength = 'strong' | 'moderate' | 'weak' | 'contradicts'

export type ModelCategory = 'base' | 'hybrid' | 'industry'

export interface ModelDefinition {
  id: BusinessModel
  /** Russian label for UI. */
  name: string
  /** English label for logs and analytics. */
  nameEn: string
  category: ModelCategory
  /** Short description for confirmation UI. */
  description: string
  /** Strength of each indicator for this model. Sparse — keys not listed are treated as 'weak'. */
  indicators: Partial<Record<IndicatorKey, IndicatorStrength>>
}

export const MODELS: Record<BusinessModel, ModelDefinition> = {
  // -------- Base models --------
  project: {
    id: 'project',
    name: 'Проектная',
    nameEn: 'Project',
    category: 'base',
    description: 'Сделка = проект, директ-костинг (26→90 напрямую), без склада и НЗП',
    indicators: {
      account_26_destination: 'strong',
      inventory_balance_41: 'weak',
      wip_balance_20: 'contradicts',
      finished_goods_43: 'contradicts',
      revenue_regularity_score: 'weak',
      fot_share_in_cogs: 'moderate',
      agency_transit_share: 'contradicts',
    },
  },
  trading: {
    id: 'trading',
    name: 'Торговая',
    nameEn: 'Trading',
    category: 'base',
    description: 'Inventory-driven: B2B-дистрибуция со значимыми остатками на сч. 41',
    indicators: {
      account_26_destination: 'moderate',
      inventory_balance_41: 'strong',
      wip_balance_20: 'contradicts',
      finished_goods_43: 'contradicts',
      revenue_regularity_score: 'moderate',
      fot_share_in_cogs: 'weak',
      agency_transit_share: 'contradicts',
    },
  },
  production: {
    id: 'production',
    name: 'Производственная',
    nameEn: 'Production',
    category: 'base',
    description: 'Manufacturing: материалы, НЗП и готовая продукция (сч. 10/20/43)',
    indicators: {
      account_26_destination: 'strong',
      inventory_balance_41: 'strong',
      wip_balance_20: 'strong',
      finished_goods_43: 'strong',
      revenue_regularity_score: 'moderate',
      fot_share_in_cogs: 'moderate',
      agency_transit_share: 'contradicts',
    },
  },
  subscription: {
    id: 'subscription',
    name: 'Подписочная',
    nameEn: 'Subscription / SaaS',
    category: 'base',
    description: 'SaaS / сервис: равномерные поступления, COGS = ФОТ, без склада',
    indicators: {
      account_26_destination: 'moderate',
      inventory_balance_41: 'contradicts',
      wip_balance_20: 'contradicts',
      finished_goods_43: 'contradicts',
      revenue_regularity_score: 'strong',
      fot_share_in_cogs: 'strong',
      agency_transit_share: 'contradicts',
    },
  },
  consulting: {
    id: 'consulting',
    name: 'Консалтинг',
    nameEn: 'Consulting',
    category: 'base',
    description: 'Time-based: ФОТ доминирует, без склада и НЗП',
    indicators: {
      account_26_destination: 'moderate',
      inventory_balance_41: 'contradicts',
      wip_balance_20: 'contradicts',
      finished_goods_43: 'contradicts',
      revenue_regularity_score: 'moderate',
      fot_share_in_cogs: 'strong',
      agency_transit_share: 'contradicts',
    },
  },
  agency: {
    id: 'agency',
    name: 'Агентская',
    nameEn: 'Agency',
    category: 'base',
    description: 'Комиссионная: высокий транзит на 76/62, оборот >> прибыль',
    indicators: {
      account_26_destination: 'weak',
      inventory_balance_41: 'contradicts',
      wip_balance_20: 'contradicts',
      finished_goods_43: 'contradicts',
      revenue_regularity_score: 'moderate',
      fot_share_in_cogs: 'moderate',
      agency_transit_share: 'strong',
    },
  },

  // -------- Hybrid models --------
  // Hybrid indicators inherit MAX strength from base components per indicator.
  // Source rows in bizmodel_matrix_final.html.
  project_trading: {
    id: 'project_trading',
    name: 'Проект + Торговля',
    nameEn: 'Project + Trading',
    category: 'hybrid',
    description: 'Интеграторы, строители: проектная выручка с буфером на складе',
    indicators: {
      account_26_destination: 'strong',
      inventory_balance_41: 'moderate',
      wip_balance_20: 'weak',
      finished_goods_43: 'contradicts',
      revenue_regularity_score: 'weak',
      fot_share_in_cogs: 'moderate',
      agency_transit_share: 'contradicts',
    },
  },
  production_project: {
    id: 'production_project',
    name: 'Производство + Проект',
    nameEn: 'Production + Project',
    category: 'hybrid',
    description: 'Под заказ (мебель, спецтехника): позаказное производство с НЗП',
    indicators: {
      account_26_destination: 'strong',
      inventory_balance_41: 'strong',
      wip_balance_20: 'strong',
      finished_goods_43: 'moderate',
      revenue_regularity_score: 'weak',
      fot_share_in_cogs: 'moderate',
      agency_transit_share: 'contradicts',
    },
  },
  consulting_subscription: {
    id: 'consulting_subscription',
    name: 'Консалтинг + Подписка',
    nameEn: 'Consulting + Subscription',
    category: 'hybrid',
    description: 'Ретейнер + проекты: частично регулярная выручка, доминирует ФОТ',
    indicators: {
      account_26_destination: 'moderate',
      inventory_balance_41: 'contradicts',
      wip_balance_20: 'contradicts',
      finished_goods_43: 'contradicts',
      revenue_regularity_score: 'moderate',
      fot_share_in_cogs: 'strong',
      agency_transit_share: 'contradicts',
    },
  },
  trading_agency: {
    id: 'trading_agency',
    name: 'Торговля + Агент',
    nameEn: 'Trading + Agency',
    category: 'hybrid',
    description: 'Свой товар + комиссия: частичный склад и частичный транзит на 76',
    indicators: {
      account_26_destination: 'moderate',
      inventory_balance_41: 'moderate',
      wip_balance_20: 'contradicts',
      finished_goods_43: 'contradicts',
      revenue_regularity_score: 'moderate',
      fot_share_in_cogs: 'weak',
      agency_transit_share: 'moderate',
    },
  },
  subscription_consulting: {
    id: 'subscription_consulting',
    name: 'Подписка + Консалтинг',
    nameEn: 'Subscription + Consulting',
    category: 'hybrid',
    description: 'Подписка + внедрение: базово регулярная выручка, доминирует ФОТ',
    indicators: {
      account_26_destination: 'moderate',
      inventory_balance_41: 'contradicts',
      wip_balance_20: 'contradicts',
      finished_goods_43: 'contradicts',
      revenue_regularity_score: 'moderate',
      fot_share_in_cogs: 'strong',
      agency_transit_share: 'contradicts',
    },
  },
  production_trading: {
    id: 'production_trading',
    name: 'Производство + Торговля',
    nameEn: 'Production + Trading',
    category: 'hybrid',
    description: 'Своё производство + перепродажа: большой склад (10+41+43), есть НЗП',
    indicators: {
      account_26_destination: 'strong',
      inventory_balance_41: 'strong',
      wip_balance_20: 'moderate',
      finished_goods_43: 'strong',
      revenue_regularity_score: 'moderate',
      fot_share_in_cogs: 'moderate',
      agency_transit_share: 'contradicts',
    },
  },

  // -------- Industry pattern --------
  clinic: {
    id: 'clinic',
    name: 'Частная клиника',
    nameEn: 'Private clinic',
    category: 'industry',
    description: 'Здравоохранение: медикаменты на складе + ФОТ врачей доминирует',
    indicators: {
      account_26_destination: 'moderate',
      inventory_balance_41: 'moderate',
      wip_balance_20: 'contradicts',
      finished_goods_43: 'contradicts',
      revenue_regularity_score: 'moderate',
      fot_share_in_cogs: 'strong',
      agency_transit_share: 'contradicts',
    },
  },
}

export function getModelDefinition(model: BusinessModel | null | undefined): ModelDefinition | null {
  if (!model) return null
  return MODELS[model] ?? null
}
