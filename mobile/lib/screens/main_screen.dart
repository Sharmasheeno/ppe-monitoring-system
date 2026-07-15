import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'worker_dashboard.dart';
import 'alerts_screen.dart';
import 'profile_screen.dart'; // Import ProfileScreen
import 'login_screen.dart';

import '../services/alert_polling_service.dart';
import '../services/api_service.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;
  final ApiService _apiService = ApiService();
  Timer? _heartbeatTimer;

  @override
  void initState() {
    super.initState();
    // Start listening for alerts when MainScreen loads
    AlertPollingService().startPolling();
    // Send heartbeat immediately on login, then every 30 s for the full session
    _apiService.sendHeartbeat();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 15), (_) => _apiService.sendHeartbeat());
  }

  @override
  void dispose() {
    // Stop polling and heartbeat when the user logs out
    AlertPollingService().stopPolling();
    _heartbeatTimer?.cancel();
    super.dispose();
  }

  final List<Widget> _screens = [
    WorkerDashboard(),
    const AlertsScreen(),
    ProfileScreen(), // Professional Profile Screen
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.grey.withOpacity(0.1),
              blurRadius: 10,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          backgroundColor: Colors.white,
          selectedItemColor: const Color(0xFF16A34A),
          unselectedItemColor: Colors.grey.shade400,
          showUnselectedLabels: true,
          type: BottomNavigationBarType.fixed,
          selectedLabelStyle: GoogleFonts.outfit(fontWeight: FontWeight.w600),
          unselectedLabelStyle: GoogleFonts.outfit(),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_rounded),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.notifications_active_rounded),
              label: 'Alerts',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_rounded),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}


