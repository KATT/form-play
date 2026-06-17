export type ApiBillKind = 'one_off' | 'repeating'
export type ApiBillStatus = 'draft' | 'scheduled' | 'sent' | 'paid'
export type ApiCurrency = 'USD' | 'EUR' | 'GBP'
export type ApiMoneyCents = number
export type ApiRecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type ApiWeekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'
export type ApiDayOverflowPolicy = 'last_day'
export type ApiScheduleEnd = {
  ends_on: string | null
  max_occurrences: number | null
}
export type ApiDailySchedule = ApiScheduleEnd & {
  frequency: 'daily'
  interval: number
  starts_on: string
  weekdays: ApiWeekday[]
}
export type ApiWeeklySchedule = ApiScheduleEnd & {
  frequency: 'weekly'
  interval: number
  starts_on: string
  weekdays: ApiWeekday[]
}
export type ApiMonthlySchedule = ApiScheduleEnd & {
  frequency: 'monthly'
  interval: number
  starts_on: string
  anchor_date: string
  day_of_month: number
  day_overflow: ApiDayOverflowPolicy
}
export type ApiYearlySchedule = ApiScheduleEnd & {
  frequency: 'yearly'
  interval: number
  starts_on: string
  anchor_date: string
  month: number
  day: number
  day_overflow: ApiDayOverflowPolicy
}
export type ApiBillSchedule =
  | ApiDailySchedule
  | ApiWeeklySchedule
  | ApiMonthlySchedule
  | ApiYearlySchedule

export type ApiBill = {
  id: string
  kind: ApiBillKind
  status: ApiBillStatus
  customer: {
    name: string
    email: string
  }
  issue_date: string
  due_date: string | null
  currency: ApiCurrency
  line_items: Array<{
    id: string
    description: string
    quantity: number
    unit_amount_cents: ApiMoneyCents
    taxable: boolean
  }>
  tax_rate_bps: number
  auto_collect: boolean
  memo: string | null
  schedule: null | ApiBillSchedule
}

export type ApiBillPayloadBase = {
  kind: ApiBillKind
  customer: {
    name: string
    email: string
  }
  status: ApiBillStatus
  issue_date: string
  due_date: string | null
  currency: ApiCurrency
  tax_rate_bps: number
  auto_collect: boolean
  memo: string | null
  schedule: null | ApiBillSchedule
}

export type ApiCreateBillPayload = ApiBillPayloadBase & {
  line_items: Array<{
    description: string
    quantity: number
    unit_amount_cents: ApiMoneyCents
    taxable: boolean
  }>
}

export type ApiUpdateBillPayload = {
  id: string
} & ApiBillPayloadBase & {
    line_items: Array<{
      id?: string
      description: string
      quantity: number
      unit_amount_cents: ApiMoneyCents
      taxable: boolean
    }>
  }

export type ApiBillPayload = ApiCreateBillPayload | ApiUpdateBillPayload

export type ApiCreateSubmission = {
  endpoint: '/api/bills'
  method: 'POST'
  body: ApiCreateBillPayload
}

export type ApiUpdateSubmission = {
  endpoint: string
  method: 'PATCH'
  body: ApiUpdateBillPayload
}

export type ApiSubmission = ApiCreateSubmission | ApiUpdateSubmission

export const sampleApiBill: ApiBill = {
  id: 'bill_42',
  kind: 'repeating',
  status: 'scheduled',
  customer: {
    name: 'Acme Studios',
    email: 'billing@acme.example',
  },
  issue_date: '2026-06-01',
  due_date: null,
  currency: 'USD',
  line_items: [
    {
      id: 'li_design',
      description: 'Design retainer',
      quantity: 1,
      unit_amount_cents: 450_000,
      taxable: true,
    },
    {
      id: 'li_support',
      description: 'Priority support',
      quantity: 4,
      unit_amount_cents: 25_000,
      taxable: false,
    },
  ],
  tax_rate_bps: 825,
  auto_collect: true,
  memo: 'Imported from an imaginary billing API.',
  schedule: {
    frequency: 'monthly',
    interval: 1,
    starts_on: '2026-07-01',
    anchor_date: '2026-07-31',
    day_of_month: 31,
    day_overflow: 'last_day',
    ends_on: null,
    max_occurrences: null,
  },
}
