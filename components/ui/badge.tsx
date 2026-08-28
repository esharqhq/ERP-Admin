import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * The DS calls this "controlled status vocabulary only" and names exactly six
 * chips: Done, Pending, Cancelled, Verified, New, Draft. Those are meanings,
 * not looks, so they arrive as a separate `tone` prop rather than as more
 * `variant` values — `variant` stays the shadcn presentation vocabulary that
 * ~20 non-semantic call sites already use for plain outline/secondary pills.
 *
 * When a `tone` is set the presentation variant resolves to `tonal`, which
 * carries no colour of its own. That makes the two groups additive instead of
 * competing: the tone's colours are the only ones emitted, so correctness does
 * not rest on tailwind-merge winning a `bg-*` conflict.
 *
 * Every tone is a tint + a text colour off the `--status-*` scale in
 * `globals.css`. The DS is explicit that these are "tinted chips, never solid
 * fills" — solid fill stays reserved for the one primary action per area.
 */
const badgeVariants = cva(
  "group/badge inline-flex h-[22px] w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-[9px] py-0.5 text-xs font-semibold tracking-[0.01em] whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        // Colourless carrier used whenever `tone` is supplied.
        tonal: "",
      },
      tone: {
        /** Done / Active / Completed */
        success: "bg-status-active-tint text-status-active",
        /** Pending / Awaiting / In review */
        warning: "bg-status-pending-tint text-status-pending",
        /** Cancelled / Rejected / Failed */
        danger: "bg-status-cancelled-tint text-status-cancelled",
        /** Verified / Approved — the brand-carrying chip */
        primary: "bg-status-verified-tint text-status-verified",
        /** New / Informational */
        info: "bg-status-info-tint text-status-info",
        /** Draft / Inactive / no state yet */
        neutral: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  tone,
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(
          badgeVariants({ variant: tone ? "tonal" : variant, tone }),
          className
        ),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
      ...(tone ? { tone } : {}),
    },
  })
}

export { Badge, badgeVariants }
