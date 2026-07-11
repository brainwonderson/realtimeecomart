class ChatMessage {
  final int id;
  final int senderId;
  final int receiverId;
  final int? productId;
  final String message;
  final bool isRead;
  final String createdAt;
  final String? productTitle;
  final String? productImage;
  final double? productPrice;

  ChatMessage({
    required this.id,
    required this.senderId,
    required this.receiverId,
    this.productId,
    required this.message,
    required this.isRead,
    required this.createdAt,
    this.productTitle,
    this.productImage,
    this.productPrice,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'],
      senderId: json['sender_id'],
      receiverId: json['receiver_id'],
      productId: json['product_id'],
      message: json['message'] ?? '',
      isRead: (json['is_read'] ?? 0) == 1,
      createdAt: json['created_at'] ?? '',
      productTitle: json['product_title'],
      productImage: json['product_image'],
      productPrice: json['product_price'] != null ? double.tryParse(json['product_price'].toString()) : null,
    );
  }
}

class ChatRoom {
  final int otherUserId;
  final String otherUserName;
  final String lastMessage;
  final String lastMessageTime;
  final int unreadCount;

  ChatRoom({
    required this.otherUserId,
    required this.otherUserName,
    required this.lastMessage,
    required this.lastMessageTime,
    required this.unreadCount,
  });

  factory ChatRoom.fromJson(Map<String, dynamic> json) {
    return ChatRoom(
      otherUserId: json['other_user_id'],
      otherUserName: json['other_user_name'] ?? 'User #${json['other_user_id']}',
      lastMessage: json['last_message'] ?? '',
      lastMessageTime: json['last_message_time'] ?? '',
      unreadCount: json['unread_count'] ?? 0,
    );
  }
}
