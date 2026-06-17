import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import type { ControlledFieldBase } from '@/components/ui/react-hook-form-fields/_types'

interface CheckboxGroupOption<TValue extends string> {
  label: React.ReactNode
  value: TValue
}

interface ControlledCheckboxGroupProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TValue extends string,
  TTransformedValues extends FieldValues | undefined = FieldValues,
> extends ControlledFieldBase<TFieldValues, TName, TTransformedValues> {
  className?: string
  description?: React.ReactNode
  options: readonly CheckboxGroupOption<TValue>[]
  optionsClassName?: string
}

function ControlledCheckboxGroup<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TValue extends string,
  TTransformedValues extends FieldValues | undefined = FieldValues,
>({
  className,
  control,
  description,
  label,
  name,
  options,
  optionsClassName,
}: ControlledCheckboxGroupProps<
  TFieldValues,
  TName,
  TValue,
  TTransformedValues
>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const selectedValues = Array.isArray(field.value)
          ? (field.value as TValue[])
          : []
        const error = fieldState.error?.message

        return (
          <Field data-invalid={!!error} className={className}>
            <FieldLabel>{label}</FieldLabel>
            <FieldGroup className={optionsClassName}>
              {options.map((option) => (
                <Field orientation="horizontal" key={option.value}>
                  <FieldLabel className="items-center">
                    <Checkbox
                      checked={selectedValues.includes(option.value)}
                      ref={field.ref}
                      onCheckedChange={(checked) => {
                        field.onChange(
                          checked
                            ? [...selectedValues, option.value]
                            : selectedValues.filter(
                                (selectedValue) =>
                                  selectedValue !== option.value,
                              ),
                        )
                      }}
                    />
                    {option.label}
                  </FieldLabel>
                </Field>
              ))}
            </FieldGroup>
            {description ? (
              <FieldDescription>{description}</FieldDescription>
            ) : null}
            <FieldError>{error}</FieldError>
          </Field>
        )
      }}
    />
  )
}

export { ControlledCheckboxGroup }
