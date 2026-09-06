import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/app_providers.dart';

class HomeScreen extends ConsumerStatefulWidget {
  final Function(int) onNavigateTab;

  const HomeScreen({super.key, required this.onNavigateTab});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  Map<String, dynamic>? _aiInsight;
  bool _isLoadingInsight = false;
  bool _hasInsightError = false;

  @override
  void initState() {
    super.initState();
    _loadDailyInsight();
  }

  Future<void> _loadDailyInsight() async {
    setState(() {
      _isLoadingInsight = true;
      _hasInsightError = false;
    });
    final aiService = ref.read(aiServiceProvider);
    try {
      final result = await aiService.fetchDailyInsight('user_mock_123');
      if (mounted) {
        setState(() {
          _aiInsight = result;
          _isLoadingInsight = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _hasInsightError = true;
          _isLoadingInsight = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkSurface : AppColors.lightSurface;
    final textPrimary = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
    final textSecondary = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;

    final userProfile = ref.watch(userProfileProvider);
    final journey = ref.watch(journeyProvider);
    final checklist = ref.watch(dailyChecklistProvider);
    final checklistNotifier = ref.read(dailyChecklistProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.primaryTeal.withOpacity(0.15),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.primaryTeal, width: 1),
              ),
              child: const Row(
                children: [
                  Icon(Icons.bolt, color: AppColors.primaryTeal, size: 16),
                  SizedBox(width: 4),
                  Text(
                    'ReLifeX Today',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primaryTeal,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.warningOrange.withOpacity(0.2),
                  AppColors.warningOrange.withOpacity(0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.warningOrange.withOpacity(0.5)),
            ),
            child: Row(
              children: [
                const Icon(Icons.local_fire_department, color: AppColors.warningOrange, size: 18),
                const SizedBox(width: 4),
                Text(
                  '${journey.currentStreak} Days',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: AppColors.warningOrange,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Good Morning, Alex',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                userProfile.healthGoal,
                style: TextStyle(fontSize: 14, color: textSecondary),
              ),
              const SizedBox(height: 20),

              _buildProgressRingCard(context, journey, cardBg, textPrimary, textSecondary),
              const SizedBox(height: 20),

              _buildAIInsightCard(context, cardBg, textPrimary, textSecondary, isDark),
              const SizedBox(height: 24),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Daily Health Checklist',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: textPrimary,
                    ),
                  ),
                  Text(
                    '${checklist.completedCount} / 5 Completed',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primaryTeal,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              _buildChecklistItem(
                title: 'Morning Fasting Glucose',
                subtitle: checklist.fastingGlucoseLogged ? 'Logged: 108 mg/dL (Normal)' : 'Tap to log entry',
                icon: Icons.water_drop,
                iconColor: AppColors.primaryTeal,
                isChecked: checklist.fastingGlucoseLogged,
                onTap: () => checklistNotifier.toggleCheck('fastingGlucose'),
                cardBg: cardBg,
                textPrimary: textPrimary,
                textSecondary: textSecondary,
              ),
              _buildChecklistItem(
                title: 'Breakfast Medication (Metformin)',
                subtitle: checklist.breakfastMedChecked ? 'Taken at 8:15 AM' : 'Check off prescription dose',
                icon: Icons.medication,
                iconColor: AppColors.healthGreen,
                isChecked: checklist.breakfastMedChecked,
                onTap: () => checklistNotifier.toggleCheck('breakfastMed'),
                cardBg: cardBg,
                textPrimary: textPrimary,
                textSecondary: textSecondary,
              ),
              _buildChecklistItem(
                title: 'Meal Photo Carb Log',
                subtitle: checklist.mealPhotoLogged ? 'Parsed: 38g carbs (Low GI)' : 'Snap meal photo with AI Vision',
                icon: Icons.camera_alt,
                iconColor: AppColors.purpleAccent,
                isChecked: checklist.mealPhotoLogged,
                onTap: () => checklistNotifier.toggleCheck('mealPhoto'),
                cardBg: cardBg,
                textPrimary: textPrimary,
                textSecondary: textSecondary,
              ),
              _buildChecklistItem(
                title: 'Evening Physical Movement',
                subtitle: checklist.exerciseLogged ? '25 min brisk walk completed' : 'Target: 20+ mins post-dinner',
                icon: Icons.directions_walk,
                iconColor: AppColors.warningOrange,
                isChecked: checklist.exerciseLogged,
                onTap: () => checklistNotifier.toggleCheck('exercise'),
                cardBg: cardBg,
                textPrimary: textPrimary,
                textSecondary: textSecondary,
              ),
              _buildChecklistItem(
                title: 'Dinner Medication Dose',
                subtitle: checklist.dinnerMedChecked ? 'Taken' : 'Scheduled for 7:30 PM',
                icon: Icons.medication_liquid,
                iconColor: AppColors.healthGreen,
                isChecked: checklist.dinnerMedChecked,
                onTap: () => checklistNotifier.toggleCheck('dinnerMed'),
                cardBg: cardBg,
                textPrimary: textPrimary,
                textSecondary: textSecondary,
              ),

              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryTeal,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      icon: const Icon(Icons.add, size: 20),
                      label: const Text('Quick Log'),
                      onPressed: () => widget.onNavigateTab(1),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primaryTeal,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        side: const BorderSide(color: AppColors.primaryTeal),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      icon: const Icon(Icons.chat_bubble_outline, size: 20),
                      label: const Text('Ask AI Coach'),
                      onPressed: () => widget.onNavigateTab(2),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProgressRingCard(
    BuildContext context,
    JourneyState journey,
    Color cardBg,
    Color textPrimary,
    Color textSecondary,
  ) {
    final percent = (journey.progressPercentage * 100).toInt();

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.primaryTeal.withOpacity(0.3), width: 1.5),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            height: 80,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 80,
                  height: 80,
                  child: CircularProgressIndicator(
                    value: journey.progressPercentage,
                    strokeWidth: 8,
                    backgroundColor: AppColors.primaryTeal.withOpacity(0.15),
                    color: AppColors.primaryTeal,
                    strokeCap: StrokeCap.round,
                  ),
                ),
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '$percent%',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: textPrimary,
                      ),
                    ),
                    Text(
                      'Day ${journey.currentDay}',
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.primaryTeal,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      '66-Day Journey',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: textPrimary,
                      ),
                    ),
                    const Spacer(),
                    GestureDetector(
                      onTap: () => widget.onNavigateTab(3),
                      child: const Text(
                        'View Map >',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.primaryTeal,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'Scientific habit neuroplasticity window. You are on track for metabolic stability.',
                  style: TextStyle(
                    fontSize: 13,
                    color: textSecondary,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAIInsightCard(
    BuildContext context,
    Color cardBg,
    Color textPrimary,
    Color textSecondary,
    bool isDark,
  ) {
    if (_isLoadingInsight) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(18)),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primaryTeal)),
            SizedBox(width: 12),
            Text('Analyzing 7-day metabolic trends...', style: TextStyle(color: AppColors.primaryTeal, fontWeight: FontWeight.bold, fontSize: 13)),
          ],
        ),
      );
    }

    if (_hasInsightError) {
      return Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.warningOrange.withOpacity(0.4)),
        ),
        child: Row(
          children: [
            const Icon(Icons.info_outline, color: AppColors.warningOrange, size: 24),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('AI Service Temporarily Unavailable', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: textPrimary)),
                  const SizedBox(height: 2),
                  Text('ReLifeX is operating in offline mode. Baseline logging functions remain active.', style: TextStyle(fontSize: 12, color: textSecondary)),
                ],
              ),
            ),
            IconButton(icon: const Icon(Icons.refresh, size: 18), onPressed: _loadDailyInsight),
          ],
        ),
      );
    }

    final insightText = _aiInsight?['insight'] ?? 'Logging 15+ minutes of evening physical activity coincided with lower post-dinner glucose readings.';
    final evidenceText = _aiInsight?['evidence'] ?? '7-day trend shows 18% lower peak glucose on active evenings.';
    final suggestionText = _aiInsight?['suggestion'] ?? 'Continue logging your post-dinner activity minutes daily.';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primaryTeal.withOpacity(0.12),
            AppColors.healthGreen.withOpacity(0.08),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.primaryTeal.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppColors.primaryTeal,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.auto_awesome, color: Colors.white, size: 16),
              ),
              const SizedBox(width: 10),
              const Text(
                'AI Daily Health Intelligence',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryTeal,
                ),
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.refresh, size: 18),
                onPressed: _loadDailyInsight,
                color: textSecondary,
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            insightText,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: textPrimary,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isDark ? Colors.black26 : Colors.white60,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.analytics_outlined, size: 14, color: AppColors.primaryTeal),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Evidence: $evidenceText',
                        style: TextStyle(fontSize: 12, color: textSecondary),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.lightbulb_outline, size: 14, color: AppColors.warningOrange),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Action: $suggestionText',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: textPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChecklistItem({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    required bool isChecked,
    required VoidCallback onTap,
    required Color cardBg,
    required Color textPrimary,
    required Color textSecondary,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isChecked ? iconColor.withOpacity(0.4) : Colors.transparent,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: iconColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: isChecked ? textSecondary : textPrimary,
                      decoration: isChecked ? TextDecoration.lineThrough : null,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12,
                      color: textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              isChecked ? Icons.check_circle : Icons.radio_button_unchecked,
              color: isChecked ? iconColor : textSecondary,
              size: 22,
            ),
          ],
        ),
      ),
    );
  }
}
