import type { Control, FieldPath, FieldValues } from 'react-hook-form'

interface FormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>
  name: TName
}

interface FieldComponentBase<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  field: FormField<TFieldValues, TName>
  label: string
}

export type { FieldComponentBase, FormField }
