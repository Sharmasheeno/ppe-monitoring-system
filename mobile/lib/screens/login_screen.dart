import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import 'admin_dashboard.dart';
import 'main_screen.dart';

// PPE Monitoring Brand Colors
const kGreen600 = Color(0xFF16A34A);
const kGreen500 = Color(0xFF22C55E);
const kGreen50  = Color(0xFFF0FDF4);
const kGreen100 = Color(0xFFDCFCE7);
const kGreen200 = Color(0xFFBBF7D0);

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _apiService = ApiService();
  bool _isLoading = false;
  bool _isObscure = true;

  void _login() async {
    if (_usernameController.text.trim().isEmpty || _passwordController.text.trim().isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Please enter your username or email and password',
              style: GoogleFonts.inter()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);
    final result = await _apiService.login(
      _usernameController.text.trim(),
      _passwordController.text.trim(),
    );
    setState(() => _isLoading = false);

    if (result['success']) {
      final role = result['data']['user']['role'];
      if (!mounted) return;
      if (role == 'admin') {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const AdminDashboard()),
        );
      } else {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const MainScreen()),
        );
      }
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message'], style: GoogleFonts.inter())),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kGreen50,
      body: Stack(
        children: [
          // Decorative green blob top-right
          Positioned(
            top: -60,
            right: -60,
            child: Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: kGreen200.withOpacity(0.5),
              ),
            ),
          ),
          // Decorative green blob bottom-left
          Positioned(
            bottom: -40,
            left: -40,
            child: Container(
              width: 160,
              height: 160,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: kGreen100,
              ),
            ),
          ),
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28.0, vertical: 24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Custom Web-style Logo
                  SizedBox(
                    width: 76,
                    height: 76,
                    child: CustomPaint(
                      painter: PPELogoPainter(inverted: false),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'PPE',
                    style: GoogleFonts.inter(
                      fontSize: 32,
                      fontWeight: FontWeight.w900,
                      color: kGreen600,
                      letterSpacing: 2.0,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'MONITORING',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      color: Colors.grey.shade700,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 2.0,
                    ),
                  ),
                  const SizedBox(height: 36),

                  // Card
                  Container(
                    padding: const EdgeInsets.all(28),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: kGreen200),
                      boxShadow: [
                        BoxShadow(
                          color: kGreen500.withOpacity(0.08),
                          blurRadius: 30,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Welcome back',
                          style: GoogleFonts.inter(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text('Sign in to your account',
                          style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade500),
                        ),
                        const SizedBox(height: 24),

                        // Username or Email
                        _buildLabel('Username or Email'),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _usernameController,
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                          autocorrect: false,
                          style: GoogleFonts.inter(color: Colors.black87, fontSize: 14),
                          decoration: InputDecoration(
                            hintText: 'Username or you@example.com',
                            hintStyle: GoogleFonts.inter(color: Colors.grey.shade400, fontSize: 14),
                            filled: true,
                            fillColor: kGreen50,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: kGreen200),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: kGreen200),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: kGreen600, width: 2),
                            ),
                            prefixIcon: const Icon(Icons.person_outline, color: kGreen600, size: 20),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Password
                        _buildLabel('Password'),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _passwordController,
                          obscureText: _isObscure,
                          style: GoogleFonts.inter(color: Colors.black87, fontSize: 14),
                          decoration: InputDecoration(
                            hintText: '••••••••',
                            hintStyle: GoogleFonts.inter(color: Colors.grey.shade400, fontSize: 14),
                            filled: true,
                            fillColor: kGreen50,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: kGreen200),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: kGreen200),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: kGreen600, width: 2),
                            ),
                            prefixIcon: const Icon(Icons.lock_outline, color: kGreen600, size: 20),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _isObscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                color: Colors.grey.shade400,
                                size: 20,
                              ),
                              onPressed: () => setState(() => _isObscure = !_isObscure),
                            ),
                          ),
                        ),

                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: () => Navigator.pushNamed(context, '/forgot-password'),
                            child: Text(
                              'Forgot Password?',
                              style: GoogleFonts.inter(
                                color: kGreen600,
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: ElevatedButton(
                            onPressed: _isLoading ? null : _login,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: kGreen600,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                              elevation: 0,
                              shadowColor: kGreen600.withOpacity(0.4),
                            ),
                            child: _isLoading
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2.5,
                                    ),
                                  )
                                : Text(
                                    'Sign In',
                                    style: GoogleFonts.inter(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),
                  Text(
                    'Worker accounts are created by your Supervisor.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(color: Colors.grey.shade500, fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: GoogleFonts.inter(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: Colors.black87,
      ),
    );
  }
}

class PPELogoPainter extends CustomPainter {
  final bool inverted;
  PPELogoPainter({this.inverted = false});

  @override
  void paint(Canvas canvas, Size size) {
    final double scale = size.width / 48.0;
    canvas.scale(scale, scale);

    final bg = inverted ? Colors.white : const Color(0xFF16A34A);
    final fg = inverted ? const Color(0xFF16A34A) : Colors.white;
    final scan = inverted ? const Color(0xFF16A34A) : Colors.white.withOpacity(0.55);

    // Octagon contour
    final paintOctagon = Paint()..color = bg;
    if (inverted) {
      paintOctagon.style = PaintingStyle.stroke;
      paintOctagon.strokeWidth = 1.5;
    }
    final pathOctagon = Path()
      ..moveTo(18, 3)
      ..lineTo(30, 3)
      ..lineTo(39, 12)
      ..lineTo(39, 24)
      ..lineTo(30, 33)
      ..lineTo(18, 33)
      ..lineTo(9, 24)
      ..lineTo(9, 12)
      ..close();
    canvas.drawPath(pathOctagon, paintOctagon);

    // Hard-hat dome
    final paintHat = Paint()..color = fg.withOpacity(0.95);
    final pathHat = Path()
      ..moveTo(14, 28)
      ..quadraticBezierTo(14, 18, 24, 17)
      ..quadraticBezierTo(34, 18, 34, 28)
      ..close();
    canvas.drawPath(pathHat, paintHat);

    // Hard-hat brim
    final paintBrim = Paint()..color = fg.withOpacity(0.95);
    canvas.drawRRect(
        RRect.fromRectAndRadius(const Rect.fromLTWH(12, 27, 24, 3), const Radius.circular(1.5)),
        paintBrim);

    // Scan line (dashed effect)
    final paintScan = Paint()
      ..color = scan
      ..strokeWidth = 1.4
      ..style = PaintingStyle.stroke;

    canvas.drawLine(const Offset(14, 22), const Offset(17, 22), paintScan);
    canvas.drawLine(const Offset(19, 22), const Offset(22, 22), paintScan);
    canvas.drawLine(const Offset(26, 22), const Offset(29, 22), paintScan);
    canvas.drawLine(const Offset(31, 22), const Offset(34, 22), paintScan);

    // Center dot
    final paintDot = Paint()..color = scan == Colors.white.withOpacity(0.55) ? Colors.white : const Color(0xFF16A34A);
    canvas.drawCircle(const Offset(24, 22), 1.5, paintDot);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

