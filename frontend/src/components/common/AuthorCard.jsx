import "../../styles/AuthorCard.css";

export default function AuthorCard({ author, onClick }) {
  const initials = author.name?.slice(0, 2).toUpperCase();

  return (
    <div className="author-card" onClick={() => onClick(author)}>
      <div className="author-card__avatar">
        {author.image_url
          ? <img src={author.image_url} alt={author.name} />
          : <span>{initials}</span>
        }
      </div>
      <div className="author-card__info">
        <div className="author-card__label">Author</div>
        <div className="author-card__name">{author.name}</div>
        {author.bio && (
          <div className="author-card__bio">{author.bio}</div>
        )}
      </div>
      <div className="author-card__chevron">›</div>
    </div>
  );
}