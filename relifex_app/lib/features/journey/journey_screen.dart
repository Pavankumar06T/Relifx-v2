import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/app_providers.dart';

class JourneyScreen extends ConsumerStatefulWidget {
  const JourneyScreen({super.key});

  @override
  ConsumerState<JourneyScreen> createState() => _JourneyScreenState();
}

class _JourneyScreenState extends ConsumerState<JourneyScreen> {
  Map<String, dynamic>? _weeklyRecap;
  bool _isLoadingRecap = false;
  bool _hasRecapError = false;

  @override
  void initState() {
    super.initState();
    _loadWeeklyRecap();
  }

  Future<void> _loadWeeklyRecap() async {
    setState(() {
      _isLoadingRecap = true;
      _hasRecapError = false;
    });
    final aiService = ref.read(aiServiceProvider);
    try {
      final result = await aiService.fetchWeeklyRecap('user_mock_123');
      if (mounted) {
        setState(() {
          _weeklyRecap = result;
          _isLoadingRecap = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _hasRecapError = true;
          _isLoadingRecap = false;
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

    final journey = ref.watch(journeyProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('66-Day Habit Journey'),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () {
              showDialog(
                context: context,
                builder: (_) => AlertDialog(
                  title: const Text('The 66-Day Habit Science'),
                  content: const Text(
                    'Research by Dr. Phillippa Lally at UCL shows that it takes an average of 66 days for a new health behavior to become an automatic habit. ReLifeX structures your metabolic transformation into three 22-day phases.',
                  ),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context), child: const Text('Got it')),
                  ],
                ),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Hero Summary Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppColors.primaryTeal, AppColors.healthGreen],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Phase 1: Habit Destruction & Setup',
                          style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(12)),
                          child: Text('Day ${journey.currentDay} / 66', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Neuroplasticity Rewiring',
                      style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Streak: ${journey.currentStreak} consecutive active logging days!',
                      style: const TextStyle(color: Colors.white70, fontSize: 14),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Weekly AI Recap Generator Card
              _buildWeeklyRecapCard(context, cardBg, textPrimary, textSecondary, isDark),

              const SizedBox(height: 24),

              // 66-Day Grid Visualization
              Text('Milestone Progress Grid', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: textPrimary)),
              const SizedBox(height: 6),
              Text('Each dot represents one day in your 66-day neuroplasticity window.', style: TextStyle(fontSize: 13, color: textSecondary)),
              const SizedBox(height: 16),

              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(16)),
                child: Column(
                  children: [
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 11,
                        crossAxisSpacing: 6,
                        mainAxisSpacing: 6,
                      ),
                      itemCount: 66,
                      itemBuilder: (context, index) {
                        final isCompleted = journey.completedDays[index];
                        final isCurrent = index == journey.currentDay - 1;

                        Color dotColor = isDark ? AppColors.darkSurfaceSubtle : AppColors.lightSurfaceSubtle;
                        if (isCompleted) dotColor = AppColors.primaryTeal;
                        if (isCurrent) dotColor = AppColors.warningOrange;

                        return Container(
                          decoration: BoxDecoration(
                            color: dotColor,
                            shape: BoxShape.circle,
                            border: isCurrent ? Border.all(color: Colors.white, width: 2) : null,
                          ),
                          child: Center(
                            child: Text(
                              '${index + 1}',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: isCompleted || isCurrent ? Colors.white : textSecondary,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildLegendItem('Days 1-22: Destruction', AppColors.primaryTeal, textSecondary),
                        _buildLegendItem('Days 23-44: Installation', AppColors.healthGreen, textSecondary),
                        _buildLegendItem('Days 45-66: Integration', AppColors.purpleAccent, textSecondary),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Weekly Reflection Card
              Text('Weekly Reflection Log', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: textPrimary)),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(16)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.edit_note, color: AppColors.primaryTeal, size: 22),
                        const SizedBox(width: 8),
                        Text('Week 2 Reflection Prompt', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: textPrimary)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      '"What meal or activity shift had the most noticeable positive effect on your energy level this week?"',
                      style: TextStyle(fontSize: 14, fontStyle: FontStyle.italic, color: textSecondary),
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primaryTeal,
                          side: const BorderSide(color: AppColors.primaryTeal),
                        ),
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Reflection editor opened!')),
                          );
                        },
                        child: const Text('Add Reflection Entry'),
                      ),
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

  Widget _buildWeeklyRecapCard(
    BuildContext context,
    Color cardBg,
    Color textPrimary,
    Color textSecondary,
    bool isDark,
  ) {
    if (_isLoadingRecap) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(18)),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primaryTeal)),
            SizedBox(width: 12),
            Text('Generating Weekly AI Recap...', style: TextStyle(color: AppColors.primaryTeal, fontWeight: FontWeight.bold, fontSize: 13)),
          ],
        ),
      );
    }

    if (_hasRecapError) {
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
                  Text('Weekly Recap Service Offline', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: textPrimary)),
                  const SizedBox(height: 2),
                  Text('ReLifeX is operating in offline mode.', style: TextStyle(fontSize: 12, color: textSecondary)),
                ],
              ),
            ),
            IconButton(icon: const Icon(Icons.refresh, size: 18), onPressed: _loadWeeklyRecap),
          ],
        ),
      );
    }

    final streakCount = _weeklyRecap?['streakCount'] ?? 14;
    final bestDay = _weeklyRecap?['bestDay'] ?? 'Friday (94 mg/dL Fasting)';
    final notablePattern = _weeklyRecap?['notablePattern'] ?? 'Logging 20+ minutes of post-dinner walking was consistently associated with lower post-prandial glucose peaks.';
    final oneWin = _weeklyRecap?['oneWin'] ?? 'You logged 7 out of 7 days this week while maintaining a 14-day habit streak.';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.purpleAccent.withOpacity(0.12),
            AppColors.primaryTeal.withOpacity(0.08),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.purpleAccent.withOpacity(0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppColors.purpleAccent,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.calendar_view_week, color: Colors.white, size: 16),
              ),
              const SizedBox(width: 10),
              const Text(
                'Weekly AI Recap',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: AppColors.purpleAccent,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.purpleAccent.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  'Streak: $streakCount Days',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppColors.purpleAccent,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.refresh, size: 18),
                onPressed: _loadWeeklyRecap,
                color: textSecondary,
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Best Day Badge
          Row(
            children: [
              const Icon(Icons.emoji_events_outlined, size: 16, color: AppColors.warningOrange),
              const SizedBox(width: 6),
              Text(
                'Best Day: ',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: textPrimary),
              ),
              Text(
                bestDay,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.healthGreen),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Notable Pattern Block
          Container(
            width: double.infinity,
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
                    const Icon(Icons.trending_up, size: 14, color: AppColors.primaryTeal),
                    const SizedBox(width: 6),
                    Text(
                      'Notable Weekly Pattern',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: textSecondary),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  notablePattern,
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: textPrimary, height: 1.3),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Genuine Win Highlight
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.healthGreen.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.healthGreen.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.verified, size: 16, color: AppColors.healthGreen),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Weekly Win: $oneWin',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: AppColors.healthGreen,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color, Color textColor) {
    return Row(
      children: [
        Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 10, color: textColor)),
      ],
    );
  }
}
