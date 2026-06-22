import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import type { FieldComponentBase } from '@/components/ui/react-hook-form-fields/_types'

interface CheckboxFieldProps<
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
    FieldComponentBase<TFieldValues, TName> {}

function CheckboxField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  field: controlledField,
  label,
  ...props
}: CheckboxFieldProps<TFieldValues, TName>) {
  return (
    <Controller
      control={controlledField.control}
      name={controlledField.name}
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

export { CheckboxField }
