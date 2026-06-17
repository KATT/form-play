import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { ControlledFieldBase } from '@/components/ui/react-hook-form-fields/_types'
import { cn } from '@/lib/utils'

interface RadioCardOption {
  description?: React.ReactNode
  disabled?: boolean
  title: React.ReactNode
  value: string
}

interface ControlledRadioCardGroupProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues extends FieldValues | undefined = FieldValues,
> extends ControlledFieldBase<TFieldValues, TName, TTransformedValues> {
  className?: string
  options: readonly RadioCardOption[]
}

function ControlledRadioCardGroup<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues extends FieldValues | undefined = FieldValues,
>({
  className,
  control,
  label,
  name,
  options,
}: ControlledRadioCardGroupProps<TFieldValues, TName, TTransformedValues>) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => {
          const error = fieldState.error?.message

          return (
            <>
              <RadioGroup
                aria-invalid={!!error}
                className={cn('grid gap-4 md:grid-cols-2', className)}
                value={field.value == null ? '' : String(field.value)}
                onValueChange={(value) => field.onChange(value)}
              >
                {options.map((option) => {
                  const optionId = `${String(name)}-${option.value}`

                  return (
                    <FieldLabel htmlFor={optionId} key={option.value}>
                      <Field
                        data-disabled={option.disabled || undefined}
                        orientation="horizontal"
                        className={cn(
                          'min-h-32 cursor-pointer rounded-xl transition-colors hover:bg-accent/50 has-data-checked:ring-1 has-data-checked:ring-ring',
                          option.disabled && 'cursor-not-allowed opacity-50',
                        )}
                      >
                        <FieldContent>
                          <FieldTitle>{option.title}</FieldTitle>
                          {option.description ? (
                            <FieldDescription>
                              {option.description}
                            </FieldDescription>
                          ) : null}
                        </FieldContent>
                        <RadioGroupItem
                          aria-invalid={!!error}
                          disabled={option.disabled}
                          id={optionId}
                          value={option.value}
                        />
                      </Field>
                    </FieldLabel>
                  )
                })}
              </RadioGroup>
              <FieldError>{error}</FieldError>
            </>
          )
        }}
      />
    </Field>
  )
}

export { ControlledRadioCardGroup }
