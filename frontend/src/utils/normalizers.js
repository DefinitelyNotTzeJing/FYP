import { createBookCoverDataUrl, shouldUseGeneratedCover } from './bookCovers';

export function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.user_id ?? user.id,
    email: user.email ?? '',
    username: user.username ?? user.name ?? '',
    displayName: user.username ?? user.name ?? '',
    isAdmin: Boolean(user.is_admin ?? user.role === 'admin'),
    profile: user.profile ?? {},
  };
}

export function normalizeBook(book) {
  if (!book) {
    return null;
  }

  const authorName =
    typeof book.author === 'string'
      ? book.author
      : book.author?.name ?? book.author?.author_name ?? 'Unknown Author';
  const title = book.book_name ?? book.title ?? 'Untitled Book';
  const category = book.category?.name ?? book.category?.slug ?? book.category ?? '';
  const remoteImageUrl = book.cover_image_url ?? book.cover_image ?? '';
  const fallbackImageUrl = createBookCoverDataUrl({
    title,
    author: authorName,
    category: category || 'Book',
  });

  return {
    id: book.book_id ?? book.id,
    title,
    description: book.book_description ?? book.description ?? '',
    author: authorName,
    authorId: book.author_id ?? book.author?.author_id ?? null,
    category,
    categoryId: book.category_id ?? book.category?.category_id ?? null,
    price: Number(book.price ?? 0),
    stock: Number(book.available_quantity ?? book.stock ?? 0),
    imageUrl: shouldUseGeneratedCover(remoteImageUrl) ? fallbackImageUrl : remoteImageUrl,
    fallbackImageUrl,
    featured: Boolean(book.is_featured),
    rating: Number(book.book_total_rating ?? book.rating ?? 0),
    ratingCount: Number(book.book_number_of_rating ?? book.reviews_count ?? 0),
    reviews: book.reviews ?? [],
    ratings: book.ratings ?? [],
    raw: book,
  };
}

export function normalizeOrderItem(item) {
  if (!item) {
    return null;
  }

  const book = normalizeBook(item.book ?? item);
  const quantity = Number(item.quantity ?? 1);
  const price = Number(item.price ?? book.price ?? 0);

  return {
    id: item.order_item_id ?? item.id ?? book.id,
    book,
    bookId: book.id,
    quantity,
    price,
    total: Number(item.total ?? price * quantity),
  };
}

export function normalizeOrder(order) {
  if (!order) {
    return null;
  }

  return {
    id: order.order_id ?? order.id,
    orderNumber: order.order_number ?? `ORD-${order.order_id ?? order.id}`,
    totalAmount: Number(order.total_amount ?? 0),
    status: order.status ?? 'pending',
    paymentStatus: order.payment_status ?? 'pending',
    paymentMethod: order.payment_method ?? 'cash',
    shippingAddress: order.shipping_address ?? '',
    notes: order.notes ?? '',
    createdAt: order.created_at ?? '',
    user: normalizeUser(order.user),
    items: Array.isArray(order.items) ? order.items.map(normalizeOrderItem) : [],
  };
}

export function normalizePaginatedResponse(response, mapper) {
  const items = Array.isArray(response?.data) ? response.data.map(mapper) : [];

  return {
    items,
    data: items,
    meta: {
      currentPage: response?.current_page ?? 1,
      lastPage: response?.last_page ?? 1,
      perPage: Number(response?.per_page ?? items.length ?? 0),
      total: Number(response?.total ?? items.length ?? 0),
    },
    raw: response,
  };
}
