import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from './button'
import 'react-day-picker/dist/style.css'

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabledBefore,
}: {
  value?: Date
  onChange: (d: Date | undefined) => void
  placeholder?: string
  disabledBefore?: Date
}) {
  const [open, setOpen] = useState(false)

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start font-normal">
          <CalendarIcon className="h-4 w-4" />
          {value ? format(value, 'dd MMM yyyy') : <span className="text-muted-foreground">{placeholder}</span>}
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-50 rounded-md border border-border bg-card p-2 shadow-md"
        >
          <DayPicker
            mode="single"
            selected={value}
            onSelect={(d) => {
              onChange(d)
              setOpen(false)
            }}
            disabled={disabledBefore ? { before: disabledBefore } : undefined}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
