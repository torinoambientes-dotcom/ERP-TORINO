import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 150 40"
      className={cn("h-10 w-auto", props.className)}
      {...props}
      fill="currentColor"
    >
      <g transform="translate(5, 5)">
        <path
          d="M0 2 L24 2"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M12 2 L12 18"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M4 30 L12 18 L20 30"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <text
        x="40"
        y="21"
        fontFamily="Poppins, sans-serif"
        fontSize="18"
        fontWeight="600"
        letterSpacing="1"
        fill="currentColor"
      >
        TORINO
      </text>
      <text
        x="40"
        y="33"
        fontFamily="Poppins, sans-serif"
        fontSize="7"
        fontWeight="500"
        letterSpacing="3.5"
        fill="currentColor"
      >
        AMBIENTES
      </text>
    </svg>
  );
}
