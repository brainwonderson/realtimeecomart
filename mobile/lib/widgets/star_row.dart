import 'package:flutter/material.dart';

class StarRow extends StatelessWidget {
  final double rating;
  final double size;

  const StarRow({
    super.key,
    required this.rating,
    this.size = 16.0,
  });

  @override
  Widget build(BuildContext context) {
    List<Widget> stars = [];
    int fullStars = rating.floor();
    bool hasHalfStar = (rating - fullStars) >= 0.5;

    for (int i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.add(Icon(Icons.star, color: Colors.orange, size: size));
      } else if (i == fullStars + 1 && hasHalfStar) {
        stars.add(Icon(Icons.star_half, color: Colors.orange, size: size));
      } else {
        stars.add(Icon(Icons.star_border, color: Colors.orange.withOpacity(0.4), size: size));
      }
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: stars,
    );
  }
}
