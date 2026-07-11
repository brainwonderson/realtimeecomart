import 'package:flutter/material.dart';
import '../services/api_service.dart';

class BuyerOrdersScreen extends StatefulWidget {
  const BuyerOrdersScreen({super.key});

  @override
  State<BuyerOrdersScreen> createState() => _BuyerOrdersScreenState();
}

class _BuyerOrdersScreenState extends State<BuyerOrdersScreen> {
  List<dynamic> _orders = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    setState(() => _isLoading = true);
    try {
      final data = await ApiService.instance.fetchBuyerOrders();
      setState(() {
        _orders = data;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memuat pesanan: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _handlePay(int orderId) async {
    try {
      await ApiService.instance.payOrder(orderId);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pembayaran berhasil dilakukan!')),
      );
      _loadOrders();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Pembayaran gagal: $e')),
      );
    }
  }

  Future<void> _handleReceive(int orderId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Konfirmasi', style: TextStyle(color: Colors.white)),
        content: const Text(
          'Apakah Anda yakin barang sudah diterima dengan baik?',
          style: TextStyle(color: Color(0xFF94A3B8)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Batal', style: TextStyle(color: Color(0xFF64748B))),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Ya, Terima', style: TextStyle(color: Color(0xFF3B82F6))),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await ApiService.instance.receiveOrder(orderId);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Pesanan ditandai selesai. Terima kasih!')),
        );
        _loadOrders();
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal menyelesaikan pesanan: $e')),
        );
      }
    }
  }

  Future<void> _handleCancel(int orderId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Batalkan Pesanan', style: TextStyle(color: Colors.white)),
        content: const Text(
          'Apakah Anda yakin ingin membatalkan pesanan ini?',
          style: TextStyle(color: Color(0xFF94A3B8)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Tidak', style: TextStyle(color: Color(0xFF64748B))),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Ya, Batalkan', style: TextStyle(color: Colors.redAccent)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await ApiService.instance.cancelOrder(orderId, 'Dibatalkan oleh pembeli via HP');
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Pesanan berhasil dibatalkan')),
        );
        _loadOrders();
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal membatalkan pesanan: $e')),
        );
      }
    }
  }

  Color _getStatusColor(String status, String paymentStatus) {
    if (status == 'pending' && paymentStatus == 'pending') return Colors.amber;
    if (status == 'pending' && paymentStatus == 'paid') return Colors.blue;
    if (status == 'diproses') return Colors.blueAccent;
    if (status == 'dikirim') return Colors.orange;
    if (status == 'selesai') return Colors.green;
    return Colors.red;
  }

  String _getStatusLabel(String status, String paymentStatus) {
    if (status == 'pending' && paymentStatus == 'pending') return 'Menunggu Pembayaran';
    if (status == 'pending' && paymentStatus == 'paid') return 'Pesanan Baru (Dikemas)';
    if (status == 'diproses') return 'Diproses (Dikemas)';
    if (status == 'dikirim') return 'Dikirim';
    if (status == 'selesai') return 'Selesai';
    return status.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: const Text('Pesanan Saya', style: TextStyle(color: Colors.white)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6)))
          : _orders.isEmpty
              ? const Center(
                  child: Text(
                    'Belum ada riwayat pesanan.',
                    style: TextStyle(color: Color(0xFF94A3B8)),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadOrders,
                  color: const Color(0xFF3B82F6),
                  backgroundColor: const Color(0xFF1E293B),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _orders.length,
                    itemBuilder: (context, index) {
                      final order = _orders[index];
                      final isUnpaid = order['status'] == 'pending' && order['payment_status'] == 'pending';
                      final isShipped = order['status'] == 'dikirim';
                      final trackingNumber = order['tracking_number'];

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
                                  'Order #${order['id']}',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: _getStatusColor(order['status'], order['payment_status']).withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    _getStatusLabel(order['status'], order['payment_status']),
                                    style: TextStyle(
                                      color: _getStatusColor(order['status'], order['payment_status']),
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const Divider(color: Color(0xFF334155), height: 24),
                            Text(
                              'Status Bayar: ${order['payment_status'].toString().toUpperCase()}',
                              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Metode: ${order['payment_method'].toString().toUpperCase()}',
                              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Tanggal: ${order['created_at'].toString().split('T')[0]}',
                              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                            ),
                            
                            if (trackingNumber != null) ...[
                              const SizedBox(height: 12),
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0F172A),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: const Color(0xFF334155)),
                                ),
                                child: Text(
                                  '🚚 Resi Pengiriman: $trackingNumber',
                                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],

                            const SizedBox(height: 12),
                            Text(
                              'Total Pembayaran: Rp ${double.parse(order['total_amount'].toString()).toStringAsFixed(0)}',
                              style: const TextStyle(color: Color(0xFFF97316), fontWeight: FontWeight.bold, fontSize: 14),
                            ),

                            // Actions
                            if (isUnpaid || isShipped) ...[
                              const Divider(color: Color(0xFF334155), height: 24),
                              Row(
                                children: [
                                  if (isUnpaid) ...[
                                    Expanded(
                                      child: ElevatedButton.icon(
                                        onPressed: () => _handlePay(order['id']),
                                        icon: const Icon(Icons.payment, size: 16),
                                        label: const Text('Bayar Dummy', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: const Color(0xFF3B82F6),
                                          foregroundColor: Colors.white,
                                          padding: const EdgeInsets.symmetric(vertical: 10),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    OutlinedButton(
                                      onPressed: () => _handleCancel(order['id']),
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: Colors.redAccent,
                                        side: const BorderSide(color: Colors.redAccent),
                                        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                      child: const Text('Batal', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                    ),
                                  ],
                                  if (isShipped)
                                    Expanded(
                                      child: ElevatedButton.icon(
                                        onPressed: () => _handleReceive(order['id']),
                                        icon: const Icon(Icons.done_all, size: 16),
                                        label: const Text('Pesanan Diterima', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Colors.green,
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
                ),
    );
  }
}
