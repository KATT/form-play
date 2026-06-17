import { createContext, useContext, useId } from 'react'
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import {
  Field,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { ControlledFieldBase } from '@/components/ui/react-hook-form-fields/_types'
import { ConditionalTooltip } from '@/components/ui/conditional-tooltip'
import { cn } from '@/lib/utils'

interface RadioCardGroupContextValue {
  error: boolean
  fieldRef: (instance: HTMLElement | null) => void
  selectedValue: string
}

const RadioCardGroupContext = createContext<
  RadioCardGroupContextValue | undefined
>(undefined)

interface ControlledRadioCardGroupProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues extends FieldValues | undefined = FieldValues,
> extends ControlledFieldBase<TFieldValues, TName, TTransformedValues> {
  children: React.ReactNode
  className?: string
}

function ControlledRadioCardGroup<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues extends FieldValues | undefined = FieldValues,
>({
  children,
  className,
  control,
  label,
  name,
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

          return (
            <>
              <RadioCardGroupContext
                value={{
                  error: !!error,
                  fieldRef: field.ref,
                  selectedValue,
                }}
              >
                <RadioGroup
                  aria-invalid={!!error}
                  className={cn('grid gap-4 md:grid-cols-2', className)}
                  value={selectedValue}
                  onValueChange={(value) => field.onChange(value)}
                >
                  {children}
                </RadioGroup>
              </RadioCardGroupContext>
              <FieldError>{error}</FieldError>
            </>
          )
        }}
      />
    </Field>
  )
}

interface ControlledRadioCardGroupItemProps {
  children: React.ReactNode
  className?: string
  disabled?: boolean
  disabledReason: React.ReactNode | undefined
  value: string
}

function ControlledRadioCardGroupItem({
  children,
  className,
  disabled,
  disabledReason,
  value,
}: ControlledRadioCardGroupItemProps) {
  const { error, fieldRef, selectedValue } = useRadioCardGroupContext()
  const optionId = useId()

  return (
    <ConditionalTooltip disabledReason={disabledReason}>
      <FieldLabel
        htmlFor={optionId}
        aria-disabled={disabled || undefined}
        className={cn(
          'cursor-pointer',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <Field
          data-disabled={disabled || undefined}
          orientation="horizontal"
          className={cn(
            'min-h-32 rounded-xl transition-colors hover:bg-accent/50 has-data-checked:ring-1 has-data-checked:ring-ring',
            disabled && 'hover:bg-transparent',
            className,
          )}
        >
          {children}
          <RadioGroupItem
            aria-invalid={error}
            disabled={disabled}
            id={optionId}
            ref={
              selectedValue === value || (!selectedValue && !disabled)
                ? fieldRef
                : undefined
            }
            value={value}
          />
        </Field>
      </FieldLabel>
    </ConditionalTooltip>
  )
}

function useRadioCardGroupContext() {
  const context = useContext(RadioCardGroupContext)

  if (!context) {
    throw new Error(
      'ControlledRadioCardGroupItem must be used inside ControlledRadioCardGroup.',
    )
  }

  return context
}

export { ControlledRadioCardGroup, ControlledRadioCardGroupItem }
