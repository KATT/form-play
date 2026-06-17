import { type ComponentProps, useId } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckIcon } from 'lucide-react'
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

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

type SubmitButtonState = 'error' | 'idle' | 'submitting' | 'success'

type UseResolverForm<
  TInput extends FieldValues,
  TOutput,
> = UseFormReturn<TInput, unknown, TOutput> & {
  /**
   * A unique ID for this form.
   */
  id: string
}

interface UseResolverFormProps<
  TInput extends FieldValues,
  TOutput,
> extends Omit<
    UseFormProps<TInput, unknown, TOutput>,
    'defaultValues' | 'resolver'
  > {
  defaultValues: NoInfer<DefaultValues<TInput>>
  resolver: Resolver<TInput, unknown, TOutput>
}

function useResolverForm<TInput extends FieldValues, TOutput>(
  props: UseResolverFormProps<TInput, TOutput>,
) {
  const form = useForm<TInput, unknown, TOutput>(props) as UseResolverForm<
    TInput,
    TOutput
  >

  form.id = useId()

  return form
}

type AnyResolverForm = UseResolverForm<FieldValues, unknown>

interface ResolverFormProps<
  TInput extends FieldValues,
  TOutput,
> extends Omit<ComponentProps<'form'>, 'id' | 'onSubmit'> {
  form: UseResolverForm<TInput, TOutput>
  handleSubmit: SubmitHandler<TOutput>
  onError?: ((error: unknown) => void | Promise<void>) | undefined
  onInputValidationError?: SubmitErrorHandler<TInput> | undefined
}

function ResolverForm<TInput extends FieldValues, TOutput>(
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
          form.clearErrors('root.server')
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
  props: Omit<ComponentProps<typeof Button>, 'form' | 'type'> & {
    /**
     * Optionally specify a form to submit instead of the closest form context.
     */
    form?: AnyResolverForm | undefined
  },
) {
  const {
    children,
    className,
    disabled,
    form: explicitForm,
    ...passThrough
  } = props
  const context = useFormContext()

  const form = explicitForm ?? context
  const formState = form?.formState
  const isSubmitting = formState?.isSubmitting ?? false
  const submitCount = formState?.submitCount ?? 0
  const isSubmitSuccessful = formState?.isSubmitSuccessful ?? false
  const errorCount = formState ? Object.keys(formState.errors).length : 0
  const submitButtonState = (
    isSubmitting
      ? 'submitting'
      : submitCount > 0 && errorCount > 0
        ? 'error'
        : submitCount > 0 && isSubmitSuccessful
          ? 'success'
          : 'idle'
  ) satisfies SubmitButtonState

  if (!form) {
    throw new Error(
      'SubmitButton must be used within a ResolverForm or have a form prop',
    )
  }

  return (
    <motion.span
      key={`submit-${submitButtonState}-${submitCount}`}
      animate={
        submitButtonState === 'error'
          ? { x: [0, -6, 6, -4, 4, 0] }
          : { x: 0 }
      }
      className={cn('inline-flex', className)}
      transition={{ duration: 0.35 }}
    >
      <Button
        {...passThrough}
        aria-busy={isSubmitting}
        className={className}
        form={explicitForm?.id}
        type="submit"
        disabled={disabled || isSubmitting}
      >
        <span
          aria-hidden="true"
          data-icon="inline-start"
          className="inline-grid size-4 shrink-0 place-items-center"
        >
          <AnimatePresence initial={false} mode="wait">
            {submitButtonState === 'submitting' ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0, scale: 0.8, y: -2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 2 }}
                transition={{ duration: 0.15 }}
              >
                <Spinner aria-hidden="true" role="presentation" />
              </motion.span>
            ) : submitButtonState === 'success' ? (
              <motion.span
                key="success"
                initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6, rotate: 20 }}
                transition={{
                  type: 'spring',
                  duration: 0.35,
                  bounce: 0.35,
                }}
              >
                <CheckIcon aria-hidden="true" className="text-emerald-500" />
              </motion.span>
            ) : null}
          </AnimatePresence>
        </span>
        {children}
      </Button>
    </motion.span>
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
