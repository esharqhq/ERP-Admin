"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * A single choice among a few short options, laid out side by side — "Yes / No",
 * never a list long enough to want a Select.
 *
 * The DS ships no radio or segmented control, so this is built from the tokens
 * its field and button already use: 40px tall, 1px border, lg (14px) radius and
 * the 3px green focus ring. The selected option is **forest tint**
 * (`bg-accent` = forest 100, `text-accent-foreground` = forest 700), not a solid
 * fill: the DS reserves solid forest for the one primary action per screen area,
 * and in a form that is the submit button.
 *
 * `value` may be `null` — nothing selected — and that is the point for a
 * required answer the admin must actually give: a pre-selected default would be
 * sent without anyone having decided it.
 *
 * Keyboard: a `radiogroup` with roving focus. Tab reaches the group once (the
 * selected option, or the first when none is), and the arrow keys move and
 * select, as a native radio group does.
 */
export interface ChoiceOption<T extends string> {
  value: T
  label: React.ReactNode
}

function ChoiceGroup<T extends string>({
  value,
  onValueChange,
  options,
  disabled = false,
  className,
  "aria-labelledby": labelledBy,
  "aria-invalid": invalid,
  id,
}: {
  value: T | null
  onValueChange: (value: T) => void
  options: readonly ChoiceOption<T>[]
  disabled?: boolean
  className?: string
  "aria-labelledby"?: string
  "aria-invalid"?: boolean
  id?: string
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])
  const selectedIndex = options.findIndex((o) => o.value === value)
  const focusIndex = selectedIndex === -1 ? 0 : selectedIndex

  function move(from: number, step: number) {
    const next = (from + step + options.length) % options.length
    onValueChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      id={id}
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-invalid={invalid || undefined}
      aria-disabled={disabled || undefined}
      data-slot="choice-group"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((option, index) => {
        const selected = index === selectedIndex
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={index === focusIndex ? 0 : -1}
            disabled={disabled}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault()
                move(index, 1)
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault()
                move(index, -1)
              }
            }}
            data-slot="choice-group-item"
            className={cn(
              "inline-flex h-10 min-w-24 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors outline-none",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              "disabled:pointer-events-none disabled:opacity-50",
              selected
                ? "border-primary bg-accent text-accent-foreground"
                : "border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
              invalid && !selected && "border-destructive"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export { ChoiceGroup }
