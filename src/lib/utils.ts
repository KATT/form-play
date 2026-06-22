import { clsx, type ClassValue } from 'clsx'
import type { DefaultValues, FieldValues } from 'react-hook-form'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type KeysOfUnion<TValue> = TValue extends unknown ? keyof TValue : never

type ValueOfUnion<TValue, TKey extends PropertyKey> = TValue extends unknown
  ? TKey extends keyof TValue
    ? TValue[TKey]
    : never
  : never

type DefaultValuesForDiscriminatedUnion<TFieldValues extends FieldValues> =
  DefaultValues<TFieldValues> &
    Partial<{
      [TKey in Exclude<
        KeysOfUnion<TFieldValues>,
        keyof TFieldValues
      >]: ValueOfUnion<TFieldValues, TKey>
    }>

export type { DefaultValuesForDiscriminatedUnion }
