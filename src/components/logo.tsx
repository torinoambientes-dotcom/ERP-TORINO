import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 40"
      className={cn("text-sidebar-foreground", props.className)}
      {...props}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1">
        {/* Symbol */}
        <polyline points="5,5 25,5" />
        <polyline points="5,5 15,15" />
        <polyline points="8,8 15,15" />
        <polyline points="15,15 22,8" />
        <polyline points="15,15 15,35" />
      </g>
      
      {/* TORINO */}
      <text
        x="95"
        y="18"
        fontFamily="Poppins, sans-serif"
        fontSize="17"
        fill="currentColor"
        textAnchor="middle"
        fontWeight="400"
        letterSpacing="0.5"
      >
        TORINO
      </text>

      {/* AMBIENTES */}
      <text
        x="95"
        y="32"
        fontFamily="Poppins, sans-serif"
        fontSize="7"
        fill="currentColor"
        textAnchor="middle"
        letterSpacing="3"
        opacity="0.9"
      >
        AMBIENTES
      </text>
    </svg>
  );
}
