import React from "react";

export default function Input({
  labelText,
  name,
  isNumber,
  description,
  error,
  ...props
}) {
  return (
    <div className="flex flex-col w-full">
      {labelText && <p className="mt-2 font-semibold !mb-[8px]">{labelText}</p>}
      <input
        type={isNumber ? "number" : "text"}
        name={name}
        {...(isNumber ? { onWheel: (e) => e.target.blur() } : {})}
        {...props}
      />
      {description && <p className="text-xs info !w-full mt-1">{description}</p>}
      <div className="h-4 mt-1">
        {error && <p className="text-red-500 text-xs">{error}</p>}
      </div>
    </div>
  );
}
