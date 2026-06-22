import { createContext, useContext } from 'react'
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

interface CheckboxGroupContextValue {
  error: boolean
  fieldRef: (instance: HTMLElement | null) => void
  selectedValues: string[]
  setSelectedValues: (values: string[]) => void
}

const CheckboxGroupContext = createContext<
  CheckboxGroupContextValue | undefined
>(undefined)

interface ControlledCheckboxGroupProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends ControlledFieldBase<TFieldValues, TName> {
  children: React.ReactNode
  className: string | undefined
  description: React.ReactNode | undefined
  optionsClassName: string | undefined
}

function ControlledCheckboxGroup<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  children,
  className,
  description,
  field: controlledField,
  label,
  optionsClassName,
}: ControlledCheckboxGroupProps<TFieldValues, TName>) {
  return (
    <Controller
      control={controlledField.control}
      name={controlledField.name}
      render={({ field, fieldState }) => {
        const selectedValues = Array.isArray(field.value)
          ? (field.value as string[])
          : []
        const error = fieldState.error?.message

        return (
          <Field data-invalid={!!error} className={className}>
            <FieldLabel>{label}</FieldLabel>
            <CheckboxGroupContext
              value={{
                error: !!error,
                fieldRef: field.ref,
                selectedValues,
                setSelectedValues: field.onChange,
              }}
            >
              <FieldGroup className={optionsClassName}>{children}</FieldGroup>
            </CheckboxGroupContext>
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

interface ControlledCheckboxGroupItemProps {
  children: React.ReactNode
  value: string
}

function ControlledCheckboxGroupItem({
  children,
  value,
}: ControlledCheckboxGroupItemProps) {
  const { error, fieldRef, selectedValues, setSelectedValues } =
    useCheckboxGroupContext()

  return (
    <Field orientation="horizontal">
      <FieldLabel className="items-center">
        <Checkbox
          aria-invalid={error}
          checked={selectedValues.includes(value)}
          ref={fieldRef}
          onCheckedChange={(checked) => {
            setSelectedValues(
              checked
                ? [...selectedValues, value]
                : selectedValues.filter(
                    (selectedValue) => selectedValue !== value,
                  ),
            )
          }}
        />
        {children}
      </FieldLabel>
    </Field>
  )
}

function useCheckboxGroupContext() {
  const context = useContext(CheckboxGroupContext)

  if (!context) {
    throw new Error(
      'ControlledCheckboxGroupItem must be used inside ControlledCheckboxGroup.',
    )
  }

  return context
}

export { ControlledCheckboxGroup, ControlledCheckboxGroupItem }
