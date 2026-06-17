import { useId } from 'react'
import {
  Controller,
  type Control,
  type FieldErrors,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'

import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
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
                <FieldLabel
                  className={cn(
                    'min-h-32 cursor-pointer items-start rounded-xl border p-4 transition-colors hover:bg-accent/50 has-data-checked:border-primary has-data-checked:bg-primary/5 has-data-checked:ring-1 has-data-checked:ring-ring',
                    option.disabled && 'cursor-not-allowed opacity-50',
                  )}
                  htmlFor={optionId}
                  key={option.value}
                >
                  <RadioGroupItem
                    disabled={option.disabled}
                    id={optionId}
                    value={option.value}
                  />
                  <span className="flex flex-col gap-1">
                    <span className="text-base font-semibold">
                      {option.title}
                    </span>
                    {option.description ? (
                      <span className="text-sm text-muted-foreground">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
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

export {
  CheckboxField,
  ControlledCheckboxField,
  ControlledRadioCardGroup,
  ControlledSelectInput,
  ControlledTextInput,
  ControlledTextareaInput,
}
