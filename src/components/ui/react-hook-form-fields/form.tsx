import { type ComponentProps, useEffect, useRef, useState, useId } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  CheckIcon,
  type LucideIcon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react'
import {
  type Control,
  type DefaultValues,
  type FieldPath,
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
import type { FormField } from '@/components/ui/react-hook-form-fields/_types'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

type SubmitButtonState =
  | 'idle'
  | 'input-error'
  | 'server-error'
  | 'submitting'
  | 'success'
type SubmitButtonFeedbackState = Exclude<SubmitButtonState, 'idle' | 'submitting'>
type SubmitButtonIconPosition = 'end' | 'start'

const submitButtonFeedbackCooldownMs = 1800
const submitButtonTransitionSeconds = 0.3

type UseResolverForm<
  TInput extends FieldValues,
  TOutput,
> = UseFormReturn<TInput, unknown, TOutput> & {
  field: <TName extends FieldPath<TInput>>(
    name: TName,
  ) => FormField<TInput, TName>
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
  form.field = (name) => ({
    control: form.control as unknown as Control<TInput>,
    name,
  })

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
    /**
     * The icon shown when the submit button is idle.
     */
    icon: LucideIcon
    /**
     * Where to place the persistent status icon slot.
     */
    iconPosition?: SubmitButtonIconPosition | undefined
  },
) {
  const {
    children,
    className,
    disabled,
    form: explicitForm,
    icon,
    iconPosition = 'start',
    ...passThrough
  } = props
  const context = useFormContext()
  const Icon = icon
  const lastSettledSubmitCount = useRef(0)
  const [isFeedbackSettled, setIsFeedbackSettled] = useState(true)

  const form = explicitForm ?? context
  const formState = form?.formState
  const isSubmitting = formState?.isSubmitting ?? false
  const submitCount = formState?.submitCount ?? 0
  const isSubmitSuccessful = formState?.isSubmitSuccessful ?? false
  const errorCount = formState ? Object.keys(formState.errors).length : 0
  const hasServerError = !!formState?.errors.root?.server
  const settledSubmitState = ((): SubmitButtonFeedbackState | undefined => {
    if (submitCount === 0 || errorCount === 0 && !isSubmitSuccessful) {
      return undefined
    }

    if (errorCount === 0) {
      return 'success'
    }

    return hasServerError ? 'server-error' : 'input-error'
  })()
  const submitButtonState = ((): SubmitButtonState => {
    if (isSubmitting) {
      return 'submitting'
    }

    if (isFeedbackSettled) {
      return 'idle'
    }

    return settledSubmitState ?? 'idle'
  })()

  useEffect(() => {
    if (isSubmitting) {
      setIsFeedbackSettled(true)
      return
    }

    if (!settledSubmitState) {
      setIsFeedbackSettled(true)
      return
    }

    if (
      lastSettledSubmitCount.current === submitCount
    ) {
      return
    }

    lastSettledSubmitCount.current = submitCount
    setIsFeedbackSettled(false)

    const timeout = setTimeout(() => {
      setIsFeedbackSettled(true)
    }, submitButtonFeedbackCooldownMs)

    return () => {
      clearTimeout(timeout)
    }
  }, [isSubmitting, settledSubmitState, submitCount])

  const submitButtonMotion = (() => {
    switch (submitButtonState) {
      case 'idle':
      case 'success':
        return { rotate: 0, scale: 1, x: 0, y: 0 }
      case 'submitting':
        return { rotate: 0, scale: 0.98, x: 0, y: 0 }
      case 'input-error':
        return {
          rotate: [0, -1.5, 1.5, 0],
          scale: [1, 1.02, 1],
          x: [0, -5, 5, -3, 3, 0],
          y: [0, -2, 0],
        }
      case 'server-error':
        return {
          rotate: [0, -2, 2, -1.5, 1.5, 0],
          scale: [1, 0.98, 1],
          x: [0, -14, 14, -10, 10, -6, 6, 0],
          y: 0,
        }
      default:
        submitButtonState satisfies never
        return { rotate: 0, scale: 1, x: 0, y: 0 }
    }
  })()

  const submitButtonToneClassName = ((): string | undefined => {
    switch (submitButtonState) {
      case 'idle':
      case 'submitting':
        return undefined
      case 'success':
        return 'bg-emerald-600 text-white hover:bg-emerald-600'
      case 'input-error':
        return 'bg-amber-500 text-white hover:bg-amber-500'
      case 'server-error':
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

  const iconSlot = (
    <span
      aria-hidden="true"
      data-icon={iconPosition === 'start' ? 'inline-start' : 'inline-end'}
      className="inline-grid size-4 shrink-0 place-items-center"
    >
      <AnimatePresence initial={false} mode="wait">
        {(() => {
          switch (submitButtonState) {
            case 'idle':
              return (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0, scale: 0.7, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.7, y: 6 }}
                  transition={{
                    type: 'spring',
                    duration: submitButtonTransitionSeconds,
                    bounce: 0.25,
                  }}
                >
                  <Icon aria-hidden="true" />
                </motion.span>
              )
            case 'submitting':
              return (
                <motion.span
                  key="submitting"
                  initial={{ opacity: 0, scale: 0.7, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.7, y: 6 }}
                  transition={{
                    type: 'spring',
                    duration: submitButtonTransitionSeconds,
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
                    duration: submitButtonTransitionSeconds,
                    bounce: 0.6,
                  }}
                >
                  <CheckIcon aria-hidden="true" />
                </motion.span>
              )
            case 'input-error':
              return (
                <motion.span
                  key="input-error"
                  initial={{ opacity: 0, scale: 0.75, rotate: -12 }}
                  animate={{ opacity: 1, scale: [1, 1.12, 1], rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.75, rotate: 12 }}
                  transition={{ duration: submitButtonTransitionSeconds }}
                >
                  <TriangleAlertIcon aria-hidden="true" />
                </motion.span>
              )
            case 'server-error':
              return (
                <motion.span
                  key="server-error"
                  initial={{ opacity: 0, scale: 0.75 }}
                  animate={{ opacity: 1, scale: [1, 1.18, 1] }}
                  exit={{ opacity: 0, scale: 0.75 }}
                  transition={{ duration: submitButtonTransitionSeconds }}
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
  )

  return (
    <Button
      {...passThrough}
      aria-busy={isSubmitting}
      className={cn(
        'min-w-44 transition-colors duration-300 ease-in-out',
        submitButtonToneClassName,
        className,
      )}
      form={explicitForm?.id}
      render={
        <motion.button
          animate={submitButtonMotion}
          transition={{
            duration: submitButtonTransitionSeconds,
            ease: 'easeInOut',
          }}
          whileHover={submitButtonState === 'idle' ? { scale: 1.01 } : undefined}
          whileTap={isSubmitting ? undefined : { scale: 0.98 }}
        />
      }
      type="submit"
      disabled={disabled || isSubmitting}
    >
      {iconPosition === 'start' ? iconSlot : null}
      <span>{children}</span>
      {iconPosition === 'end' ? iconSlot : null}
    </Button>
  )
}

export {
  ResolverForm,
  SubmitButton,
  useResolverForm,
  type SubmitButtonIconPosition,
  type ResolverFormProps,
  type UseResolverForm,
  type UseResolverFormProps,
}
