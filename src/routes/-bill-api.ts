export type ApiBillKind = 'one_off' | 'repeating'
export type ApiBillStatus = 'draft' | 'scheduled' | 'sent' | 'paid'
export type ApiCurrency = 'USD' | 'EUR' | 'GBP'
export type ApiRecurrenceFrequency = 'weekly' | 'monthly' | 'yearly'

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
    unit_amount_cents: number
    taxable: boolean
  }>
  tax_rate_bps: number
  auto_collect: boolean
  memo: string | null
  schedule: null | {
    frequency: ApiRecurrenceFrequency
    interval: number
    starts_on: string
    ends_on: string | null
    max_occurrences: number | null
  }
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
  schedule: null | {
    frequency: ApiRecurrenceFrequency
    interval: number
    starts_on: string
    ends_on: string | null
    max_occurrences: number | null
  }
}

export type ApiCreateBillPayload = ApiBillPayloadBase & {
  line_items: Array<{
    description: string
    quantity: number
    unit_amount_cents: number
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
      unit_amount_cents: number
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
    ends_on: null,
    max_occurrences: null,
  },
}
