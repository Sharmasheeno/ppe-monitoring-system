import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:audioplayers/audioplayers.dart';
import '../services/api_service.dart';

class AlertPollingService {
  Timer? _timer;
  final AudioPlayer _audioPlayer = AudioPlayer();
  String? _lastAlertId; 
  
  // Feature Toggles (Controlled by ProfileScreen)
  bool isAudioEnabled = true;
  bool isNotificationsEnabled = true; 
  
  // Callback to show errors on UI
  Function(String)? onDebugLog;

  static final AlertPollingService _instance = AlertPollingService._internal();
  factory AlertPollingService() => _instance;
  AlertPollingService._internal();

  void _log(String msg) {
    print(msg);
    // Send to UI if listener exists
    if (onDebugLog != null) onDebugLog!(msg);
  }

  void startPolling() {
    _timer?.cancel();
    // Poll every 5 seconds
    _timer = Timer.periodic(const Duration(seconds: 5), (timer) => _checkAlerts());
    print("Alert Polling Started...");
  }

  void stopPolling() {
    _timer?.cancel();
    print("Alert Polling Stopped.");
  }

  Future<void> _checkAlerts() async {
    try {
      final apiService = ApiService();
      final token = await apiService.getToken();
      final baseUrl = ApiService.baseUrl;
      
      print("Polling API: $baseUrl/violations"); 

      final response = await http.get(
        Uri.parse('$baseUrl/violations'),
         headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );
      
      if (response.statusCode == 200) {
        final List<dynamic> alerts = jsonDecode(response.body);
        _log("Poll OK. Found: ${alerts.length}"); 
        
        if (alerts.isNotEmpty) {
          final latestAlert = alerts[0]; 
          if (_lastAlertId != latestAlert['_id']) {
            _lastAlertId = latestAlert['_id'];
             _log("NEW ALERT! System processing...");
             
             if (isNotificationsEnabled) {
                 _log("Push Notification Sent.");
             }
             
             if (isAudioEnabled) {
                 _log("Playing Sound..."); 
                 await _playSound();
             } else {
                 _log("Audio muted in Profile settings.");
             }
          }
        }
      } else {
        _log("Poll Failed: ${response.statusCode}");
      }
    } catch (e) {
      _log("Polling Error: $e");
    }
  }

  Future<void> _playSound() async {
    try {
      _log("Playing Sound (Local Asset)...");
      // Use the local asset generated in mobile/assets/alert.wav
      // AssetSource automatically adds 'assets/' prefix
      await _audioPlayer.play(AssetSource('alert.wav'));
      _log("Audio Command Sent (Asset).");
    } catch (e) {
      _log("Audio Error: $e");
    }
  }

  Future<void> forceAudioUnlock() async {
     _log("Unlocking Audio...");
     // Play silent or short part of asset to unlock
     // Just play the same file briefly
     await _audioPlayer.play(AssetSource('alert.wav'), volume: 0.1);
  }
}
