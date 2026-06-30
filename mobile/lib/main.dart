import 'package:flutter/material.dart';
import 'package:device_preview/device_preview.dart';
import 'screens/login_screen.dart';
import 'screens/forgot_password_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  print("PPE Monitoring App Starting...");
  runApp(
    DevicePreview(
      enabled: true,          // set false to hide the device frame
      builder: (context) => const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PPE Monitoring Mobile',
      debugShowCheckedModeBanner: false,
      locale: DevicePreview.locale(context),
      builder: DevicePreview.appBuilder,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF16A34A),
          brightness: Brightness.light,
          primary: const Color(0xFF16A34A),
          secondary: const Color(0xFF22C55E),
          surface: Colors.white,
          background: const Color(0xFFF0FDF4),
        ),
        scaffoldBackgroundColor: const Color(0xFFF0FDF4),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF16A34A),
          foregroundColor: Colors.white,
          elevation: 0,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF16A34A),
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFBBF7D0)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFBBF7D0)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF16A34A), width: 2),
          ),
          prefixIconColor: const Color(0xFF16A34A),
        ),
        useMaterial3: true,
      ),
      home: const LoginScreen(),
      routes: {
        '/forgot-password': (context) => const ForgotPasswordScreen(),
      },
    );
  }
}
