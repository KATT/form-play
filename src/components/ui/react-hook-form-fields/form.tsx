import { type ComponentProps, useId } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckIcon, type LucideIcon } from 'lucide-react'
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
  props: Omit<ComponentProps<typeof Button>, 'form' | 'render' | 'type'> & {
    /**
     * Optionally specify a form to submit instead of the closest form context.
     */
    form?: AnyResolverForm | undefined
    /**
     * The default icon shown before the label when the button is idle.
     */
    icon: LucideIcon
  },
) {
  const {
    children,
    className,
    disabled,
    form: explicitForm,
    icon,
    ...passThrough
  } = props
  const Icon = icon
  const context = useFormContext()

  const form = explicitForm ?? context
  const formState = form?.formState
  const isSubmitting = formState?.isSubmitting ?? false
  const submitCount = formState?.submitCount ?? 0
  const isSubmitSuccessful = formState?.isSubmitSuccessful ?? false
  const errorCount = formState ? Object.keys(formState.errors).length : 0
  const submitButtonState = ((): SubmitButtonState => {
    if (isSubmitting) {
      return 'submitting'
    }

    if (submitCount > 0 && errorCount > 0) {
      return 'error'
    }

    if (submitCount > 0 && isSubmitSuccessful) {
      return 'success'
    }

    return 'idle'
  })()

  if (!form) {
    throw new Error(
      'SubmitButton must be used within a ResolverForm or have a form prop',
    )
  }

  return (
    <Button
      {...passThrough}
      aria-busy={isSubmitting}
      className={className}
      form={explicitForm?.id}
      key={`submit-${submitButtonState}-${submitCount}`}
      render={
        <motion.button
          animate={
            submitButtonState === 'error'
              ? {
                  rotate: [0, -1, 1, -1, 1, 0],
                  x: [0, -6, 6, -4, 4, 0],
                }
              : { rotate: 0, x: 0 }
          }
          transition={{ duration: 0.35 }}
          whileHover={isSubmitting ? undefined : { y: -1 }}
          whileTap={isSubmitting ? undefined : { scale: 0.98 }}
        />
      }
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
              initial={{ opacity: 0, scale: 0.7, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: 6 }}
              transition={{ type: 'spring', duration: 0.28, bounce: 0.25 }}
            >
              <Spinner aria-hidden="true" role="presentation" />
            </motion.span>
          ) : submitButtonState === 'success' ? (
            <motion.span
              key="success"
              initial={{ opacity: 0, scale: 0.4, rotate: -45 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.4, rotate: 45 }}
              transition={{
                type: 'spring',
                duration: 0.45,
                bounce: 0.5,
              }}
            >
              <CheckIcon aria-hidden="true" className="text-emerald-500" />
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              initial={{ opacity: 0, scale: 0.7, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: 6 }}
              transition={{ type: 'spring', duration: 0.28, bounce: 0.25 }}
            >
              <Icon aria-hidden="true" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {children}
    </Button>
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
