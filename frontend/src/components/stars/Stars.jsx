import { Star } from "lucide-react";

export default function Stars({ rating, count }) {
  const filled = Math.round(rating || 0);
  return (
    <span className="stars" role="img" aria-label={`${filled} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="stars__icon">
          <Star size={13} fill={i <= filled ? "currentColor" : "none"} strokeWidth={1.5} />
        </span>
      ))}
      {count !== undefined && <span className="stars__count">({count})</span>}
    </span>
  );
}
