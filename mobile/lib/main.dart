import 'package:flutter/material.dart';
import 'services/api_service.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize user session
  await ApiService.instance.init();

  runApp(const EcoMartApp());
}

class EcoMartApp extends StatelessWidget {
  const EcoMartApp({super.key});

  @override
  Widget build(BuildContext context) {
    final isLoggedIn = ApiService.instance.userId != null;

    return MaterialApp(
      title: 'EcoMart',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF1E293B),
          elevation: 0,
        ),
        primaryColor: const Color(0xFF3B82F6),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF3B82F6),
          secondary: Color(0xFFF97316),
          background: Color(0xFF0F172A),
          surface: Color(0xFF1E293B),
        ),
        useMaterial3: true,
      ),
      home: isLoggedIn ? const HomeScreen() : const LoginScreen(),
    );
  }
}
