"use client";

import { useState } from "react";

export default function FormChoiceRow({
  multiple = true,
  name,
  onSelectedChange,
  title,
  options,
  selectedOptions,
}: {
  multiple?: boolean;
  name?: string;
  onSelectedChange?: (selected: string[]) => void;
  title: string;
  options: string[];
  selectedOptions?: string[];
}) {
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const selected = selectedOptions ?? internalSelected;

  function toggleOption(option: string) {
    const nextSelected = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : multiple
        ? [...selected, option]
        : [option];

    if (!selectedOptions) {
      setInternalSelected(nextSelected);
    }

    onSelectedChange?.(nextSelected);
  }

  return (
    <div data-motion-form-item>
      <p className="font-serif text-[64px] leading-[0.88] tracking-[-0.03em] italic text-[#141714]">
        {title}
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        {options.map((option, index) => {
          const isSelected = selected.includes(option);

          return (
            <button
              key={`${title}-${index}`}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggleOption(option)}
              className="motion-chip rounded-full bg-[#EFEFEB] px-5 py-[11px] font-sans text-[18px] leading-none tracking-[0em] text-[#141714]"
            >
              {option}
            </button>
          );
        })}
      </div>
      {name
        ? selected.map((option) => (
            <input key={`${name}-${option}`} type="hidden" name={name} value={option} />
          ))
        : null}
    </div>
  );
}
