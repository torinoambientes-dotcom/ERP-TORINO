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
      <text
        x="80"
        y="15"
        fontFamily="Poppins, sans-serif"
        fontSize="16"
        fill="currentColor"
        textAnchor="middle"
        fontWeight="600"
        letterSpacing="1"
      >
        TORINO
      </text>
      <text
        x="80"
        y="32"
        fontFamily="Poppins, sans-serif"
        fontSize="8"
        fill="currentColor"
        textAnchor="middle"
        letterSpacing="3.5"
        opacity="0.8"
      >
        AMBIENTES
      </text>
    </svg>
  );
}
