import React from "react";
export const Tag:React.FC<React.HTMLAttributes<HTMLSpanElement>> =
    ({className="", ...p}) => <span {...p} className={`tag ${className}`.trim()} />;
