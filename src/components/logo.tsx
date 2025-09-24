import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 150 40"
      className={cn("h-8 w-auto", props.className)}
      {...props}
      fill="currentColor"
    >
      <g transform="translate(0, 5)">
        <path d="M0 2 L24 2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 2 L12 18" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 30 L12 18 L20 30" stroke="currentColor" strokeWidth="1.5" />
      </g>
      <text
        x="35"
        y="20"
        fontFamily="Poppins, sans-serif"
        fontSize="18"
        letterSpacing="2"
        fill="currentColor"
      >
        TORINO
      </text>
      <text
        x="35"
        y="32"
        fontFamily="Poppins, sans-serif"
        fontSize="7"
        letterSpacing="4"
        fill="currentColor"
      >
        AMBIENTES
      </text>
    </svg>
  );
}
