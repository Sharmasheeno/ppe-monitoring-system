import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';

import '../services/api_service.dart';

// Top-level function for compute. Must be outside any class.
Uint8List decodeBase64(String input) {
  return base64Decode(input);
}

class ViolationListScreen extends StatefulWidget {
  const ViolationListScreen({Key? key}) : super(key: key);

  @override
  _ViolationListScreenState createState() => _ViolationListScreenState();
}

class _ViolationListScreenState extends State<ViolationListScreen> {
  final ApiService _apiService = ApiService();
  List<dynamic> violations = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    fetchViolations();
  }

  Future<void> fetchViolations() async {
    try {
      final data = await _apiService.getViolations();
      if (mounted) {
        setState(() {
          violations = data;
          isLoading = false;
        });
      }
    } catch (e) {
      print("Error: $e");
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Dark Slate
      appBar: AppBar(
        title: const Text('Site Guardian Mobile'),
        elevation: 0,
        centerTitle: true,
        backgroundColor: Colors.transparent,
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFFDC2626), Color(0xFF991B1B)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.red))
          : RefreshIndicator(
              onRefresh: fetchViolations,
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: violations.length,
                itemBuilder: (context, index) {
                  return ViolationCard(violation: violations[index])
                      .animate()
                      .fadeIn(duration: 400.ms, delay: (50 * index).ms)
                      .slideX(begin: -0.2, end: 0);
                },
              ),
            ),
    );
  }
}

class ViolationCard extends StatefulWidget {
  final Map<String, dynamic> violation;

  const ViolationCard({Key? key, required this.violation}) : super(key: key);

  @override
  State<ViolationCard> createState() => _ViolationCardState();
}

class _ViolationCardState extends State<ViolationCard> {
  Future<Uint8List?>? _imageFuture;

  @override
  void initState() {
    super.initState();
    _imageFuture = _processImage();
  }

  Future<Uint8List?> _processImage() async {
    final imageUrl = widget.violation['imageUrl'] ?? '';
    if (imageUrl.startsWith('data:image')) {
      final base64String = imageUrl.split(',')[1];
      // Use compute with the top-level function `decodeBase64`
      return compute<String, Uint8List>(decodeBase64, base64String);
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final imageUrl = widget.violation['imageUrl'] ?? '';
    final DateTime timestamp = DateTime.parse(widget.violation['timestamp']);
    final formattedTime = DateFormat('h:mm a · MMM d').format(timestamp);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B), // Slate 800
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4)),
        ],
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Column(
        children: [
          // Header Image
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: SizedBox(
               height: 180,
               width: double.infinity,
               child: Stack(
                 fit: StackFit.expand,
                 children: [
                   if (imageUrl.startsWith('data:image'))
                     FutureBuilder<Uint8List?>(
                       future: _imageFuture,
                       builder: (context, snapshot) {
                         if (snapshot.connectionState == ConnectionState.done && snapshot.data != null) {
                           return Image.memory(
                             snapshot.data!,
                             fit: BoxFit.cover,
                             errorBuilder: (ctx, err, stack) => Container(color: Colors.grey[800], child: const Icon(Icons.broken_image, color: Colors.white54)),
                           );
                         } else {
                            return Container(color: Colors.grey[900], child: const Center(child: CircularProgressIndicator(strokeWidth: 2)));
                         }
                       }
                     )
                   else
                     Image.network(
                       imageUrl,
                       fit: BoxFit.cover,
                       errorBuilder: (ctx, err, stack) => Container(color: Colors.grey[800], child: const Icon(Icons.broken_image, color: Colors.white54)),
                     ),
                   
                   // Gradient Overlay
                   const DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [Colors.transparent, Colors.black54],
                          stops: [0.6, 1.0],
                        ),
                      ),
                   ),
                   // Status Badge
                   Positioned(
                     top: 12,
                     right: 12,
                     child: Container(
                       padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                       decoration: BoxDecoration(
                         color: Colors.red.withOpacity(0.9),
                         borderRadius: BorderRadius.circular(8),
                         boxShadow: const [BoxShadow(blurRadius: 4, color: Colors.black26)]
                       ),
                       child: Text(
                         '${(widget.violation['confidence'] * 100).toInt()}% Match',
                         style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                       ),
                     ),
                   )
                 ],
               ),
            ),
          ),
          
          // Content
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.warning_amber_rounded, color: Colors.redAccent, size: 28),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.violation['violationType'] ?? 'Violation',
                        style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.access_time, size: 14, color: Colors.blueGrey[400]),
                          const SizedBox(width: 4),
                          Text(formattedTime, style: TextStyle(color: Colors.blueGrey[400], fontSize: 13)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                         widget.violation['location'] ?? 'Site Camera 1',
                         style: TextStyle(color: Colors.blueGrey[500], fontSize: 12, fontStyle: FontStyle.italic),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: Colors.blueGrey[600]),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
