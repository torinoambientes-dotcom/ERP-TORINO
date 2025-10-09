import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

export const logoSvgString = `<svg viewBox="0 0 130 40">
  <text
    x="50%"
    y="20"
    font-family="Poppins, sans-serif"
    font-size="20"
    fill="currentColor"
    text-anchor="middle"
    font-weight="400"
  >
    TORINO
  </text>
  <text
    x="50%"
    y="34"
    font-family="Poppins, sans-serif"
    font-size="8"
    fill="currentColor"
    text-anchor="middle"
    letter-spacing="3"
    opacity="0.7"
  >
    AMBIENTES
  </text>
</svg>`;

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 130 40"
      className={cn("text-sidebar-foreground", props.className)}
      {...props}
    >
      <text
        x="50%"
        y="20"
        fontFamily="Poppins, sans-serif"
        fontSize="20"
        fill="currentColor"
        textAnchor="middle"
        fontWeight="400"
      >
        TORINO
      </text>
      <text
        x="50%"
        y="34"
        fontFamily="Poppins, sans-serif"
        fontSize="8"
        fill="currentColor"
        textAnchor="middle"
        letterSpacing="3"
        opacity="0.7"
      >
        AMBIENTES
      </text>
    </svg>
  );
}