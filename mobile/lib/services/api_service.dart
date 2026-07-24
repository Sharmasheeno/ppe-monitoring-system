import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// Top-level function for compute
List<dynamic> _parseViolations(String responseBody) {
  return jsonDecode(responseBody);
}

// Top-level function for compute
List<dynamic> _parseUsers(String responseBody) {
  return jsonDecode(responseBody);
}

// Top-level function for compute
Map<String, dynamic> _parseLogin(String responseBody) {
  return jsonDecode(responseBody);
}

/// In-memory token storage fallback for platforms where secure storage may fail
class _MemoryStorage {
  static final Map<String, String> _data = {};
  
  Future<void> write(String key, String value) async => _data[key] = value;
  Future<String?> read(String key) async => _data[key];
  Future<void> delete(String key) async => _data.remove(key);
}

class ApiService {
  // For Android Emulator use 10.0.2.2, for Web use localhost
  static String get baseUrl {
    if (kIsWeb) {
            return 'http://localhost:5001/api';
    }
            return 'http://10.0.2.2:5001/api';
  }
  
  // Use FlutterSecureStorage with web options on web, or default on native
  FlutterSecureStorage? _secureStorage;
  final _memoryStorage = _MemoryStorage();
  bool _useMemoryFallback = false;

  ApiService() {
    if (kIsWeb) {
      // On web, FlutterSecureStorage uses localStorage but can fail with SecurityContext
      // Use memory fallback on web for reliability
      _useMemoryFallback = true;
    } else {
      try {
        _secureStorage = const FlutterSecureStorage();
      } catch (e) {
        print('SecureStorage init failed, using memory fallback: $e');
        _useMemoryFallback = true;
      }
    }
  }
  
  // Helper to expose baseUrl to other services
  String get url => baseUrl; 

  Future<String?> getToken() async {
    if (_useMemoryFallback) {
      return await _memoryStorage.read('token');
    }
    try {
      return await _secureStorage!.read(key: 'token');
    } catch (e) {
      _useMemoryFallback = true;
      return await _memoryStorage.read('token');
    }
  }

  Future<void> _saveToken(String token, String role, String username, String workerId, {String? avatar}) async {
    if (_useMemoryFallback) {
      await _memoryStorage.write('token', token);
      await _memoryStorage.write('role', role);
      await _memoryStorage.write('username', username);
      await _memoryStorage.write('workerId', workerId);
      if (avatar != null) await _memoryStorage.write('avatar', avatar);
      return;
    }
    try {
      await _secureStorage!.write(key: 'token', value: token);
      await _secureStorage!.write(key: 'role', value: role);
      await _secureStorage!.write(key: 'username', value: username);
      await _secureStorage!.write(key: 'workerId', value: workerId);
      if (avatar != null) await _secureStorage!.write(key: 'avatar', value: avatar);
    } catch (e) {
      _useMemoryFallback = true;
      await _memoryStorage.write('token', token);
      await _memoryStorage.write('role', role);
      await _memoryStorage.write('username', username);
      await _memoryStorage.write('workerId', workerId);
      if (avatar != null) await _memoryStorage.write('avatar', avatar);
    }
  }

  Future<String> getWorkerId() async {
    String? id;
    if (_useMemoryFallback) {
      id = await _memoryStorage.read('workerId');
    } else {
      try {
        id = await _secureStorage!.read(key: 'workerId');
      } catch (e) {
        id = await _memoryStorage.read('workerId');
      }
    }
    
    if (id == null || id == 'undefined' || id == 'null' || id.isEmpty) {
        return 'ID: Unknown';
    }
    return id;
  }

  Future<String> getUsername() async {
    if (_useMemoryFallback) {
      return (await _memoryStorage.read('username')) ?? 'John Doe';
    }
    try {
      return (await _secureStorage!.read(key: 'username')) ?? 'John Doe';
    } catch (e) {
      return (await _memoryStorage.read('username')) ?? 'John Doe';
    }
  }

  Future<void> updateProfile({String? newName, String? base64Avatar}) async {
    try {
      final token = await getToken();
      if (token == null) return;
      
      final Map<String, dynamic> body = {};
      if (newName != null) body['username'] = newName;
      if (base64Avatar != null) body['avatar'] = base64Avatar;

      final response = await http.patch(
        Uri.parse('$baseUrl/users/profile'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json'
        },
        body: jsonEncode(body),
      );

      if (response.statusCode == 200) {
        if (newName != null) {
           if (_useMemoryFallback) {
             await _memoryStorage.write('username', newName);
           } else {
             await _secureStorage?.write(key: 'username', value: newName);
             await _memoryStorage.write('username', newName); // Fallback copy
           }
        }
        if (base64Avatar != null) {
           if (_useMemoryFallback) {
             await _memoryStorage.write('avatar', base64Avatar);
           } else {
             await _secureStorage?.write(key: 'avatar', value: base64Avatar);
             await _memoryStorage.write('avatar', base64Avatar);
           }
        }
      }
    } catch (e) {
      print('Update Profile Error: $e');
    }
  }

  Future<String?> getAvatar() async {
    if (_useMemoryFallback) {
      return await _memoryStorage.read('avatar');
    }
    try {
      return await _secureStorage!.read(key: 'avatar');
    } catch (e) {
      return await _memoryStorage.read('avatar');
    }
  }

  Future<Map<String, dynamic>> login(String username, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'username': username, 'password': password}),
      );

      if (response.statusCode == 200) {
        final data = await compute(_parseLogin, response.body);
        final workerId = data['user']['workerId'] ?? 'ID: Unknown';
        final avatar = data['user']['avatar'];
        await _saveToken(data['token'], data['user']['role'], data['user']['username'], workerId, avatar: avatar);
        return {'success': true, 'data': data};
      } else {
        final errorData = jsonDecode(response.body);
        return {'success': false, 'message': errorData['msg'] ?? 'Invalid Credentials'};
      }
    } catch (e) {
      print('Login Error: $e');
      if (e.toString().contains('SocketException') || e.toString().contains('Connection refused')) {
         return {'success': false, 'message': 'Network Error: Check Server'};
      }
      return {'success': false, 'message': 'An unexpected error occurred'};
    }
  }

  Future<Map<String, dynamic>> register(String username, String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username, 
          'email': email,
          'password': password,
          'role': 'user'
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final workerId = data['user']['workerId'] ?? 'ID: Unknown';
        final avatar = data['user']['avatar'];
        await _saveToken(data['token'], data['user']['role'], data['user']['username'], workerId, avatar: avatar);
        return {'success': true, 'data': data};
      } else {
        final errorData = jsonDecode(response.body);
        return {'success': false, 'message': errorData['msg'] ?? 'Registration Failed'};
      }
    } catch (e) {
      if (e.toString().contains('SocketException') || e.toString().contains('Connection refused')) {
         return {'success': false, 'message': 'Network Error: Check Server'};
      }
      return {'success': false, 'message': 'An unexpected error occurred'};
    }
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
     try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/forgot-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email}),
      );

      if (response.statusCode == 200) {
         final data = jsonDecode(response.body);
         return {'success': true, 'message': data['msg']};
      } else {
         final errorData = jsonDecode(response.body);
         return {'success': false, 'message': errorData['msg'] ?? 'Request Failed'};
      }
    } catch (e) {
       return {'success': false, 'message': 'Network Error'};
    }
  }

  Future<Map<String, dynamic>> verifyResetCode(String email, String code) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/verify-reset-code'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'code': code}),
      );
      if (response.statusCode == 200) {
        return {'success': true};
      } else {
        final errorData = jsonDecode(response.body);
        return {'success': false, 'message': errorData['msg'] ?? 'Invalid code'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Network Error'};
    }
  }

  Future<Map<String, dynamic>> resetPassword(String email, String code, String newPassword) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'code': code, 'newPassword': newPassword}),
      );
      if (response.statusCode == 200) {
        return {'success': true};
      } else {
        final errorData = jsonDecode(response.body);
        return {'success': false, 'message': errorData['msg'] ?? 'Reset failed'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Network Error'};
    }
  }

  Future<List<dynamic>> getViolations() async {
    try {
      final token = await getToken();
      final response = await http.get(
        Uri.parse('$baseUrl/violations'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );
      if (response.statusCode == 200) {
        return await compute(_parseViolations, response.body);
      }
      print('getViolations failed: ${response.statusCode}');
      return [];
    } catch (e) {
      print('getViolations error: $e');
      return [];
    }
  }

  /// Live compliance snapshot (Option B). Returns null when the AI engine has
  /// not posted a fresh heartbeat, so the caller can fall back to the
  /// violation-based decision without changing behaviour.
  Future<Map<String, dynamic>?> getLiveStatus() async {
    try {
      final id = await getWorkerId();
      if (id.isEmpty || id.startsWith('ID:')) return null;
      final r = await http.get(Uri.parse('$baseUrl/status/live/$id'))
          .timeout(const Duration(seconds: 3));
      if (r.statusCode != 200) return null;
      final m = jsonDecode(r.body) as Map<String, dynamic>;
      if (m['known'] == true) return m;
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    try {
      final token = await getToken();
      if (token != null) {
        await http.post(
          Uri.parse('$baseUrl/auth/logout'),
          headers: {'Authorization': 'Bearer $token'},
        );
      }
    } catch (_) {}
    // Clear local storage
    if (_useMemoryFallback) {
      await _memoryStorage.delete('token');
      await _memoryStorage.delete('role');
      await _memoryStorage.delete('username');
      await _memoryStorage.delete('workerId');
    } else {
      try {
        await _secureStorage?.delete(key: 'token');
        await _secureStorage?.delete(key: 'role');
        await _secureStorage?.delete(key: 'username');
        await _secureStorage?.delete(key: 'workerId');
      } catch (_) {
        await _memoryStorage.delete('token');
      }
    }
  }

  Future<void> sendHeartbeat() async {
    try {
      final token = await getToken();
      if (token == null) return;
      await http.post(
        Uri.parse('$baseUrl/auth/heartbeat'),
        headers: {'Authorization': 'Bearer $token'},
      );
    } catch (_) {}
  }

  Future<List<dynamic>> getUsers() async {
     try {
      final response = await http.get(Uri.parse('$baseUrl/users'));
      if (response.statusCode == 200) {
        return await compute(_parseUsers, response.body);
      }
      return [];
    } catch (e) {
      return [];
    }
  }
}
