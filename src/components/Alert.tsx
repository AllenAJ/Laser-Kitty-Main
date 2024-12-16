import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import React from "react";

const variants = {
  default: "bg-gray-50 text-gray-900",
  destructive: "bg-red-50 text-red-900",
  success: "bg-green-50 text-green-900",
  warning: "bg-yellow-50 text-yellow-900",
};

const icons = {
  default: Info,
  destructive: XCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
};

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variants;
}

export function Alert({ className = "", variant = "default", children, ...props }: AlertProps) {
  const Icon = icons[variant];
  
  return (
    <div
      role="alert"
      className={`relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11 ${variants[variant]} ${className}`}
      {...props}
    >
      <Icon className="h-5 w-5" />
      {children}
    </div>
  );
}

export const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className = "", children, ...props }, ref) => (
  <h5
    ref={ref}
    className={`mb-1 font-medium leading-none tracking-tight ${className}`}
    {...props}
  >
    {children}
  </h5>
));
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className = "", children, ...props }, ref) => (
  <div
    ref={ref}
    className={`text-sm [&_p]:leading-relaxed ${className}`}
    {...props}
  >
    {children}
  </div>
));
AlertDescription.displayName = "AlertDescription";