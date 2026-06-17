import { useId } from 'react'
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { ControlledFieldBase } from '@/components/ui/react-hook-form-fields/_types'

interface ControlledTextInputProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues extends FieldValues | undefined = FieldValues,
>
  extends
    Omit<
      React.InputHTMLAttributes<HTMLInputElement>,
      'defaultValue' | 'form' | 'name' | 'onBlur' | 'onChange' | 'value'
    >,
    ControlledFieldBase<TFieldValues, TName, TTransformedValues> {}

function ControlledTextInput<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues extends FieldValues | undefined = FieldValues,
>({
  control,
  id,
  label,
  name,
  ...props
}: ControlledTextInputProps<TFieldValues, TName, TTransformedValues>) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <Controller
      control={control}
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

export { ControlledTextInput }
