import {
  type Control,
  type FieldPath,
  type FieldPathValue,
  type FieldValues,
  useWatch,
} from 'react-hook-form'

interface FormConditionalProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues extends FieldValues | undefined = FieldValues,
> {
  children: React.ReactNode
  control: Control<TFieldValues, unknown, TTransformedValues>
  name: TName
  render: (value: FieldPathValue<TFieldValues, TName>) => boolean
}

function FormConditional<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues extends FieldValues | undefined = FieldValues,
>({
  children,
  control,
  name,
  render,
}: FormConditionalProps<TFieldValues, TName, TTransformedValues>) {
  const value = useWatch({
    control,
    name,
  }) as FieldPathValue<TFieldValues, TName>

  return render(value) ? <>{children}</> : null
}

export { FormConditional }
