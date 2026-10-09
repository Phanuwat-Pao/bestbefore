import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { Urgency } from "../../convex/lib/dates";
import { describeDaysLeft } from "../../convex/lib/dates";

const TONE: Record<Urgency, string> = {
  expired: "bg-urgency-expired text-white",
  ok: "bg-urgency-ok text-white",
  soon: "bg-urgency-soon text-black",
  today: "bg-urgency-today text-white",
  unknown: "bg-urgency-unknown text-white",
};

export function UrgencyBadge({
  urgency,
  daysLeft,
  className,
}: {
  urgency: Urgency;
  daysLeft: number | null;
  className?: string;
}) {
  return (
    <Badge className={cn("border-transparent", TONE[urgency], className)}>
      {describeDaysLeft(daysLeft)}
    </Badge>
  );
}
