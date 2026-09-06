import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/app_providers.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  final VoidCallback onReopenOnboarding;

  const ProfileScreen({super.key, required this.onReopenOnboarding});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _isBackendConnected = false;
  bool _isChecking = true;

  @override
  void initState() {
    super.initState();
    _checkBackendStatus();
  }

  Future<void> _checkBackendStatus() async {
    setState(() => _isChecking = true);
    final aiService = ref.read(aiServiceProvider);
    final connected = await aiService.checkHealth();
    if (mounted) {
      setState(() {
        _isBackendConnected = connected;
        _isChecking = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkSurface : AppColors.lightSurface;
    final textPrimary = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
    final textSecondary = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;

    final userProfile = ref.watch(userProfileProvider);
    final themeMode = ref.watch(themeModeProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile & Settings'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // User Avatar & Title Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(20)),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 32,
                      backgroundColor: AppColors.primaryTeal,
                      child: const Text('A', style: TextStyle(fontSize: 26, color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Alex Rivera', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: textPrimary)),
                          const SizedBox(height: 2),
                          Text(userProfile.diabetesType, style: const TextStyle(fontSize: 13, color: AppColors.primaryTeal, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 2),
                          Text('Target: ${userProfile.healthGoal}', style: TextStyle(fontSize: 12, color: textSecondary)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Theme Mode Setting Card
              Text('Preferences', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: textPrimary)),
              const SizedBox(height: 10),
              Container(
                decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(16)),
                child: SwitchListTile(
                  title: Text('Dark Mode Theme', style: TextStyle(fontWeight: FontWeight.bold, color: textPrimary)),
                  subtitle: Text('Enable calm slate dark color palette', style: TextStyle(fontSize: 12, color: textSecondary)),
                  secondary: Icon(isDark ? Icons.dark_mode : Icons.light_mode, color: AppColors.primaryTeal),
                  value: themeMode == ThemeMode.dark,
                  activeColor: AppColors.primaryTeal,
                  onChanged: (val) {
                    ref.read(themeModeProvider.notifier).state = val ? ThemeMode.dark : ThemeMode.light;
                  },
                ),
              ),

              const SizedBox(height: 24),

              // Medical Baseline Card
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Medical Baseline', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: textPrimary)),
                  TextButton.icon(
                    icon: const Icon(Icons.edit, size: 16, color: AppColors.primaryTeal),
                    label: const Text('Edit Assessment', style: TextStyle(color: AppColors.primaryTeal)),
                    onPressed: widget.onReopenOnboarding,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(16)),
                child: Column(
                  children: [
                    _buildBaselineRow('Diagnosis', userProfile.diabetesType, textPrimary, textSecondary),
                    const Divider(height: 20),
                    _buildBaselineRow('Medications', userProfile.medications.join(', '), textPrimary, textSecondary),
                    const Divider(height: 20),
                    _buildBaselineRow('Sleep Schedule', userProfile.sleepSchedule, textPrimary, textSecondary),
                    const Divider(height: 20),
                    _buildBaselineRow('Diet Pattern', userProfile.dietPattern, textPrimary, textSecondary),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // AI Service Connection Status
              Text('AI Backend Status', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: textPrimary)),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(16)),
                child: Row(
                  children: [
                    Icon(
                      _isBackendConnected ? Icons.cloud_done : Icons.cloud_off,
                      color: _isBackendConnected ? AppColors.healthGreen : AppColors.alertRed,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _isBackendConnected ? 'Connected to ReLifeX AI Service' : 'Backend Service Offline (Local Fallback Active)',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: textPrimary),
                          ),
                          Text('http://10.0.2.2:3000 / localhost:3000', style: TextStyle(fontSize: 12, color: textSecondary)),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: _isChecking ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.refresh, size: 20),
                      onPressed: _checkBackendStatus,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBaselineRow(String title, String val, Color textPrimary, Color textSecondary) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: TextStyle(fontSize: 13, color: textSecondary)),
        const SizedBox(width: 16),
        Expanded(
          child: Text(
            val,
            textAlign: TextAlign.end,
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: textPrimary),
          ),
        ),
      ],
    );
  }
}
