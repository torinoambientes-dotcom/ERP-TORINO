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
        y="27"
        fontFamily="Poppins, sans-serif"
        fontSize="28"
        fill="currentColor"
        textAnchor="middle"
        fontWeight="600"
        letterSpacing="1"
      >
        TORINO
      </text>
      <text
        x="80"
        y="39"
        fontFamily="Poppins, sans-serif"
        fontSize="10"
        fill="currentColor"
        textAnchor="middle"
        letterSpacing="3"
        opacity="0.8"
      >
        AMBIENTES
      </text>
    </svg>
  );
}
