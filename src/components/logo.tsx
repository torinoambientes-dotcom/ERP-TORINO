import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <div
      className={cn("flex flex-col items-start leading-none", props.className)}
    >
      <span
        style={{
          fontFamily: "Poppins, sans-serif",
          fontSize: "18px",
          fontWeight: "600",
          letterSpacing: "1px",
        }}
      >
        TORINO
      </span>
      <span
        style={{
          fontFamily: "Poppins, sans-serif",
          fontSize: "7px",
          fontWeight: "500",
          letterSpacing: "3.5px",
        }}
      >
        AMBIENTES
      </span>
    </div>
  );
}
