class CartItem {
  final int id;
  final int productId;
  final int quantity;
  final String title;
  final double price;
  final String image;
  final String category;
  final String? selectedColor;
  final String? selectedSize;

  CartItem({
    required this.id,
    required this.productId,
    required this.quantity,
    required this.title,
    required this.price,
    required this.image,
    required this.category,
    this.selectedColor,
    this.selectedSize,
  });

  factory CartItem.fromJson(Map<String, dynamic> json) {
    return CartItem(
      id: json['id'],
      productId: json['product_id'],
      quantity: json['quantity'] ?? 1,
      title: json['title'] ?? '',
      price: double.parse((json['price'] ?? 0).toString()),
      image: json['image'] ?? '',
      category: json['category'] ?? 'General',
      selectedColor: json['selected_color'],
      selectedSize: json['selected_size'],
    );
  }

  double get subtotal => price * quantity;
}
