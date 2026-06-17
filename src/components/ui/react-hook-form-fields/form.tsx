import { type ComponentProps, useEffect, useRef, useState, useId } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'motion/react'
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
type SubmitButtonFeedbackState = Exclude<SubmitButtonState, 'submitting'>

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
  const buttonAnimationControls = useAnimationControls()
  const context = useFormContext()
  const lastSettledSubmitCount = useRef(0)
  const [feedbackState, setFeedbackState] =
    useState<SubmitButtonFeedbackState>('idle')

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

    return feedbackState
  })()

  useEffect(() => {
    if (isSubmitting) {
      setFeedbackState('idle')
    }
  }, [isSubmitting])

  useEffect(() => {
    if (
      isSubmitting ||
      submitCount === 0 ||
      lastSettledSubmitCount.current === submitCount
    ) {
      return
    }

    if (errorCount === 0 && !isSubmitSuccessful) {
      return
    }

    lastSettledSubmitCount.current = submitCount

    if (errorCount > 0) {
      setFeedbackState('error')
      void buttonAnimationControls.start({
        rotate: [0, -1, 1, -1, 1, 0],
        scale: [1, 0.98, 1],
        x: [0, -6, 6, -4, 4, 0],
        transition: { duration: 0.35 },
      })
    } else {
      setFeedbackState('success')
      void buttonAnimationControls.start({
        rotate: 0,
        scale: 1,
        x: 0,
        transition: { duration: 0.2 },
      })
    }

    const timeout = setTimeout(() => {
      setFeedbackState('idle')
      void buttonAnimationControls.start({
        rotate: 0,
        scale: 1,
        x: 0,
        transition: { duration: 0.2 },
      })
    }, 1800)

    return () => {
      clearTimeout(timeout)
    }
  }, [
    buttonAnimationControls,
    errorCount,
    isSubmitSuccessful,
    isSubmitting,
    submitCount,
  ])

  const submitButtonToneClassName = ((): string | undefined => {
    switch (submitButtonState) {
      case 'idle':
      case 'submitting':
        return undefined
      case 'success':
        return 'bg-emerald-600 text-white hover:bg-emerald-600'
      case 'error':
        return 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
      default:
        submitButtonState satisfies never
        return undefined
    }
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
      className={cn('min-w-44', submitButtonToneClassName, className)}
      form={explicitForm?.id}
      render={
        <motion.button
          animate={buttonAnimationControls}
          whileHover={isSubmitting ? undefined : { y: -1 }}
          whileTap={isSubmitting ? undefined : { scale: 0.98 }}
        />
      }
      type="submit"
      disabled={disabled || isSubmitting}
    >
      <span>{children}</span>
      <span
        aria-hidden="true"
        data-icon="inline-end"
        className="inline-grid size-4 shrink-0 place-items-center"
      >
        <AnimatePresence initial={false} mode="wait">
          {(() => {
            switch (submitButtonState) {
              case 'idle':
                return null
              case 'submitting':
                return (
                  <motion.span
                    key="submitting"
                    initial={{ opacity: 0, scale: 0.7, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.7, y: 6 }}
                    transition={{
                      type: 'spring',
                      duration: 0.28,
                      bounce: 0.25,
                    }}
                  >
                    <Spinner aria-hidden="true" role="presentation" />
                  </motion.span>
                )
              case 'success':
                return (
                  <motion.span
                    key="success"
                    initial={{ opacity: 0, scale: 0, rotate: -90 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0, rotate: 90 }}
                    transition={{
                      type: 'spring',
                      duration: 0.45,
                      bounce: 0.6,
                    }}
                  >
                    <CheckIcon aria-hidden="true" />
                  </motion.span>
                )
              case 'error':
                return (
                  <motion.span
                    key="error"
                    initial={{ opacity: 0, scale: 0.75 }}
                    animate={{ opacity: 1, scale: [1, 1.18, 1] }}
                    exit={{ opacity: 0, scale: 0.75 }}
                    transition={{ duration: 0.35 }}
                  >
                    <XIcon aria-hidden="true" />
                  </motion.span>
                )
              default:
                submitButtonState satisfies never
                return null
            }
          })()}
        </AnimatePresence>
      </span>
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
