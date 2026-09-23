"use client";
import { useCallback, useState } from "react";
import type { z } from "zod";

const getPath = (obj: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((o, k) => (o == null ? o : (o as Record<string, unknown>)[k]), obj);

function setPath<T>(obj: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split(".");
  const cur = obj as Record<string, unknown>;
  return { ...cur, [head]: rest.length ? setPath(cur[head] ?? {}, rest.join("."), value) : value } as T;
}

/**
 * Minimal form state + zod validation.
 *   const f = useForm(schema, initial);
 *   <Input {...f.field("guardian.phone")} />   // value, onChange, error
 *   const data = f.validate(); if (!data) return;
 * Errors are keyed by dotted path and cleared as the user edits that field.
 */
export function useForm<TIn extends object, TOut>(schema: z.ZodType<TOut, TIn>, initial: TIn) {
  const [values, setValues] = useState<TIn>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = useCallback((path: string, value: unknown) => {
    setValues((v) => setPath(v, path, value));
    setErrors((e) => { if (!e[path]) return e; const { [path]: _drop, ...rest } = e; void _drop; return rest; });
  }, []);

  const field = (path: string) => ({
    value: (getPath(values, path) ?? "") as string | number,
    error: !!errors[path],
    onChange: (e: { target: { value: string } }) => set(path, e.target.value),
  });

  const validate = useCallback((): TOut | null => {
    const r = schema.safeParse(values);
    if (r.success) { setErrors({}); return r.data; }
    const next: Record<string, string> = {};
    for (const issue of r.error.issues) next[issue.path.join(".")] ||= issue.message;
    setErrors(next);
    return null;
  }, [schema, values]);

  return { values, setValues, set, get: (p: string) => getPath(values, p), field, errors, setErrors, validate, error: (p: string) => errors[p] };
}
