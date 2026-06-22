import { useId, useMemo } from 'react'
import { Controller, type FieldValues } from 'react-hook-form'
import { z } from 'zod'

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import type { FieldComponentBase } from '@/components/ui/react-hook-form-fields/_types'

const currencyAmountInputPattern = /^\d+(\.\d{1,2})?$/

interface MoneyInputFieldProps<TFieldValues extends FieldValues>
  extends
    Omit<
      React.InputHTMLAttributes<HTMLInputElement>,
      | 'defaultValue'
      | 'form'
      | 'id'
      | 'inputMode'
      | 'name'
      | 'onBlur'
      | 'onChange'
      | 'type'
      | 'value'
    >,
    FieldComponentBase<TFieldValues> {
  currency: string
  locale: string
}

function MoneyInputField<TFieldValues extends FieldValues>({
  currency,
  field,
  label,
  locale,
  placeholder,
  ...props
}: MoneyInputFieldProps<TFieldValues>) {
  const currencyAdornment = useMemo(() => {
    const parts = new Intl.NumberFormat(locale, {
      currency,
      style: 'currency',
    }).formatToParts(0)
    const currencyIndex = parts.findIndex((part) => part.type === 'currency')
    const numberIndex = parts.findIndex((part) =>
      ['integer', 'decimal', 'fraction'].includes(part.type),
    )

    return {
      align:
        currencyIndex > numberIndex && numberIndex !== -1
          ? ('inline-end' as const)
          : ('inline-start' as const),
      value: parts[currencyIndex]?.value ?? currency,
    }
  }, [currency, locale])
  const inputId = useId()

  return (
    <Controller
      control={field.control}
      name={field.name}
      render={({ field: controllerField, fieldState }) => {
        const error = fieldState.error?.message

        return (
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
            <InputGroup>
              {currencyAdornment.align === 'inline-start' ? (
                <InputGroupAddon>
                  <InputGroupText>{currencyAdornment.value}</InputGroupText>
                </InputGroupAddon>
              ) : null}
              <InputGroupInput
                {...props}
                aria-invalid={!!error}
                id={inputId}
                inputMode="decimal"
                name={controllerField.name}
                placeholder={placeholder ?? `0.00 ${currency}`}
                ref={controllerField.ref}
                type="number"
                step="1"
                value={
                  controllerField.value == null
                    ? ''
                    : String(controllerField.value)
                }
                onBlur={() => {
                  const formattedValue = formatCurrencyAmountInput(
                    controllerField.value,
                  )

                  if (formattedValue !== undefined) {
                    controllerField.onChange(formattedValue)
                  }

                  controllerField.onBlur()
                }}
                onChange={(event) =>
                  controllerField.onChange(event.currentTarget.value)
                }
              />
              {currencyAdornment.align === 'inline-end' ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupText>{currencyAdornment.value}</InputGroupText>
                </InputGroupAddon>
              ) : null}
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

export {
  createCurrencyAmountSchema,
  MoneyInputField,
  parseCurrencyAmountInput,
}
