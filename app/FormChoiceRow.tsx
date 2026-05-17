"use client";

import { useState } from "react";

export default function FormChoiceRow({
  title,
  options,
  serif,
}: {
  title: string;
  options: string[];
  serif?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggleOption(option: string) {
    setSelected((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    );
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
              className={`motion-chip rounded-full bg-[#EFEFEB] px-5 py-[11px] leading-none text-[#141714] ${
                serif
                  ? "font-serif text-[20px] tracking-[-0.02em]"
                  : "font-sans text-[20px] tracking-[0em]"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
