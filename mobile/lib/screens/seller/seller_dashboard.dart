import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../models/product.dart';
import 'add_product_screen.dart';

class SellerDashboard extends StatefulWidget {
  const SellerDashboard({super.key});

  @override
  State<SellerDashboard> createState() => _SellerDashboardState();
}

class _SellerDashboardState extends State<SellerDashboard> with SingleTickerProviderStateMixin {
  TabController? _tabController;
  bool _isLoading = true;
  bool _registeringStore = false;

  // Store profile
  final _storeNameController = TextEditingController();
  final _storeDescController = TextEditingController();

  List<Product> _sellerProducts = [];
  List<dynamic> _incomingOrders = [];

  @override
  void initState() {
    super.initState();
    _checkStoreAndLoad();
  }

  void _checkStoreAndLoad() {
    final hasStore = ApiService.instance.storeId != null;
    if (hasStore) {
      _tabController = TabController(length: 2, vsync: this);
      _loadDashboardData();
    } else {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadDashboardData() async {
    setState(() => _isLoading = true);
    try {
      final productsData = await ApiService.instance.fetchSellerProducts();
      final ordersData = await ApiService.instance.fetchSellerOrders();

      setState(() {
        _sellerProducts = productsData.map((json) => Product.fromJson(json)).toList();
        _incomingOrders = ordersData;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memuat dashboard data: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _handleRegisterStore() async {
    final name = _storeNameController.text.trim();
    final desc = _storeDescController.text.trim();

    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nama toko wajib diisi')),
      );
      return;
    }

    setState(() => _registeringStore = true);
    try {
      await ApiService.instance.becomeSeller(name, desc);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pendaftaran toko berhasil!')),
      );
      _checkStoreAndLoad();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal membuat toko: $e')),
      );
    } finally {
      setState(() => _registeringStore = false);
    }
  }

  Future<void> _handleUpdateStatus(int orderId, String status, {String? trackingNumber}) async {
    try {
      await ApiService.instance.updateOrderStatus(orderId, status, trackingNumber: trackingNumber);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Pesanan berhasil diupdate ke status: $status')),
      );
      _loadDashboardData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memperbarui status: $e')),
      );
    }
  }

  void _showShippingDialog(int orderId) {
    final courierController = TextEditingController(text: 'JNE');
    final resiController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Kirim Pesanan', style: TextStyle(color: Colors.white)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: courierController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Kurir',
                labelStyle: TextStyle(color: Color(0xFF64748B)),
                enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF334155))),
                focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF3B82F6))),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: resiController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Nomor Resi',
                labelStyle: TextStyle(color: Color(0xFF64748B)),
                enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF334155))),
                focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF3B82F6))),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal', style: TextStyle(color: Color(0xFF64748B))),
          ),
          TextButton(
            onPressed: () {
              final courier = courierController.text.trim();
              final resi = resiController.text.trim();
              if (courier.isEmpty || resi.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Kurir dan No. Resi wajib diisi')),
                );
                return;
              }
              Navigator.pop(context);
              _handleUpdateStatus(orderId, 'dikirim', trackingNumber: '$courier - $resi');
            },
            child: const Text('Kirim', style: TextStyle(color: Color(0xFF3B82F6))),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFF0F172A),
        body: Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6))),
      );
    }

    final hasStore = ApiService.instance.storeId != null;

    // View to Register Store
    if (!hasStore) {
      return Scaffold(
        backgroundColor: const Color(0xFF0F172A),
        appBar: AppBar(
          backgroundColor: const Color(0xFF1E293B),
          elevation: 0,
          title: const Text('Buka Toko Seller', style: TextStyle(color: Colors.white)),
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 20),
              const Icon(Icons.storefront, size: 80, color: Color(0xFF3B82F6)),
              const SizedBox(height: 24),
              const Text(
                'Mulai Berjualan di EcoMart',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Buat profil toko Anda dan daftarkan produk untuk mulai menerima transaksi pembelian.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
              ),
              const SizedBox(height: 40),
              TextField(
                controller: _storeNameController,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Nama Toko',
                  labelStyle: const TextStyle(color: Color(0xFF64748B)),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF334155)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF3B82F6)),
                  ),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _storeDescController,
                maxLines: 3,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Deskripsi Toko',
                  labelStyle: const TextStyle(color: Color(0xFF64748B)),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF334155)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF3B82F6)),
                  ),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                ),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _registeringStore ? null : _handleRegisterStore,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF3B82F6),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _registeringStore
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Text('Aktifkan Toko Saya', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: const Text('Dashboard Seller', style: TextStyle(color: Colors.white)),
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF3B82F6),
          unselectedLabelColor: const Color(0xFF94A3B8),
          indicatorColor: const Color(0xFF3B82F6),
          tabs: const [
            Tab(text: 'Produk Saya', icon: Icon(Icons.inventory_2_outlined)),
            Tab(text: 'Pesanan Masuk', icon: Icon(Icons.receipt_long_outlined)),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFF3B82F6),
        foregroundColor: Colors.white,
        child: const Icon(Icons.add),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const AddProductScreen()),
          ).then((_) => _loadDashboardData());
        },
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Products List
          _sellerProducts.isEmpty
              ? const Center(
                  child: Text('Belum ada produk terdaftar.', style: TextStyle(color: Color(0xFF94A3B8))),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _sellerProducts.length,
                  itemBuilder: (context, index) {
                    final prod = _sellerProducts[index];
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF334155)),
                      ),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              width: 56,
                              height: 56,
                              color: const Color(0xFF0F172A),
                              child: prod.image.isNotEmpty
                                  ? Image.network(prod.image, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.image))
                                  : const Icon(Icons.image),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  prod.title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Rp ${prod.price.toStringAsFixed(0)} · Stok: ${prod.stock}',
                                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: prod.status == 'ACTIVE' ? Colors.green.withOpacity(0.15) : Colors.amber.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              prod.status,
                              style: TextStyle(
                                color: prod.status == 'ACTIVE' ? Colors.green : Colors.amber,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          )
                        ],
                      ),
                    );
                  },
                ),

          // Tab 2: Orders List
          _incomingOrders.isEmpty
              ? const Center(
                  child: Text('Belum ada pesanan masuk.', style: TextStyle(color: Color(0xFF94A3B8))),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _incomingOrders.length,
                  itemBuilder: (context, index) {
                    final order = _incomingOrders[index];
                    final orderId = order['order_id'] ?? order['id'];
                    final status = order['status'] ?? 'pending';
                    final paymentStatus = order['payment_status'] ?? 'pending';
                    final trackingNumber = order['tracking_number'];

                    final hasColor = order['selected_color'] != null;
                    final hasSize = order['selected_size'] != null;

                    // Status details mapping
                    Color statusColor = Colors.grey;
                    String statusText = status.toString().toUpperCase();

                    if (status == 'pending' && paymentStatus == 'pending') {
                      statusColor = Colors.grey;
                      statusText = 'Belum Bayar';
                    } else if (status == 'pending' && paymentStatus == 'paid') {
                      statusColor = Colors.blue;
                      statusText = 'Pesanan Baru (Perlu Dikemas)';
                    } else if (status == 'diproses') {
                      statusColor = Colors.amber;
                      statusText = 'Diproses (Dikemas)';
                    } else if (status == 'dikirim') {
                      statusColor = Colors.orange;
                      statusText = 'Dikirim';
                    } else if (status == 'selesai') {
                      statusColor = Colors.green;
                      statusText = 'Selesai';
                    } else if (status == 'dibatalkan') {
                      statusColor = Colors.red;
                      statusText = 'Dibatalkan';
                    }

                    return Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF334155)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Order #$orderId',
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: statusColor.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  statusText,
                                  style: TextStyle(
                                    color: statusColor,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              )
                            ],
                          ),
                          const Divider(color: Color(0xFF334155), height: 24),
                          Text(
                            'Produk: ${order['title']}',
                            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                          ),
                          
                          // Render variant requested
                          if (hasColor || hasSize) ...[
                            const SizedBox(height: 4),
                            Wrap(
                              spacing: 6,
                              children: [
                                if (hasColor)
                                  Text(
                                    'Warna: ${order['selected_color']}',
                                    style: const TextStyle(color: Color(0xFF3B82F6), fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                if (hasColor && hasSize)
                                  const Text('|', style: TextStyle(color: Color(0xFF334155), fontSize: 11)),
                                if (hasSize)
                                  Text(
                                    'Ukuran: ${order['selected_size']}',
                                    style: const TextStyle(color: Color(0xFF3B82F6), fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                              ],
                            ),
                          ],
                          
                          const SizedBox(height: 6),
                          Text(
                            'Qty: ${order['quantity']} · Total: Rp ${(double.parse(order['unit_price'].toString()) * double.parse(order['quantity'].toString())).toStringAsFixed(0)}',
                            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                          ),
                          
                          if (trackingNumber != null) ...[
                            const SizedBox(height: 8),
                            Text(
                              'Resi: $trackingNumber',
                              style: const TextStyle(color: Color(0xFF10B981), fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ],

                          // Action Buttons
                          if ((status == 'pending' && paymentStatus == 'paid') || status == 'diproses') ...[
                            const Divider(color: Color(0xFF334155), height: 24),
                            Row(
                              children: [
                                if (status == 'pending' && paymentStatus == 'paid')
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      onPressed: () => _handleUpdateStatus(orderId, 'diproses'),
                                      icon: const Icon(Icons.inventory_2_outlined, size: 16),
                                      label: const Text('Kemas Pesanan', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF3B82F6),
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(vertical: 10),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                    ),
                                  ),
                                if (status == 'diproses')
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      onPressed: () => _showShippingDialog(orderId),
                                      icon: const Icon(Icons.local_shipping_outlined, size: 16),
                                      label: const Text('Kirim Pesanan (Resi)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.orange,
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(vertical: 10),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    );
                  },
                ),
        ],
      ),
    );
  }
}
