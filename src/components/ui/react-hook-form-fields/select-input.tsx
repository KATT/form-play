import { useId } from 'react'
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { NativeSelect } from '@/components/ui/native-select'
import type { ControlledFieldBase } from '@/components/ui/react-hook-form-fields/_types'

interface ControlledSelectInputProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues extends FieldValues | undefined = FieldValues,
>
  extends
    Omit<
      React.SelectHTMLAttributes<HTMLSelectElement>,
      | 'defaultValue'
      | 'form'
      | 'id'
      | 'name'
      | 'onBlur'
      | 'onChange'
      | 'size'
      | 'value'
    >,
    ControlledFieldBase<TFieldValues, TName, TTransformedValues> {
  children: React.ReactNode
}

function ControlledSelectInput<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues extends FieldValues | undefined = FieldValues,
>({
  children,
  control,
  label,
  name,
  ...props
}: ControlledSelectInputProps<TFieldValues, TName, TTransformedValues>) {
  const selectId = useId()

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message

        return (
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor={selectId}>{label}</FieldLabel>
            <NativeSelect
              {...props}
              aria-invalid={!!error}
              className="w-full"
              id={selectId}
              name={field.name}
              ref={field.ref}
              value={field.value == null ? '' : String(field.value)}
              onBlur={field.onBlur}
              onChange={(event) => field.onChange(event.currentTarget.value)}
            >
              {children}
            </NativeSelect>
            <FieldError>{error}</FieldError>
          </Field>
        )
      }}
    />
  )
}

export { ControlledSelectInput }
