import type { Control, FieldPath, FieldValues } from 'react-hook-form'

interface ControlledFieldBase<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues extends FieldValues | undefined = FieldValues,
> {
  control: Control<TFieldValues, unknown, TTransformedValues>
  label: string
  name: TName
}

export type { ControlledFieldBase }
