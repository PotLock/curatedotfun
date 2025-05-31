import * as React from "react"; // Add React import
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastProps, // Import the ToastProps type
  type ToastActionElement, // Import the ToastActionElement type
} from "./toast";
import { useToast } from "../../hooks/use-toast"; // Assuming this path is correct

// Define the shape of a toast object managed by the hook
interface ToasterToast {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  // Include other relevant props from ToastProps manually if needed for the hook's logic
  // For example:
  variant?: ToastProps["variant"];
  // Add other props from ToastProps that useToast might set or use
}

export function Toaster() {
  // Explicitly type the return value of useToast if possible,
  // otherwise, rely on inference or type the destructured `toasts`
  const { toasts }: { toasts: ToasterToast[] } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({
        id,
        title,
        description,
        action,
        ...props
      }: ToasterToast) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
