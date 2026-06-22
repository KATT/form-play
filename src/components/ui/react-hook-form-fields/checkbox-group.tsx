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
import type { FieldComponentBase } from '@/components/ui/react-hook-form-fields/_types'

interface CheckboxGroupContextValue {
  error: boolean
  fieldRef: (instance: HTMLElement | null) => void
  selectedValues: string[]
  setSelectedValues: (values: string[]) => void
}

const CheckboxGroupContext = createContext<
  CheckboxGroupContextValue | undefined
>(undefined)

interface CheckboxGroupFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends FieldComponentBase<TFieldValues, TName> {
  children: React.ReactNode
  className: string | undefined
  description: React.ReactNode | undefined
  optionsClassName: string | undefined
}

function CheckboxGroupField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  children,
  className,
  description,
  field,
  label,
  optionsClassName,
}: CheckboxGroupFieldProps<TFieldValues, TName>) {
  return (
    <Controller
      control={field.control}
      name={field.name}
      render={({ field: controllerField, fieldState }) => {
        const selectedValues = Array.isArray(controllerField.value)
          ? (controllerField.value as string[])
          : []
        const error = fieldState.error?.message

        return (
          <Field data-invalid={!!error} className={className}>
            <FieldLabel>{label}</FieldLabel>
            <CheckboxGroupContext
              value={{
                error: !!error,
                fieldRef: controllerField.ref,
                selectedValues,
                setSelectedValues: controllerField.onChange,
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

interface CheckboxGroupFieldItemProps {
  children: React.ReactNode
  value: string
}

function CheckboxGroupFieldItem({
  children,
  value,
}: CheckboxGroupFieldItemProps) {
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
      'CheckboxGroupFieldItem must be used inside CheckboxGroupField.',
    )
  }

  return context
}

export { CheckboxGroupField, CheckboxGroupFieldItem }
