import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ConditionalTooltipProps {
  children: React.ReactNode
  disabledReason: React.ReactNode | undefined
}

function ConditionalTooltip({
  children,
  disabledReason,
}: ConditionalTooltipProps) {
  if (disabledReason == null) {
    return children
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            aria-label={
              typeof disabledReason === 'string' ? disabledReason : undefined
            }
            className="block"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{disabledReason}</TooltipContent>
    </Tooltip>
  )
}

export { ConditionalTooltip }
