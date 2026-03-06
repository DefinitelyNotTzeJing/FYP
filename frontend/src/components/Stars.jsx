export default function Stars({ rating, count }) {
  const filled = Math.round(rating || 0);
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="stars__icon">
          {i <= filled ? "★" : "☆"}
        </span>
      ))}
      {count > 0 && <span>({count})</span>}
    </span>
  );
}