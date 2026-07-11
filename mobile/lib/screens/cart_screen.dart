import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/cart_item.dart';
import 'checkout_screen.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  List<CartItem> _cartItems = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadCart();
  }

  Future<void> _loadCart() async {
    setState(() => _isLoading = true);
    try {
      final rawList = await ApiService.instance.fetchCart();
      setState(() {
        _cartItems = rawList.map((json) => CartItem.fromJson(json)).toList();
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengambil keranjang: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _updateQty(CartItem item, int nextQty) async {
    try {
      if (nextQty < 1) {
        await _removeItem(item);
        return;
      }
      await ApiService.instance.updateCartQuantity(item.id, nextQty);
      _loadCart();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengubah jumlah: $e')),
      );
    }
  }

  Future<void> _removeItem(CartItem item) async {
    try {
      await ApiService.instance.removeCartItem(item.id);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Produk dihapus dari keranjang')),
      );
      _loadCart();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal menghapus produk: $e')),
      );
    }
  }

  double get _totalPrice => _cartItems.fold(0.0, (sum, item) => sum + item.subtotal);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: const Text('Keranjang Belanja', style: TextStyle(color: Colors.white)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6)))
          : _cartItems.isEmpty
              ? const Center(
                  child: Text(
                    'Keranjang belanja kosong.',
                    style: TextStyle(color: Color(0xFF94A3B8)),
                  ),
                )
              : Column(
                  children: [
                    Expanded(
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _cartItems.length,
                        itemBuilder: (context, index) {
                          final item = _cartItems[index];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFF1E293B),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFF334155)),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Product Image
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Container(
                                    width: 64,
                                    height: 64,
                                    color: const Color(0xFF0F172A),
                                    child: item.image.isNotEmpty
                                        ? Image.network(
                                            item.image,
                                            fit: BoxFit.cover,
                                            errorBuilder: (_, __, ___) => const Icon(Icons.image),
                                          )
                                        : const Icon(Icons.image),
                                  ),
                                ),
                                const SizedBox(width: 12),

                                // Product Info
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.title,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Rp ${item.price.toStringAsFixed(0)}',
                                        style: const TextStyle(
                                          color: Color(0xFF94A3B8),
                                          fontSize: 12,
                                        ),
                                      ),
                                      // Render Selected Variants
                                      if (item.selectedColor != null || item.selectedSize != null) ...[
                                        const SizedBox(height: 4),
                                        Wrap(
                                          spacing: 6,
                                          children: [
                                            if (item.selectedColor != null)
                                              Text(
                                                'Warna: ${item.selectedColor}',
                                                style: const TextStyle(
                                                  color: Color(0xFF3B82F6),
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            if (item.selectedColor != null && item.selectedSize != null)
                                              const Text('|', style: TextStyle(color: Color(0xFF334155), fontSize: 11)),
                                            if (item.selectedSize != null)
                                              Text(
                                                'Ukuran: ${item.selectedSize}',
                                                style: const TextStyle(
                                                  color: Color(0xFF3B82F6),
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                          ],
                                        ),
                                      ],
                                      const SizedBox(height: 12),

                                      // Qty Actions Row
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Container(
                                            height: 32,
                                            decoration: BoxDecoration(
                                              border: Border.all(color: const Color(0xFF334155)),
                                              borderRadius: BorderRadius.circular(6),
                                              color: const Color(0xFF0F172A),
                                            ),
                                            child: Row(
                                              children: [
                                                IconButton(
                                                  icon: const Icon(Icons.remove, color: Colors.white, size: 12),
                                                  padding: EdgeInsets.zero,
                                                  onPressed: () => _updateQty(item, item.quantity - 1),
                                                ),
                                                Text(
                                                  '${item.quantity}',
                                                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                                                ),
                                                IconButton(
                                                  icon: const Icon(Icons.add, color: Colors.white, size: 12),
                                                  padding: EdgeInsets.zero,
                                                  onPressed: () => _updateQty(item, item.quantity + 1),
                                                ),
                                              ],
                                            ),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 20),
                                            onPressed: () => _removeItem(item),
                                          ),
                                        ],
                                      )
                                    ],
                                  ),
                                )
                              ],
                            ),
                          );
                        },
                      ),
                    ),

                    // Bottom Bar
                    Container(
                      padding: const EdgeInsets.all(20),
                      color: const Color(0xFF1E293B),
                      child: SafeArea(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Text('Total Harga:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                                Text(
                                  'Rp ${_totalPrice.toStringAsFixed(0)}',
                                  style: const TextStyle(
                                    color: Color(0xFFF97316),
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            ElevatedButton(
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const CheckoutScreen()),
                                );
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF3B82F6),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              child: const Text('Checkout', style: TextStyle(fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      ),
                    )
                  ],
                ),
    );
  }
}
