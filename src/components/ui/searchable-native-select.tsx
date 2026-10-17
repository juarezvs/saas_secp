"use client";

import { Children, Fragment, isValidElement, useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { SearchableSelect, type SearchableSelectOption } from "./searchable-select";

function texto(node: ReactNode): string {
  return Children.toArray(node).map((item) => isValidElement<{ children?: ReactNode }>(item) ? texto(item.props.children) : String(item)).join("");
}

function opcoes(children: ReactNode, group?: string, disabled = false): SearchableSelectOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode; value?: string | number; label?: string; disabled?: boolean; "data-search-text"?: string }>(child)) return [];
    if (child.type === Fragment) return opcoes(child.props.children, group, disabled);
    if (child.type === "optgroup") return opcoes(child.props.children, child.props.label, disabled || child.props.disabled);
    if (child.type !== "option") return [];
    const label = child.props.label ?? texto(child.props.children);
    return [{ value: String(child.props.value ?? label), label, group, disabled: disabled || child.props.disabled, searchText: child.props["data-search-text"] }];
  });
}

export function SearchableNativeSelect({ children, className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const generatedId = useId();
  if (props.multiple || (props.size && props.size > 1)) return <select {...props} className={className}>{children}</select>;
  const options = opcoes(children);
  const fallback = options.find((option) => !option.disabled)?.value ?? "";
  const normalizarValor = (value: unknown) => options.some((option) => option.value === String(value)) ? String(value) : fallback;
  const layout = className?.split(/\s+/).filter((item) => /^(?:(?:sm|md|lg|xl|2xl):)?(?:w-|min-w-|max-w-|col-|row-|flex-(?:1|auto|initial|none)$|grow(?:-|$)|shrink(?:-|$)|basis-|hidden$)/.test(item)).join(" ");
  return <SearchableSelect id={props.id ?? generatedId} name={props.name ?? ""}
    options={options} value={props.value === undefined ? undefined : normalizarValor(props.value)}
    defaultValue={normalizarValor(props.defaultValue)}
    disabled={props.disabled} required={props.required} className={`inline-block align-middle ${layout ?? ""}`}
    triggerClassName={className} nativeSelectProps={props} />;
}
