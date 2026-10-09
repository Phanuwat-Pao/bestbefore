import { Link } from "@tanstack/react-router";
import { ShoppingBasket } from "lucide-react";
import type { ReactNode } from "react";

import { UrgencyBadge } from "@/components/urgency-badge";

import type { IsoDate, Urgency } from "../../convex/lib/dates";
import { formatThai } from "../../convex/lib/dates";

export interface ItemCardProps {
  id: string;
  name: string;
  expiresOn: IsoDate | null;
  daysLeft: number | null;
  urgency: Urgency;
  thumbnailUrl: string | null;
  trailing?: ReactNode;
  subtitle?: string;
}

export function ItemCard(props: ItemCardProps) {
  return (
    <li className="bg-card flex items-center gap-3 rounded-xl border p-3 shadow-xs">
      <Link
        to="/items/$itemId"
        params={{ itemId: props.id }}
        className="shrink-0"
        aria-label={props.name}
      >
        {props.thumbnailUrl ? (
          <img
            className="size-16 rounded-lg object-cover"
            src={props.thumbnailUrl}
            alt=""
            loading="lazy"
          />
        ) : (
          <div className="bg-muted text-muted-foreground flex size-16 items-center justify-center rounded-lg">
            <ShoppingBasket className="size-7" />
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to="/items/$itemId"
          params={{ itemId: props.id }}
          className="block truncate text-base leading-tight font-semibold"
        >
          {props.name}
        </Link>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <UrgencyBadge urgency={props.urgency} daysLeft={props.daysLeft} />
          {props.expiresOn && <span>หมดอายุ {formatThai(props.expiresOn)}</span>}
          {props.subtitle && <span>{props.subtitle}</span>}
        </div>
      </div>
      {props.trailing && <div className="shrink-0">{props.trailing}</div>}
    </li>
  );
}
