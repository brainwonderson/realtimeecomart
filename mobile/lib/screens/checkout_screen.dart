import 'package:flutter/material.dart';
import 'dart:convert';
import '../services/api_service.dart';
import '../models/cart_item.dart';
import '../screens/home_screen.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  List<CartItem> _cartItems = [];
  bool _isLoading = true;
  bool _isSubmitting = false;

  final _addressController = TextEditingController();
  String _shippingOption = 'standard';
  String _paymentMethod = 'qris';

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
        SnackBar(content: Text('Gagal memuat item checkout: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  double get _itemsTotal => _cartItems.fold(0.0, (sum, item) => sum + item.subtotal);
  double get _shippingCost => _shippingOption == 'express' ? 30000.0 : 15000.0;
  double get _grandTotal => _itemsTotal + _shippingCost;

  Future<void> _handlePlaceOrder() async {
    final address = _addressController.text.trim();
    if (address.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Alamat pengiriman wajib diisi')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final userId = ApiService.instance.userId;
      final res = await ApiService.instance.post('/orders/checkout/$userId', {
        'addressId': null,
        'manualAddress': address,
        'shippingOption': _shippingOption,
        'paymentMethod': _paymentMethod,
        'voucherCode': null,
      });

      if (res.statusCode == 200 && mounted) {
        final body = jsonDecode(res.body);
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => AlertDialog(
            backgroundColor: const Color(0xFF1E293B),
            title: const Text('Pembayaran Sukses', style: TextStyle(color: Colors.white)),
            content: Text(
              _paymentMethod == 'cod' 
                  ? 'Pesanan Anda berhasil dibuat dengan metode COD.' 
                  : 'Token Midtrans: ${body["token"] ?? "-"}. Transaksi pesanan berhasil didaftarkan.',
              style: const TextStyle(color: Color(0xFF94A3B8)),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(builder: (_) => const HomeScreen()),
                    (route) => false,
                  );
                },
                child: const Text('OK', style: TextStyle(color: Color(0xFF3B82F6))),
              ),
            ],
          ),
        );
      } else {
        throw Exception(jsonDecode(res.body)['error'] ?? 'Gagal membuat pesanan');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
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

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: const Text('Checkout', style: TextStyle(color: Colors.white)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Section Alamat
            const Text(
              'Alamat Pengiriman',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _addressController,
              maxLines: 3,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Masukkan nama penerima, nomor telepon, dan alamat tujuan pengiriman lengkap...',
                hintStyle: const TextStyle(color: Color(0xFF64748B)),
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
            const SizedBox(height: 24),

            // Section Kurir
            const Text(
              'Metode Pengiriman',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    label: const Text('Regular (Rp 15.000)'),
                    selected: _shippingOption == 'standard',
                    onSelected: (_) => setState(() => _shippingOption = 'standard'),
                    selectedColor: const Color(0xFF3B82F6),
                    backgroundColor: const Color(0xFF1E293B),
                    labelStyle: TextStyle(
                      color: _shippingOption == 'standard' ? Colors.white : const Color(0xFF94A3B8),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ChoiceChip(
                    label: const Text('Express (Rp 30.000)'),
                    selected: _shippingOption == 'express',
                    onSelected: (_) => setState(() => _shippingOption = 'express'),
                    selectedColor: const Color(0xFF3B82F6),
                    backgroundColor: const Color(0xFF1E293B),
                    labelStyle: TextStyle(
                      color: _shippingOption == 'express' ? Colors.white : const Color(0xFF94A3B8),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Section Metode Pembayaran
            const Text(
              'Metode Pembayaran',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                ChoiceChip(
                  label: const Text('QRIS'),
                  selected: _paymentMethod == 'qris',
                  onSelected: (_) => setState(() => _paymentMethod = 'qris'),
                  selectedColor: const Color(0xFF3B82F6),
                  backgroundColor: const Color(0xFF1E293B),
                  labelStyle: TextStyle(color: _paymentMethod == 'qris' ? Colors.white : const Color(0xFF94A3B8)),
                ),
                ChoiceChip(
                  label: const Text('Bank Transfer'),
                  selected: _paymentMethod == 'bank_transfer',
                  onSelected: (_) => setState(() => _paymentMethod = 'bank_transfer'),
                  selectedColor: const Color(0xFF3B82F6),
                  backgroundColor: const Color(0xFF1E293B),
                  labelStyle: TextStyle(color: _paymentMethod == 'bank_transfer' ? Colors.white : const Color(0xFF94A3B8)),
                ),
                ChoiceChip(
                  label: const Text('COD (Bayar di Tempat)'),
                  selected: _paymentMethod == 'cod',
                  onSelected: (_) => setState(() => _paymentMethod = 'cod'),
                  selectedColor: const Color(0xFF3B82F6),
                  backgroundColor: const Color(0xFF1E293B),
                  labelStyle: TextStyle(color: _paymentMethod == 'cod' ? Colors.white : const Color(0xFF94A3B8)),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Section Ringkasan
            const Text(
              'Ringkasan Order',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Column(
                children: [
                  ..._cartItems.map((item) => Padding(
                        padding: const EdgeInsets.only(bottom: 8.0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                '${item.title} (x${item.quantity})',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: Color(0xFF94A3B8)),
                              ),
                            ),
                            Text(
                              'Rp ${item.subtotal.toStringAsFixed(0)}',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      )),
                  const Divider(color: Color(0xFF334155), height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Subtotal Item:', style: TextStyle(color: Color(0xFF94A3B8))),
                      Text('Rp ${_itemsTotal.toStringAsFixed(0)}', style: const TextStyle(color: Colors.white)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Biaya Pengiriman:', style: TextStyle(color: Color(0xFF94A3B8))),
                      Text('Rp ${_shippingCost.toStringAsFixed(0)}', style: const TextStyle(color: Colors.white)),
                    ],
                  ),
                  const Divider(color: Color(0xFF334155), height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Pembayaran:', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      Text(
                        'Rp ${_grandTotal.toStringAsFixed(0)}',
                        style: const TextStyle(color: Color(0xFFF97316), fontWeight: FontWeight.black, fontSize: 16),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Button Submit
            ElevatedButton(
              onPressed: _isSubmitting ? null : _handlePlaceOrder,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _isSubmitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Text('Buat Pesanan & Bayar', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            ),
          ],
        ),
      ),
    );
  }
}
