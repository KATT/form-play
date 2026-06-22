import { useId } from 'react'
import { Controller, type FieldValues } from 'react-hook-form'

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { NativeSelect } from '@/components/ui/native-select'
import type { FieldComponentBase } from '@/components/ui/react-hook-form-fields/_types'

interface SelectFieldProps<TFieldValues extends FieldValues>
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
    FieldComponentBase<TFieldValues> {
  children: React.ReactNode
}

function SelectField<TFieldValues extends FieldValues>({
  children,
  field,
  label,
  ...props
}: SelectFieldProps<TFieldValues>) {
  const selectId = useId()

  return (
    <Controller
      control={field.control}
      name={field.name}
      render={({ field: controllerField, fieldState }) => {
        const error = fieldState.error?.message

        return (
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor={selectId}>{label}</FieldLabel>
            <NativeSelect
              {...props}
              aria-invalid={!!error}
              className="w-full"
              id={selectId}
              name={controllerField.name}
              ref={controllerField.ref}
              value={
                controllerField.value == null
                  ? ''
                  : String(controllerField.value)
              }
              onBlur={controllerField.onBlur}
              onChange={(event) =>
                controllerField.onChange(event.currentTarget.value)
              }
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

export { SelectField }
