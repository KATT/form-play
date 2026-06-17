import { useId } from 'react'
import {
  Controller,
  type Control,
  type FieldErrors,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'

import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type FormWithControl<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>
  formState: {
    errors: FieldErrors<TFieldValues>
  }
}

type ControlledFieldBase<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  form: FormWithControl<TFieldValues>
  label: string
  name: TName
}

type ControlledTextInputProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'defaultValue' | 'form' | 'name' | 'onBlur' | 'onChange' | 'value'
> &
  ControlledFieldBase<TFieldValues, TName>

type ControlledMoneyInputProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = Omit<
  ControlledTextInputProps<TFieldValues, TName>,
  'inputMode' | 'type'
> & {
  currency?: string
}

type ControlledSelectInputProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'defaultValue' | 'form' | 'name' | 'onBlur' | 'onChange' | 'size' | 'value'
> &
  ControlledFieldBase<TFieldValues, TName> & {
    children: React.ReactNode
  }

type ControlledTextareaInputProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'defaultValue' | 'form' | 'name' | 'onBlur' | 'onChange' | 'value'
> &
  ControlledFieldBase<TFieldValues, TName> & {
    className?: string
  }

type ControlledCheckboxFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = Omit<
  React.ComponentProps<typeof Checkbox>,
  'checked' | 'defaultChecked' | 'form' | 'name' | 'onBlur' | 'onCheckedChange'
> &
  ControlledFieldBase<TFieldValues, TName>

type RadioCardOption = {
  description?: React.ReactNode
  disabled?: boolean
  title: React.ReactNode
  value: string
}

type ControlledRadioCardGroupProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = ControlledFieldBase<TFieldValues, TName> & {
  className?: string
  options: readonly RadioCardOption[]
}

function ControlledTextInput<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ form, name, ...props }: ControlledTextInputProps<TFieldValues, TName>) {
  const error = getFieldError(form.formState.errors, name)

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <TextInput
          {...props}
          error={error}
          name={field.name}
          value={field.value == null ? '' : String(field.value)}
          onBlur={field.onBlur}
          onChange={(event) => field.onChange(event.currentTarget.value)}
        />
      )}
    />
  )
}

function ControlledMoneyInput<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  currency = 'USD',
  form,
  name,
  placeholder,
  ...props
}: ControlledMoneyInputProps<TFieldValues, TName>) {
  const error = getFieldError(form.formState.errors, name)
  const currencySymbol = getCurrencySymbol(currency)

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <TextInput
          {...props}
          error={error}
          inputMode="decimal"
          name={field.name}
          placeholder={placeholder ?? `0.00 ${currency}`}
          type="text"
          value={formatMoneyInputValue(field.value)}
          onBlur={(event) => {
            field.onBlur()
            field.onChange(formatMoneyInputValue(event.currentTarget.value))
          }}
          onChange={(event) => {
            field.onChange(normalizeMoneyInputValue(event.currentTarget.value))
          }}
          prefix={currencySymbol}
          suffix={currency}
        />
      )}
    />
  )
}

function ControlledSelectInput<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  children,
  form,
  name,
  ...props
}: ControlledSelectInputProps<TFieldValues, TName>) {
  const error = getFieldError(form.formState.errors, name)

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <SelectInput
          {...props}
          error={error}
          name={field.name}
          value={field.value == null ? '' : String(field.value)}
          onBlur={field.onBlur}
          onChange={(event) => field.onChange(event.currentTarget.value)}
        >
          {children}
        </SelectInput>
      )}
    />
  )
}

function ControlledTextareaInput<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ form, name, ...props }: ControlledTextareaInputProps<TFieldValues, TName>) {
  const error = getFieldError(form.formState.errors, name)

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <TextareaInput
          {...props}
          error={error}
          name={field.name}
          value={field.value == null ? '' : String(field.value)}
          onBlur={field.onBlur}
          onChange={(event) => field.onChange(event.currentTarget.value)}
        />
      )}
    />
  )
}

function ControlledCheckboxField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  form,
  label,
  name,
  ...props
}: ControlledCheckboxFieldProps<TFieldValues, TName>) {
  const error = getFieldError(form.formState.errors, name)

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <CheckboxField
          {...props}
          checked={!!field.value}
          error={error}
          label={label}
          onCheckedChange={field.onChange}
        />
      )}
    />
  )
}

function ControlledRadioCardGroup<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  className,
  form,
  label,
  name,
  options,
}: ControlledRadioCardGroupProps<TFieldValues, TName>) {
  const error = getFieldError(form.formState.errors, name)

  return (
    <Field data-invalid={!!error}>
      <FieldLabel>{label}</FieldLabel>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <RadioGroup
            aria-invalid={!!error}
            className={cn('grid gap-4 md:grid-cols-2', className)}
            value={field.value == null ? '' : String(field.value)}
            onValueChange={(value) => field.onChange(value)}
          >
            {options.map((option) => {
              const optionId = `${String(name)}-${option.value}`

              return (
                <FieldLabel htmlFor={optionId} key={option.value}>
                  <Field
                    data-disabled={option.disabled || undefined}
                    orientation="horizontal"
                    className={cn(
                      'min-h-32 cursor-pointer rounded-xl transition-colors hover:bg-accent/50 has-data-checked:ring-1 has-data-checked:ring-ring',
                      option.disabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <FieldContent>
                      <FieldTitle>{option.title}</FieldTitle>
                      {option.description ? (
                        <FieldDescription>
                          {option.description}
                        </FieldDescription>
                      ) : null}
                    </FieldContent>
                    <RadioGroupItem
                      disabled={option.disabled}
                      id={optionId}
                      value={option.value}
                    />
                  </Field>
                </FieldLabel>
              )
            })}
          </RadioGroup>
        )}
      />
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function getFieldError<TFieldValues extends FieldValues>(
  errors: FieldErrors<TFieldValues>,
  name: FieldPath<TFieldValues>,
) {
  const fieldError = name.split('.').reduce<unknown>((current, segment) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[segment]
    }

    return undefined
  }, errors)

  if (
    fieldError &&
    typeof fieldError === 'object' &&
    'message' in fieldError &&
    typeof fieldError.message === 'string'
  ) {
    return fieldError.message
  }

  return undefined
}

function TextInput({
  error,
  id,
  label,
  prefix,
  suffix,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string
  label: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        ) : null}
        <Input
          aria-invalid={!!error}
          className={cn(prefix && 'pl-7', suffix && 'pr-12')}
          id={inputId}
          {...props}
        />
        {suffix ? (
          <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs font-medium text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
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
  error,
  label,
  onCheckedChange,
  ...props
}: React.ComponentProps<typeof Checkbox> & {
  error?: string
  label: string
}) {
  return (
    <Field data-invalid={!!error} orientation="horizontal">
      <FieldLabel className="items-center">
        <Checkbox
          aria-invalid={!!error}
          checked={checked}
          onCheckedChange={onCheckedChange}
          {...props}
        />
        {label}
      </FieldLabel>
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function normalizeMoneyInputValue(value: unknown) {
  return String(value ?? '').replace(/[^\d.]/g, '')
}

function formatMoneyInputValue(value: unknown) {
  const normalizedValue = normalizeMoneyInputValue(value)

  if (normalizedValue === '') {
    return ''
  }

  const parsedValue = Number(normalizedValue)

  if (!Number.isFinite(parsedValue)) {
    return normalizedValue
  }

  return parsedValue.toFixed(2)
}

function getCurrencySymbol(currency: string) {
  const parts = new Intl.NumberFormat('en-US', {
    currency,
    style: 'currency',
  }).formatToParts(0)

  return parts.find((part) => part.type === 'currency')?.value ?? currency
}

export {
  CheckboxField,
  ControlledCheckboxField,
  ControlledMoneyInput,
  ControlledRadioCardGroup,
  ControlledSelectInput,
  ControlledTextInput,
  ControlledTextareaInput,
}
