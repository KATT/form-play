import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute } from '@tanstack/react-router'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import {
  sampleApiBill,
  type ApiBill,
  type ApiBillPayload,
  type ApiSubmission,
} from './-bill-api'

export const Route = createFileRoute('/')({ component: Home })

const currencies = ['USD', 'EUR', 'GBP'] as const
const billStatuses = ['draft', 'scheduled', 'sent', 'paid'] as const
const editorModes = ['new', 'api'] as const
const apiSubmitIntents = ['create', 'update'] as const
const recurrenceFrequencies = ['weekly', 'monthly', 'yearly'] as const
const recurrenceEndStrategies = [
  'never',
  'on_date',
  'after_occurrences',
] as const

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const lineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Add a description'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  taxable: z.boolean(),
})

const recurrenceSchema = z
  .object({
    frequency: z.enum(recurrenceFrequencies),
    interval: z.number().min(1, 'Repeat interval must be at least 1'),
    startsOn: z.string().min(1, 'Choose a start date'),
    endStrategy: z.enum(recurrenceEndStrategies),
    endsOn: z.string().optional(),
    occurrenceCount: z.number().optional(),
  })
  .superRefine((recurrence, ctx) => {
    if (recurrence.endStrategy === 'on_date' && !recurrence.endsOn) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsOn'],
        message: 'Choose an end date',
      })
    }

    if (
      recurrence.endStrategy === 'after_occurrences' &&
      (!recurrence.occurrenceCount || recurrence.occurrenceCount < 2)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['occurrenceCount'],
        message: 'Use at least 2 occurrences',
      })
    }
  })

const baseBillSchema = z.object({
  editorMode: z.enum(editorModes),
  submitIntent: z.enum(apiSubmitIntents),
  customerName: z.string().min(2, 'Customer name is required'),
  customerEmail: z.email('Use a valid email address'),
  status: z.enum(billStatuses),
  issueDate: z.string().min(1, 'Choose an issue date'),
  currency: z.enum(currencies),
  lineItems: z.array(lineItemSchema).min(1, 'Add at least one line item'),
  taxRate: z.number().min(0).max(100, 'Tax rate cannot exceed 100%'),
  collectPaymentAutomatically: z.boolean(),
  memo: z.string().max(500, 'Keep the memo under 500 characters').optional(),
})

const oneOffBillSchema = baseBillSchema.extend({
  billType: z.literal('one_off'),
  dueDate: z.string().min(1, 'Choose a due date'),
  recurrence: recurrenceSchema.optional(),
})

const repeatingBillSchema = baseBillSchema.extend({
  billType: z.literal('repeating'),
  dueDate: z.string().optional(),
  recurrence: recurrenceSchema,
})

const billFormSchema = z.discriminatedUnion('billType', [
  oneOffBillSchema,
  repeatingBillSchema,
])

type BillFormValues = z.infer<typeof billFormSchema>

function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
          React Hook Form + Zod
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          Bill editor example
        </h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          This single route models create and edit bill forms side by side. Each
          accordion renders its own <code>UpsertBillForm</code>, with fresh
          defaults or defaults mapped from an imaginary API bill.
        </p>

        <div className="mt-8 space-y-5">
          <AccordionSection
            defaultOpen
            description="Starts from local defaults and submits to the create endpoint."
            title="Create a new bill"
          >
            <UpsertBillForm
              defaultValues={getNewBillDefaults()}
              sourceTitle="New bill defaults"
              sourceValue={getNewBillDefaults()}
            />
          </AccordionSection>
          <AccordionSection
            description="Starts from an API response and submits to the update endpoint by default."
            title="Edit an existing bill"
          >
            <UpsertBillForm
              defaultValues={getBillDefaultsFromApi(sampleApiBill)}
              sourceTitle="API bill response"
              sourceValue={sampleApiBill}
            />
          </AccordionSection>
        </div>
      </div>
    </main>
  )
}

function UpsertBillForm({
  defaultValues,
  sourceTitle,
  sourceValue,
}: {
  defaultValues: BillFormValues
  sourceTitle: string
  sourceValue: unknown
}) {
  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues,
  })
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  })
  const watchedValues = useWatch({ control: form.control })
  const billType = useWatch({ control: form.control, name: 'billType' })
  const recurrenceEndStrategy = useWatch({
    control: form.control,
    name: 'recurrence.endStrategy',
  })
  const lineItems = useWatch({ control: form.control, name: 'lineItems' })
  const taxRate = useWatch({ control: form.control, name: 'taxRate' })
  const parsedWatchedValues = billFormSchema.safeParse(watchedValues)
  const totals = calculateTotals(lineItems ?? [], Number(taxRate) || 0)
  const submissionPreview = parsedWatchedValues.success
    ? toApiSubmission(parsedWatchedValues.data)
    : 'Complete the required fields to inspect the API submission.'

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
      <section>
        <form
          className="space-y-6"
          onSubmit={form.handleSubmit((values) => {
            console.info('Submitting bill', toApiSubmission(values))
          })}
        >
          <Panel title="Bill details">
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput
                error={form.formState.errors.customerName?.message}
                label="Customer name"
                {...form.register('customerName')}
              />
              <TextInput
                error={form.formState.errors.customerEmail?.message}
                label="Customer email"
                type="email"
                {...form.register('customerEmail')}
              />
              <SelectInput
                error={form.formState.errors.status?.message}
                label="Status"
                {...form.register('status')}
              >
                {billStatuses.map((status) => (
                  <option key={status} value={status}>
                    {titleCase(status)}
                  </option>
                ))}
              </SelectInput>
              <SelectInput
                error={form.formState.errors.currency?.message}
                label="Currency"
                {...form.register('currency')}
              >
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </SelectInput>
              <TextInput
                error={form.formState.errors.issueDate?.message}
                label="Issue date"
                type="date"
                {...form.register('issueDate')}
              />
              {billType === 'one_off' ? (
                <TextInput
                  error={form.formState.errors.dueDate?.message}
                  label="Due date"
                  type="date"
                  {...form.register('dueDate')}
                />
              ) : null}
            </div>
          </Panel>

          <Panel title="Bill type">
            <div className="grid gap-4 md:grid-cols-2">
              <ChoiceCard
                active={billType === 'one_off'}
                description="Collect this bill once with a fixed due date."
                title="One-off"
                onClick={() => {
                  form.setValue('billType', 'one_off', {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }}
              />
              <ChoiceCard
                active={billType === 'repeating'}
                description="Generate future bills on a weekly, monthly, or yearly cadence."
                title="Repeating"
                onClick={() => {
                  form.setValue('billType', 'repeating', {
                    shouldDirty: true,
                    shouldValidate: true,
                  })

                  if (!form.getValues('recurrence')) {
                    form.setValue('recurrence', getDefaultRecurrence(), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                }}
              />
            </div>

            {billType === 'repeating' ? (
              <div className="mt-5 grid gap-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 md:grid-cols-2">
                <SelectInput
                  error={form.formState.errors.recurrence?.frequency?.message}
                  label="Frequency"
                  {...form.register('recurrence.frequency')}
                >
                  {recurrenceFrequencies.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {titleCase(frequency)}
                    </option>
                  ))}
                </SelectInput>
                <TextInput
                  error={form.formState.errors.recurrence?.interval?.message}
                  label="Every"
                  min={1}
                  type="number"
                  {...form.register('recurrence.interval', {
                    valueAsNumber: true,
                  })}
                />
                <TextInput
                  error={form.formState.errors.recurrence?.startsOn?.message}
                  label="Starts on"
                  type="date"
                  {...form.register('recurrence.startsOn')}
                />
                <SelectInput
                  error={form.formState.errors.recurrence?.endStrategy?.message}
                  label="Ends"
                  {...form.register('recurrence.endStrategy')}
                >
                  <option value="never">Never</option>
                  <option value="on_date">On a date</option>
                  <option value="after_occurrences">After occurrences</option>
                </SelectInput>
                {recurrenceEndStrategy === 'on_date' ? (
                  <TextInput
                    error={form.formState.errors.recurrence?.endsOn?.message}
                    label="End date"
                    type="date"
                    {...form.register('recurrence.endsOn')}
                  />
                ) : null}
                {recurrenceEndStrategy === 'after_occurrences' ? (
                  <TextInput
                    error={
                      form.formState.errors.recurrence?.occurrenceCount?.message
                    }
                    label="Occurrences"
                    min={2}
                    type="number"
                    {...form.register('recurrence.occurrenceCount', {
                      setValueAs: (value) =>
                        value === '' ? undefined : Number(value),
                    })}
                  />
                ) : null}
              </div>
            ) : null}
          </Panel>

          <Panel title="Line items">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  className="grid gap-3 rounded-2xl border border-white/10 bg-white/3 p-4 md:grid-cols-[1fr_110px_140px_auto]"
                  key={field.id}
                >
                  <TextInput
                    error={
                      form.formState.errors.lineItems?.[index]?.description
                        ?.message
                    }
                    label="Description"
                    {...form.register(`lineItems.${index}.description`)}
                  />
                  <TextInput
                    error={
                      form.formState.errors.lineItems?.[index]?.quantity
                        ?.message
                    }
                    label="Qty"
                    min={1}
                    type="number"
                    {...form.register(`lineItems.${index}.quantity`, {
                      valueAsNumber: true,
                    })}
                  />
                  <TextInput
                    error={
                      form.formState.errors.lineItems?.[index]?.unitPrice
                        ?.message
                    }
                    label="Unit price"
                    min={0}
                    step="0.01"
                    type="number"
                    {...form.register(`lineItems.${index}.unitPrice`, {
                      valueAsNumber: true,
                    })}
                  />
                  <div className="flex items-end gap-3">
                    <label className="flex h-11 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-slate-300">
                      <input
                        className="size-4 accent-cyan-300"
                        type="checkbox"
                        {...form.register(`lineItems.${index}.taxable`)}
                      />
                      Taxable
                    </label>
                    <button
                      className="h-11 rounded-xl border border-rose-400/30 px-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={fields.length === 1}
                      type="button"
                      onClick={() => remove(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="mt-4 rounded-xl border border-cyan-300/30 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-300/10"
              type="button"
              onClick={() => append(getDefaultLineItem())}
            >
              Add line item
            </button>
          </Panel>

          <Panel title="Payment and notes">
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput
                error={form.formState.errors.taxRate?.message}
                label="Tax rate (%)"
                min={0}
                step="0.01"
                type="number"
                {...form.register('taxRate', { valueAsNumber: true })}
              />
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/3 p-4 text-sm text-slate-300">
                <input
                  className="size-4 accent-cyan-300"
                  type="checkbox"
                  {...form.register('collectPaymentAutomatically')}
                />
                Collect payment automatically
              </label>
            </div>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-slate-200">Memo</span>
              <textarea
                className={inputClass}
                rows={4}
                {...form.register('memo')}
              />
              <ErrorMessage message={form.formState.errors.memo?.message} />
            </label>
          </Panel>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/4 p-5">
            <div>
              <p className="text-sm text-slate-400">Bill total</p>
              <p className="text-3xl font-bold">{money.format(totals.total)}</p>
              <p className="text-sm text-slate-400">
                {money.format(totals.subtotal)} subtotal +{' '}
                {money.format(totals.tax)} tax
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <SelectInput label="Submit as" {...form.register('submitIntent')}>
                <option value="create">Create endpoint</option>
                <option value="update">Update endpoint</option>
              </SelectInput>
              <button
                className="self-end rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-200"
                type="submit"
              >
                Transform and submit
              </button>
            </div>
          </div>
        </form>
      </section>

      <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
        <JsonCard title={sourceTitle} value={sourceValue} />
        <JsonCard
          title="Derived submission preview"
          value={submissionPreview}
        />
      </aside>
    </div>
  )
}

function AccordionSection({
  children,
  defaultOpen = false,
  description,
  title,
}: {
  children: React.ReactNode
  defaultOpen?: boolean
  description: string
  title: string
}) {
  return (
    <details
      className="group rounded-3xl border border-white/10 bg-white/4 shadow-2xl shadow-black/20"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 marker:hidden">
        <span>
          <span className="block text-lg font-semibold">{title}</span>
          <span className="mt-1 block text-sm text-slate-400">
            {description}
          </span>
        </span>
        <span className="rounded-full border border-cyan-300/30 px-3 py-1 text-sm font-semibold text-cyan-200 transition group-open:rotate-180">
          Open
        </span>
      </summary>
      <div className="border-t border-white/10 p-5">{children}</div>
    </details>
  )
}

function Panel({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/4 p-5 shadow-2xl shadow-black/20">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function ChoiceCard({
  active,
  description,
  onClick,
  title,
}: {
  active: boolean
  description: string
  onClick: () => void
  title: string
}) {
  return (
    <button
      className={[
        'rounded-2xl border p-4 text-left transition',
        active
          ? 'border-cyan-300 bg-cyan-300/10 text-cyan-100'
          : 'border-white/10 bg-white/3 text-slate-300 hover:bg-white/6',
      ].join(' ')}
      type="button"
      onClick={onClick}
    >
      <span className="block text-base font-semibold">{title}</span>
      <span className="mt-1 block text-sm">{description}</span>
    </button>
  )
}

function TextInput({
  error,
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string
  label: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      <input className={inputClass} {...props} />
      <ErrorMessage message={error} />
    </label>
  )
}

function SelectInput({
  children,
  error,
  label,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  error?: string
  label: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      <select className={inputClass} {...props}>
        {children}
      </select>
      <ErrorMessage message={error} />
    </label>
  )
}

function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null

  return <p className="mt-1 text-sm text-rose-300">{message}</p>
}

function JsonCard({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/20">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="font-semibold">{title}</h2>
      </div>
      <pre className="max-h-[520px] overflow-auto p-5 text-xs leading-relaxed text-slate-300">
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  )
}

function getNewBillDefaults(): BillFormValues {
  return {
    editorMode: 'new',
    submitIntent: 'create',
    billType: 'one_off',
    customerName: '',
    customerEmail: '',
    status: 'draft',
    issueDate: '2026-06-16',
    dueDate: '2026-06-30',
    currency: 'USD',
    lineItems: [getDefaultLineItem()],
    taxRate: 0,
    collectPaymentAutomatically: false,
    memo: '',
    recurrence: getDefaultRecurrence(),
  }
}

function getBillDefaultsFromApi(apiBill: ApiBill): BillFormValues {
  const baseDefaults = {
    editorMode: 'api' as const,
    submitIntent: 'update' as const,
    customerName: apiBill.customer.name,
    customerEmail: apiBill.customer.email,
    status: apiBill.status,
    issueDate: apiBill.issue_date,
    currency: apiBill.currency,
    lineItems: apiBill.line_items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: centsToDollars(item.unit_amount_cents),
      taxable: item.taxable,
    })),
    taxRate: apiBill.tax_rate_bps / 100,
    collectPaymentAutomatically: apiBill.auto_collect,
    memo: apiBill.memo ?? '',
  }

  if (apiBill.kind === 'repeating' && apiBill.schedule) {
    return {
      ...baseDefaults,
      billType: 'repeating',
      dueDate: apiBill.due_date ?? undefined,
      recurrence: {
        frequency: apiBill.schedule.frequency,
        interval: apiBill.schedule.interval,
        startsOn: apiBill.schedule.starts_on,
        endStrategy: apiBill.schedule.ends_on
          ? 'on_date'
          : apiBill.schedule.max_occurrences
            ? 'after_occurrences'
            : 'never',
        endsOn: apiBill.schedule.ends_on ?? '',
        occurrenceCount: apiBill.schedule.max_occurrences ?? undefined,
      },
    }
  }

  return {
    ...baseDefaults,
    billType: 'one_off',
    dueDate: apiBill.due_date ?? apiBill.issue_date,
    recurrence: getDefaultRecurrence(),
  }
}

function getDefaultLineItem(): BillFormValues['lineItems'][number] {
  return {
    description: '',
    quantity: 1,
    unitPrice: 0,
    taxable: true,
  }
}

function getDefaultRecurrence(): NonNullable<BillFormValues['recurrence']> {
  return {
    frequency: 'monthly',
    interval: 1,
    startsOn: '2026-07-01',
    endStrategy: 'never',
    endsOn: '',
    occurrenceCount: undefined,
  }
}

const toApiPayload = billFormSchema.transform(
  (values): ApiBillPayload => ({
    kind: values.billType,
    customer: {
      name: values.customerName,
      email: values.customerEmail,
    },
    status: values.status,
    issue_date: values.issueDate,
    due_date: values.billType === 'one_off' ? values.dueDate : null,
    currency: values.currency,
    line_items: values.lineItems.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit_amount_cents: dollarsToCents(item.unitPrice),
      taxable: item.taxable,
    })),
    tax_rate_bps: Math.round(values.taxRate * 100),
    auto_collect: values.collectPaymentAutomatically,
    memo: values.memo || null,
    schedule:
      values.billType === 'repeating'
        ? {
            frequency: values.recurrence.frequency,
            interval: values.recurrence.interval,
            starts_on: values.recurrence.startsOn,
            ends_on:
              values.recurrence.endStrategy === 'on_date'
                ? (values.recurrence.endsOn ?? null)
                : null,
            max_occurrences:
              values.recurrence.endStrategy === 'after_occurrences'
                ? (values.recurrence.occurrenceCount ?? null)
                : null,
          }
        : null,
  }),
)

function toApiSubmission(values: BillFormValues): ApiSubmission {
  const billId = values.editorMode === 'api' ? sampleApiBill.id : ':billId'

  return {
    endpoint:
      values.submitIntent === 'create' ? '/api/bills' : `/api/bills/${billId}`,
    method: values.submitIntent === 'create' ? 'POST' : 'PATCH',
    body: toApiPayload.parse(values),
  }
}

function calculateTotals(
  lineItems: Array<
    Pick<
      BillFormValues['lineItems'][number],
      'quantity' | 'unitPrice' | 'taxable'
    >
  >,
  taxRate: number,
) {
  const subtotal = lineItems.reduce(
    (total, item) =>
      total + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  )
  const taxableSubtotal = lineItems.reduce(
    (total, item) =>
      item.taxable
        ? total + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
        : total,
    0,
  )
  const tax = taxableSubtotal * (taxRate / 100)

  return {
    subtotal,
    tax,
    total: subtotal + tax,
  }
}

function dollarsToCents(value: number) {
  return Math.round(value * 100)
}

function centsToDollars(value: number) {
  return value / 100
}

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

const inputClass =
  'mt-1 block w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20'
