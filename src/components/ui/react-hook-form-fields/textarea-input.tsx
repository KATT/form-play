import { useId } from 'react'
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import type { ControlledFieldBase } from '@/components/ui/react-hook-form-fields/_types'
import { Textarea } from '@/components/ui/textarea'

interface ControlledTextareaInputProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues extends FieldValues | undefined = FieldValues,
>
  extends
    Omit<
      React.TextareaHTMLAttributes<HTMLTextAreaElement>,
      'defaultValue' | 'form' | 'name' | 'onBlur' | 'onChange' | 'value'
    >,
    ControlledFieldBase<TFieldValues, TName, TTransformedValues> {
  className?: string
}

function ControlledTextareaInput<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues extends FieldValues | undefined = FieldValues,
>({
  className,
  control,
  id,
  label,
  name,
  ...props
}: ControlledTextareaInputProps<TFieldValues, TName, TTransformedValues>) {
  const generatedId = useId()
  const textareaId = id ?? generatedId

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message

        return (
          <Field className={className} data-invalid={!!error}>
            <FieldLabel htmlFor={textareaId}>{label}</FieldLabel>
            <Textarea
              {...props}
              aria-invalid={!!error}
              id={textareaId}
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

export { ControlledTextareaInput }
