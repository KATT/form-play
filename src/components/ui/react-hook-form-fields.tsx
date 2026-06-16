import { useId } from 'react'
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'

type FormWithControl<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>
}

type ControlledFieldBase<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  error?: string
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

function ControlledTextInput<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ form, name, ...props }: ControlledTextInputProps<TFieldValues, TName>) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <TextInput
          {...props}
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
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <SelectInput
          {...props}
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
      control={form.control}
      name={name}
      render={({ field }) => (
        <TextareaInput
          {...props}
          name={field.name}
          value={field.value == null ? '' : String(field.value)}
          onBlur={field.onBlur}
          onChange={(event) => field.onChange(event.currentTarget.value)}
        />
      )}
    />
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

export { ControlledSelectInput, ControlledTextInput, ControlledTextareaInput }
