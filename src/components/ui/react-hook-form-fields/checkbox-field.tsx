import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import type { ControlledFieldBase } from '@/components/ui/react-hook-form-fields/_types'

interface ControlledCheckboxFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues extends FieldValues | undefined = FieldValues,
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
    ControlledFieldBase<TFieldValues, TName, TTransformedValues> {}

function ControlledCheckboxField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues extends FieldValues | undefined = FieldValues,
>({
  control,
  label,
  name,
  ...props
}: ControlledCheckboxFieldProps<TFieldValues, TName, TTransformedValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message

        return (
          <Field data-invalid={!!error} orientation="horizontal">
            <FieldLabel className="items-center">
              <Checkbox
                {...props}
                aria-invalid={!!error}
                checked={!!field.value}
                ref={field.ref}
                onCheckedChange={field.onChange}
              />
              {label}
            </FieldLabel>
            <FieldError>{error}</FieldError>
          </Field>
        )
      }}
    />
  )
}

export { ControlledCheckboxField }
