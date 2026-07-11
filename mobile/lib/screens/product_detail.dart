import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../services/api_service.dart';
import '../models/product.dart';
import '../widgets/star_row.dart';
import 'cart_screen.dart';
import 'chat/chat_view_screen.dart';

class ProductDetailScreen extends StatefulWidget {
  final int productId;

  const ProductDetailScreen({super.key, required this.productId});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  Product? _product;
  bool _isLoading = true;
  int _qty = 1;

  // Variant selections
  String? _selectedColor;
  String? _selectedSize;

  // Media gallery states
  ProductMedia? _activeMedia;
  VideoPlayerController? _videoController;
  bool _isVideoInitialized = false;

  @override
  void initState() {
    super.initState();
    _loadProductDetail();
  }

  @override
  void dispose() {
    _disposeVideoController();
    super.dispose();
  }

  void _disposeVideoController() {
    if (_videoController != null) {
      _videoController!.dispose();
      _videoController = null;
      _isVideoInitialized = false;
    }
  }

  Future<void> _loadProductDetail() async {
    setState(() => _isLoading = true);
    try {
      final json = await ApiService.instance.fetchProductDetail(widget.productId);
      setState(() {
        _product = Product.fromJson(json);
        if (_product!.image.isNotEmpty) {
          _activeMedia = ProductMedia(url: _product!.image, type: 'image');
        } else if (_product!.media.isNotEmpty) {
          _activeMedia = _product!.media.first;
        }
      });
      _setupMediaView();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memuat produk: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _setupMediaView() {
    _disposeVideoController();
    if (_activeMedia != null && _activeMedia!.type == 'video') {
      _videoController = VideoPlayerController.networkUrl(Uri.parse(_activeMedia!.url))
        ..initialize().then((_) {
          setState(() {
            _isVideoInitialized = true;
          });
          _videoController!.setLooping(true);
          _videoController!.play();
        });
    }
  }

  void _setActiveMedia(ProductMedia media) {
    if (_activeMedia?.url == media.url) return;
    setState(() {
      _activeMedia = media;
    });
    _setupMediaView();
  }

  Future<void> _handleAddToCart() async {
    if (_product == null) return;

    // Parsing variant options
    final colors = _product!.colors != null
        ? _product!.colors!.split(',').map((c) => c.trim()).where((c) => c.isNotEmpty).toList()
        : [];
    final sizes = _product!.sizes != null
        ? _product!.sizes!.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList()
        : [];

    if (colors.isNotEmpty && _selectedColor == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Silakan pilih Warna terlebih dahulu')),
      );
      return;
    }
    if (sizes.isNotEmpty && _selectedSize == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Silakan pilih Ukuran terlebih dahulu')),
      );
      return;
    }

    try {
      await ApiService.instance.addToCart(
        _product!.id,
        _qty,
        color: _selectedColor,
        size: _selectedSize,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Produk ditambahkan ke keranjang')),
        );
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const CartScreen()),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFF0F172A),
        body: Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6))),
      );
    }

    if (_product == null) {
      return const Scaffold(
        backgroundColor: Color(0xFF0F172A),
        body: Center(child: Text('Produk tidak ditemukan', style: TextStyle(color: Colors.white))),
      );
    }

    final product = _product!;
    final colorsList = product.colors != null
        ? product.colors!.split(',').map((c) => c.trim()).where((c) => c.isNotEmpty).toList()
        : [];
    final sizesList = product.sizes != null
        ? product.sizes!.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList()
        : [];

    final List<ProductMedia> allMedia = [];
    if (product.image.isNotEmpty) {
      allMedia.add(ProductMedia(url: product.image, type: 'image'));
    }
    allMedia.addAll(product.media);

    final inStock = product.stock > 0;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: Text(product.title, style: const TextStyle(color: Colors.white)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Active Media Box
            Container(
              aspectRatio: 1.0,
              decoration: const BoxDecoration(
                color: Color(0xFF1E293B),
              ),
              child: _activeMedia == null
                  ? const Icon(Icons.image, size: 64, color: Color(0xFF64748B))
                  : _activeMedia!.type == 'video'
                      ? _isVideoInitialized
                          ? AspectRatio(
                              aspectRatio: _videoController!.value.aspectRatio,
                              child: VideoPlayer(_videoController!),
                            )
                          : const Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6)))
                      : Image.network(
                          _activeMedia!.url,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => const Icon(Icons.image, size: 64),
                        ),
            ),

            // Media Thumbnails strip
            if (allMedia.length > 1)
              Container(
                height: 72,
                padding: const EdgeInsets.symmetric(vertical: 8),
                color: const Color(0xFF0F172A),
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: allMedia.length,
                  itemBuilder: (context, index) {
                    final media = allMedia[index];
                    final isActive = _activeMedia?.url == media.url;
                    return GestureDetector(
                      onTap: () => _setActiveMedia(media),
                      child: Container(
                        width: 56,
                        margin: const EdgeInsets.only(right: 8),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isActive ? const Color(0xFF3B82F6) : const Color(0xFF334155),
                            width: isActive ? 2 : 1,
                          ),
                          color: const Color(0xFF1E293B),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: media.type == 'video'
                              ? const Stack(
                                  alignment: Alignment.center,
                                  children: [
                                    Icon(Icons.video_library_outlined, color: Colors.white, size: 24),
                                    Icon(Icons.play_circle_outline, color: Color(0xFF3B82F6), size: 14),
                                  ],
                                )
                              : Image.network(
                                  media.url,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => const Icon(Icons.image, size: 16),
                                ),
                        ),
                      ),
                    );
                  },
                ),
              ),

            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title & Status Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: inStock ? const Color(0xFF10B981).withOpacity(0.15) : Colors.red.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          inStock ? 'Stok Tersedia' : 'Habis',
                          style: TextStyle(
                            color: inStock ? const Color(0xFF10B981) : Colors.redAccent,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Text(
                        product.category,
                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                      )
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    product.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Rating Row
                  const Row(
                    children: [
                      StarRow(rating: 4.8, size: 16),
                      SizedBox(width: 6),
                      Text('4.8', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Pricing Container
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF97316).withOpacity(0.06),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFF97316).withOpacity(0.15)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (product.originalPrice != null && product.originalPrice! > product.price) ...[
                          Row(
                            children: [
                              Text(
                                'Rp ${product.originalPrice!.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  color: Color(0xFF64748B),
                                  fontSize: 14,
                                  textDecoration: TextDecoration.lineThrough,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.red,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  '-${(((product.originalPrice! - product.price) / product.originalPrice!) * 100).round()}%',
                                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                ),
                              )
                            ],
                          ),
                          const SizedBox(height: 4),
                        ],
                        Text(
                          'Rp ${product.price.toStringAsFixed(0)}',
                          style: const TextStyle(
                            color: Color(0xFFF97316),
                            fontSize: 28,
                            fontWeight: FontWeight.black,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Description
                  const Text(
                    'Deskripsi Produk',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    product.description.isEmpty ? 'Tidak ada deskripsi.' : product.description,
                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13, height: 1.6),
                  ),
                  const SizedBox(height: 24),

                  // Colors list
                  if (colorsList.isNotEmpty) ...[
                    Text(
                      'Pilihan Warna: ${_selectedColor ?? "Pilih Warna"}',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: colorsList.map((color) {
                        final isSelected = _selectedColor == color;
                        return ChoiceChip(
                          label: Text(color),
                          selected: isSelected,
                          onSelected: (_) => setState(() => _selectedColor = color),
                          selectedColor: const Color(0xFF3B82F6),
                          backgroundColor: const Color(0xFF1E293B),
                          labelStyle: TextStyle(
                            color: isSelected ? Colors.white : const Color(0xFF94A3B8),
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Sizes list
                  if (sizesList.isNotEmpty) ...[
                    Text(
                      'Pilihan Ukuran: ${_selectedSize ?? "Pilih Ukuran"}',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: sizesList.map((size) {
                        final isSelected = _selectedSize == size;
                        return ChoiceChip(
                          label: Text(size),
                          selected: isSelected,
                          onSelected: (_) => setState(() => _selectedSize = size),
                          selectedColor: const Color(0xFF3B82F6),
                          backgroundColor: const Color(0xFF1E293B),
                          labelStyle: TextStyle(
                            color: isSelected ? Colors.white : const Color(0xFF94A3B8),
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Qty Selector
                  Row(
                    children: [
                      const Text(
                        'Jumlah:',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const SizedBox(width: 16),
                      Container(
                        decoration: BoxDecoration(
                          border: Border.all(color: const Color(0xFF334155)),
                          borderRadius: BorderRadius.circular(8),
                          color: const Color(0xFF1E293B),
                        ),
                        child: Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove, color: Colors.white, size: 16),
                              onPressed: () => setState(() => _qty = _qty > 1 ? _qty - 1 : 1),
                            ),
                            Text(
                              '$_qty',
                              style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                            ),
                            IconButton(
                              icon: const Icon(Icons.add, color: Colors.white, size: 16),
                              onPressed: () => setState(() => _qty++),
                            ),
                          ],
                        ),
                      )
                    ],
                  ),
                  const SizedBox(height: 32),

                  // Bottom Action Buttons
                  Row(
                    children: [
                      if (product.sellerId != null && product.sellerId != ApiService.instance.userId) ...[
                        Expanded(
                          flex: 1,
                          child: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFF3B82F6)),
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: () {
                            if (ApiService.instance.userId == null) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Silakan login terlebih dahulu')),
                              );
                              return;
                            }
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => ChatViewScreen(
                                  otherUserId: product.sellerId!,
                                  otherUserName: product.sellerName ?? 'Penjual',
                                  productId: product.id,
                                ),
                              ),
                            );
                          },
                          child: const Text('Chat', style: TextStyle(color: Color(0xFF3B82F6))),
                        ),
                        const SizedBox(width: 12),
                      ],
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          onPressed: inStock ? _handleAddToCart : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF3B82F6),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('Beli / + Keranjang', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
