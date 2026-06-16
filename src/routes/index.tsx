import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute } from '@tanstack/react-router'
import { useId } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  sampleApiBill,
  type ApiBill,
  type ApiBillPayload,
  type ApiBillPayloadBase,
  type ApiSubmission,
} from './-bill-api'

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
const accordionSections = ['create', 'edit'] as const

const routeSearchSchema = z.object({
  sections: z.array(z.enum(accordionSections)).catch(['create']),
})

export const Route = createFileRoute('/')({
  component: Home,
  validateSearch: routeSearchSchema,
})

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
  billId: z.string().optional(),
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
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const openSections = search.sections

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-7xl">
        <Badge variant="secondary">React Hook Form + Zod</Badge>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          Bill editor example
        </h1>
        <p className="mt-4 max-w-3xl text-pretty text-muted-foreground">
          This single route models create and edit bill forms side by side. Each
          accordion renders its own <code>UpsertBillForm</code>, with fresh
          defaults or defaults mapped from an imaginary API bill.
        </p>

        <Accordion
          className="mt-8 gap-5"
          multiple
          value={openSections}
          onValueChange={(sections) => {
            const nextSections = sections.filter(isAccordionSection)

            navigate({
              search: (previous) => ({
                ...previous,
                sections: nextSections,
              }),
            })
          }}
        >
          <AccordionItem value="create">
            <AccordionTrigger>
              <span>
                <span className="block text-lg font-semibold">
                  Create a New Bill
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Starts from local defaults and submits to the create endpoint.
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <UpsertBillForm
                defaultValues={getNewBillDefaults()}
                sourceTitle="New bill defaults"
                sourceValue={getNewBillDefaults()}
              />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="edit">
            <AccordionTrigger>
              <span>
                <span className="block text-lg font-semibold">
                  Edit an Existing Bill
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Starts from an API response and submits to the update endpoint
                  by default.
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <UpsertBillForm
                defaultValues={getBillDefaultsFromApi(sampleApiBill)}
                sourceTitle="API bill response"
                sourceValue={sampleApiBill}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
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
          className="flex flex-col gap-6"
          onSubmit={form.handleSubmit((values) => {
            console.info('Submitting bill', toApiSubmission(values))
          })}
        >
          <Card>
            <CardHeader>
              <CardTitle>Bill Details</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <TextInput
                  error={form.formState.errors.customerName?.message}
                  label="Customer name"
                  autoComplete="organization"
                  {...form.register('customerName')}
                />
                <TextInput
                  error={form.formState.errors.customerEmail?.message}
                  label="Customer email"
                  autoComplete="email"
                  spellCheck={false}
                  type="email"
                  {...form.register('customerEmail')}
                />
                <SelectInput
                  error={form.formState.errors.status?.message}
                  label="Status"
                  {...form.register('status')}
                >
                  {billStatuses.map((status) => (
                    <NativeSelectOption key={status} value={status}>
                      {titleCase(status)}
                    </NativeSelectOption>
                  ))}
                </SelectInput>
                <SelectInput
                  error={form.formState.errors.currency?.message}
                  label="Currency"
                  {...form.register('currency')}
                >
                  {currencies.map((currency) => (
                    <NativeSelectOption key={currency} value={currency}>
                      {currency}
                    </NativeSelectOption>
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
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bill Type</CardTitle>
            </CardHeader>
            <CardContent>
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
                <Card className="mt-5">
                  <CardContent>
                    <FieldGroup className="grid gap-4 md:grid-cols-2">
                      <SelectInput
                        error={
                          form.formState.errors.recurrence?.frequency?.message
                        }
                        label="Frequency"
                        {...form.register('recurrence.frequency')}
                      >
                        {recurrenceFrequencies.map((frequency) => (
                          <NativeSelectOption key={frequency} value={frequency}>
                            {titleCase(frequency)}
                          </NativeSelectOption>
                        ))}
                      </SelectInput>
                      <TextInput
                        error={
                          form.formState.errors.recurrence?.interval?.message
                        }
                        label="Every"
                        min={1}
                        type="number"
                        {...form.register('recurrence.interval', {
                          valueAsNumber: true,
                        })}
                      />
                      <TextInput
                        error={
                          form.formState.errors.recurrence?.startsOn?.message
                        }
                        label="Starts on"
                        type="date"
                        {...form.register('recurrence.startsOn')}
                      />
                      <SelectInput
                        error={
                          form.formState.errors.recurrence?.endStrategy?.message
                        }
                        label="Ends"
                        {...form.register('recurrence.endStrategy')}
                      >
                        <NativeSelectOption value="never">
                          Never
                        </NativeSelectOption>
                        <NativeSelectOption value="on_date">
                          On a date
                        </NativeSelectOption>
                        <NativeSelectOption value="after_occurrences">
                          After occurrences
                        </NativeSelectOption>
                      </SelectInput>
                      {recurrenceEndStrategy === 'on_date' ? (
                        <TextInput
                          error={
                            form.formState.errors.recurrence?.endsOn?.message
                          }
                          label="End date"
                          type="date"
                          {...form.register('recurrence.endsOn')}
                        />
                      ) : null}
                      {recurrenceEndStrategy === 'after_occurrences' ? (
                        <TextInput
                          error={
                            form.formState.errors.recurrence?.occurrenceCount
                              ?.message
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
                    </FieldGroup>
                  </CardContent>
                </Card>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                {fields.map((field, index) => (
                  <Card key={field.id}>
                    <CardContent className="grid gap-3 md:grid-cols-[1fr_110px_140px_auto]">
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
                        <CheckboxField
                          checked={!!lineItems?.[index]?.taxable}
                          label="Taxable"
                          onCheckedChange={(checked) =>
                            form.setValue(
                              `lineItems.${index}.taxable`,
                              Boolean(checked),
                              {
                                shouldDirty: true,
                                shouldValidate: true,
                              },
                            )
                          }
                        />
                        <Button
                          disabled={fields.length === 1}
                          size="lg"
                          type="button"
                          variant="destructive"
                          onClick={() => remove(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button
                className="mt-4"
                type="button"
                variant="outline"
                onClick={() => append(getDefaultLineItem())}
              >
                Add Line Item
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment & Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <TextInput
                  error={form.formState.errors.taxRate?.message}
                  label="Tax rate (%)"
                  min={0}
                  step="0.01"
                  type="number"
                  {...form.register('taxRate', { valueAsNumber: true })}
                />
                <CheckboxField
                  checked={!!watchedValues.collectPaymentAutomatically}
                  label="Collect payment automatically"
                  onCheckedChange={(checked) =>
                    form.setValue(
                      'collectPaymentAutomatically',
                      Boolean(checked),
                      {
                        shouldDirty: true,
                        shouldValidate: true,
                      },
                    )
                  }
                />
              </FieldGroup>
              <TextareaInput
                className="mt-4"
                error={form.formState.errors.memo?.message}
                label="Memo"
                rows={4}
                {...form.register('memo')}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Bill total</p>
                <p className="text-3xl font-bold">
                  {money.format(totals.total)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {money.format(totals.subtotal)} subtotal +{' '}
                  {money.format(totals.tax)} tax
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <SelectInput
                  label="Submit as"
                  {...form.register('submitIntent')}
                >
                  <NativeSelectOption value="create">
                    Create Endpoint
                  </NativeSelectOption>
                  <NativeSelectOption value="update">
                    Update Endpoint
                  </NativeSelectOption>
                </SelectInput>
                <Button className="self-end" size="lg" type="submit">
                  Transform & Submit
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </section>

      <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
        <JsonCard title={sourceTitle} value={sourceValue} />
        <JsonCard
          title="Derived submission preview"
          value={submissionPreview}
        />
      </aside>
    </div>
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
    <Button
      className="h-auto justify-start p-4 text-left"
      type="button"
      variant={active ? 'secondary' : 'outline'}
      onClick={onClick}
    >
      <span className="block text-base font-semibold">{title}</span>
      <span className="mt-1 block text-sm text-muted-foreground">
        {description}
      </span>
    </Button>
  )
}

function TextInput({
  error,
  id,
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string
  label: string
}) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Input aria-invalid={!!error} id={inputId} {...props} />
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function SelectInput({
  children,
  error,
  id,
  label,
  ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  error?: string
  label: string
}) {
  const generatedId = useId()
  const selectId = id ?? generatedId

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={selectId}>{label}</FieldLabel>
      <NativeSelect
        aria-invalid={!!error}
        className="w-full"
        id={selectId}
        {...props}
      >
        {children}
      </NativeSelect>
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function TextareaInput({
  className,
  error,
  id,
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  className?: string
  error?: string
  label: string
}) {
  const generatedId = useId()
  const textareaId = id ?? generatedId

  return (
    <Field className={className} data-invalid={!!error}>
      <FieldLabel htmlFor={textareaId}>{label}</FieldLabel>
      <Textarea aria-invalid={!!error} id={textareaId} {...props} />
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function CheckboxField({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean
  label: string
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Field orientation="horizontal">
      <FieldLabel className="items-center">
        <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
        {label}
      </FieldLabel>
    </Field>
  )
}

function JsonCard({ title, value }: { title: string; value: unknown }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Live JSON preview</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[520px] rounded-lg border bg-muted/30">
          <pre className="p-4 text-xs leading-relaxed">
            {JSON.stringify(value, null, 2)}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function getNewBillDefaults(): BillFormValues {
  return {
    billId: undefined,
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
    billId: apiBill.id,
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

const toApiPayload = billFormSchema.transform((values): ApiBillPayload => {
  const basePayload: ApiBillPayloadBase = {
    kind: values.billType,
    customer: {
      name: values.customerName,
      email: values.customerEmail,
    },
    status: values.status,
    issue_date: values.issueDate,
    due_date: values.billType === 'one_off' ? values.dueDate : null,
    currency: values.currency,
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
  }

  if (values.submitIntent === 'create') {
    return {
      ...basePayload,
      line_items: values.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit_amount_cents: dollarsToCents(item.unitPrice),
        taxable: item.taxable,
      })),
    }
  }

  return {
    id: values.billId ?? ':billId',
    ...basePayload,
    line_items: values.lineItems.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit_amount_cents: dollarsToCents(item.unitPrice),
      taxable: item.taxable,
    })),
  }
})

function toApiSubmission(values: BillFormValues): ApiSubmission {
  const billId = values.billId ?? ':billId'
  const body = toApiPayload.parse(values)

  if (values.submitIntent === 'create') {
    if ('id' in body) {
      throw new Error('Create bill payload should not include a bill id')
    }

    return {
      endpoint: '/api/bills',
      method: 'POST',
      body,
    }
  }

  if (!('id' in body)) {
    throw new Error('Update bill payload must include a bill id')
  }

  return {
    endpoint: `/api/bills/${billId}`,
    method: 'PATCH',
    body,
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

function isAccordionSection(
  value: unknown,
): value is (typeof accordionSections)[number] {
  return (
    typeof value === 'string' &&
    accordionSections.includes(value as (typeof accordionSections)[number])
  )
}
