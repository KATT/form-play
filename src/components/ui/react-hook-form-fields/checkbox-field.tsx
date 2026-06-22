import { Controller, type FieldValues } from 'react-hook-form'

import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import type { FieldComponentBase } from '@/components/ui/react-hook-form-fields/_types'

interface CheckboxFieldProps<TFieldValues extends FieldValues>
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
    FieldComponentBase<TFieldValues> {}

function CheckboxField<TFieldValues extends FieldValues>({
  field,
  label,
  ...props
}: CheckboxFieldProps<TFieldValues>) {
  return (
    <Controller
      control={field.control}
      name={field.name}
      render={({ field: controllerField, fieldState }) => {
        const error = fieldState.error?.message

        return (
          <Field data-invalid={!!error} orientation="horizontal">
            <FieldLabel className="items-center">
              <Checkbox
                {...props}
                aria-invalid={!!error}
                checked={!!controllerField.value}
                ref={controllerField.ref}
                onCheckedChange={controllerField.onChange}
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
