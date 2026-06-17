import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ConditionalTooltipProps {
  children: React.ReactElement
  disabledReason?: React.ReactNode
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
      <TooltipTrigger render={children} />
      <TooltipContent>{disabledReason}</TooltipContent>
    </Tooltip>
  )
}

export { ConditionalTooltip }
