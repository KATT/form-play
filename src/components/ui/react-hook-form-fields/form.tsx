import { type ComponentProps, useEffect, useRef, useState, useId } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
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
  const animationControls = useAnimationControls()
  const context = useFormContext()
  const lastErrorSubmitCount = useRef(0)
  const lastSuccessSubmitCount = useRef(0)
  const [showSuccess, setShowSuccess] = useState(false)

  const form = explicitForm ?? context
  const formState = form?.formState
  const isSubmitting = formState?.isSubmitting ?? false
  const submitCount = formState?.submitCount ?? 0
  const isSubmitSuccessful = formState?.isSubmitSuccessful ?? false
  const errorCount = formState ? Object.keys(formState.errors).length : 0

  useEffect(() => {
    if (isSubmitting) {
      setShowSuccess(false)
    }
  }, [isSubmitting])

  useEffect(() => {
    if (
      submitCount === 0 ||
      errorCount === 0 ||
      lastErrorSubmitCount.current === submitCount
    ) {
      return
    }

    lastErrorSubmitCount.current = submitCount
    setShowSuccess(false)
    void animationControls.start({
      x: [0, -6, 6, -4, 4, 0],
      transition: { duration: 0.35 },
    })
  }, [animationControls, errorCount, submitCount])

  useEffect(() => {
    if (
      isSubmitting ||
      submitCount === 0 ||
      errorCount > 0 ||
      !isSubmitSuccessful ||
      lastSuccessSubmitCount.current === submitCount
    ) {
      return
    }

    lastSuccessSubmitCount.current = submitCount
    setShowSuccess(true)

    const timeout = setTimeout(() => {
      setShowSuccess(false)
    }, 1600)

    return () => {
      clearTimeout(timeout)
    }
  }, [errorCount, isSubmitSuccessful, isSubmitting, submitCount])

  if (!form) {
    throw new Error(
      'SubmitButton must be used within a ResolverForm or have a form prop',
    )
  }

  return (
    <motion.span
      animate={animationControls}
      className={cn('inline-flex', className)}
    >
      <Button
        {...passThrough}
        aria-busy={isSubmitting}
        className={className}
        form={explicitForm?.id}
        type="submit"
        disabled={disabled || isSubmitting}
      >
        <AnimatePresence initial={false} mode="wait">
          {isSubmitting ? (
            <motion.span
              key="loading"
              data-icon="inline-start"
              initial={{ opacity: 0, scale: 0.8, y: -2 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 2 }}
              transition={{ duration: 0.15 }}
            >
              <Spinner aria-hidden="true" role="presentation" />
            </motion.span>
          ) : showSuccess ? (
            <motion.span
              key="success"
              data-icon="inline-start"
              initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6, rotate: 20 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0.35 }}
            >
              <CheckIcon aria-hidden="true" className="text-emerald-500" />
            </motion.span>
          ) : null}
        </AnimatePresence>
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
