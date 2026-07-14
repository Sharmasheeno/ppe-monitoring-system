import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';

// PPE Monitoring Brand Colors
const kGreen600 = Color(0xFF16A34A);
const kGreen500 = Color(0xFF22C55E);
const kGreen50  = Color(0xFFF0FDF4);
const kGreen100 = Color(0xFFDCFCE7);
const kGreen200 = Color(0xFFBBF7D0);

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _apiService = ApiService();

  // Step control: 1 = email, 2 = OTP, 3 = new password
  int _step = 1;

  // Step 1
  final _emailController = TextEditingController();

  // Step 2 – OTP (6 individual controllers)
  final List<TextEditingController> _otpControllers =
      List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _otpFocusNodes =
      List.generate(6, (_) => FocusNode());

  // Step 3
  final _newPasswordController    = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _showPassword = false;

  bool _isLoading = false;
  String _errorMsg = '';

  String get _enteredCode =>
      _otpControllers.map((c) => c.text).join();

  void _setError(String msg) => setState(() => _errorMsg = msg);
  void _clearError()         => setState(() => _errorMsg = '');

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────
  Future<void> _sendCode() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) { _setError('Please enter your email address.'); return; }
    _clearError();
    setState(() => _isLoading = true);
    final result = await _apiService.forgotPassword(email);
    setState(() => _isLoading = false);
    if (result['success']) {
      setState(() => _step = 2);
    } else {
      _setError(result['message'] ?? 'Failed to send code.');
    }
  }

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  Future<void> _verifyCode() async {
    if (_enteredCode.length < 6) { _setError('Please enter the full 6-digit code.'); return; }
    _clearError();
    setState(() => _isLoading = true);
    final result = await _apiService.verifyResetCode(_emailController.text.trim(), _enteredCode);
    setState(() => _isLoading = false);
    if (result['success']) {
      setState(() => _step = 3);
    } else {
      _setError(result['message'] ?? 'Invalid or expired code.');
    }
  }

  // ── Step 3: Reset Password ────────────────────────────────────────────────
  Future<void> _resetPassword() async {
    final newPwd     = _newPasswordController.text;
    final confirmPwd = _confirmPasswordController.text;
    if (newPwd.isEmpty)              { _setError('Please enter a new password.'); return; }
    if (newPwd != confirmPwd)        { _setError('Passwords do not match.'); return; }
    _clearError();
    setState(() => _isLoading = true);
    final result = await _apiService.resetPassword(
      _emailController.text.trim(), _enteredCode, newPwd,
    );
    setState(() => _isLoading = false);
    if (result['success']) {
      if (!mounted) return;
      _showSuccessAndPop();
    } else {
      _setError(result['message'] ?? 'Failed to reset password.');
    }
  }

  void _showSuccessAndPop() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(color: kGreen100, shape: BoxShape.circle),
              child: const Icon(Icons.check_rounded, color: kGreen600, size: 44),
            ),
            const SizedBox(height: 20),
            Text('Password Updated!',
                style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87)),
            const SizedBox(height: 8),
            Text('You can now sign in with your new password.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade500, height: 1.5)),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () { Navigator.pop(context); Navigator.pop(context); },
                style: ElevatedButton.styleFrom(
                  backgroundColor: kGreen600,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Text('Back to Sign In',
                    style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  // ── Build ─────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kGreen50,
      body: Stack(children: [
        // Blobs
        Positioned(top: -60, right: -60,
            child: Container(width: 220, height: 220,
                decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0x40BBF7D0)))),
        Positioned(bottom: -40, left: -40,
            child: Container(width: 160, height: 160,
                decoration: const BoxDecoration(shape: BoxShape.circle, color: kGreen100))),
        // Back button
        Positioned(
          top: 50, left: 10,
          child: IconButton(
            icon: const Icon(Icons.arrow_back, color: kGreen600),
            onPressed: () {
              if (_step > 1) { setState(() { _step--; _clearError(); }); }
              else           { Navigator.pop(context); }
            },
          ),
        ),
        Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
            child: Column(children: [
              // Logo
              SizedBox(width: 76, height: 76,
                  child: CustomPaint(painter: PPELogoPainter(inverted: false))),
              const SizedBox(height: 12),
              Text('PPE', style: GoogleFonts.inter(
                  fontSize: 32, fontWeight: FontWeight.w900,
                  color: kGreen600, letterSpacing: 2.0)),
              const SizedBox(height: 4),
              Text('MONITORING', style: GoogleFonts.inter(
                  fontSize: 16, color: Colors.grey.shade700,
                  fontWeight: FontWeight.w800, letterSpacing: 2.0)),
              const SizedBox(height: 28),

              // Progress dots
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                for (int i = 1; i <= 3; i++) ...[
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    width: i == _step ? 28 : 10,
                    height: 8,
                    decoration: BoxDecoration(
                      color: i <= _step ? kGreen600 : Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  if (i < 3) const SizedBox(width: 6),
                ],
              ]),
              const SizedBox(height: 24),

              // Card
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 280),
                transitionBuilder: (child, anim) => FadeTransition(opacity: anim, child: child),
                child: Container(
                  key: ValueKey(_step),
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: kGreen200),
                    boxShadow: [BoxShadow(
                      color: kGreen500.withOpacity(0.08),
                      blurRadius: 30, offset: const Offset(0, 8),
                    )],
                  ),
                  child: _step == 1 ? _buildStep1()
                       : _step == 2 ? _buildStep2()
                       :              _buildStep3(),
                ),
              ),

              const SizedBox(height: 24),
              if (_step == 1)
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text("Remembered your password? ",
                      style: GoogleFonts.inter(color: Colors.grey.shade500, fontSize: 13)),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Text('Sign In',
                        style: GoogleFonts.inter(
                            color: kGreen600, fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                ]),
            ]),
          ),
        ),
      ]),
    );
  }

  // ── Step 1 Widget ─────────────────────────────────────────────────────────
  Widget _buildStep1() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _stepHeader(Icons.email_outlined, 'Forgot Password?',
          "Enter your email and we'll send a 6-digit reset code."),
      const SizedBox(height: 20),
      _fieldLabel('Email Address'),
      const SizedBox(height: 6),
      _emailField(),
      const SizedBox(height: 8),
      if (_errorMsg.isNotEmpty) _errorBanner(),
      const SizedBox(height: 20),
      _primaryButton('Send Code', _isLoading ? null : _sendCode),
    ]);
  }

  // ── Step 2 Widget ─────────────────────────────────────────────────────────
  Widget _buildStep2() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _stepHeader(Icons.pin_outlined, 'Enter Code',
          'We sent a 6-digit code to\n${_emailController.text.trim()}'),
      const SizedBox(height: 24),
      // OTP boxes
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: List.generate(6, (i) => _otpBox(i)),
      ),
      const SizedBox(height: 8),
      if (_errorMsg.isNotEmpty) _errorBanner(),
      const SizedBox(height: 20),
      _primaryButton('Verify Code', _isLoading ? null : _verifyCode),
      const SizedBox(height: 12),
      Center(
        child: TextButton(
          onPressed: () { setState(() { _step = 1; _clearError(); }); },
          child: Text('Resend or change email',
              style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade500)),
        ),
      ),
    ]);
  }

  // ── Step 3 Widget ─────────────────────────────────────────────────────────
  Widget _buildStep3() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _stepHeader(Icons.lock_outline_rounded, 'New Password',
          'Set a strong new password for your account.'),
      const SizedBox(height: 20),
      _fieldLabel('New Password'),
      const SizedBox(height: 6),
      _passwordField(_newPasswordController, 'Min 8 chars, upper, number, symbol'),
      const SizedBox(height: 14),
      _fieldLabel('Confirm Password'),
      const SizedBox(height: 6),
      _passwordField(_confirmPasswordController, 'Repeat your new password'),
      const SizedBox(height: 8),
      if (_errorMsg.isNotEmpty) _errorBanner(),
      const SizedBox(height: 20),
      _primaryButton('Update Password', _isLoading ? null : _resetPassword),
    ]);
  }

  // ── Shared Widgets ────────────────────────────────────────────────────────
  Widget _stepHeader(IconData icon, String title, String subtitle) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: kGreen50, borderRadius: BorderRadius.circular(14),
            border: Border.all(color: kGreen200)),
        child: Icon(icon, color: kGreen600, size: 28),
      ),
      const SizedBox(height: 14),
      Text(title, style: GoogleFonts.inter(
          fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87)),
      const SizedBox(height: 6),
      Text(subtitle, style: GoogleFonts.inter(
          fontSize: 13, color: Colors.grey.shade500, height: 1.5)),
    ]);
  }

  Widget _fieldLabel(String label) => Text(label,
      style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.black87));

  Widget _emailField() => TextField(
    controller: _emailController,
    keyboardType: TextInputType.emailAddress,
    style: GoogleFonts.inter(color: Colors.black87, fontSize: 14),
    decoration: InputDecoration(
      hintText: 'Enter your registered email',
      hintStyle: GoogleFonts.inter(color: Colors.grey.shade400, fontSize: 14),
      filled: true, fillColor: kGreen50,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border:        OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: kGreen200)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: kGreen200)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: kGreen600, width: 2)),
      prefixIcon: const Icon(Icons.email_outlined, color: kGreen600, size: 20),
    ),
  );

  Widget _otpBox(int i) {
    return SizedBox(
      width: 44, height: 54,
      child: TextField(
        controller: _otpControllers[i],
        focusNode: _otpFocusNodes[i],
        textAlign: TextAlign.center,
        keyboardType: TextInputType.number,
        maxLength: 1,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.black87),
        decoration: InputDecoration(
          counterText: '',
          filled: true, fillColor: kGreen50,
          contentPadding: EdgeInsets.zero,
          border:        OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: kGreen200, width: 1.5)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: kGreen200, width: 1.5)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: kGreen600, width: 2)),
        ),
        onChanged: (val) {
          if (val.isNotEmpty && i < 5) {
            _otpFocusNodes[i + 1].requestFocus();
          } else if (val.isEmpty && i > 0) {
            _otpFocusNodes[i - 1].requestFocus();
          }
        },
      ),
    );
  }

  Widget _passwordField(TextEditingController ctrl, String hint) => TextField(
    controller: ctrl,
    obscureText: !_showPassword,
    style: GoogleFonts.inter(color: Colors.black87, fontSize: 14),
    decoration: InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.inter(color: Colors.grey.shade400, fontSize: 13),
      filled: true, fillColor: kGreen50,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border:        OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: kGreen200)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: kGreen200)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: kGreen600, width: 2)),
      prefixIcon: const Icon(Icons.lock_outline, color: kGreen600, size: 20),
      suffixIcon: IconButton(
        icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility,
            color: Colors.grey.shade400, size: 20),
        onPressed: () => setState(() => _showPassword = !_showPassword),
      ),
    ),
  );

  Widget _errorBanner() => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    margin: const EdgeInsets.only(top: 4, bottom: 4),
    decoration: BoxDecoration(
      color: const Color(0xFFFEF2F2),
      border: Border.all(color: const Color(0xFFFECACA)),
      borderRadius: BorderRadius.circular(10),
    ),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 16),
      const SizedBox(width: 8),
      Expanded(child: Text(_errorMsg,
          style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFFDC2626)))),
    ]),
  );

  Widget _primaryButton(String label, VoidCallback? onPressed) => SizedBox(
    width: double.infinity, height: 52,
    child: ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: kGreen600,
        disabledBackgroundColor: kGreen600.withOpacity(0.6),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        elevation: 0,
      ),
      child: _isLoading
          ? const SizedBox(width: 22, height: 22,
              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
          : Text(label, style: GoogleFonts.inter(
              fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
    ),
  );

  @override
  void dispose() {
    _emailController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    for (final c in _otpControllers) c.dispose();
    for (final f in _otpFocusNodes) f.dispose();
    super.dispose();
  }
}

// ── PPE Logo Painter ──────────────────────────────────────────────────────────
class PPELogoPainter extends CustomPainter {
  final bool inverted;
  PPELogoPainter({this.inverted = false});

  @override
  void paint(Canvas canvas, Size size) {
    final double scale = size.width / 48.0;
    canvas.scale(scale, scale);

    final bg   = inverted ? Colors.white : const Color(0xFF16A34A);
    final fg   = inverted ? const Color(0xFF16A34A) : Colors.white;
    final scan = inverted ? const Color(0xFF16A34A) : Colors.white.withOpacity(0.55);

    final paintOctagon = Paint()..color = bg;
    if (inverted) {
      paintOctagon.style = PaintingStyle.stroke;
      paintOctagon.strokeWidth = 1.5;
    }
    final pathOctagon = Path()
      ..moveTo(18, 3)..lineTo(30, 3)..lineTo(39, 12)..lineTo(39, 24)
      ..lineTo(30, 33)..lineTo(18, 33)..lineTo(9, 24)..lineTo(9, 12)..close();
    canvas.drawPath(pathOctagon, paintOctagon);

    final paintHat = Paint()..color = fg.withOpacity(0.95);
    final pathHat  = Path()
      ..moveTo(14, 28)..quadraticBezierTo(14, 18, 24, 17)
      ..quadraticBezierTo(34, 18, 34, 28)..close();
    canvas.drawPath(pathHat, paintHat);

    final paintBrim = Paint()..color = fg.withOpacity(0.95);
    canvas.drawRRect(
        RRect.fromRectAndRadius(const Rect.fromLTWH(12, 27, 24, 3), const Radius.circular(1.5)),
        paintBrim);

    final paintScan = Paint()
      ..color = scan ..strokeWidth = 1.4 ..style = PaintingStyle.stroke;
    canvas.drawLine(const Offset(14, 22), const Offset(17, 22), paintScan);
    canvas.drawLine(const Offset(19, 22), const Offset(22, 22), paintScan);
    canvas.drawLine(const Offset(26, 22), const Offset(29, 22), paintScan);
    canvas.drawLine(const Offset(31, 22), const Offset(34, 22), paintScan);

    final paintDot = Paint()
      ..color = scan == Colors.white.withOpacity(0.55) ? Colors.white : const Color(0xFF16A34A);
    canvas.drawCircle(const Offset(24, 22), 1.5, paintDot);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
