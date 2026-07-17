import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../services/alert_polling_service.dart';
import '../services/mqtt_service.dart';
import '../services/api_service.dart';
import 'package:mqtt_client/mqtt_client.dart';
import 'alerts_screen.dart';

class WorkerDashboard extends StatefulWidget {
  const WorkerDashboard({super.key});

  @override
  State<WorkerDashboard> createState() => _WorkerDashboardState();
}

class _WorkerDashboardState extends State<WorkerDashboard> {
  final ApiService _apiService = ApiService();
  late final MqttService _mqttService;
  bool _isSafe = true;
  int _score = 100;
  String _lastScan = "Checking...";
  bool _isLoading = false;
  String _username = 'Loading...';
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();

    final broker = '10.0.2.2';
    _mqttService = MqttService(broker: broker, clientIdentifier: 'flutter_worker_client');

    _setupMqtt();

    AlertPollingService().onDebugLog = (msg) {
      if (!mounted) return;
      if (msg.contains("Error") || msg.contains("Playing") || msg.contains("Unlocking")) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            duration: const Duration(milliseconds: 1000),
            backgroundColor: msg.contains("Error") ? Colors.red : const Color(0xFF16A34A),
          )
        );
      }
    };

    // Auto-refresh safety status every 10 seconds
    _refreshTimer = Timer.periodic(const Duration(seconds: 3), (_) => _checkStatus());

    _loadProfile();
    _checkStatus();
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    final name = await _apiService.getUsername();
    if (mounted) setState(() => _username = name);
  }

  Future<void> _setupMqtt() async {
    await _mqttService.connect();
    _mqttService.subscribe('ppe/alerts');
    
    final messageStream = _mqttService.onMessage;
    if (messageStream != null) {
      messageStream.listen((List<MqttReceivedMessage<MqttMessage?>>? c) {
        if (c == null || c.isEmpty) return;
        final MqttPublishMessage recMess = c[0].payload as MqttPublishMessage;
        final String pt = MqttPublishPayload.bytesToStringAsString(recMess.payload.message);
        print('MQTT Notification: $pt');
        
        // Update UI on Alert
        if (mounted) {
          setState(() {
            _isSafe = false;
            _lastScan = "Risk Detected! (Real-time)";
          });
          
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Safety Alert: $pt'), 
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 4),
              action: SnackBarAction(label: 'VIEW', onPressed: _checkStatus, textColor: Colors.white),
            )
          );
        }
      });
    } else {
      print('MQTT not available (web platform), relying on HTTP polling.');
    }
  }

  Future<void> _checkStatus() async {
    setState(() => _isLoading = true);
    try {
      // 1) LIVE compliance signal — the AI engine posts current PPE state every
      //    ~2s. When it's fresh we trust it directly, so the Home flips
      //    green/red the instant detection changes.
      final live = await _apiService.getLiveStatus();

      // 2) Score is always derived from violation history (unchanged behaviour).
      final alerts = await _apiService.getViolations();
      if (!mounted) return;
      final now = DateTime.now();
      final cutoff = now.subtract(const Duration(days: 30));
      int recent30 = 0;
      for (final a in alerts) {
        final ts = DateTime.tryParse((a['timestamp'] ?? '').toString());
        if (ts != null && ts.isAfter(cutoff)) recent30++;
      }

      // 3) Decide _isSafe: prefer the live signal; fall back to violation-based
      //    logic (unchanged) when the AI engine hasn't posted recently.
      bool isSafe;
      String lastScan;
      if (live != null) {
        // Only "safe" when the AI is actually looking at a person and no items are missing.
        isSafe = live['safe'] == true;
        if (live['personDetected'] == false) {
          lastScan = "Waiting for you at the camera";
          isSafe = true;   // no worker in view → nothing to flag; don't scare them
        } else {
          lastScan = isSafe ? "All PPE Detected" : "Risk Detected!";
        }
      } else {
        // Fallback: original violation-based decision.
        bool recentRisk = false;
        if (alerts.isNotEmpty && alerts.first['timestamp'] != null) {
          final ts = DateTime.tryParse(alerts.first['timestamp'].toString())?.toLocal();
          if (ts != null && now.difference(ts).inSeconds <= 120) recentRisk = true;
        }
        isSafe = !recentRisk;
        lastScan = recentRisk ? "Risk Detected!" : "All Clear";
      }

      setState(() {
        _isLoading = false;
        _isSafe = isSafe;
        _lastScan = lastScan;
        _score = (100 - recent30 * 5).clamp(0, 100).toInt();
      });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0FDF4), // brand-50 green-white
      appBar: AppBar(
        backgroundColor: const Color(0xFF16A34A), // brand-600 green
        foregroundColor: Colors.white,
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFF22C55E), width: 1.5),
              ),
              child: const CircleAvatar(
                radius: 18,
                backgroundColor: Colors.white,
                child: Icon(Icons.person, color: Color(0xFF16A34A), size: 20),
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Welcome Back,', style: GoogleFonts.outfit(color: Colors.white70, fontSize: 12)),
                Text(_username, style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
              ],
            ),
          ],
        ),
        actions: [
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined, color: Colors.white), 
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AlertsScreen())),
              ),
              if (!_isSafe)
                Positioned(
                  right: 12,
                  top: 12,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.redAccent,
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(minWidth: 8, minHeight: 8),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _checkStatus,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Safety Status Card
              _buildSafetyCard()
                  .animate()
                  .fadeIn(duration: 600.ms)
                  .slideY(begin: 0.2, end: 0, curve: Curves.easeOut),

              const SizedBox(height: 32),
              
              Text('Quick Actions', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87))
                  .animate().fadeIn(delay: 200.ms),
              const SizedBox(height: 16),
              
              // We removed the "Scan QR" button since the laptop camera monitors PPE directly.
              // Now we only have a full-width History/Logs button.
              SizedBox(
                width: double.infinity,
                child: _buildActionCard(Icons.history, 'Review Alert History', const Color(0xFF15803D), 1, () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const AlertsScreen()));
                }),
              ),
              
              const SizedBox(height: 32),
              Text('Compliance Score', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87))
                  .animate().fadeIn(delay: 400.ms),
              const SizedBox(height: 16),
              
              _buildComplianceCard()
                  .animate()
                  .fadeIn(delay: 500.ms)
                  .slideX(begin: 0.1, end: 0, curve: Curves.easeOut),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSafetyCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: _isSafe ? const Color(0xFF10B981) : const Color(0xFFEF4444), // Green or Red
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: (_isSafe ? Colors.green : Colors.red).withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(
              _isSafe ? Icons.shield_outlined : Icons.warning_amber_rounded, 
              color: Colors.white, 
              size: 48
            ),
          ),
          const SizedBox(height: 16),
          Text(
            _isSafe ? 'You are Safe' : 'Safety Violation!',
            style: GoogleFonts.outfit(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            _isSafe ? 'Full PPE Detected' : 'Missing PPE Detected',
            style: GoogleFonts.outfit(color: Colors.white.withOpacity(0.9), fontSize: 16),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(30),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _isLoading 
                    ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Icon(Icons.refresh, color: Colors.white.withOpacity(0.8), size: 14),
                const SizedBox(width: 8),
                Text(
                  'Last Scan: $_lastScan',
                  style: GoogleFonts.outfit(color: Colors.white, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionCard(IconData icon, String label, Color color, int delayIndex, VoidCallback onTap) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 15, offset: const Offset(0, 5)),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onTap,
          splashColor: color.withOpacity(0.1),
          highlightColor: color.withOpacity(0.05),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Icon(icon, color: color, size: 32),
                const SizedBox(height: 12),
                Text(label, style: GoogleFonts.outfit(fontWeight: FontWeight.w600, color: Colors.black87)),
              ],
            ),
          ),
        ),
      ),
    ).animate().scale(delay: (200 + (delayIndex * 100)).ms, duration: 400.ms, curve: Curves.easeOutBack);
  }

  Widget _buildComplianceCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 15, offset: const Offset(0, 5)),
        ],
      ),
      child: Row(
        children: [
          SizedBox(
            height: 60,
            width: 60,
            child: CircularProgressIndicator(
              value: _score / 100.0,
              backgroundColor: Colors.grey.shade100,
              color: _score >= 80 ? Colors.green : (_score >= 60 ? Colors.orange : Colors.red),
              strokeWidth: 6,
            ),
          ),
          const SizedBox(width: 20),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('$_score% — ' + (_score >= 80 ? 'Excellent' : (_score >= 60 ? 'Fair' : 'Critical')), style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black87)),
              Text('Weekly adherence', style: GoogleFonts.outfit(color: Colors.grey, fontSize: 14)),
            ],
          )
        ],
      ),
    );
  }
}
