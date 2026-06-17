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
import { ConditionalTooltip } from '@/components/ui/conditional-tooltip'
import { cn } from '@/lib/utils'

interface RadioCardOption {
  description?: React.ReactNode
  disabled?: boolean
  disabledReason?: React.ReactNode
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
          const selectedValue = field.value == null ? '' : String(field.value)
          const focusValue =
            selectedValue ||
            options.find((option) => !option.disabled)?.value ||
            options[0]?.value

          return (
            <>
              <RadioGroup
                aria-invalid={!!error}
                className={cn('grid gap-4 md:grid-cols-2', className)}
                value={selectedValue}
                onValueChange={(value) => field.onChange(value)}
              >
                {options.map((option) => {
                  const optionId = `${String(name)}-${option.value}`

                  return (
                    <ConditionalTooltip
                      disabledReason={option.disabledReason}
                      key={option.value}
                    >
                      <FieldLabel
                        htmlFor={optionId}
                        aria-disabled={option.disabled || undefined}
                        className={cn(
                          'cursor-pointer',
                          option.disabled && 'cursor-not-allowed opacity-60',
                        )}
                      >
                        <Field
                          data-disabled={option.disabled || undefined}
                          orientation="horizontal"
                          className={cn(
                            'min-h-32 rounded-xl transition-colors hover:bg-accent/50 has-data-checked:ring-1 has-data-checked:ring-ring',
                            option.disabled && 'hover:bg-transparent',
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
                            ref={
                              option.value === focusValue
                                ? field.ref
                                : undefined
                            }
                            value={option.value}
                          />
                        </Field>
                      </FieldLabel>
                    </ConditionalTooltip>
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
