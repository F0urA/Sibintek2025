import React from "react";
export const Card:React.FC<React.HTMLAttributes<HTMLDivElement>> =
    ({className="", ...p}) => <div {...p} className={`card ${className}`.trim()} />;
