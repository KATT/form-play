import { zodResolver } from '@hookform/resolvers/zod'
import { createHighlighterCore } from '@shikijs/core'
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript'
import jsonLanguage from '@shikijs/langs/json'
import githubDarkTheme from '@shikijs/themes/github-dark'
import githubLightTheme from '@shikijs/themes/github-light'
import { createFileRoute } from '@tanstack/react-router'
import {
  type ReactNode,
  Suspense,
  use,
  useDeferredValue,
  useMemo,
} from 'react'
import { type UseFormReturn, useFieldArray, useWatch } from 'react-hook-form'
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
import { ConditionalTooltip } from '@/components/ui/conditional-tooltip'
import {
  ResolverForm,
  SubmitButton,
  useResolverForm,
} from '@/components/ui/react-hook-form-fields/form'
import {
  ControlledCheckboxGroup,
  ControlledCheckboxGroupItem,
} from '@/components/ui/react-hook-form-fields/checkbox-group'
import { ControlledCheckboxField } from '@/components/ui/react-hook-form-fields/checkbox-field'
import {
  ControlledMoneyInput,
  createCurrencyAmountSchema,
} from '@/components/ui/react-hook-form-fields/money-input'
import {
  ControlledRadioCardGroup,
  ControlledRadioCardGroupItem,
} from '@/components/ui/react-hook-form-fields/radio-card-group'
import { ControlledSelectInput } from '@/components/ui/react-hook-form-fields/select-input'
import { ControlledTextInput } from '@/components/ui/react-hook-form-fields/text-input'
import { ControlledTextareaInput } from '@/components/ui/react-hook-form-fields/textarea-input'
import {
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldTitle,
} from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  sampleApiBill,
  type ApiBill,
  type ApiSubmission,
  type ApiWeekday,
} from './-bill-api'

const currencies = ['USD', 'EUR', 'GBP', 'SEK', 'JPY'] as const
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
const appLocales = ['en-US', 'en-GB', 'sv-SE', 'ja-JP'] as const
const appLocaleLabels: Record<(typeof appLocales)[number], string> = {
  'en-GB': 'English (United Kingdom)',
  'en-US': 'English (United States)',
  'ja-JP': '日本語 (日本)',
  'sv-SE': 'Svenska (Sverige)',
}
const weekdays = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const satisfies readonly ApiWeekday[]
const routeSearchSchema = z.object({
  locale: z.enum(appLocales).catch('en-US'),
  sections: z.array(z.enum(accordionSections)).catch(['create']),
})

type AppLocale = (typeof appLocales)[number]

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

const currencyAmountSchema = createCurrencyAmountSchema(
  'Unit price is required',
  z
    .number()
    .int('Unit price must resolve to whole cents')
    .min(0, 'Unit price cannot be negative'),
)

const lineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Add a description'),
  quantity: requiredNumberInput('Quantity is required').pipe(
    z.number().min(1, 'Quantity must be at least 1'),
  ),
  unitAmountCents: currencyAmountSchema,
  taxable: z.boolean(),
})
const lineItemsSchema = z
  .array(lineItemSchema)
  .min(1, 'Add at least one line item')
const taxRateSchema = requiredNumberInput('Tax rate is required').pipe(
  z.number().min(0).max(100, 'Tax rate cannot exceed 100%'),
)

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
  lineItems: lineItemsSchema,
  taxRate: taxRateSchema,
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

const billFormInputSchema = z.discriminatedUnion('billType', [
  oneOffBillSchema,
  repeatingBillSchema,
])

const billFormSchema = billFormInputSchema.transform((values): ApiSubmission => {
  const schedule =
    values.billType === 'repeating'
      ? (() => {
          const recurrence = values.recurrence
          const end = {
            ends_on:
              recurrence.endStrategy === 'on_date'
                ? (recurrence.endsOn ?? null)
                : null,
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
                day_of_month: Number(anchorDate.slice(8, 10)),
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
                month: Number(anchorDate.slice(5, 7)),
                day: Number(anchorDate.slice(8, 10)),
                day_overflow: 'last_day' as const,
              }
            }
          }
        })()
      : null

  const sharedPayload = {
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
    schedule,
  }

  if (values.submitIntent === 'create') {
    return {
      endpoint: '/api/bills',
      method: 'POST',
      body: {
        ...sharedPayload,
        line_items: values.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_amount_cents: item.unitAmountCents,
          taxable: item.taxable,
        })),
      },
    }
  }

  const billId = values.billId ?? ':billId'

  return {
    endpoint: `/api/bills/${billId}`,
    method: 'PATCH',
    body: {
      id: billId,
      ...sharedPayload,
      line_items: values.lineItems.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit_amount_cents: item.unitAmountCents,
        taxable: item.taxable,
      })),
    },
  }
})

type BillFormInputValues = z.input<typeof billFormSchema>
type BillFormSubmission = z.output<typeof billFormSchema>
type BillForm = UseFormReturn<BillFormInputValues, unknown, BillFormSubmission>
type BillFormControl = BillForm['control']
type RecurrenceInputValues = NonNullable<BillFormInputValues['recurrence']>

function Home() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const locale = search.locale
  const openSections = search.sections

  return (
    <main
      className="min-h-screen bg-background px-6 py-10 text-foreground"
      lang={locale}
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge variant="secondary">React Hook Form + Zod</Badge>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Bill editor example
            </h1>
            <p className="mt-4 max-w-3xl text-pretty text-muted-foreground">
              This single route models create and edit bill forms side by side.
              Each accordion renders its own <code>UpsertBillForm</code>, with
              fresh defaults or defaults mapped from an imaginary API bill.
            </p>
          </div>
          <Card className="w-full md:w-72">
            <CardContent>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Locale
                <NativeSelect
                  className="w-full"
                  value={locale}
                  onChange={(event) => {
                    const nextLocale = event.currentTarget.value

                    if (isAppLocale(nextLocale)) {
                      navigate({
                        resetScroll: false,
                        search: (previous) => ({
                          ...previous,
                          locale: nextLocale,
                        }),
                      })
                    }
                  }}
                >
                  {appLocales.map((appLocale) => (
                    <NativeSelectOption key={appLocale} value={appLocale}>
                      {appLocaleLabels[appLocale]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>
            </CardContent>
          </Card>
        </div>

        <Accordion
          keepMounted
          className="mt-8 gap-5"
          multiple
          value={openSections}
          onValueChange={(sections) => {
            navigate({
              resetScroll: false,
              search: (previous) => ({
                ...previous,
                sections: sections.filter(
                  (section): section is (typeof accordionSections)[number] =>
                    accordionSections.includes(
                      section as (typeof accordionSections)[number],
                    ),
                ),
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
                locale={locale}
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
                locale={locale}
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
  locale,
  sourceTitle,
  sourceValue,
}: {
  defaultValues: BillFormInputValues
  locale: AppLocale
  sourceTitle: string
  sourceValue: unknown
}) {
  const form = useResolverForm<BillFormInputValues, BillFormSubmission>({
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
        <ResolverForm
          className="flex flex-col gap-6"
          form={form}
          handleSubmit={(submission) => {
            console.info('Submitting bill', submission)
          }}
        >
          <BillDetailsSection control={form.control} />
          <BillTypeSection control={form.control} />
          <LineItemsSection control={form.control} locale={locale} />
          <PaymentNotesSection control={form.control} />
          <SubmissionSection control={form.control} locale={locale} />
        </ResolverForm>
      </section>

      <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
        <CodePreviewCard title={sourceTitle} value={sourceValue} />
        <SubmissionPreviewCard control={form.control} />
      </aside>
    </div>
  )
}

function BillDetailsSection({ control }: { control: BillFormControl }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bill Details</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <ControlledTextInput
            control={control}
            label="Customer name"
            name="customerName"
            autoComplete="organization"
          />
          <ControlledTextInput
            control={control}
            label="Customer email"
            name="customerEmail"
            autoComplete="email"
            spellCheck={false}
            type="email"
          />
          <ControlledSelectInput
            control={control}
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
            control={control}
            label="Currency"
            name="currency"
          >
            {currencies.map((currency) => (
              <NativeSelectOption key={currency} value={currency}>
                {currency}
              </NativeSelectOption>
            ))}
          </ControlledSelectInput>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

function BillTypeSection({ control }: { control: BillFormControl }) {
  const editorMode = useWatch({ control, name: 'editorMode' })
  const billType = useWatch({ control, name: 'billType' })
  const billTypeDisabledReason =
    editorMode === 'api'
      ? 'Bill type is locked for imported API bills so the update payload stays compatible with the existing bill schedule.'
      : undefined
  const oneOffDisabledReason =
    billTypeDisabledReason && billType !== 'one_off'
      ? billTypeDisabledReason
      : undefined
  const repeatingDisabledReason =
    billTypeDisabledReason && billType !== 'repeating'
      ? billTypeDisabledReason
      : undefined
  let scheduleFields: ReactNode

  switch (billType) {
    case 'one_off':
      scheduleFields = <OneOffScheduleFields control={control} />
      break
    case 'repeating':
      scheduleFields = <RepeatingScheduleFields control={control} />
      break
    case undefined:
      scheduleFields = null
      break
    default:
      billType satisfies never
      scheduleFields = null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bill Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <ControlledRadioCardGroup
          control={control}
          label="Bill type"
          name="billType"
        >
          <ConditionalTooltip disabledReason={oneOffDisabledReason}>
            <ControlledRadioCardGroupItem
              disabled={!!oneOffDisabledReason}
              value="one_off"
            >
              <FieldContent>
                <FieldTitle>One-off</FieldTitle>
                <FieldDescription>
                  Collect this bill once with a fixed due date.
                </FieldDescription>
              </FieldContent>
            </ControlledRadioCardGroupItem>
          </ConditionalTooltip>
          <ConditionalTooltip disabledReason={repeatingDisabledReason}>
            <ControlledRadioCardGroupItem
              disabled={!!repeatingDisabledReason}
              value="repeating"
            >
              <FieldContent>
                <FieldTitle>Repeating</FieldTitle>
                <FieldDescription>
                  Generate future bills on a daily, weekly, monthly, or yearly
                  cadence.
                </FieldDescription>
              </FieldContent>
            </ControlledRadioCardGroupItem>
          </ConditionalTooltip>
        </ControlledRadioCardGroup>
        {scheduleFields}
      </CardContent>
    </Card>
  )
}

function OneOffScheduleFields({ control }: { control: BillFormControl }) {
  return (
    <Card className="mt-5">
      <CardContent>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <ControlledTextInput
            control={control}
            label="Issue date"
            name="issueDate"
            type="date"
          />
          <ControlledTextInput
            control={control}
            label="Due date"
            name="dueDate"
            type="date"
          />
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

function RepeatingScheduleFields({ control }: { control: BillFormControl }) {
  return (
    <Card className="mt-5">
      <CardContent>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <ControlledTextInput
            control={control}
            label="First issue date"
            name="issueDate"
            type="date"
          />
          <ControlledSelectInput
            control={control}
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
            control={control}
            label="Every"
            min={1}
            name="recurrence.interval"
            type="number"
          />
          <ControlledTextInput
            control={control}
            label="Starts on"
            name="recurrence.startsOn"
            type="date"
          />
          <RecurrenceFrequencyFields control={control} />
          <ControlledSelectInput
            control={control}
            label="Ends"
            name="recurrence.endStrategy"
          >
            <NativeSelectOption value="never">Never</NativeSelectOption>
            <NativeSelectOption value="on_date">On a date</NativeSelectOption>
            <NativeSelectOption value="after_occurrences">
              After occurrences
            </NativeSelectOption>
          </ControlledSelectInput>
          <RecurrenceEndFields control={control} />
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

function RecurrenceFrequencyFields({ control }: { control: BillFormControl }) {
  const frequency = useWatch({ control, name: 'recurrence.frequency' })

  switch (frequency) {
    case 'daily':
    case 'weekly':
      return (
        <ControlledCheckboxGroup
          className="md:col-span-2"
          control={control}
          description="Choose which weekdays should generate an occurrence."
          label="Weekdays"
          name="recurrence.weekdays"
          optionsClassName="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {weekdays.map((weekday) => (
            <ControlledCheckboxGroupItem key={weekday} value={weekday}>
              {titleCase(weekday)}
            </ControlledCheckboxGroupItem>
          ))}
        </ControlledCheckboxGroup>
      )
    case 'monthly':
      return (
        <>
          <ControlledTextInput
            control={control}
            label="Monthly anchor date"
            name="recurrence.monthlyAnchorDate"
            type="date"
          />
          <FieldDescription>
            If a month does not have that day, the bill runs on the last valid
            day of that month.
          </FieldDescription>
        </>
      )
    case 'yearly':
      return (
        <>
          <ControlledTextInput
            control={control}
            label="Yearly anchor date"
            name="recurrence.yearlyAnchorDate"
            type="date"
          />
          <FieldDescription>
            If a future year does not have that date, the bill runs on the last
            valid day of that month.
          </FieldDescription>
        </>
      )
    case undefined:
      return null
    default:
      frequency satisfies never
      return null
  }
}
function RecurrenceEndFields({ control }: { control: BillFormControl }) {
  const endStrategy = useWatch({ control, name: 'recurrence.endStrategy' })

  switch (endStrategy) {
    case 'never':
    case undefined:
      return null
    case 'on_date':
      return (
        <ControlledTextInput
          control={control}
          label="End date"
          name="recurrence.endsOn"
          type="date"
        />
      )
    case 'after_occurrences':
      return (
        <ControlledTextInput
          control={control}
          label="Occurrences"
          min={2}
          name="recurrence.occurrenceCount"
          type="number"
        />
      )
    default:
      endStrategy satisfies never
      return null
  }
}

function LineItemsSection({
  control,
  locale,
}: {
  control: BillFormControl
  locale: AppLocale
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  })
  const currency = useWatch({ control, name: 'currency' })

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
                  control={control}
                  label="Description"
                  name={`lineItems.${index}.description`}
                />
                <ControlledTextInput
                  control={control}
                  label="Qty"
                  min={1}
                  name={`lineItems.${index}.quantity`}
                  type="number"
                />
                <ControlledMoneyInput
                  control={control}
                  currency={currency}
                  label="Unit price"
                  locale={locale}
                  min={0}
                  name={`lineItems.${index}.unitAmountCents`}
                  step="0.01"
                />
                <div className="flex items-end gap-3">
                  <ControlledCheckboxField
                    control={control}
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

function PaymentNotesSection({ control }: { control: BillFormControl }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment & Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <ControlledTextInput
            control={control}
            label="Tax rate (%)"
            min={0}
            name="taxRate"
            step="0.01"
            type="number"
          />
          <ControlledCheckboxField
            control={control}
            label="Collect payment automatically"
            name="collectPaymentAutomatically"
          />
        </FieldGroup>
        <ControlledTextareaInput
          className="mt-4"
          control={control}
          label="Memo"
          name="memo"
          rows={4}
        />
      </CardContent>
    </Card>
  )
}

function SubmissionSection({
  control,
  locale,
}: {
  control: BillFormControl
  locale: AppLocale
}) {
  const lineItems = useWatch({ control, name: 'lineItems' })
  const taxRate = useWatch({ control, name: 'taxRate' })
  const currency = useWatch({ control, name: 'currency' })
  const totals = useMemo(() => {
    const parsedLineItems = lineItemsSchema.safeParse(lineItems ?? [])
    const parsedTaxRate = taxRateSchema.safeParse(taxRate ?? '')

    if (!parsedLineItems.success || !parsedTaxRate.success) {
      return null
    }

    const subtotal = parsedLineItems.data.reduce(
      (total, item) => total + (item.quantity * item.unitAmountCents) / 100,
      0,
    )
    const taxableSubtotal = parsedLineItems.data.reduce(
      (total, item) =>
        item.taxable
          ? total + (item.quantity * item.unitAmountCents) / 100
          : total,
      0,
    )
    const tax = taxableSubtotal * (parsedTaxRate.data / 100)

    return {
      subtotal,
      tax,
      total: subtotal + tax,
    }
  }, [lineItems, taxRate])
  const money = new Intl.NumberFormat(locale, {
    currency,
    style: 'currency',
  })

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Bill total</p>
          {totals ? (
            <>
              <p className="text-3xl font-bold">{money.format(totals.total)}</p>
              <p className="text-sm text-muted-foreground">
                {money.format(totals.subtotal)} subtotal +{' '}
                {money.format(totals.tax)} tax
              </p>
            </>
          ) : (
            <p className="max-w-sm text-sm text-muted-foreground">
              Complete the line items and tax rate to preview the bill total.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <ControlledSelectInput
            control={control}
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
          <SubmitButton className="self-end" size="lg">
            Transform & Submit
          </SubmitButton>
        </div>
      </CardContent>
    </Card>
  )
}

function SubmissionPreviewCard({ control }: { control: BillFormControl }) {
  const watchedValues = useWatch({ control })
  const parsedSubmission = billFormSchema.safeParse(watchedValues)
  const submissionPreview = parsedSubmission.success
    ? parsedSubmission.data
    : 'Complete the required fields to inspect the API submission.'

  return (
    <CodePreviewCard
      title="Derived submission preview"
      value={submissionPreview}
    />
  )
}

function CodePreviewCard({ title, value }: { title: string; value: unknown }) {
  const code = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
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
  const issueDate = new Date()

  return {
    billId: undefined,
    editorMode: 'new',
    submitIntent: 'create',
    billType: 'one_off',
    customerName: '',
    customerEmail: '',
    status: 'draft',
    issueDate: getDateInputValue(issueDate),
    dueDate: getDateInputValue(addDays(issueDate, 14)),
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
      unitAmountCents: z.encode(currencyAmountSchema, item.unit_amount_cents),
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
      interval: String(apiBill.schedule.interval),
      startsOn: apiBill.schedule.starts_on,
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
      recurrence: (() => {
        switch (apiBill.schedule.frequency) {
          case 'daily':
          case 'weekly':
            return {
              ...baseRecurrence,
              frequency: apiBill.schedule.frequency,
              weekdays: apiBill.schedule.weekdays,
            }
          case 'monthly':
            return {
              ...baseRecurrence,
              frequency: 'monthly',
              monthlyAnchorDate: apiBill.schedule.anchor_date,
            }
          case 'yearly':
            return {
              ...baseRecurrence,
              frequency: 'yearly',
              yearlyAnchorDate: apiBill.schedule.anchor_date,
            }
        }
      })(),
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
    unitAmountCents: z.encode(currencyAmountSchema, 0),
    taxable: true,
  }
}

function getDefaultRecurrence(
  frequency: RecurrenceInputValues['frequency'] = 'monthly',
): RecurrenceInputValues {
  const startsOn = getDateInputValue(new Date())
  const baseRecurrence = {
    interval: '1',
    startsOn,
    endStrategy: 'never' as const,
    endsOn: '',
    occurrenceCount: undefined,
  }

  switch (frequency) {
    case 'daily':
    case 'weekly':
      return {
        ...baseRecurrence,
        frequency,
        weekdays: ['monday'],
      }
    case 'monthly':
      return {
        ...baseRecurrence,
        frequency: 'monthly',
        monthlyAnchorDate: startsOn,
      }
    case 'yearly':
      return {
        ...baseRecurrence,
        frequency: 'yearly',
        yearlyAnchorDate: startsOn,
      }
  }
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)

  return nextDate
}

function getDateInputValue(date: Date) {
  const localDate = new Date(date)
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset())

  return localDate.toISOString().slice(0, 10)
}

function isAppLocale(value: string): value is AppLocale {
  return appLocales.includes(value as AppLocale)
}

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
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
