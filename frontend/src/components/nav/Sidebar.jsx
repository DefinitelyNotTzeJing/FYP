import { useState } from "react";
import { SlidersHorizontal, X, Settings } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import AssistantBar from "../common/AssistantBar";
import "../../styles/Sidebar.css";

export default function Sidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  sortValue,
  onSortChange,
  onNavigateToAdmin,
  onCommand,
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating filter button — mobile only */}
      <button
        className="sidebar-fab"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="filter-sidebar"
      >
        <SlidersHorizontal size={16} />
        Filters
      </button>

      {/* Backdrop — mobile only */}
      {open && (
        <div
          className="sidebar-overlay"
          role="presentation"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        id="filter-sidebar"
        className={`sidebar${open ? " sidebar--open" : ""}`}
        aria-label="Filters"
      >
        {/* Close button — mobile only */}
        <div className="sidebar__close">
          <button
            className="sidebar__close-btn"
            onClick={() => setOpen(false)}
            aria-label="Close filters"
          >
            <X size={18} />
          </button>
        </div>

        {/* Admin button — visible to admins on both mobile and desktop */}
        {user?.is_admin && (
          <div className="sidebar__section">
            <button
              className="sidebar__admin-btn"
              onClick={() => { onNavigateToAdmin?.(); setOpen(false); }}
            >
              <Settings size={14} /> Admin Panel
            </button>
          </div>
        )}

        <div className="sidebar__section">
          <label className="sidebar__title" htmlFor="sort-select">Sort By</label>
          <select
            id="sort-select"
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
            <option value="featured__desc">Featured ⭐</option>
          </select>
        </div>

        <div className="sidebar__section">
          <div className="sidebar__title">Categories</div>
          <div className="sidebar__category-list">
            <button
              className={`sidebar__category-btn${!selectedCategory ? " sidebar__category-btn--active" : ""}`}
              onClick={() => { onCategoryChange(null); setOpen(false); }}
            >
              All Books
            </button>
            {categories.map((cat) => (
              <button
                key={cat.category_id}
                className={`sidebar__category-btn${
                  selectedCategory === cat.category_id ? " sidebar__category-btn--active" : ""
                }`}
                onClick={() => { onCategoryChange(cat.category_id); setOpen(false); }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {onCommand && (
          <div className="sidebar__section">
            <AssistantBar onCommand={onCommand} />
          </div>
        )}
      </aside>
    </>
  );
}