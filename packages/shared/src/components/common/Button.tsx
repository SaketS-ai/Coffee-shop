import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

// variant/size are the two axes every hand-rolled button in this app
// already varied along - this just gives that pattern one definition
// instead of ~100. `primary` intentionally uses the accent/accent-hover/
// on-accent tokens from index.css, not the raw #C08552 caramel - see that
// file's palette note for why (#C08552 fails WCAG AA contrast under
// cream/white text).
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent hover:bg-accent-hover text-on-accent shadow-md shadow-[#8C5A3C]/20',
  secondary: 'bg-white hover:bg-[#F4EFE6] text-ink border border-[#8C5A3C]/20 shadow-sm',
  ghost: 'bg-[#F4EFE6] hover:bg-[#E8DED1] text-[#8C5A3C] hover:text-ink border border-[#8C5A3C]/20',
  danger: 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200',
};

// min-h guarantees a comfortable tap target (WCAG 2.2 AA web minimum is
// 24 CSS px; these clear it with real margin) regardless of how short the
// label/icon combination is.
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-[11px] gap-1 min-h-[2rem]',
  md: 'px-4 py-2.5 text-xs gap-1.5 min-h-[2.25rem]',
  lg: 'py-3 px-5 text-xs gap-2 min-h-[2.75rem]',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth = false, icon, children, className = '', type = 'button', ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={`inline-flex items-center justify-center rounded-xl font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...rest}
      >
        {icon}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
