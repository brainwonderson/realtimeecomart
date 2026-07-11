import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/product.dart';
import '../widgets/star_row.dart';
import 'product_detail.dart';
import 'cart_screen.dart';
import 'chat/chat_rooms_screen.dart';
import 'seller/seller_dashboard.dart';
import 'auth/login_screen.dart';
import 'buyer_orders_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _searchController = TextEditingController();
  String _selectedCategory = '';
  List<Product> _products = [];
  bool _isLoading = true;

  final List<String> _categories = [
    'Semua',
    'Audio',
    'Wearables',
    'Bag',
    'Elektronik',
    'Fashion',
    'Kecantikan',
  ];

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  Future<void> _loadProducts() async {
    setState(() => _isLoading = true);
    try {
      final category = _selectedCategory == 'Semua' ? '' : _selectedCategory;
      final rawList = await ApiService.instance.fetchProducts(
        q: _searchController.text.trim(),
        category: category,
      );
      setState(() {
        _products = rawList.map((json) => Product.fromJson(json)).toList();
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengambil produk: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _handleLogout() async {
    await ApiService.instance.clearSession();
    if (mounted) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLoggedIn = ApiService.instance.userId != null;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: const Text(
          '🛍️ EcoMart',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        actions: [
          if (isLoggedIn) ...[
            IconButton(
              icon: const Icon(Icons.chat_bubble_outline, color: Colors.white),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ChatRoomsScreen()),
                );
              },
            ),
            IconButton(
              icon: const Icon(Icons.shopping_cart_outlined, color: Colors.white),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const CartScreen()),
                ).then((_) => _loadProducts()); // Reload on return
              },
            ),
            IconButton(
              icon: const Icon(Icons.receipt_long_outlined, color: Colors.white),
              tooltip: 'Pesanan Saya',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const BuyerOrdersScreen()),
                );
              },
            ),
            IconButton(
              icon: const Icon(Icons.storefront_outlined, color: Colors.white),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const SellerDashboard()),
                );
              },
            ),
            IconButton(
              icon: const Icon(Icons.logout, color: Colors.redAccent),
              onPressed: _handleLogout,
            ),
          ] else
            TextButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                );
              },
              child: const Text('Login', style: TextStyle(color: Color(0xFF3B82F6))),
            )
        ],
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchController,
              onSubmitted: (_) => _loadProducts(),
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Cari produk, brand, kategori...',
                hintStyle: const TextStyle(color: Color(0xFF64748B)),
                prefixIcon: const Icon(Icons.search, color: Color(0xFF64748B)),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.clear, color: Color(0xFF64748B)),
                  onPressed: () {
                    _searchController.clear();
                    _loadProducts();
                  },
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF1E293B)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF3B82F6)),
                ),
                filled: true,
                fillColor: const Color(0xFF1E293B),
              ),
            ),
          ),

          // Categories horizontal scrolling
          SizedBox(
            height: 40,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _categories.length,
              itemBuilder: (context, index) {
                final cat = _categories[index];
                final isSelected = (_selectedCategory == cat) || 
                                   (_selectedCategory.isEmpty && cat == 'Semua');
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: ChoiceChip(
                    label: Text(cat),
                    selected: isSelected,
                    onSelected: (selected) {
                      setState(() {
                        _selectedCategory = cat == 'Semua' ? '' : cat;
                      });
                      _loadProducts();
                    },
                    selectedColor: const Color(0xFF3B82F6),
                    backgroundColor: const Color(0xFF1E293B),
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : const Color(0xFF94A3B8),
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 16),

          // Catalog Products Grid
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6)))
                : _products.isEmpty
                    ? const Center(
                        child: Text(
                          'Produk tidak ditemukan.',
                          style: TextStyle(color: Color(0xFF94A3B8)),
                        ),
                      )
                    : GridView.builder(
                        padding: const EdgeInsets.all(16),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 0.72,
                          crossAxisSpacing: 16,
                          mainAxisSpacing: 16,
                        ),
                        itemCount: _products.length,
                        itemBuilder: (context, index) {
                          final prod = _products[index];
                          return GestureDetector(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => ProductDetailScreen(productId: prod.id),
                                ),
                              );
                            },
                            child: Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFF1E293B),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFF334155)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Expanded(
                                    child: ClipRRect(
                                      borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                                      child: prod.image.isNotEmpty
                                          ? Image.network(
                                              prod.image,
                                              fit: BoxShape.fill.toString() == 'BoxShape.fill' ? BoxFit.cover : BoxFit.contain,
                                              errorBuilder: (_, __, ___) => const Icon(Icons.image, size: 48),
                                            )
                                          : const Icon(Icons.image, size: 48),
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.all(12),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          prod.title,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'Rp ${prod.price.toStringAsFixed(0)}',
                                          style: const TextStyle(
                                            color: Color(0xFFF97316),
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13,
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Row(
                                          children: [
                                            const StarRow(rating: 4.8, size: 12),
                                            const SizedBox(width: 4),
                                            Text(
                                              '(${prod.stock})',
                                              style: const TextStyle(
                                                color: Color(0xFF64748B),
                                                fontSize: 11,
                                              ),
                                            )
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
