import { Link } from "@tanstack/react-router";

import type { IsoDate, Urgency } from "../../convex/lib/dates";
import { describeDaysLeft, formatThai } from "../../convex/lib/dates";

export interface ItemCardProps {
  id: string;
  name: string;
  expiresOn: IsoDate | null;
  daysLeft: number | null;
  urgency: Urgency;
  thumbnailUrl: string | null;
  trailing?: React.ReactNode;
  subtitle?: string;
}

export function UrgencyBadge({
  urgency,
  daysLeft,
}: {
  urgency: Urgency;
  daysLeft: number | null;
}) {
  return (
    <span className={`badge badge-${urgency}`}>
      {describeDaysLeft(daysLeft)}
    </span>
  );
}

export function ItemCard(props: ItemCardProps) {
  return (
    <li className="item">
      <Link
        to="/items/$itemId"
        params={{ itemId: props.id }}
        className="thumb-link"
      >
        {props.thumbnailUrl ? (
          <img
            className="thumb"
            src={props.thumbnailUrl}
            alt=""
            loading="lazy"
          />
        ) : (
          <div className="thumb thumb-empty">🛒</div>
        )}
      </Link>
      <div className="grow">
        <Link
          to="/items/$itemId"
          params={{ itemId: props.id }}
          className="item-name"
        >
          {props.name}
        </Link>
        <div className="meta">
          <UrgencyBadge urgency={props.urgency} daysLeft={props.daysLeft} />
          {props.expiresOn && <span>หมดอายุ {formatThai(props.expiresOn)}</span>}
          {props.subtitle && <span>{props.subtitle}</span>}
        </div>
      </div>
      {props.trailing && <div className="actions">{props.trailing}</div>}
    </li>
  );
}
