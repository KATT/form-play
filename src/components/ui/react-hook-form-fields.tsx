import { useId } from 'react'
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldPathValue,
  type FieldValues,
  useWatch,
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

interface ControlledFieldBase<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  control: unknown
  label: string
  name: TName
}

function getControl<TFieldValues extends FieldValues>(control: unknown) {
  return control as Control<TFieldValues>
}

interface ControlledTextInputProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>
  extends
    Omit<
      React.InputHTMLAttributes<HTMLInputElement>,
      'defaultValue' | 'form' | 'name' | 'onBlur' | 'onChange' | 'value'
    >,
    ControlledFieldBase<TFieldValues, TName> {}

interface ControlledMoneyInputProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends Omit<
  ControlledTextInputProps<TFieldValues, TName>,
  'inputMode' | 'type'
> {
  currency?: string
}

interface ControlledSelectInputProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>
  extends
    Omit<
      React.SelectHTMLAttributes<HTMLSelectElement>,
      | 'defaultValue'
      | 'form'
      | 'name'
      | 'onBlur'
      | 'onChange'
      | 'size'
      | 'value'
    >,
    ControlledFieldBase<TFieldValues, TName> {
  children: React.ReactNode
}

interface ControlledTextareaInputProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>
  extends
    Omit<
      React.TextareaHTMLAttributes<HTMLTextAreaElement>,
      'defaultValue' | 'form' | 'name' | 'onBlur' | 'onChange' | 'value'
    >,
    ControlledFieldBase<TFieldValues, TName> {
  className?: string
}

interface ControlledCheckboxFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>
  extends
    Omit<
      React.ComponentProps<typeof Checkbox>,
      | 'checked'
      | 'defaultChecked'
      | 'form'
      | 'name'
      | 'onBlur'
      | 'onCheckedChange'
    >,
    ControlledFieldBase<TFieldValues, TName> {}

interface RadioCardOption {
  description?: React.ReactNode
  disabled?: boolean
  title: React.ReactNode
  value: string
}

interface ControlledRadioCardGroupProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends ControlledFieldBase<TFieldValues, TName> {
  className?: string
  options: readonly RadioCardOption[]
}

interface FormConditionalProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  children: React.ReactNode
  control: unknown
  name: TName
  render: (value: FieldPathValue<TFieldValues, TName>) => boolean
}

function ControlledTextInput<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  id,
  label,
  name,
  ...props
}: ControlledTextInputProps<TFieldValues, TName>) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <Controller
      control={getControl<TFieldValues>(control)}
      name={name}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message

        return (
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
            <Input
              {...props}
              aria-invalid={!!error}
              id={inputId}
              name={field.name}
              value={field.value == null ? '' : String(field.value)}
              onBlur={field.onBlur}
              onChange={(event) => field.onChange(event.currentTarget.value)}
            />
            <FieldError>{error}</FieldError>
          </Field>
        )
      }}
    />
  )
}

function ControlledMoneyInput<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  currency = 'USD',
  control,
  id,
  label,
  name,
  placeholder,
  ...props
}: ControlledMoneyInputProps<TFieldValues, TName>) {
  const currencySymbol = getCurrencySymbol(currency)
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <Controller
      control={getControl<TFieldValues>(control)}
      name={name}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message

        return (
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <InputGroupText>{currencySymbol}</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                {...props}
                aria-invalid={!!error}
                id={inputId}
                inputMode="decimal"
                name={field.name}
                placeholder={placeholder ?? `0.00 ${currency}`}
                type="text"
                value={field.value == null ? '' : String(field.value)}
                onBlur={() => {
                  field.onBlur()
                }}
                onChange={(event) => field.onChange(event.currentTarget.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>{currency}</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            <FieldError>{error}</FieldError>
          </Field>
        )
      }}
    />
  )
}

function ControlledSelectInput<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  children,
  control,
  name,
  ...props
}: ControlledSelectInputProps<TFieldValues, TName>) {
  return (
    <Controller
      control={getControl<TFieldValues>(control)}
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
>({
  control,
  name,
  ...props
}: ControlledTextareaInputProps<TFieldValues, TName>) {
  return (
    <Controller
      control={getControl<TFieldValues>(control)}
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
  control,
  label,
  name,
  ...props
}: ControlledCheckboxFieldProps<TFieldValues, TName>) {
  return (
    <Controller
      control={getControl<TFieldValues>(control)}
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
  control,
  label,
  name,
  options,
}: ControlledRadioCardGroupProps<TFieldValues, TName>) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Controller
        control={getControl<TFieldValues>(control)}
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

function FormConditional<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  children,
  control,
  name,
  render,
}: FormConditionalProps<TFieldValues, TName>) {
  const value = useWatch({
    control: getControl<TFieldValues>(control),
    name,
  }) as FieldPathValue<TFieldValues, TName>

  return render(value) ? <>{children}</> : null
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
  FormConditional,
}
