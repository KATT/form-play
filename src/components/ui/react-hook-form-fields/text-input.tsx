import { useId } from 'react'
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { FieldComponentBase } from '@/components/ui/react-hook-form-fields/_types'

interface TextInputFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>
  extends
    Omit<
      React.InputHTMLAttributes<HTMLInputElement>,
      'defaultValue' | 'form' | 'id' | 'name' | 'onBlur' | 'onChange' | 'value'
    >,
    FieldComponentBase<TFieldValues, TName> {}

function TextInputField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  field: controlledField,
  label,
  ...props
}: TextInputFieldProps<TFieldValues, TName>) {
  const inputId = useId()

  return (
    <Controller
      control={controlledField.control}
      name={controlledField.name}
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
              ref={field.ref}
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

export { TextInputField }
