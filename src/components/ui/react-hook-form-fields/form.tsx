import { type ComponentProps, useId } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckIcon, XIcon } from 'lucide-react'
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
          void form
            .handleSubmit(async (values) => {
              try {
                await handleSubmit(values)
              } catch (error) {
                await onError?.(error)
                form.setError('root.server', {
                  message:
                    error instanceof Error ? error.message : 'Unknown error',
                  type: 'server',
                })
                throw error
              }
            }, onInputValidationError)(event)
            .catch(() => undefined)
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
      className={cn('relative min-w-44 overflow-hidden', className)}
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
      <span className="relative z-10">{children}</span>
      <AnimatePresence initial={false} mode="wait">
        {(() => {
          switch (submitButtonState) {
            case 'idle':
              return null
            case 'submitting':
              return (
                <motion.span
                  key="submitting"
                  aria-hidden="true"
                  className="absolute inset-0 z-20 flex items-center justify-center bg-primary text-primary-foreground"
                  initial={{ clipPath: 'circle(0% at 50% 50%)', opacity: 0 }}
                  animate={{
                    clipPath: 'circle(140% at 50% 50%)',
                    opacity: 1,
                  }}
                  exit={{ clipPath: 'circle(0% at 50% 50%)', opacity: 0 }}
                  transition={{ type: 'spring', duration: 0.45, bounce: 0.2 }}
                >
                  <Spinner aria-hidden="true" role="presentation" />
                </motion.span>
              )
            case 'success':
              return (
                <motion.span
                  key="success"
                  className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-emerald-600 text-white"
                  initial={{ clipPath: 'inset(0 100% 0 0)', opacity: 0 }}
                  animate={{ clipPath: 'inset(0 0% 0 0)', opacity: 1 }}
                  exit={{ clipPath: 'inset(0 0 0 100%)', opacity: 0 }}
                  transition={{ type: 'spring', duration: 0.5, bounce: 0.25 }}
                >
                  <motion.span
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', duration: 0.45, bounce: 0.6 }}
                  >
                    <CheckIcon aria-hidden="true" />
                  </motion.span>
                  Submitted
                </motion.span>
              )
            case 'error':
              return (
                <motion.span
                  key="error"
                  className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-destructive text-destructive-foreground"
                  initial={{ clipPath: 'circle(0% at 50% 50%)', opacity: 0 }}
                  animate={{
                    clipPath: 'circle(140% at 50% 50%)',
                    opacity: 1,
                  }}
                  exit={{ clipPath: 'circle(0% at 50% 50%)', opacity: 0 }}
                  transition={{ type: 'spring', duration: 0.42, bounce: 0.35 }}
                >
                  <motion.span
                    initial={{ scale: 0.75 }}
                    animate={{ scale: [1, 1.18, 1] }}
                    transition={{ duration: 0.35 }}
                  >
                    <XIcon aria-hidden="true" />
                  </motion.span>
                  Try again
                </motion.span>
              )
            default:
              submitButtonState satisfies never
              return null
          }
        })()}
      </AnimatePresence>
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
