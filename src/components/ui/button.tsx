import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-sans text-sm font-medium tracking-wide transition-[opacity,transform,background-color,color] duration-150 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.96]",
  {
    variants: {
      variant: {
        solid:
          "bg-primary text-primary-fg hover:opacity-90",
        ink: "bg-ink text-paper hover:opacity-90",
        ghost:
          "bg-transparent text-fg hover:text-primary",
        outline:
          "border border-border bg-transparent text-fg hover:border-primary hover:text-primary",
        paper:
          "border border-ink/20 bg-transparent text-ink hover:border-ink hover:bg-ink hover:text-paper",
      },
      size: {
        md: "h-11 px-5",
        lg: "h-12 px-6",
        sm: "h-9 px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "solid",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
