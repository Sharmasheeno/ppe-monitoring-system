import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../services/alert_polling_service.dart';
import '../services/api_service.dart';
import 'login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _notificationsEnabled = true;
  bool _audioEnabled = true;
  String _username = 'Loading...';
  String _workerId = 'Loading...';
  String? _avatarBase64;
  final _apiService = ApiService();
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _loadProfile();
    _audioEnabled = AlertPollingService().isAudioEnabled;
    _notificationsEnabled = AlertPollingService().isNotificationsEnabled;
  }

  Future<void> _loadProfile() async {
    final name = await _apiService.getUsername();
    final workerId = await _apiService.getWorkerId();
    final avatar = await _apiService.getAvatar();
    if (mounted) {
        setState(() {
            _username = name;
            _workerId = workerId;
            _avatarBase64 = avatar;
        });
    }
  }

  Future<void> _pickProfileImage() async {
      try {
          final XFile? image = await _picker.pickImage(
             source: ImageSource.gallery, 
             maxWidth: 500, 
             maxHeight: 500,
             imageQuality: 80
          );
          
          if (image != null) {
              final bytes = await image.readAsBytes();
              String base64Image = "data:image/jpeg;base64," + base64Encode(bytes);
              
              setState(() => _avatarBase64 = base64Image);
              await _apiService.updateProfile(base64Avatar: base64Image);
              
              if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Profile image updated!')),
                  );
              }
          }
      } catch (e) {
          debugPrint('Image pick error: $e');
      }
  }

  Future<void> _editProfile() async {
    final TextEditingController controller = TextEditingController(text: _username);
    final String? newName = await showDialog<String>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text('Edit Profile Name', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
          content: TextField(
            controller: controller,
            decoration: const InputDecoration(hintText: "Enter your name"),
            autofocus: true,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, controller.text.trim()),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.blueAccent),
              child: const Text('Save', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );

    if (newName != null && newName.isNotEmpty && newName != _username) {
      await _apiService.updateProfile(newName: newName);
      setState(() => _username = newName);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Profile name updated successfully")),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: Text(
          'My Profile',
          style: GoogleFonts.outfit(color: Colors.black, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // Header Profile Card
            Center(
              child: Column(
                children: [
                  GestureDetector(
                    onTap: _pickProfileImage,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.blueAccent, width: 2),
                      ),
                      child: CircleAvatar(
                        radius: 50,
                        backgroundColor: Colors.blueAccent.withOpacity(0.1),
                        backgroundImage: (_avatarBase64 != null && _avatarBase64!.contains('base64,')) 
                             ? MemoryImage(base64Decode(_avatarBase64!.split('base64,')[1]))
                             : null,
                        child: _avatarBase64 == null 
                            ? const Icon(Icons.camera_alt, size: 40, color: Colors.blueAccent)
                            : null,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _username,
                        style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black87),
                      ),
                      IconButton(
                        icon: const Icon(Icons.edit, size: 18, color: Colors.blueAccent),
                        onPressed: _editProfile,
                        splashRadius: 20,
                      )
                    ],
                  ),
                  Text(
                    'Tracking ID: $_workerId',
                    style: GoogleFonts.outfit(fontSize: 16, color: Colors.grey),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 32),
            
            _buildSectionHeader('General Settings'),
            const SizedBox(height: 12),
            
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4)),
                ],
              ),
              child: Column(
                children: [
                  _buildSwitchTile(
                    title: 'Push Notifications',
                    subtitle: 'Receive alerts when app is in background',
                    icon: Icons.notifications_outlined,
                    value: _notificationsEnabled,
                    onChanged: (val) {
                      setState(() => _notificationsEnabled = val);
                      AlertPollingService().isNotificationsEnabled = val;
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(val ? 'Push Notifications Enabled' : 'Push Notifications Disabled')));
                    },
                  ),
                  const Divider(height: 1, indent: 60),
                  _buildSwitchTile(
                    title: 'Audio Alerts',
                    subtitle: 'Play loud sound on violation',
                    icon: Icons.volume_up_outlined,
                    value: _audioEnabled,
                    onChanged: (val) {
                      setState(() => _audioEnabled = val);
                      AlertPollingService().isAudioEnabled = val;
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(val ? 'Audio Alerts Enabled' : 'Audio Alerts Muted')));
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),
            _buildSectionHeader('System & Diagnostics'),
            const SizedBox(height: 12),
             Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4)),
                ],
              ),
              child: Column(
                children: [
                   _buildActionTile(
                    title: 'System Audio Check',
                    subtitle: 'Tap to test audio playback (Unlocks Audio)',
                    icon: Icons.speaker_phone,
                    onTap: () async {
                      await AlertPollingService().forceAudioUnlock();
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text("Audio System Checked: OK"))
                        );
                      }
                    },
                  ),
                ],
              ),
            ),


            const SizedBox(height: 48),
            
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: () async {
                  // 1. Tell server: mark worker offline → AI engine stops camera
                  await _apiService.logout();
                  // 2. Stop alert polling on this device 
                  AlertPollingService().stopPolling();
                  // 3. Navigate to login, clear entire stack
                  if (mounted) {
                    Navigator.of(context).pushAndRemoveUntil(
                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                      (route) => false,
                    );
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.red,
                  elevation: 0,
                  side: BorderSide(color: Colors.red.shade200),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Text('Log Out', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ),
             const SizedBox(height: 24),
              Text(
                    'PPE Monitoring Mobile v1.0.2',
                    style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey.shade400),
                  ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        title.toUpperCase(),
        style: GoogleFonts.outfit(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.grey.shade500,
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool value,
    required Function(bool) onChanged,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.blueAccent.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: Colors.blueAccent),
      ),
      title: Text(title, style: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 16)),
      subtitle: Text(subtitle, style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey)),
      trailing: Switch(
        value: value,
        onChanged: onChanged,
        activeColor: Colors.blueAccent,
      ),
    );
  }

  Widget _buildActionTile({
    required String title, 
    required String subtitle, 
    required IconData icon,
    required VoidCallback onTap 
  }) {
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.orange.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: Colors.orange),
      ),
      title: Text(title, style: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 16)),
      subtitle: Text(subtitle, style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey)),
      trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
    );
  }
}
