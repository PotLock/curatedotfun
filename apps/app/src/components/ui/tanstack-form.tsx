import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { Label } from "src/components/ui/label";
import { cn } from "src/lib/utils";
import {
  createFormHook,
  createFormHookContexts,
  useStore,
} from "@tanstack/react-form";

const {
  fieldContext,
  formContext,
  useFieldContext: _useFieldContext,
  useFormContext,
} = createFormHookContexts();

const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage,
    FormItem,
  },
  formComponents: {},
});

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue,
);

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        data-slot="form-item"
        className={cn("grid gap-2", className)}
        {...props}
      />
    </FormItemContext.Provider>
  );
}

const useFormField = () => {
  const { id } = React.useContext(FormItemContext);
  const fieldApi = _useFieldContext();
  const errors = useStore(fieldApi.store, (state) => state.meta.errors);

  if (!fieldApi) {
    throw new Error("useFormField should be used within <FormItem>");
  }

  return {
    id,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    errors,
  };
};

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  const { formItemId, errors } = useFormField();

  return (
    <Label
      data-slot="form-label"
      data-error={!!errors.length}
      className={cn("data-[error=true]:text-red-500 dark:data-[error=true]:text-red-900", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
  const { errors, formItemId, formDescriptionId, formMessageId } =
    useFormField();

  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={
        !errors.length
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!errors.length}
      {...props}
    />
  );
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-neutral-500 text-sm dark:text-neutral-400", className)}
      {...props}
    />
  );
}

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
  const { errors, formMessageId } = useFormField();
  const body = errors.length
    ? String(errors.at(0)?.message ?? "")
    : props.children;
  if (!body) return null;

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn("text-red-500 text-sm dark:text-red-900", className)}
      {...props}
    >
      {body}
    </p>
  );
}

export {
  useAppForm,
  useFormContext,
  useFormField,
  withForm,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
};
