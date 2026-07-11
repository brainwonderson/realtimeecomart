import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Use 192.168.137.1 for Laptop Hotspot, or 10.0.2.2 for Android Emulator
  static const String baseUrl = 'http://192.168.137.1:4000/api';

  static final ApiService instance = ApiService._internal();
  ApiService._internal();

  String? _token;
  int? userId;
  String? userName;
  String? userRole;
  String? storeId;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
    userId = prefs.getInt('userId');
    userName = prefs.getString('userName');
    userRole = prefs.getString('userRole');
    storeId = prefs.getString('storeId');
  }

  Future<void> _saveSession(String token, Map<String, dynamic> userMap) async {
    _token = token;
    userId = userMap['id'];
    userName = userMap['name'];
    userRole = userMap['role'];
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
    await prefs.setInt('userId', userId!);
    await prefs.setString('userName', userName ?? '');
    await prefs.setString('userRole', userRole ?? 'BUYER');
    
    if (userMap['store'] != null) {
      storeId = userMap['store']['id'].toString();
      await prefs.setString('storeId', storeId!);
    } else {
      storeId = null;
      await prefs.remove('storeId');
    }
  }

  Future<void> clearSession() async {
    _token = null;
    userId = null;
    userName = null;
    userRole = null;
    storeId = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }

  Map<String, String> _headers() {
    final headers = {'Content-Type': 'application/json'};
    if (_token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  // --- Network Methods ---
  Future<http.Response> get(String path) async {
    return await http.get(Uri.parse('$baseUrl$path'), headers: _headers());
  }

  Future<http.Response> post(String path, Map<String, dynamic> body) async {
    return await http.post(
      Uri.parse('$baseUrl$path'),
      headers: _headers(),
      body: jsonEncode(body),
    );
  }

  Future<http.Response> patch(String path, Map<String, dynamic> body) async {
    return await http.patch(
      Uri.parse('$baseUrl$path'),
      headers: _headers(),
      body: jsonEncode(body),
    );
  }

  Future<http.Response> delete(String path) async {
    return await http.delete(Uri.parse('$baseUrl$path'), headers: _headers());
  }

  // --- Auth APIs ---
  Future<bool> login(String email, String password) async {
    final res = await post('/auth/login', {'email': email, 'password': password});
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      await _saveSession(data['token'], data['user']);
      return true;
    }
    throw Exception(jsonDecode(res.body)['error'] ?? 'Gagal login');
  }

  Future<bool> register(String name, String email, String password) async {
    final res = await post('/auth/register', {
      'name': name,
      'email': email,
      'password': password,
      'role': 'BUYER',
    });
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      await _saveSession(data['token'], data['user']);
      return true;
    }
    throw Exception(jsonDecode(res.body)['error'] ?? 'Gagal registrasi');
  }

  Future<void> becomeSeller(String storeName, String storeDescription) async {
    final res = await post('/account/become-seller', {
      'store_name': storeName,
      'store_description': storeDescription,
    });
    if (res.statusCode != 200) {
      throw Exception(jsonDecode(res.body)['error'] ?? 'Gagal mendaftar toko');
    }
    // Refresh session to populate storeId and role
    final meRes = await get('/account/me');
    if (meRes.statusCode == 200) {
      final meData = jsonDecode(meRes.body);
      final prefs = await SharedPreferences.getInstance();
      userRole = meData['role'];
      await prefs.setString('userRole', userRole!);
      if (meData['store'] != null) {
        storeId = meData['store']['id'].toString();
        await prefs.setString('storeId', storeId!);
      }
    }
  }

  // --- Product APIs ---
  Future<List<dynamic>> fetchProducts({String? q, String? category}) async {
    String path = '/products?limit=50';
    if (q != null && q.isNotEmpty) path += '&q=${Uri.encodeComponent(q)}';
    if (category != null && category.isNotEmpty) path += '&category=${Uri.encodeComponent(category)}';
    
    final res = await get(path);
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    throw Exception('Gagal memuat produk');
  }

  Future<Map<String, dynamic>> fetchProductDetail(int id) async {
    final res = await get('/products/$id');
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    throw Exception('Gagal memuat detail produk');
  }

  // --- Cart APIs ---
  Future<List<dynamic>> fetchCart() async {
    if (userId == null) return [];
    final res = await get('/cart/$userId');
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    throw Exception('Gagal memuat keranjang');
  }

  Future<void> addToCart(int productId, int quantity, {String? color, String? size}) async {
    if (userId == null) throw Exception('Silakan login terlebih dahulu');
    final res = await post('/cart/$userId', {
      'productId': productId,
      'quantity': quantity,
      'selectedColor': color,
      'selectedSize': size,
    });
    if (res.statusCode != 200) {
      throw Exception(jsonDecode(res.body)['error'] ?? 'Gagal menambahkan ke keranjang');
    }
  }

  Future<void> updateCartQuantity(int cartItemId, int nextQty) async {
    final res = await patch('/cart/item/$cartItemId', {'quantity': nextQty});
    if (res.statusCode != 200) {
      throw Exception('Gagal mengubah jumlah');
    }
  }

  Future<void> removeCartItem(int cartItemId) async {
    final res = await delete('/cart/item/$cartItemId');
    if (res.statusCode != 200) {
      throw Exception('Gagal menghapus item');
    }
  }

  // --- Chat APIs ---
  Future<List<dynamic>> fetchChatRooms() async {
    final res = await get('/chats/rooms');
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    throw Exception('Gagal memuat daftar chat');
  }

  Future<List<dynamic>> fetchChatMessages(int otherUserId) async {
    final res = await get('/chats/messages/$otherUserId');
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    throw Exception('Gagal memuat pesan obrolan');
  }

  Future<Map<String, dynamic>> sendChatMessage(int receiverId, String message, {int? productId}) async {
    final res = await post('/chats', {
      'receiverId': receiverId,
      'message': message,
      'productId': productId,
    });
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    throw Exception('Gagal mengirim pesan');
  }

  // --- Seller APIs ---
  Future<List<dynamic>> fetchSellerProducts() async {
    final res = await get('/seller/products');
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    throw Exception('Gagal memuat produk seller');
  }

  Future<void> createProduct(Map<String, dynamic> data) async {
    final res = await post('/seller/products', data);
    if (res.statusCode != 200) {
      throw Exception(jsonDecode(res.body)['error'] ?? 'Gagal membuat produk');
    }
  }

  Future<List<dynamic>> fetchSellerOrders() async {
    final res = await get('/seller/orders');
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    throw Exception('Gagal memuat pesanan masuk');
  }

  // --- Buyer Order APIs ---
  Future<List<dynamic>> fetchBuyerOrders() async {
    if (userId == null) return [];
    final res = await get('/orders/$userId');
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    throw Exception('Gagal memuat riwayat pesanan');
  }

  Future<void> payOrder(int orderId) async {
    final res = await post('/orders/$orderId/pay', {});
    if (res.statusCode != 200) {
      throw Exception(jsonDecode(res.body)['error'] ?? 'Gagal melakukan pembayaran');
    }
  }

  Future<void> receiveOrder(int orderId) async {
    final res = await post('/orders/$orderId/receive', {});
    if (res.statusCode != 200) {
      throw Exception(jsonDecode(res.body)['error'] ?? 'Gagal menandai barang diterima');
    }
  }

  Future<void> cancelOrder(int orderId, String reason) async {
    final res = await post('/orders/$orderId/cancel', {'reason': reason});
    if (res.statusCode != 200) {
      throw Exception(jsonDecode(res.body)['error'] ?? 'Gagal membatalkan pesanan');
    }
  }

  // --- Seller Order APIs ---
  Future<void> updateOrderStatus(int orderId, String status, {String? trackingNumber}) async {
    final Map<String, dynamic> body = {
      'status': status,
      'note': 'Status diubah menjadi $status oleh penjual via Mobile App'
    };
    if (trackingNumber != null) {
      body['tracking_number'] = trackingNumber;
    }
    final res = await patch('/orders/$orderId/status', body);
    if (res.statusCode != 200) {
      throw Exception(jsonDecode(res.body)['error'] ?? 'Gagal mengubah status');
    }
  }
}
