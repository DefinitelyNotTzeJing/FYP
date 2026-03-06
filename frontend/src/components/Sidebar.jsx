import "../styles/Sidebar.css";

export default function Sidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  sortValue,
  onSortChange,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar__section">
        <div className="sidebar__title">Categories</div>
        <button
          className={`sidebar__category-btn${!selectedCategory ? " sidebar__category-btn--active" : ""}`}
          onClick={() => onCategoryChange(null)}
        >
          All Books
        </button>
        {categories.map((cat) => (
          <button
            key={cat.category_id}
            className={`sidebar__category-btn${
              selectedCategory === cat.category_id ? " sidebar__category-btn--active" : ""
            }`}
            onClick={() => onCategoryChange(cat.category_id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="sidebar__section">
        <div className="sidebar__title">Sort By</div>
        <select
          className="sidebar__select"
          value={sortValue}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="created_at__desc">Newest First</option>
          <option value="created_at__asc">Oldest First</option>
          <option value="price__asc">Price: Low to High</option>
          <option value="price__desc">Price: High to Low</option>
          <option value="book_name__asc">Title A–Z</option>
          <option value="book_total_rating__desc">Top Rated</option>
        </select>
      </div>
    </aside>
  );
}