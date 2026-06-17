import { type ComponentProps, useId } from 'react'
import {
  type DefaultValues,
  type FieldValues,
  FormProvider,
  type Resolver,
  type SubmitErrorHandler,
  type SubmitHandler,
  useForm,
  useFormContext,
  type UseFormProps,
  type UseFormReturn,
} from 'react-hook-form'

type UseResolverForm<
  TInput extends FieldValues,
  TOutput extends FieldValues,
> = UseFormReturn<TInput, unknown, TOutput> & {
  /**
   * A unique ID for this form.
   */
  id: string
}

interface UseResolverFormProps<
  TInput extends FieldValues,
  TOutput extends FieldValues,
> extends Omit<
    UseFormProps<TInput, unknown, TOutput>,
    'defaultValues' | 'resolver'
  > {
  defaultValues: NoInfer<DefaultValues<TInput>>
  resolver: Resolver<TInput, unknown, TOutput>
}

function useResolverForm<TInput extends FieldValues, TOutput extends FieldValues>(
  props: UseResolverFormProps<TInput, TOutput>,
) {
  const form = useForm<TInput, unknown, TOutput>(props) as UseResolverForm<
    TInput,
    TOutput
  >

  form.id = useId()

  return form
}

type AnyResolverForm = UseResolverForm<FieldValues, FieldValues>

interface ResolverFormProps<
  TInput extends FieldValues,
  TOutput extends FieldValues,
> extends Omit<ComponentProps<'form'>, 'id' | 'onSubmit'> {
  form: UseResolverForm<TInput, TOutput>
  handleSubmit: SubmitHandler<TOutput>
  onError?: ((error: unknown) => void | Promise<void>) | undefined
  onInputValidationError?: SubmitErrorHandler<TInput> | undefined
}

function ResolverForm<TInput extends FieldValues, TOutput extends FieldValues>(
  props: ResolverFormProps<TInput, TOutput>,
) {
  const {
    form,
    handleSubmit,
    onError,
    onInputValidationError,
    ...passThrough
  } = props

  return (
    <FormProvider {...form}>
      <form
        {...passThrough}
        id={form.id}
        onSubmit={(event) => {
          void form.handleSubmit(async (values) => {
            try {
              await handleSubmit(values)
            } catch (error) {
              await onError?.(error)
              form.setError('root.server', {
                message:
                  error instanceof Error ? error.message : 'Unknown error',
                type: 'server',
              })
            }
          }, onInputValidationError)(event)
        }}
      />
    </FormProvider>
  )
}

function SubmitButton(
  props: Omit<ComponentProps<'button'>, 'form' | 'type'> & {
    /**
     * Optionally specify a form to submit instead of the closest form context.
     */
    form?: AnyResolverForm | undefined
  },
) {
  const context = useFormContext()

  const form = props.form ?? context
  if (!form) {
    throw new Error(
      'SubmitButton must be used within a ResolverForm or have a form prop',
    )
  }
  const { formState } = form

  return (
    <button
      {...props}
      form={props.form?.id}
      type="submit"
      disabled={formState.isSubmitting}
    >
      {formState.isSubmitting ? 'Loading' : props.children}
    </button>
  )
}

export {
  ResolverForm,
  SubmitButton,
  useResolverForm,
  type ResolverFormProps,
  type UseResolverForm,
  type UseResolverFormProps,
}
