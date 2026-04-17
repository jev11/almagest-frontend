import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  eyebrow: string;
  value: ReactNode;
  meta: ReactNode;
  tone?: "default" | "accent";
}

export function HeroStat({ eyebrow, value, meta, tone = "default" }: Props) {
  return (
    <Card className="card-hover animate-fade-in py-0 min-w-0">
      <CardContent className="p-pad flex flex-col justify-between min-h-[118px] min-w-0">
        <div className="card-title">{eyebrow}</div>
        <div
          className={
            "font-display leading-[1.1] truncate mt-2 " +
            (tone === "accent" ? "text-primary" : "text-foreground")
          }
          style={{ fontSize: "28px" }}
        >
          {value}
        </div>
        <div className="text-muted-foreground text-xs mt-2 truncate">{meta}</div>
      </CardContent>
    </Card>
  );
}
