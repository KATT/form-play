import { zodResolver } from '@hookform/resolvers/zod'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
import { FileCheckIcon, GripVerticalIcon } from 'lucide-react'
import {
  useFieldArray,
  useFormContext,
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
} from '@/components/ui/card'
import { ConditionalTooltip } from '@/components/ui/conditional-tooltip'
import {
  ResolverForm,
  SubmitButton,
  type UseResolverForm,
  useResolverForm,
} from '@/components/ui/react-hook-form-fields/form'
import {
  CheckboxGroupField,
  CheckboxGroupFieldItem,
} from '@/components/ui/react-hook-form-fields/checkbox-group'
import { CheckboxField } from '@/components/ui/react-hook-form-fields/checkbox-field'
import {
  createCurrencyAmountSchema,
  MoneyInputField,
} from '@/components/ui/react-hook-form-fields/money-input'
import {
  RadioCardGroupField,
  RadioCardGroupFieldItem,
} from '@/components/ui/react-hook-form-fields/radio-card-group'
import { SelectField } from '@/components/ui/react-hook-form-fields/select-input'
import { TextInputField } from '@/components/ui/react-hook-form-fields/text-input'
import { TextareaField } from '@/components/ui/react-hook-form-fields/textarea-input'
import {
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTheme } from '@/components/theme-provider'
import { cn, type DefaultValuesForDiscriminatedUnion } from '@/lib/utils'
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
const appThemes = ['system', 'dark', 'light'] as const
const appLocaleLabels: Record<(typeof appLocales)[number], string> = {
  'en-GB': 'English (United Kingdom)',
  'en-US': 'English (United States)',
  'ja-JP': '日本語 (日本)',
  'sv-SE': 'Svenska (Sverige)',
}
const appThemeLabels: Record<(typeof appThemes)[number], string> = {
  system: 'System',
  dark: 'Dark',
  light: 'Light',
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
type AppTheme = (typeof appThemes)[number]

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

const lineItemInputSchema = z.object({
  id: z.string().optional(),
  description: z.string(),
  quantity: z.string(),
  unitAmountCents: z.string(),
  taxable: z.boolean(),
})
const lineItemSchema = lineItemInputSchema.extend({
  description: z.string().min(1, 'Add a description'),
  quantity: requiredNumberInput('Quantity is required').pipe(
    z.number().min(1, 'Quantity must be at least 1'),
  ),
  unitAmountCents: currencyAmountSchema,
})
const lineItemsSchema = z
  .array(lineItemInputSchema)
  .transform((lineItems) =>
    lineItems.filter(
      (lineItem) =>
        lineItem.description.trim() !== '' ||
        String(lineItem.quantity).trim() !== '' ||
        lineItem.unitAmountCents.trim() !== '',
    ),
  )
  .pipe(z.array(lineItemSchema))
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
})

const repeatingBillSchema = baseBillSchema.extend({
  billType: z.literal('repeating'),
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
type RecurrenceInputValues = z.input<typeof recurrenceSchema>
type BillFormDefaultValues =
  DefaultValuesForDiscriminatedUnion<BillFormInputValues>
type BillForm = UseResolverForm<BillFormInputValues, BillFormSubmission>
type BillFormField = BillForm['field']

function Home() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const locale = search.locale
  const openSections = search.sections
  const { setTheme, theme } = useTheme()

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
          <Card className="w-full md:w-104">
            <CardContent className="grid gap-4 sm:grid-cols-2">
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
              <label className="flex flex-col gap-2 text-sm font-medium">
                Theme
                <NativeSelect
                  className="w-full"
                  value={theme}
                  onChange={(event) => {
                    const nextTheme = event.currentTarget.value

                    if (isAppTheme(nextTheme)) {
                      setTheme(nextTheme)
                    }
                  }}
                >
                  {appThemes.map((appTheme) => (
                    <NativeSelectOption key={appTheme} value={appTheme}>
                      {appThemeLabels[appTheme]}
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
                values={editBillDefaultValues}
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
  values,
}: {
  defaultValues: BillFormDefaultValues
  locale: AppLocale
  sourceTitle: string
  sourceValue: unknown
  values?: BillFormInputValues | undefined
}) {
  const form = useResolverForm<BillFormInputValues, BillFormSubmission>({
    resolver: zodResolver(billFormSchema),
    defaultValues,
    values,
    resetOptions: {
      keepDefaultValues: true,
    },
  })

  return (
    <ResolverForm
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]"
      form={form}
      handleSubmit={async (submission) => {
        await new Promise((resolve) => setTimeout(resolve, 900))
        if (Math.random() < 0.5) {
          throw new Error('The imaginary billing API rejected this submit.')
        }
        console.info('Submitting bill', submission)
      }}
    >
      <section>
        <div className="flex flex-col gap-6">
          <BillDetailsSection field={form.field} />
          <BillTypeSection field={form.field} />
          <LineItemsSection field={form.field} locale={locale} />
          <PaymentNotesSection field={form.field} />
          <SubmissionSection field={form.field} locale={locale} />
        </div>
      </section>

      <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
        <CodePreviewCard title={sourceTitle} value={sourceValue} />
        <SubmissionPreviewCard />
      </aside>
    </ResolverForm>
  )
}

function BillDetailsSection({ field }: { field: BillFormField }) {
  return (
    <Card>
      <CardContent>
        <FieldSet>
          <FieldLegend>Bill details</FieldLegend>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <TextInputField
              field={field('customerName')}
              label="Customer name"
              autoComplete="organization"
            />
            <TextInputField
              field={field('customerEmail')}
              label="Customer email"
              autoComplete="email"
              spellCheck={false}
              type="email"
            />
            <SelectField
              field={field('status')}
              label="Status"
            >
              {billStatuses.map((status) => (
                <NativeSelectOption key={status} value={status}>
                  {titleCase(status)}
                </NativeSelectOption>
              ))}
            </SelectField>
            <SelectField
              field={field('currency')}
              label="Currency"
            >
              {currencies.map((currency) => (
                <NativeSelectOption key={currency} value={currency}>
                  {currency}
                </NativeSelectOption>
              ))}
            </SelectField>
          </FieldGroup>
        </FieldSet>
      </CardContent>
    </Card>
  )
}

function BillTypeSection({ field }: { field: BillFormField }) {
  const editorMode = useWatch(field('editorMode'))
  const billType = useWatch(field('billType'))
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
      scheduleFields = <OneOffScheduleFields field={field} />
      break
    case 'repeating':
      scheduleFields = <RepeatingScheduleFields field={field} />
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
      <CardContent>
        <FieldSet>
          <FieldLegend>Bill schedule</FieldLegend>
          <RadioCardGroupField
            field={field('billType')}
            label="Bill type"
          >
            <ConditionalTooltip disabledReason={oneOffDisabledReason}>
              <RadioCardGroupFieldItem
                disabled={!!oneOffDisabledReason}
                value="one_off"
              >
                <FieldContent>
                  <FieldTitle>One-off</FieldTitle>
                  <FieldDescription>
                    Collect this bill once with a fixed due date.
                  </FieldDescription>
                </FieldContent>
              </RadioCardGroupFieldItem>
            </ConditionalTooltip>
            <ConditionalTooltip disabledReason={repeatingDisabledReason}>
              <RadioCardGroupFieldItem
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
              </RadioCardGroupFieldItem>
            </ConditionalTooltip>
          </RadioCardGroupField>
          {scheduleFields}
        </FieldSet>
      </CardContent>
    </Card>
  )
}

function OneOffScheduleFields({ field }: { field: BillFormField }) {
  return (
    <Card className="mt-5">
      <CardContent>
        <FieldSet>
          <FieldLegend>One-off schedule</FieldLegend>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <TextInputField
              field={field('issueDate')}
              label="Issue date"
              type="date"
            />
            <TextInputField
              field={field('dueDate')}
              label="Due date"
              type="date"
            />
          </FieldGroup>
        </FieldSet>
      </CardContent>
    </Card>
  )
}

function RepeatingScheduleFields({ field }: { field: BillFormField }) {
  return (
    <Card className="mt-5">
      <CardContent>
        <FieldSet>
          <FieldLegend>Repeating schedule</FieldLegend>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <TextInputField
              field={field('issueDate')}
              label="First issue date"
              type="date"
            />
            <SelectField
              field={field('recurrence.frequency')}
              label="Frequency"
            >
              {recurrenceFrequencies.map((frequency) => (
                <NativeSelectOption key={frequency} value={frequency}>
                  {titleCase(frequency)}
                </NativeSelectOption>
              ))}
            </SelectField>
            <TextInputField
              field={field('recurrence.interval')}
              label="Every"
              min={1}
              type="number"
            />
            <TextInputField
              field={field('recurrence.startsOn')}
              label="Starts on"
              type="date"
            />
            <RecurrenceFrequencyFields field={field} />
            <SelectField
              field={field('recurrence.endStrategy')}
              label="Ends"
            >
              <NativeSelectOption value="never">Never</NativeSelectOption>
              <NativeSelectOption value="on_date">On a date</NativeSelectOption>
              <NativeSelectOption value="after_occurrences">
                After occurrences
              </NativeSelectOption>
            </SelectField>
            <RecurrenceEndFields field={field} />
          </FieldGroup>
        </FieldSet>
      </CardContent>
    </Card>
  )
}

function RecurrenceFrequencyFields({ field }: { field: BillFormField }) {
  const frequency = useWatch(field('recurrence.frequency'))

  switch (frequency) {
    case 'daily':
    case 'weekly':
      return (
        <CheckboxGroupField
          className="md:col-span-2"
          description="Choose which weekdays should generate an occurrence."
          field={field('recurrence.weekdays')}
          label="Weekdays"
          optionsClassName="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {weekdays.map((weekday) => (
            <CheckboxGroupFieldItem key={weekday} value={weekday}>
              {titleCase(weekday)}
            </CheckboxGroupFieldItem>
          ))}
        </CheckboxGroupField>
      )
    case 'monthly':
      return (
        <>
          <TextInputField
            field={field('recurrence.monthlyAnchorDate')}
            label="Monthly anchor date"
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
          <TextInputField
            field={field('recurrence.yearlyAnchorDate')}
            label="Yearly anchor date"
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
function RecurrenceEndFields({ field }: { field: BillFormField }) {
  const endStrategy = useWatch(field('recurrence.endStrategy'))

  switch (endStrategy) {
    case 'never':
    case undefined:
      return null
    case 'on_date':
      return (
        <TextInputField
          field={field('recurrence.endsOn')}
          label="End date"
          type="date"
        />
      )
    case 'after_occurrences':
      return (
        <TextInputField
          field={field('recurrence.occurrenceCount')}
          label="Occurrences"
          min={2}
          type="number"
        />
      )
    default:
      endStrategy satisfies never
      return null
  }
}

function LineItemsSection({
  field,
  locale,
}: {
  field: BillFormField
  locale: AppLocale
}) {
  const { fields, append, move, remove } = useFieldArray(field('lineItems'))
  const currency = useWatch(field('currency'))
  const lineItemIds = useMemo(
    () => fields.map((lineItemField) => lineItemField.id),
    [fields],
  )
  const dragSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  return (
    <Card>
      <CardContent>
        <FieldSet>
          <FieldLegend>Line items</FieldLegend>
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            sensors={dragSensors}
            onDragEnd={(event: DragEndEvent) => {
              const { active, over } = event

              if (!over || active.id === over.id) {
                return
              }

              const activeIndex = fields.findIndex(
                (lineItemField) => lineItemField.id === active.id,
              )
              const overIndex = fields.findIndex(
                (lineItemField) => lineItemField.id === over.id,
              )

              if (activeIndex === -1 || overIndex === -1) {
                return
              }

              move(activeIndex, overIndex)
            }}
          >
            <SortableContext
              items={lineItemIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-4">
                {fields.map((lineItemField, index) => (
                  <SortableLineItemCard
                    key={lineItemField.id}
                    canRemove={fields.length > 1}
                    currency={currency}
                    field={field}
                    id={lineItemField.id}
                    index={index}
                    locale={locale}
                    onRemove={() => remove(index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Button
            className="self-start"
            type="button"
            variant="outline"
            onClick={() => append(getDefaultLineItem())}
          >
            Add Line Item
          </Button>
        </FieldSet>
      </CardContent>
    </Card>
  )
}

function SortableLineItemCard({
  canRemove,
  currency,
  field,
  id,
  index,
  locale,
  onRemove,
}: {
  canRemove: boolean
  currency: (typeof currencies)[number]
  field: BillFormField
  id: string
  index: number
  locale: AppLocale
  onRemove: () => void
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id })

  return (
    <Card
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && 'relative z-10 opacity-80')}
    >
      <CardContent className="grid gap-3 md:grid-cols-[auto_1fr_110px_140px_auto]">
        <Button
          {...attributes}
          {...listeners}
          ref={setActivatorNodeRef}
          aria-label={`Move line item ${index + 1}`}
          className="cursor-grab self-end active:cursor-grabbing"
          size="icon-lg"
          type="button"
          variant="ghost"
        >
          <GripVerticalIcon aria-hidden="true" />
        </Button>
        <TextInputField
          field={field(`lineItems.${index}.description`)}
          label="Description"
        />
        <TextInputField
          field={field(`lineItems.${index}.quantity`)}
          label="Qty"
          min={1}
          type="number"
        />
        <MoneyInputField
          currency={currency}
          field={field(`lineItems.${index}.unitAmountCents`)}
          label="Unit price"
          locale={locale}
          min={0}
          step="0.01"
        />
        <div className="flex items-center gap-3 self-end">
          <CheckboxField
            field={field(`lineItems.${index}.taxable`)}
            label="Taxable"
          />
          <Button
            disabled={!canRemove}
            size="lg"
            type="button"
            variant="destructive"
            onClick={onRemove}
          >
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function PaymentNotesSection({ field }: { field: BillFormField }) {
  return (
    <Card>
      <CardContent>
        <FieldSet>
          <FieldLegend>Payment and notes</FieldLegend>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <TextInputField
              field={field('taxRate')}
              label="Tax rate (%)"
              min={0}
              step="0.01"
              type="number"
            />
            <div className="self-end">
              <CheckboxField
                field={field('collectPaymentAutomatically')}
                label="Collect payment automatically"
              />
            </div>
          </FieldGroup>
          <TextareaField
            field={field('memo')}
            label="Memo"
            rows={4}
          />
        </FieldSet>
      </CardContent>
    </Card>
  )
}

function SubmissionSection({
  field,
  locale,
}: {
  field: BillFormField
  locale: AppLocale
}) {
  const lineItems = useWatch(field('lineItems'))
  const taxRate = useWatch(field('taxRate'))
  const currency = useWatch(field('currency'))
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
          <SelectField
            field={field('submitIntent')}
            label="Submit as"
          >
            <NativeSelectOption value="create">
              Create Endpoint
            </NativeSelectOption>
            <NativeSelectOption value="update">
              Update Endpoint
            </NativeSelectOption>
          </SelectField>
          <SubmitButton
            className="self-end"
            icon={FileCheckIcon}
            iconPosition="end"
            size="lg"
          >
            Transform & Submit
          </SubmitButton>
        </div>
      </CardContent>
    </Card>
  )
}

function SubmissionPreviewCard() {
  const { control } = useFormContext<BillFormInputValues>()
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
        <h2 className="font-semibold">{title}</h2>
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

function getNewBillDefaults(): BillFormDefaultValues {
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
  }
}

const createBillDefaultValues = getNewBillDefaults()
const editBillDefaultValues = getBillDefaultsFromApi(sampleApiBill)

function getDefaultLineItem(): BillFormInputValues['lineItems'][number] {
  return {
    description: '',
    quantity: '',
    unitAmountCents: '',
    taxable: false,
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

function isAppTheme(value: string): value is AppTheme {
  return appThemes.includes(value as AppTheme)
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
