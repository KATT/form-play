import { useId } from 'react'
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import type { FieldComponentBase } from '@/components/ui/react-hook-form-fields/_types'
import { Textarea } from '@/components/ui/textarea'

interface TextareaFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>
  extends
    Omit<
      React.TextareaHTMLAttributes<HTMLTextAreaElement>,
      'defaultValue' | 'form' | 'id' | 'name' | 'onBlur' | 'onChange' | 'value'
    >,
    FieldComponentBase<TFieldValues, TName> {
  className?: string
}

function TextareaField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  className,
  field: controlledField,
  label,
  ...props
}: TextareaFieldProps<TFieldValues, TName>) {
  const textareaId = useId()

  return (
    <Controller
      control={controlledField.control}
      name={controlledField.name}
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

export { TextareaField }
