import 'dart:convert';

class ProductMedia {
  final String url;
  final String type; // 'image' or 'video'

  ProductMedia({required this.url, required this.type});

  factory ProductMedia.fromJson(Map<String, dynamic> json) {
    return ProductMedia(
      url: json['url'] ?? '',
      type: json['type'] ?? 'image',
    );
  }

  Map<String, dynamic> toJson() => {
    'url': url,
    'type': type,
  };
}

class Product {
  final int id;
  final int? sellerId;
  final String title;
  final String description;
  final double price;
  final double? originalPrice;
  final int stock;
  final String image;
  final String category;
  final String status;
  final String? colors;
  final String? sizes;
  final List<ProductMedia> media;
  final int? storeId;
  final String? storeName;
  final String? sellerName;

  Product({
    required this.id,
    this.sellerId,
    required this.title,
    required this.description,
    required this.price,
    this.originalPrice,
    required this.stock,
    required this.image,
    required this.category,
    required this.status,
    this.colors,
    this.sizes,
    required this.media,
    this.storeId,
    this.storeName,
    this.sellerName,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    var mediaList = <ProductMedia>[];
    if (json['media'] != null) {
      try {
        var rawMedia = json['media'];
        List<dynamic> list = [];
        if (rawMedia is String) {
          list = jsonDecode(rawMedia);
        } else if (rawMedia is List) {
          list = rawMedia;
        }
        mediaList = list.map((item) => ProductMedia.fromJson(item)).toList();
      } catch (e) {
        print("Error parsing media list: $e");
      }
    }

    return Product(
      id: json['id'],
      sellerId: json['seller_id'],
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      price: double.parse((json['price'] ?? 0).toString()),
      originalPrice: json['original_price'] != null ? double.parse(json['original_price'].toString()) : null,
      stock: json['stock'] ?? 0,
      image: json['image'] ?? '',
      category: json['category'] ?? '',
      status: json['status'] ?? 'ACTIVE',
      colors: json['colors'],
      sizes: json['sizes'],
      media: mediaList,
      storeId: json['store_id'],
      storeName: json['store_name'],
      sellerName: json['seller_name'],
    );
  }
}
