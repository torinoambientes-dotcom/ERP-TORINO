import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 140"
      className={cn("text-sidebar-primary", props.className)}
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Stylized T */}
        <path d="M 40 45 L 80 20 L 120 45" />
        <path d="M 50 55 L 80 40 L 110 55" />
        <path d="M 80 20 L 80 90" />
      </g>
      <text
        x="80"
        y="115"
        fontFamily="Poppins, sans-serif"
        fontSize="24"
        fill="currentColor"
        textAnchor="middle"
        letterSpacing="1"
      >
        TORINO
      </text>
      <text
        x="80"
        y="135"
        fontFamily="Poppins, sans-serif"
        fontSize="10"
        fill="currentColor"
        textAnchor="middle"
        letterSpacing="4"
      >
        AMBIENTES
      </text>
    </svg>
  );
}
