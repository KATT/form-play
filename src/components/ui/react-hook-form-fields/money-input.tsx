import { useId } from 'react'
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'
import { z } from 'zod'

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import type { ControlledFieldBase } from '@/components/ui/react-hook-form-fields/_types'

const currencyAmountInputPattern = /^\d+(\.\d{1,2})?$/

interface ControlledMoneyInputProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues extends FieldValues | undefined = FieldValues,
>
  extends
    Omit<
      React.InputHTMLAttributes<HTMLInputElement>,
      | 'defaultValue'
      | 'form'
      | 'inputMode'
      | 'name'
      | 'onBlur'
      | 'onChange'
      | 'type'
      | 'value'
    >,
    ControlledFieldBase<TFieldValues, TName, TTransformedValues> {
  currency: string
}

function ControlledMoneyInput<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues extends FieldValues | undefined = FieldValues,
>({
  currency,
  control,
  id,
  label,
  name,
  placeholder,
  ...props
}: ControlledMoneyInputProps<TFieldValues, TName, TTransformedValues>) {
  const currencySymbol = getCurrencySymbol(currency)
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message

        return (
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <InputGroupText>{currencySymbol}</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                {...props}
                aria-invalid={!!error}
                id={inputId}
                inputMode="decimal"
                name={field.name}
                placeholder={placeholder ?? `0.00 ${currency}`}
                type="text"
                value={field.value == null ? '' : String(field.value)}
                onBlur={() => {
                  const formattedValue = formatCurrencyAmountInput(field.value)

                  if (formattedValue !== undefined) {
                    field.onChange(formattedValue)
                  }

                  field.onBlur()
                }}
                onChange={(event) => field.onChange(event.currentTarget.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>{currency}</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            <FieldError>{error}</FieldError>
          </Field>
        )
      }}
    />
  )
}

function createCurrencyAmountSchema(
  requiredMessage: string,
  centsSchema: z.ZodType<number, number>,
) {
  return z.codec(
    z
      .string()
      .min(1, requiredMessage)
      .regex(currencyAmountInputPattern, 'Use a valid money amount'),
    centsSchema,
    {
      decode: parseCurrencyAmountString,
      encode: formatCurrencyAmountCents,
    },
  )
}

function parseCurrencyAmountInput(
  schema: ReturnType<typeof createCurrencyAmountSchema>,
  value: unknown,
) {
  const parsed = schema.safeParse(value)

  return parsed.success ? parsed.data : 0
}

function parseCurrencyAmountString(value: string) {
  const [major = '0', minor = ''] = String(value ?? '').split('.')
  const normalizedMajor = major === '' ? '0' : major
  const normalizedMinor = minor.padEnd(2, '0').slice(0, 2)

  return Number(normalizedMajor) * 100 + Number(normalizedMinor)
}

function formatCurrencyAmountInput(value: unknown) {
  const input = String(value ?? '')

  if (!currencyAmountInputPattern.test(input)) {
    return undefined
  }

  return formatCurrencyAmountCents(parseCurrencyAmountString(input))
}

function formatCurrencyAmountCents(value: number) {
  return (value / 100).toFixed(2)
}

function getCurrencySymbol(currency: string) {
  const parts = new Intl.NumberFormat('en-US', {
    currency,
    style: 'currency',
  }).formatToParts(0)

  return parts.find((part) => part.type === 'currency')?.value ?? currency
}

export {
  ControlledMoneyInput,
  createCurrencyAmountSchema,
  parseCurrencyAmountInput,
}
