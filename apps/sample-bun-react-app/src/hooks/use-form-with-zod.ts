import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

interface UseFormOptions<T extends z.ZodType> {
  schema: T;
  defaultValues?: z.infer<T>;
  onSubmit?: (values: z.infer<T>) => void;
}

export function useFormWithZod<T extends z.ZodType>({
  schema,
  defaultValues,
  onSubmit,
  ...rest
}: UseFormOptions<T>) {
  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues,
    ...rest,
  });

  const prevDefaultValuesRef = useRef(defaultValues);

  useEffect(() => {
    const isDefaultValuesDifferent = JSON.stringify(prevDefaultValuesRef.current) !== JSON.stringify(defaultValues);
    
    if (defaultValues && isDefaultValuesDifferent) {
      prevDefaultValuesRef.current = defaultValues;
      form.reset(defaultValues);
    }
  }, [defaultValues, form]);

  return {
    ...form,
    onSubmit: form.handleSubmit(onSubmit || (() => {})),
  };
}