import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../services/api_service.dart';

class AddProductScreen extends StatefulWidget {
  const AddProductScreen({super.key});

  @override
  State<AddProductScreen> createState() => _AddProductScreenState();
}

class _AddProductScreenState extends State<AddProductScreen> {
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _priceController = TextEditingController();
  final _stockController = TextEditingController();
  final _categoryController = TextEditingController();

  final _colorsController = TextEditingController();
  final _sizesController = TextEditingController();

  final ImagePicker _picker = ImagePicker();
  final List<Map<String, String>> _selectedMedia = []; // List of { 'url': base64Data, 'type': 'image'/'video' }
  String? _mainImageBase64;
  bool _isSubmitting = false;

  Future<void> _pickMainImage() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
      if (image != null) {
        final bytes = await image.readAsBytes();
        final ext = image.name.split('.').last.toLowerCase();
        final base64String = 'data:image/$ext;base64,${base64Encode(bytes)}';
        setState(() {
          _mainImageBase64 = base64String;
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal memilih gambar utama: $e')));
    }
  }

  Future<void> _pickMedia(bool isVideo) async {
    try {
      XFile? file;
      if (isVideo) {
        file = await _picker.pickVideo(source: ImageSource.gallery);
      } else {
        file = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
      }

      if (file != null) {
        final bytes = await file.readAsBytes();
        final ext = file.name.split('.').last.toLowerCase();
        final prefix = isVideo ? 'video' : 'image';
        final base64String = 'data:$prefix/$ext;base64,${base64Encode(bytes)}';
        
        setState(() {
          _selectedMedia.add({
            'url': base64String,
            'type': isVideo ? 'video' : 'image',
          });
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal memilih media tambahan: $e')));
    }
  }

  Future<void> _handleSubmit() async {
    final title = _titleController.text.trim();
    final desc = _descController.text.trim();
    final priceStr = _priceController.text.trim();
    final stockStr = _stockController.text.trim();
    final category = _categoryController.text.trim();
    final colors = _colorsController.text.trim();
    final sizes = _sizesController.text.trim();

    if (title.isEmpty || priceStr.isEmpty || stockStr.isEmpty || category.isEmpty || _mainImageBase64 == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Judul, Harga, Stok, Kategori, dan Gambar Utama wajib diisi')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      await ApiService.instance.createProduct({
        'title': title,
        'description': desc,
        'price': double.parse(priceStr),
        'stock': int.parse(stockStr),
        'category': category,
        'image': _mainImageBase64,
        'colors': colors.isEmpty ? null : colors,
        'sizes': sizes.isEmpty ? null : sizes,
        'media': _selectedMedia.isNotEmpty ? _selectedMedia : null,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Produk berhasil didaftarkan!')),
        );
        Navigator.pop(context);
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
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: const Text('Tambah Produk Baru', style: TextStyle(color: Colors.white)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Gambar Utama Upload Box
            GestureDetector(
              onTap: _pickMainImage,
              child: Container(
                height: 140,
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: _mainImageBase64 == null
                    ? const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add_photo_alternate_outlined, size: 48, color: Color(0xFF3B82F6)),
                          SizedBox(height: 8),
                          Text('Pilih Gambar Utama (Wajib)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                        ],
                      )
                    : ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.memory(
                          base64Decode(_mainImageBase64!.split(',').last),
                          fit: BoxFit.cover,
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 20),

            // Form Inputs
            TextField(
              controller: _titleController,
              style: const TextStyle(color: Colors.white),
              decoration: _inputDecoration('Nama Produk'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _descController,
              maxLines: 3,
              style: const TextStyle(color: Colors.white),
              decoration: _inputDecoration('Deskripsi Produk'),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _priceController,
                    keyboardType: TextInputType.number,
                    style: const TextStyle(color: Colors.white),
                    decoration: _inputDecoration('Harga (Rp)'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _stockController,
                    keyboardType: TextInputType.number,
                    style: const TextStyle(color: Colors.white),
                    decoration: _inputDecoration('Stok awal'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _categoryController,
              style: const TextStyle(color: Colors.white),
              decoration: _inputDecoration('Kategori (e.g. Elektronik, Fashion, Audio)'),
            ),
            const SizedBox(height: 24),

            // Variant setup section
            const Text(
              'Variasi Pilihan (Opsional)',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
            ),
            const SizedBox(height: 4),
            const Text(
              'Pisahkan pilihan warna atau ukuran menggunakan tanda koma (e.g., Merah, Hitam, Biru)',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _colorsController,
              style: const TextStyle(color: Colors.white),
              decoration: _inputDecoration('Pilihan Warna (e.g. Merah, Kuning, Hijau)'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _sizesController,
              style: const TextStyle(color: Colors.white),
              decoration: _inputDecoration('Pilihan Ukuran (e.g. S, M, L, XL)'),
            ),
            const SizedBox(height: 24),

            // Extra Media Upload section
            const Text(
              'Media Tambahan (Foto/Video)',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.photo_library_outlined, size: 18),
                    label: const Text('Foto Tambahan'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E293B),
                      foregroundColor: const Color(0xFF3B82F6),
                      side: const BorderSide(color: Color(0xFF334155)),
                    ),
                    onPressed: () => _pickMedia(false),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.video_library_outlined, size: 18),
                    label: const Text('Video Tambahan'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E293B),
                      foregroundColor: const Color(0xFF3B82F6),
                      side: const BorderSide(color: Color(0xFF334155)),
                    ),
                    onPressed: () => _pickMedia(true),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // List of selected extra media preview
            if (_selectedMedia.isNotEmpty)
              Container(
                height: 80,
                margin: const EdgeInsets.only(bottom: 20),
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _selectedMedia.length,
                  itemBuilder: (context, index) {
                    final item = _selectedMedia[index];
                    final isVideo = item['type'] == 'video';
                    return Stack(
                      alignment: Alignment.topRight,
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          margin: const EdgeInsets.only(right: 8, top: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E293B),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFF334155)),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: isVideo
                                ? const Center(child: Icon(Icons.play_circle_outline, color: Color(0xFF3B82F6), size: 24))
                                : Image.memory(
                                    base64Decode(item['url']!.split(',').last),
                                    fit: BoxFit.cover,
                                  ),
                          ),
                        ),
                        GestureDetector(
                          onTap: () {
                            setState(() {
                              _selectedMedia.removeAt(index);
                            });
                          },
                          child: CircleAvatar(
                            radius: 10,
                            backgroundColor: Colors.red,
                            child: const Icon(Icons.close, color: Colors.white, size: 12),
                          ),
                        )
                      ],
                    );
                  },
                ),
              ),

            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _handleSubmit,
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
                  : const Text('Simpan & Rilis Produk', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            ),
          ],
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String label) {
    return InputDecoration(
      labelText: label,
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
    );
  }
}
