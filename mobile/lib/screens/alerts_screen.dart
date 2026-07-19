import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../services/api_service.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  final ApiService _apiService = ApiService();
  List<dynamic> _alerts = [];
  bool _isLoading = true;
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    _fetchAlerts();
    // Enable Real-Time polling every 5 seconds
    _pollingTimer = Timer.periodic(const Duration(seconds: 5), (_) {
       _fetchAlerts(isBackground: true);
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchAlerts({bool isBackground = false}) async {
    try {
      final alerts = await _apiService.getViolations();
      if (mounted) {
        setState(() {
          _alerts = alerts;
          if (!isBackground) _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted && !isBackground) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0FDF4), // brand-50
      appBar: AppBar(
        title: Text(
          'Safety Alerts', 
          style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)
        ),
        backgroundColor: const Color(0xFF16A34A),
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: () {
              setState(() => _isLoading = true);
              _fetchAlerts();
            }, 
          )
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchAlerts,
        color: const Color(0xFF16A34A),
        child: _isLoading 
            ? const Center(child: CircularProgressIndicator()) 
            : ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Emergency Action Card
            _buildEmergencyCard()
                .animate()
                .fadeIn(duration: 600.ms)
                .slideY(begin: 0.2, end: 0, curve: Curves.easeOut),
            
            const SizedBox(height: 24),
            Text(
              'Recent Notifications',
              style: GoogleFonts.outfit(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF1F2937),
              ),
            ).animate().fadeIn(delay: 200.ms),
            const SizedBox(height: 16),

            if (_alerts.isEmpty)
               Center(
                 child: Column(
                   children: [
                     const SizedBox(height: 40),
                     Icon(Icons.notifications_off_outlined, size: 60, color: Colors.grey.shade300),
                     const SizedBox(height: 16),
                     Text("No recent alerts", style: GoogleFonts.outfit(color: Colors.grey)),
                   ],
                 )
               ).animate().fadeIn(delay: 300.ms),

            ..._alerts.asMap().entries.map((entry) {
              int index = entry.key;
              var alert = entry.value;
              return _buildAlertItem(
                title: alert['violationType'] ?? 'Safety Check',
                time: alert['timestamp'] != null ? DateTime.parse(alert['timestamp']).toLocal().toString().substring(11, 16) : 'Just now',
                location: alert['location'] ?? 'Unknown Location',
                confidence: alert['confidence'] != null ? (alert['confidence'] * 100).toInt() : null,
                status: alert['status'] ?? 'Pending Review',
                imageUrl: alert['imageUrl'],
              ).animate()
               .fadeIn(delay: (100 + (index * 50)).ms)
               .slideX(begin: 0.05, end: 0, curve: Curves.easeOut);
            }).toList(),
            
            const SizedBox(height: 40), // Bottom padding
          ],
        ),
      ),
    );
  }

  Widget _buildEmergencyCard() {
    return GestureDetector(
      onTap: () {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Calling Site Safety Officer...')),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFEF4444), Color(0xFFB91C1C)], // More dynamic red gradient
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.red.withOpacity(0.4),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withOpacity(0.5), width: 1),
              ),
              child: const Icon(Icons.emergency_share, color: Colors.white, size: 30),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Emergency Protocol',
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Tap immediately to contact duty officer',
                    style: GoogleFonts.outfit(
                      color: Colors.white.withOpacity(0.9),
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Colors.white, size: 28),
          ],
        ),
      ),
    );
  }

  void _showViolationImage(String? imageUrl, String title) {
    showDialog(
      context: context,
      barrierColor: Colors.black87,
      builder: (ctx) => Dialog(
        insetPadding: const EdgeInsets.all(12),
        backgroundColor: Colors.transparent,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: const BoxDecoration(
                color: Color(0xFFEF4444),
                borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: Colors.white),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(title,
                      style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
            ),
            Flexible(
              child: Container(
                color: Colors.black,
                width: double.infinity,
                child: imageUrl != null
                    ? InteractiveViewer(
                        minScale: 0.8, maxScale: 4,
                        child: Image.network(imageUrl, fit: BoxFit.contain,
                          errorBuilder: (c, e, s) => const Padding(
                            padding: EdgeInsets.all(40),
                            child: Text('Image unavailable', style: TextStyle(color: Colors.white70)))),
                      )
                    : const Padding(
                        padding: EdgeInsets.all(40),
                        child: Text('No image was captured for this alert.',
                          textAlign: TextAlign.center, style: TextStyle(color: Colors.white70))),
              ),
            ),
            Container(
              padding: const EdgeInsets.all(10),
              color: Colors.black,
              child: Text('Pinch to zoom · tap ✕ to close',
                style: GoogleFonts.outfit(color: Colors.white54, fontSize: 12)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAlertItem({
    required String title,
    required String time,
    required String location,
    int? confidence,
    required String status,
    String? imageUrl,
  }) {
    final bool isResolved = status == 'Resolved';
    final Color statusColor = isResolved ? Colors.green : Colors.red;
    
    return GestureDetector(
      onTap: () => _showViolationImage(imageUrl, title),
      child: Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade100, width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Icon or Thumbnail
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: statusColor.withOpacity(0.2)),
            ),
            clipBehavior: Clip.hardEdge,
            child: imageUrl != null 
                ? Image.network(imageUrl, fit: BoxFit.cover, errorBuilder: (c, e, s) => Icon(Icons.warning_rounded, color: statusColor))
                : Icon(Icons.warning_rounded, color: statusColor, size: 28),
          ),
          const SizedBox(width: 16),
          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: const Color(0xFF1F2937),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        time,
                        style: GoogleFonts.outfit(
                          color: statusColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(Icons.location_on, size: 14, color: Colors.grey.shade500),
                    const SizedBox(width: 4),
                    Text(
                      location,
                      style: GoogleFonts.outfit(
                        color: Colors.grey.shade600,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                if (confidence != null) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Container(
                        height: 6,
                        width: 80,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade200,
                          borderRadius: BorderRadius.circular(3),
                        ),
                        child: FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: confidence / 100.0,
                          child: Container(
                            decoration: BoxDecoration(
                              color: confidence > 80 ? Colors.red : Colors.orange,
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'AI CONFIDENCE: $confidence%',
                        style: GoogleFonts.outfit(
                          fontSize: 9,
                          letterSpacing: 0.5,
                          fontWeight: FontWeight.w800,
                          color: Colors.grey.shade500,
                        ),
                      ),
                    ],
                  )
                ]
              ],
            ),
          ),
        ],
      ),
      ),
    );
  }
}
