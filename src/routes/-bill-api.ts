import { z } from 'zod'

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

export type ApiBillPayload = {
  kind: ApiBillKind
  customer: {
    name: string
    email: string
  }
  status: ApiBillStatus
  issue_date: string
  due_date: string | null
  currency: ApiCurrency
  line_items: Array<{
    id?: string
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

export type ApiSubmission = {
  endpoint: string
  method: 'POST' | 'PATCH'
  body: ApiBillPayload
}

export const apiBillPayloadSchema: z.ZodType<ApiBillPayload, ApiBillPayload> =
  z.object({
    kind: z.enum(['one_off', 'repeating']),
    customer: z.object({
      name: z.string(),
      email: z.string(),
    }),
    status: z.enum(['draft', 'scheduled', 'sent', 'paid']),
    issue_date: z.string(),
    due_date: z.string().nullable(),
    currency: z.enum(['USD', 'EUR', 'GBP']),
    line_items: z.array(
      z.object({
        id: z.string().optional(),
        description: z.string(),
        quantity: z.number(),
        unit_amount_cents: z.number(),
        taxable: z.boolean(),
      }),
    ),
    tax_rate_bps: z.number(),
    auto_collect: z.boolean(),
    memo: z.string().nullable(),
    schedule: z
      .object({
        frequency: z.enum(['weekly', 'monthly', 'yearly']),
        interval: z.number(),
        starts_on: z.string(),
        ends_on: z.string().nullable(),
        max_occurrences: z.number().nullable(),
      })
      .nullable(),
  })

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
