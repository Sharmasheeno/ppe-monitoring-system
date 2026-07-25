import 'package:flutter/foundation.dart';
import 'package:mqtt_client/mqtt_client.dart';
import 'package:mqtt_client/mqtt_server_client.dart';

class MqttService {
  MqttServerClient? _client;
  final String broker;
  final String clientIdentifier;
  bool _isConnected = false;

  MqttService({required this.broker, required this.clientIdentifier});

  Future<void> connect() async {
    // Skip MQTT on web platform — dart:io sockets are not available
    if (kIsWeb) {
      print('MQTT: Skipping connection on web platform (dart:io not supported).');
      print('MQTT: Using HTTP polling for alerts instead.');
      return;
    }

    try {
      _client = MqttServerClient(broker, clientIdentifier);
      _client!.logging(on: false);
      _client!.keepAlivePeriod = 20;
      _client!.onDisconnected = onDisconnected;
      _client!.onConnected = onConnected;
      _client!.onSubscribed = onSubscribed;
      _client!.autoReconnect = true;
      _client!.resubscribeOnAutoReconnect = true;

      print('MQTT: Connecting to $broker...');
      await _client!.connect();
    } catch (e) {
      print('MQTT: Connection failed - $e');
      _isConnected = false;
      _client?.disconnect();
      _client = null;
    }
  }

  void subscribe(String topic) {
    if (kIsWeb || _client == null || !_isConnected) {
      print('MQTT: Cannot subscribe - ${kIsWeb ? "web platform" : "not connected"}');
      return;
    }

    if (_client!.connectionStatus?.state == MqttConnectionState.connected) {
      print('MQTT: Subscribing to $topic');
      _client!.subscribe(topic, MqttQos.atMostOnce);
    }
  }

  Stream<List<MqttReceivedMessage<MqttMessage>>>? get onMessage {
    if (kIsWeb || _client == null) return null;
    return _client!.updates;
  }

  bool get isConnected => _isConnected;

  void onConnected() {
    _isConnected = true;
    print('MQTT: Connected');
  }

  void onDisconnected() {
    _isConnected = false;
    print('MQTT: Disconnected');
  }

  void onSubscribed(String topic) {
    print('MQTT: Subscribed to $topic');
  }

  void disconnect() {
    _client?.disconnect();
    _client = null;
    _isConnected = false;
  }
}
