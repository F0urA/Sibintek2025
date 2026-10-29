import React from "react";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({className="", ...p}, ref) => <input ref={ref} {...p} className={`input ${className}`.trim()} />
);
