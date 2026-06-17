import { zodResolver } from '@hookform/resolvers/zod'
import { createHighlighterCore } from '@shikijs/core'
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript'
import jsonLanguage from '@shikijs/langs/json'
import githubDarkTheme from '@shikijs/themes/github-dark'
import githubLightTheme from '@shikijs/themes/github-light'
import { createFileRoute } from '@tanstack/react-router'
import { Suspense, use, useDeferredValue } from 'react'
import {
  type UseFormReturn,
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from 'react-hook-form'
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
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ControlledCheckboxField,
  ControlledMoneyInput,
  ControlledRadioCardGroup,
  ControlledSelectInput,
  ControlledTextInput,
  ControlledTextareaInput,
  FormConditional,
} from '@/components/ui/react-hook-form-fields'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { NativeSelectOption } from '@/components/ui/native-select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  sampleApiBill,
  type ApiBill,
  type ApiBillPayload,
  type ApiBillPayloadBase,
  type ApiSubmission,
  type ApiWeekday,
} from './-bill-api'

const currencies = ['USD', 'EUR', 'GBP'] as const
const billStatuses = ['draft', 'scheduled', 'sent', 'paid'] as const
const editorModes = ['new', 'api'] as const
const apiSubmitIntents = ['create', 'update'] as const
const recurrenceFrequencies = ['daily', 'weekly', 'monthly', 'yearly'] as const
const recurrenceEndStrategies = [
  'never',
  'on_date',
  'after_occurrences',
] as const
const accordionSections = ['create', 'edit'] as const
const weekdays = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const satisfies readonly ApiWeekday[]
const billTypeOptions = [
  {
    value: 'one_off',
    title: 'One-off',
    description: 'Collect this bill once with a fixed due date.',
  },
  {
    value: 'repeating',
    title: 'Repeating',
    description:
      'Generate future bills on a daily, weekly, monthly, or yearly cadence.',
  },
] as const

const routeSearchSchema = z.object({
  sections: z.array(z.enum(accordionSections)).catch(['create']),
})

export const Route = createFileRoute('/')({
  component: Home,
  validateSearch: routeSearchSchema,
})

const shikiHighlighter = createHighlighterCore({
  engine: createJavaScriptRegexEngine(),
  langs: [jsonLanguage],
  themes: [githubLightTheme, githubDarkTheme],
})
const highlightedJsonCache = new Map<string, Promise<string>>()

const requiredNumberInput = (message: string) =>
  z
    .string()
    .min(1, message)
    .transform((value) => Number(value))

const lineItemSchema = z
  .object({
    id: z.string().optional(),
    description: z.string().min(1, 'Add a description'),
    quantity: requiredNumberInput('Quantity is required').pipe(
      z.number().min(1, 'Quantity must be at least 1'),
    ),
    unitPrice: z
      .string()
      .min(1, 'Unit price is required')
      .regex(/^\d+(\.\d{1,2})?$/, 'Use a valid money amount')
      .transform(parseMoneyInputToCents)
      .pipe(
        z
          .number()
          .int('Unit price must resolve to whole cents')
          .min(0, 'Unit price cannot be negative'),
      ),
    taxable: z.boolean(),
  })
  .transform(({ unitPrice, ...lineItem }) => ({
    ...lineItem,
    unitAmountCents: unitPrice,
  }))

const recurrenceBaseSchema = z.object({
  interval: requiredNumberInput('Repeat interval is required').pipe(
    z.number().min(1, 'Repeat interval must be at least 1'),
  ),
  startsOn: z.string().min(1, 'Choose a start date'),
  endStrategy: z.enum(recurrenceEndStrategies),
  endsOn: z.string().optional(),
  occurrenceCount: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .pipe(z.number().min(2, 'Use at least 2 occurrences').optional()),
})

const weekdayRecurrenceSchema = recurrenceBaseSchema.extend({
  frequency: z.enum(['daily', 'weekly']),
  weekdays: z.array(z.enum(weekdays)).min(1, 'Choose at least 1 weekday'),
})

const monthlyRecurrenceSchema = recurrenceBaseSchema.extend({
  frequency: z.literal('monthly'),
  monthlyAnchorDate: z.string().min(1, 'Choose a monthly anchor date'),
})

const yearlyRecurrenceSchema = recurrenceBaseSchema.extend({
  frequency: z.literal('yearly'),
  yearlyAnchorDate: z.string().min(1, 'Choose a yearly anchor date'),
})

const recurrenceSchema = z
  .discriminatedUnion('frequency', [
    weekdayRecurrenceSchema,
    monthlyRecurrenceSchema,
    yearlyRecurrenceSchema,
  ])
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
  taxRate: requiredNumberInput('Tax rate is required').pipe(
    z.number().min(0).max(100, 'Tax rate cannot exceed 100%'),
  ),
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

type BillFormInputValues = z.input<typeof billFormSchema>
type BillFormValues = z.output<typeof billFormSchema>
type BillForm = UseFormReturn<BillFormInputValues, unknown, BillFormValues>

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
          keepMounted
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
                defaultValues={createBillDefaultValues}
                sourceTitle="New bill defaults"
                sourceValue={createBillDefaultValues}
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
                defaultValues={editBillDefaultValues}
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
  defaultValues: BillFormInputValues
  sourceTitle: string
  sourceValue: unknown
}) {
  const form = useForm<BillFormInputValues, unknown, BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues,
    values: defaultValues,
    resetOptions: {
      keepDefaultValues: true,
    },
  })

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
      <section>
        <form
          className="flex flex-col gap-6"
          onSubmit={form.handleSubmit((values) => {
            console.info('Submitting bill', toApiSubmission(values))
          })}
        >
          <BillDetailsSection form={form} />
          <BillTypeSection form={form} />
          <LineItemsSection form={form} />
          <PaymentNotesSection form={form} />
          <SubmissionSection form={form} />
        </form>
      </section>

      <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
        <CodePreviewCard title={sourceTitle} value={sourceValue} />
        <SubmissionPreviewCard form={form} />
      </aside>
    </div>
  )
}

function BillDetailsSection({ form }: { form: BillForm }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bill Details</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <ControlledTextInput
            control={form.control}
            label="Customer name"
            name="customerName"
            autoComplete="organization"
          />
          <ControlledTextInput
            control={form.control}
            label="Customer email"
            name="customerEmail"
            autoComplete="email"
            spellCheck={false}
            type="email"
          />
          <ControlledSelectInput
            control={form.control}
            label="Status"
            name="status"
          >
            {billStatuses.map((status) => (
              <NativeSelectOption key={status} value={status}>
                {titleCase(status)}
              </NativeSelectOption>
            ))}
          </ControlledSelectInput>
          <ControlledSelectInput
            control={form.control}
            label="Currency"
            name="currency"
          >
            {currencies.map((currency) => (
              <NativeSelectOption key={currency} value={currency}>
                {currency}
              </NativeSelectOption>
            ))}
          </ControlledSelectInput>
          <ControlledTextInput
            control={form.control}
            label="Issue date"
            name="issueDate"
            type="date"
          />
          <FormConditional
            control={form.control}
            name="billType"
            render={(billType) => billType === 'one_off'}
          >
            <ControlledTextInput
              control={form.control}
              label="Due date"
              name="dueDate"
              type="date"
            />
          </FormConditional>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

function BillTypeSection({ form }: { form: BillForm }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bill Type</CardTitle>
      </CardHeader>
      <CardContent>
        <ControlledRadioCardGroup
          control={form.control}
          label="Bill type"
          name="billType"
          options={billTypeOptions}
        />

        <FormConditional
          control={form.control}
          name="billType"
          render={(currentBillType) => currentBillType === 'repeating'}
        >
          <Card className="mt-5">
            <CardContent>
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <ControlledSelectInput
                  control={form.control}
                  label="Frequency"
                  name="recurrence.frequency"
                >
                  {recurrenceFrequencies.map((frequency) => (
                    <NativeSelectOption key={frequency} value={frequency}>
                      {titleCase(frequency)}
                    </NativeSelectOption>
                  ))}
                </ControlledSelectInput>
                <ControlledTextInput
                  control={form.control}
                  label="Every"
                  min={1}
                  name="recurrence.interval"
                  type="number"
                />
                <ControlledTextInput
                  control={form.control}
                  label="Starts on"
                  name="recurrence.startsOn"
                  type="date"
                />
                <RecurrenceFrequencyFields form={form} />
                <ControlledSelectInput
                  control={form.control}
                  label="Ends"
                  name="recurrence.endStrategy"
                >
                  <NativeSelectOption value="never">Never</NativeSelectOption>
                  <NativeSelectOption value="on_date">
                    On a date
                  </NativeSelectOption>
                  <NativeSelectOption value="after_occurrences">
                    After occurrences
                  </NativeSelectOption>
                </ControlledSelectInput>
                <RecurrenceEndFields form={form} />
              </FieldGroup>
            </CardContent>
          </Card>
        </FormConditional>
      </CardContent>
    </Card>
  )
}

function RecurrenceFrequencyFields({ form }: { form: BillForm }) {
  return (
    <>
      <FormConditional
        control={form.control}
        name="recurrence.frequency"
        render={(frequency) => frequency === 'daily' || frequency === 'weekly'}
      >
        <WeekdayPicker
          control={form.control}
          error={getRecurrenceError(form, 'weekdays')}
          name="recurrence.weekdays"
        />
      </FormConditional>
      <FormConditional
        control={form.control}
        name="recurrence.frequency"
        render={(frequency) => frequency === 'monthly'}
      >
        <ControlledTextInput
          control={form.control}
          label="Monthly anchor date"
          name="recurrence.monthlyAnchorDate"
          type="date"
        />
        <FieldDescription>
          If a month does not have that day, the bill runs on the last valid day
          of that month.
        </FieldDescription>
      </FormConditional>
      <FormConditional
        control={form.control}
        name="recurrence.frequency"
        render={(frequency) => frequency === 'yearly'}
      >
        <ControlledTextInput
          control={form.control}
          label="Yearly anchor date"
          name="recurrence.yearlyAnchorDate"
          type="date"
        />
        <FieldDescription>
          If a future year does not have that date, the bill runs on the last
          valid day of that month.
        </FieldDescription>
      </FormConditional>
    </>
  )
}
function RecurrenceEndFields({ form }: { form: BillForm }) {
  return (
    <>
      <FormConditional
        control={form.control}
        name="recurrence.endStrategy"
        render={(endStrategy) => endStrategy === 'on_date'}
      >
        <ControlledTextInput
          control={form.control}
          label="End date"
          name="recurrence.endsOn"
          type="date"
        />
      </FormConditional>
      <FormConditional
        control={form.control}
        name="recurrence.endStrategy"
        render={(endStrategy) => endStrategy === 'after_occurrences'}
      >
        <ControlledTextInput
          control={form.control}
          label="Occurrences"
          min={2}
          name="recurrence.occurrenceCount"
          type="number"
        />
      </FormConditional>
    </>
  )
}

function LineItemsSection({ form }: { form: BillForm }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  })
  const currency = useWatch({ control: form.control, name: 'currency' })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Line Items</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {fields.map((field, index) => (
            <Card key={field.id}>
              <CardContent className="grid gap-3 md:grid-cols-[1fr_110px_140px_auto]">
                <ControlledTextInput
                  control={form.control}
                  label="Description"
                  name={`lineItems.${index}.description`}
                />
                <ControlledTextInput
                  control={form.control}
                  label="Qty"
                  min={1}
                  name={`lineItems.${index}.quantity`}
                  type="number"
                />
                <ControlledMoneyInput
                  control={form.control}
                  currency={currency}
                  label="Unit price"
                  min={0}
                  name={`lineItems.${index}.unitPrice`}
                  step="0.01"
                />
                <div className="flex items-end gap-3">
                  <ControlledCheckboxField
                    control={form.control}
                    label="Taxable"
                    name={`lineItems.${index}.taxable`}
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
  )
}

function PaymentNotesSection({ form }: { form: BillForm }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment & Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <ControlledTextInput
            control={form.control}
            label="Tax rate (%)"
            min={0}
            name="taxRate"
            step="0.01"
            type="number"
          />
          <ControlledCheckboxField
            control={form.control}
            label="Collect payment automatically"
            name="collectPaymentAutomatically"
          />
        </FieldGroup>
        <ControlledTextareaInput
          className="mt-4"
          control={form.control}
          label="Memo"
          name="memo"
          rows={4}
        />
      </CardContent>
    </Card>
  )
}

function SubmissionSection({ form }: { form: BillForm }) {
  const lineItems = useWatch({ control: form.control, name: 'lineItems' })
  const taxRate = useWatch({ control: form.control, name: 'taxRate' })
  const currency = useWatch({ control: form.control, name: 'currency' })
  const totals = calculateTotals(lineItems ?? [], Number(taxRate) || 0)
  const money = getMoneyFormatter(currency)

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Bill total</p>
          <p className="text-3xl font-bold">{money.format(totals.total)}</p>
          <p className="text-sm text-muted-foreground">
            {money.format(totals.subtotal)} subtotal +{' '}
            {money.format(totals.tax)} tax
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ControlledSelectInput
            control={form.control}
            label="Submit as"
            name="submitIntent"
          >
            <NativeSelectOption value="create">
              Create Endpoint
            </NativeSelectOption>
            <NativeSelectOption value="update">
              Update Endpoint
            </NativeSelectOption>
          </ControlledSelectInput>
          <Button className="self-end" size="lg" type="submit">
            Transform & Submit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SubmissionPreviewCard({ form }: { form: BillForm }) {
  const watchedValues = useWatch({ control: form.control })
  const parsedWatchedValues = billFormSchema.safeParse(watchedValues)
  const submissionPreview = parsedWatchedValues.success
    ? toApiSubmission(parsedWatchedValues.data)
    : 'Complete the required fields to inspect the API submission.'

  return (
    <CodePreviewCard
      title="Derived submission preview"
      value={submissionPreview}
    />
  )
}

function getRecurrenceError(form: BillForm, name: string) {
  const recurrenceErrors = form.formState.errors.recurrence as
    | Record<string, { message?: string } | undefined>
    | undefined

  return recurrenceErrors?.[name]?.message
}

function WeekdayPicker({
  control,
  error,
  name,
}: {
  control: BillForm['control']
  error?: string
  name: 'recurrence.weekdays'
}) {
  return (
    <Field data-invalid={!!error} className="md:col-span-2">
      <FieldLabel>Weekdays</FieldLabel>
      <FieldGroup className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Controller
          control={control}
          name={name}
          render={({ field }) => {
            const selectedWeekdays = field.value ?? []

            return (
              <>
                {weekdays.map((weekday) => (
                  <Field orientation="horizontal" key={weekday}>
                    <FieldLabel className="items-center">
                      <Checkbox
                        checked={selectedWeekdays.includes(weekday)}
                        onCheckedChange={(checked) => {
                          field.onChange(
                            checked
                              ? [...selectedWeekdays, weekday]
                              : selectedWeekdays.filter(
                                  (selectedWeekday) =>
                                    selectedWeekday !== weekday,
                                ),
                          )
                        }}
                      />
                      {titleCase(weekday)}
                    </FieldLabel>
                  </Field>
                ))}
              </>
            )
          }}
        />
      </FieldGroup>
      <FieldDescription>
        Choose which weekdays should generate an occurrence.
      </FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function CodePreviewCard({ title, value }: { title: string; value: unknown }) {
  const code = formatCodePreview(value)
  const deferredCode = useDeferredValue(code)
  const isStale = code !== deferredCode

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Live JSON preview</CardDescription>
        <CardAction>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(code)
            }}
          >
            Copy JSON
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[520px] rounded-lg border bg-muted/30">
          <Suspense fallback={<CodePreviewFallback code={code} />}>
            <div
              aria-busy={isStale}
              className={
                isStale
                  ? 'opacity-60 transition-opacity duration-200'
                  : 'opacity-100 transition-opacity duration-200'
              }
            >
              <HighlightedJson code={deferredCode} />
            </div>
          </Suspense>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function CodePreviewFallback({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
      <code translate="no">{code}</code>
    </pre>
  )
}

function HighlightedJson({ code }: { code: string }) {
  const highlightedCode = use(highlightJson(code))

  return (
    <div
      className="overflow-x-auto [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:p-4 [&_pre]:text-xs [&_pre]:leading-relaxed"
      dangerouslySetInnerHTML={{ __html: highlightedCode }}
      translate="no"
    />
  )
}

function getNewBillDefaults(): BillFormInputValues {
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
    taxRate: '0',
    collectPaymentAutomatically: false,
    memo: '',
    recurrence: getDefaultRecurrence(),
  }
}

function getBillDefaultsFromApi(apiBill: ApiBill): BillFormInputValues {
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
      quantity: String(item.quantity),
      unitPrice: formatCentsAsMoneyInput(item.unit_amount_cents),
      taxable: item.taxable,
    })),
    taxRate: String(apiBill.tax_rate_bps / 100),
    collectPaymentAutomatically: apiBill.auto_collect,
    memo: apiBill.memo ?? '',
  }

  if (apiBill.kind === 'repeating' && apiBill.schedule) {
    const endStrategy: (typeof recurrenceEndStrategies)[number] = apiBill
      .schedule.ends_on
      ? 'on_date'
      : apiBill.schedule.max_occurrences
        ? 'after_occurrences'
        : 'never'
    const baseRecurrence = {
      frequency: apiBill.schedule.frequency,
      interval: String(apiBill.schedule.interval),
      startsOn: apiBill.schedule.starts_on,
      monthlyAnchorDate: '',
      yearlyAnchorDate: '',
      endStrategy,
      endsOn: apiBill.schedule.ends_on ?? '',
      occurrenceCount:
        apiBill.schedule.max_occurrences == null
          ? undefined
          : String(apiBill.schedule.max_occurrences),
    }

    return {
      ...baseDefaults,
      billType: 'repeating',
      dueDate: apiBill.due_date ?? undefined,
      recurrence:
        apiBill.schedule.frequency === 'daily' ||
        apiBill.schedule.frequency === 'weekly'
          ? {
              ...baseRecurrence,
              frequency: apiBill.schedule.frequency,
              weekdays: apiBill.schedule.weekdays,
            }
          : apiBill.schedule.frequency === 'monthly'
            ? {
                ...baseRecurrence,
                frequency: 'monthly',
                monthlyAnchorDate: apiBill.schedule.anchor_date,
              }
            : {
                ...baseRecurrence,
                frequency: 'yearly',
                yearlyAnchorDate: apiBill.schedule.anchor_date,
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

const createBillDefaultValues = getNewBillDefaults()
const editBillDefaultValues = getBillDefaultsFromApi(sampleApiBill)

function getDefaultLineItem(): BillFormInputValues['lineItems'][number] {
  return {
    description: '',
    quantity: '1',
    unitPrice: '0.00',
    taxable: true,
  }
}

function getDefaultRecurrence(): NonNullable<
  BillFormInputValues['recurrence']
> {
  return {
    frequency: 'monthly',
    interval: '1',
    startsOn: '2026-07-01',
    monthlyAnchorDate: '2026-07-31',
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
        ? getApiSchedule(values.recurrence)
        : null,
  }

  if (values.submitIntent === 'create') {
    return {
      ...basePayload,
      line_items: values.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit_amount_cents: item.unitAmountCents,
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
      unit_amount_cents: item.unitAmountCents,
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

function getApiSchedule(recurrence: NonNullable<BillFormValues['recurrence']>) {
  const end = {
    ends_on:
      recurrence.endStrategy === 'on_date' ? (recurrence.endsOn ?? null) : null,
    max_occurrences:
      recurrence.endStrategy === 'after_occurrences'
        ? (recurrence.occurrenceCount ?? null)
        : null,
  }

  switch (recurrence.frequency) {
    case 'daily':
    case 'weekly':
      return {
        ...end,
        frequency: recurrence.frequency,
        interval: recurrence.interval,
        starts_on: recurrence.startsOn,
        weekdays: recurrence.weekdays,
      }
    case 'monthly': {
      const anchorDate = recurrence.monthlyAnchorDate

      return {
        ...end,
        frequency: 'monthly' as const,
        interval: recurrence.interval,
        starts_on: recurrence.startsOn,
        anchor_date: anchorDate,
        day_of_month: getDateDay(anchorDate),
        day_overflow: 'last_day' as const,
      }
    }
    case 'yearly': {
      const anchorDate = recurrence.yearlyAnchorDate

      return {
        ...end,
        frequency: 'yearly' as const,
        interval: recurrence.interval,
        starts_on: recurrence.startsOn,
        anchor_date: anchorDate,
        month: getDateMonth(anchorDate),
        day: getDateDay(anchorDate),
        day_overflow: 'last_day' as const,
      }
    }
  }
}

function calculateTotals(
  lineItems: Array<{
    quantity: unknown
    unitPrice: unknown
    taxable: boolean
  }>,
  taxRate: unknown,
) {
  const subtotal = lineItems.reduce(
    (total, item) =>
      total +
      ((Number(item.quantity) || 0) * parseMoneyInputToCents(item.unitPrice)) /
        100,
    0,
  )
  const taxableSubtotal = lineItems.reduce(
    (total, item) =>
      item.taxable
        ? total +
          ((Number(item.quantity) || 0) *
            parseMoneyInputToCents(item.unitPrice)) /
            100
        : total,
    0,
  )
  const tax = taxableSubtotal * ((Number(taxRate) || 0) / 100)

  return {
    subtotal,
    tax,
    total: subtotal + tax,
  }
}

function getDateMonth(value: string) {
  return Number(value.slice(5, 7))
}

function getDateDay(value: string) {
  return Number(value.slice(8, 10))
}

function getMoneyFormatter(currency: string) {
  return new Intl.NumberFormat('en-US', {
    currency,
    style: 'currency',
  })
}

function parseMoneyInputToCents(value: unknown) {
  const [major = '0', minor = ''] = String(value ?? '')
    .replace(/[^\d.]/g, '')
    .split('.')
  const normalizedMajor = major === '' ? '0' : major
  const normalizedMinor = minor.padEnd(2, '0').slice(0, 2)

  return Number(normalizedMajor) * 100 + Number(normalizedMinor)
}

function formatCentsAsMoneyInput(value: number) {
  return (value / 100).toFixed(2)
}

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatCodePreview(value: unknown) {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

function highlightJson(code: string) {
  const cachedHighlight = highlightedJsonCache.get(code)

  if (cachedHighlight) {
    return cachedHighlight
  }

  const highlight = shikiHighlighter.then((highlighter) =>
    highlighter.codeToHtml(code, {
      lang: 'json',
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    }),
  )

  highlightedJsonCache.set(code, highlight)

  return highlight
}

function isAccordionSection(
  value: unknown,
): value is (typeof accordionSections)[number] {
  return (
    typeof value === 'string' &&
    accordionSections.includes(value as (typeof accordionSections)[number])
  )
}
