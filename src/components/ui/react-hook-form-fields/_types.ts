import type { Control, FieldPath, FieldValues } from 'react-hook-form'

interface FormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>
  name: TName
}

type AnyFormField<TFieldValues extends FieldValues> = FormField<
  TFieldValues,
  FieldPath<TFieldValues>
>

interface FieldComponentBase<TFieldValues extends FieldValues> {
  field: AnyFormField<TFieldValues>
  label: string
}

export type { AnyFormField, FieldComponentBase, FormField }
