import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import '../services/mqtt_service.dart';
import 'package:mqtt_client/mqtt_client.dart';

class AdminDashboard extends StatefulWidget {
  const AdminDashboard({super.key});

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ApiService _apiService = ApiService();
  late final MqttService _mqttService;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    final broker = '10.0.2.2';
    _mqttService = MqttService(broker: broker, clientIdentifier: 'flutter_admin_client');
    _setupMqtt();
  }

  Future<void> _setupMqtt() async {
    await _mqttService.connect();
    _mqttService.subscribe('ppe/alerts');
    
    _mqttService.onMessage?.listen((List<MqttReceivedMessage<MqttMessage?>>? c) {
      if (c == null || c.isEmpty) return;
      final MqttPublishMessage recMess = c[0].payload as MqttPublishMessage;
      final String pt = MqttPublishPayload.bytesToStringAsString(recMess.payload.message);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.warning, color: Colors.white),
                const SizedBox(width: 10),
                Expanded(child: Text('OFFICER ALERT: $pt', style: const TextStyle(fontWeight: FontWeight.bold))),
              ],
            ), 
            backgroundColor: Colors.red.shade900,
            duration: const Duration(seconds: 5),
            behavior: SnackBarBehavior.floating,
          )
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0FDF4), // brand-50
      appBar: AppBar(
        title: Text('Admin Portal', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF16A34A), // brand-600 green
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(icon: Icon(Icons.dashboard), text: 'Overview'),
            Tab(icon: Icon(Icons.camera_alt), text: 'CCTV'),
            Tab(icon: Icon(Icons.people), text: 'Users'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => Navigator.of(context).pushReplacementNamed('/'),
          )
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // 1. Overview Tab (Violations Logs + Stats)
          FutureBuilder(
            future: _apiService.getViolations(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              final violations = snapshot.data ?? [];
              return ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: violations.length,
                itemBuilder: (context, index) {
                  final v = violations[index];
                return Card(
                    color: Colors.white,
                    margin: const EdgeInsets.only(bottom: 12),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: Color(0xFFBBF7D0)),
                    ),
                    child: ListTile(
                      leading: const Icon(Icons.warning, color: Colors.orange),
                      title: Text(v['violationType'] ?? 'Unknown', style: const TextStyle(color: Colors.black87, fontWeight: FontWeight.w600)),
                      subtitle: Text(
                        'Confidence: ${(v['confidence'] * 100).toStringAsFixed(1)}%',
                         style: const TextStyle(color: Colors.grey),
                      ),
                      trailing: Text(
                        v['timestamp'] != null 
                          ? DateTime.parse(v['timestamp']).toLocal().toString().split('.')[0] 
                          : '',
                        style: const TextStyle(color: Colors.grey, fontSize: 12),
                      ),
                    ),
                  );
                },
              );
            },
          ),
          
          // 2. CCTV Tab (Simulated)
          Center(
             child: Column(
               mainAxisAlignment: MainAxisAlignment.center,
               children: [
                 Container(
                   width: 300,
                   height: 200,
                   decoration: BoxDecoration(
                     color: const Color(0xFFF0FDF4),
                     border: Border.all(color: const Color(0xFF22C55E)),
                     borderRadius: BorderRadius.circular(8)
                   ),
                   child: const Center(
                     child: Icon(Icons.videocam_off, color: Color(0xFF86EFAC), size: 50),
                   ),
                 ),
                 const SizedBox(height: 16),
                 Text('Live Feed: Zone A', style: GoogleFonts.outfit(color: Color(0xFF14532D), fontSize: 18, fontWeight: FontWeight.bold)),
                 const SizedBox(height: 8),
                 const Text('Connecting to Stream...', style: TextStyle(color: Color(0xFF16A34A))),
               ],
             )
          ),

          // 3. User Management Tab
          FutureBuilder(
            future: _apiService.getUsers(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              final users = snapshot.data ?? [];
              return ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: users.length,
                itemBuilder: (context, index) {
                  final u = users[index];
                  return Card(
                    color: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: Color(0xFFBBF7D0)),
                    ),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: u['role'] == 'admin' 
                            ? const Color(0xFF14532D) 
                            : const Color(0xFF16A34A),
                        child: Icon(
                          u['role'] == 'admin' ? Icons.admin_panel_settings : Icons.person,
                          color: Colors.white
                        ),
                      ),
                      title: Text(u['username'], style: const TextStyle(color: Colors.black87, fontWeight: FontWeight.w600)),
                      subtitle: Text(u['role'].toUpperCase(), style: const TextStyle(color: Color(0xFF16A34A), fontSize: 12, fontWeight: FontWeight.w600)),
                      trailing: IconButton(
                        icon: const Icon(Icons.edit, color: Colors.grey),
                        onPressed: () {}, // Edit logic would go here
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }
}
