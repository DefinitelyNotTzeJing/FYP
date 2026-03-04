<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Book;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    /**
     * Get user's orders
     */
    public function index(Request $request)
    {
        $orders = Order::with(['items.book'])
            ->where('user_id', $request->user()->user_id)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($orders);
    }

    /**
     * Get single order
     */
    public function show(Request $request, $id)
    {
        $order = Order::with(['items.book.author', 'user'])
            ->where('user_id', $request->user()->user_id)
            ->findOrFail($id);

        return response()->json($order);
    }

    /**
     * Create new order (checkout)
     */
    public function store(Request $request)
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.book_id' => 'required|exists:books,book_id',
            'items.*.quantity' => 'required|integer|min:1',
            'shipping_address' => 'required|string',
            'payment_method' => 'required|string',
        ]);

        DB::beginTransaction();

        try {
            $total = 0;
            $orderItems = [];

            // Validate stock and calculate total
            foreach ($request->items as $item) {
                $book = Book::findOrFail($item['book_id']);

                if ($book->available_quantity < $item['quantity']) {
                    return response()->json([
                        'error' => "Insufficient stock for {$book->book_name}. Only {$book->available_quantity} available."
                    ], 400);
                }

                $itemTotal = $book->price * $item['quantity'];
                $total += $itemTotal;

                $orderItems[] = [
                    'book' => $book,
                    'quantity' => $item['quantity'],
                    'price' => $book->price,
                    'total' => $itemTotal,
                ];
            }

            // Create order
            $order = Order::create([
                'user_id' => $request->user()->user_id,
                'order_number' => Order::generateOrderNumber(),
                'total_amount' => $total,
                'status' => 'pending',
                'payment_status' => 'pending',
                'payment_method' => $request->payment_method,
                'shipping_address' => $request->shipping_address,
                'notes' => $request->notes,
            ]);

            // Create order items and update stock
            foreach ($orderItems as $item) {
                OrderItem::create([
                    'order_id' => $order->order_id,
                    'book_id' => $item['book']->book_id,
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'total' => $item['total'],
                ]);

                // Reduce stock
                $item['book']->decrement('available_quantity', $item['quantity']);
            }

            DB::commit();

            return response()->json([
                'message' => 'Order placed successfully',
                'order' => $order->load(['items.book']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Failed to create order',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all orders (Admin only)
     */
    public function getAllOrders(Request $request)
    {
        $query = Order::with(['items.book', 'user']);

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by payment status
        if ($request->has('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        // Search by order number
        if ($request->has('order_number')) {
            $query->where('order_number', 'like', "%{$request->order_number}%");
        }

        $orders = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($orders);
    }

    /**
     * Update order status (Admin only)
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'sometimes|in:pending,processing,shipped,delivered,cancelled',
            'payment_status' => 'sometimes|in:pending,paid,failed',
        ]);

        $order = Order::findOrFail($id);
        $order->update($request->only(['status', 'payment_status']));

        return response()->json([
            'message' => 'Order updated successfully',
            'order' => $order->load(['items.book']),
        ]);
    }
}