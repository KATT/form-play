import { useId } from 'react'
import {
  Controller,
  type Control,
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { NativeSelect } from '@/components/ui/native-select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type FormWithControl = {
  control: unknown
}

type ControlledFieldBase<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  form: FormWithControl
  label: string
  name: TName
}

function getFormControl<TFieldValues extends FieldValues>(
  form: FormWithControl,
) {
  return form.control as Control<TFieldValues>
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
  return (
    <Controller
      control={getFormControl<TFieldValues>(form)}
      name={name}
      render={({ field, fieldState }) => (
        <TextInput
          {...props}
          error={fieldState.error?.message}
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
  const currencySymbol = getCurrencySymbol(currency)

  return (
    <Controller
      control={getFormControl<TFieldValues>(form)}
      name={name}
      render={({ field, fieldState }) => (
        <MoneyInput
          {...props}
          currency={currency}
          currencySymbol={currencySymbol}
          error={fieldState.error?.message}
          name={field.name}
          placeholder={placeholder ?? `0.00 ${currency}`}
          value={field.value == null ? '' : String(field.value)}
          onBlur={() => {
            field.onBlur()
          }}
          onChange={(event) => field.onChange(event.currentTarget.value)}
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
  return (
    <Controller
      control={getFormControl<TFieldValues>(form)}
      name={name}
      render={({ field, fieldState }) => (
        <SelectInput
          {...props}
          error={fieldState.error?.message}
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
  return (
    <Controller
      control={getFormControl<TFieldValues>(form)}
      name={name}
      render={({ field, fieldState }) => (
        <TextareaInput
          {...props}
          error={fieldState.error?.message}
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
  return (
    <Controller
      control={getFormControl<TFieldValues>(form)}
      name={name}
      render={({ field, fieldState }) => (
        <CheckboxField
          {...props}
          checked={!!field.value}
          error={fieldState.error?.message}
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
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Controller
        control={getFormControl<TFieldValues>(form)}
        name={name}
        render={({ field, fieldState }) => {
          const error = fieldState.error?.message

          return (
            <>
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
                          aria-invalid={!!error}
                          disabled={option.disabled}
                          id={optionId}
                          value={option.value}
                        />
                      </Field>
                    </FieldLabel>
                  )
                })}
              </RadioGroup>
              <FieldError>{error}</FieldError>
            </>
          )
        }}
      />
    </Field>
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

function MoneyInput({
  currency,
  currencySymbol,
  error,
  id,
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  currency: string
  currencySymbol: string
  error?: string
  label: string
}) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <InputGroupText>{currencySymbol}</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          aria-invalid={!!error}
          id={inputId}
          inputMode="decimal"
          type="text"
          {...props}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupText>{currency}</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
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

function getCurrencySymbol(currency: string) {
  const parts = new Intl.NumberFormat('en-US', {
    currency,
    style: 'currency',
  }).formatToParts(0)

  return parts.find((part) => part.type === 'currency')?.value ?? currency
}

export {
  ControlledCheckboxField,
  ControlledMoneyInput,
  ControlledRadioCardGroup,
  ControlledSelectInput,
  ControlledTextInput,
  ControlledTextareaInput,
}
