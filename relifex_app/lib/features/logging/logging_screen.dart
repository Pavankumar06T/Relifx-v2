import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/app_providers.dart';

class LoggingScreen extends ConsumerStatefulWidget {
  const LoggingScreen({super.key});

  @override
  ConsumerState<LoggingScreen> createState() => _LoggingScreenState();
}

class _LoggingScreenState extends ConsumerState<LoggingScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Glucose state
  final TextEditingController _glucoseController = TextEditingController(text: '112');
  String _selectedTag = 'Fasting';
  final List<String> _tags = ['Fasting', 'Post-Breakfast', 'Post-Lunch', 'Post-Dinner', 'Pre-Bed', 'Random'];

  // Meal Vision state
  bool _isAnalyzingMeal = false;
  Map<String, dynamic>? _mealAnalysis;
  final TextEditingController _manualCarbController = TextEditingController(text: '35');

  // Activity state
  int _activityMinutes = 30;
  String _activityType = 'Brisk Walking';

  // Sleep & Stress state
  double _sleepHours = 7.5;
  int _stressLevel = 2;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _glucoseController.dispose();
    _manualCarbController.dispose();
    super.dispose();
  }

  void _submitGlucose() {
    final val = double.tryParse(_glucoseController.text) ?? 110.0;
    ref.read(dailyChecklistProvider.notifier).addGlucoseReading(val, _selectedTag);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Glucose reading ($val mg/dL - $_selectedTag) saved successfully!'),
        backgroundColor: AppColors.primaryTeal,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _triggerMealCapture({bool simulateCorrupt = false}) async {
    setState(() => _isAnalyzingMeal = true);
    final aiService = ref.read(aiServiceProvider);

    final payload = simulateCorrupt ? 'corrupt_image_payload' : 'valid_image_base64_sample';
    final result = await aiService.parseMealPhoto('user_mock_123', payload);

    if (mounted) {
      setState(() {
        _mealAnalysis = result;
        _isAnalyzingMeal = false;
      });
      if (result['parseSuccess'] == true) {
        ref.read(dailyChecklistProvider.notifier).toggleCheck('mealPhoto');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkSurface : AppColors.lightSurface;
    final textPrimary = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
    final textSecondary = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Health Logger'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: AppColors.primaryTeal,
          unselectedLabelColor: textSecondary,
          indicatorColor: AppColors.primaryTeal,
          tabs: const [
            Tab(icon: Icon(Icons.water_drop, size: 18), text: 'Glucose'),
            Tab(icon: Icon(Icons.camera_alt, size: 18), text: 'Meal Photo'),
            Tab(icon: Icon(Icons.medication, size: 18), text: 'Meds'),
            Tab(icon: Icon(Icons.fitness_center, size: 18), text: 'Activity'),
            Tab(icon: Icon(Icons.bedtime, size: 18), text: 'Sleep/Stress'),
          ],
        ),
      ),
      body: SafeArea(
        child: TabBarView(
          controller: _tabController,
          children: [
            _buildGlucoseTab(cardBg, textPrimary, textSecondary),
            _buildMealPhotoTab(cardBg, textPrimary, textSecondary),
            _buildMedsTab(cardBg, textPrimary, textSecondary),
            _buildActivityTab(cardBg, textPrimary, textSecondary),
            _buildSleepStressTab(cardBg, textPrimary, textSecondary),
          ],
        ),
      ),
    );
  }

  // 1. Glucose Tab
  Widget _buildGlucoseTab(Color cardBg, Color textPrimary, Color textSecondary) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Log Glucose Level', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: textPrimary)),
          const SizedBox(height: 6),
          Text('Record blood glucose value with contextual timing tag.', style: TextStyle(fontSize: 14, color: textSecondary)),
          const SizedBox(height: 20),

          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(16)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: _glucoseController,
                  keyboardType: TextInputType.number,
                  style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: AppColors.primaryTeal),
                  decoration: const InputDecoration(
                    labelText: 'Glucose (mg/dL)',
                    suffixText: 'mg/dL',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 20),
                Text('Timing Tag:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: textPrimary)),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _tags.map((t) {
                    final selected = _selectedTag == t;
                    return ChoiceChip(
                      label: Text(t),
                      selected: selected,
                      selectedColor: AppColors.primaryTeal,
                      labelStyle: TextStyle(color: selected ? Colors.white : textPrimary, fontWeight: selected ? FontWeight.bold : FontWeight.normal),
                      onSelected: (_) => setState(() => _selectedTag = t),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryTeal, foregroundColor: Colors.white),
              onPressed: _submitGlucose,
              icon: const Icon(Icons.check),
              label: const Text('Save Glucose Entry', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  // 2. Meal Photo Tab with Explicit Failure Handling
  Widget _buildMealPhotoTab(Color cardBg, Color textPrimary, Color textSecondary) {
    final parseSuccess = _mealAnalysis?['parseSuccess'] ?? true;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('AI Vision Meal Analysis', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: textPrimary)),
          const SizedBox(height: 6),
          Text('Capture or upload meal photo for instant Gemini carb & glycemic impact estimation.', style: TextStyle(fontSize: 14, color: textSecondary)),
          const SizedBox(height: 20),

          // Camera Upload Simulation Box
          GestureDetector(
            onTap: () => _triggerMealCapture(simulateCorrupt: false),
            child: Container(
              height: 160,
              width: double.infinity,
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.primaryTeal.withOpacity(0.5), width: 1.5),
              ),
              child: _isAnalyzingMeal
                  ? const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(color: AppColors.primaryTeal),
                        SizedBox(height: 12),
                        Text('Gemini 2.0 Flash analyzing plate...', style: TextStyle(color: AppColors.primaryTeal, fontWeight: FontWeight.bold)),
                      ],
                    )
                  : const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.add_a_photo, size: 44, color: AppColors.primaryTeal),
                        SizedBox(height: 8),
                        Text('Tap to Snap or Upload Meal Photo', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        SizedBox(height: 4),
                        Text('Supports instant carb estimation & GI rating', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      ],
                    ),
            ),
          ),

          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton.icon(
                icon: const Icon(Icons.bug_report_outlined, size: 14, color: AppColors.warningOrange),
                label: const Text('Simulate Corrupt Photo Error', style: TextStyle(fontSize: 11, color: AppColors.warningOrange)),
                onPressed: () => _triggerMealCapture(simulateCorrupt: true),
              ),
            ],
          ),

          // Dynamic Response Card (Success vs Explicit Failure)
          if (_mealAnalysis != null) ...[
            const SizedBox(height: 16),
            if (parseSuccess == false) ...[
              // EXPLICIT FAILURE CARD
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.alertRed.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.alertRed.withOpacity(0.5), width: 1.5),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.error_outline, color: AppColors.alertRed, size: 22),
                        SizedBox(width: 8),
                        Text(
                          'Image Parsing Failed',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.alertRed),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _mealAnalysis!['nutritionTip'] ?? 'Unable to analyze photo. Please enter meal details manually.',
                      style: TextStyle(fontSize: 13, color: textPrimary),
                    ),
                    const Divider(height: 20),
                    Text('Manual Carb Entry:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: textPrimary)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _manualCarbController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Estimated Carbs (g)',
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryTeal, foregroundColor: Colors.white),
                          onPressed: () {
                            ref.read(dailyChecklistProvider.notifier).toggleCheck('mealPhoto');
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Manual carb entry (${_manualCarbController.text}g) saved!')),
                            );
                          },
                          child: const Text('Save Manual Entry'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ] else ...[
              // SUCCESS CARD
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.healthGreen, width: 1.5),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.check_circle, color: AppColors.healthGreen, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          _mealAnalysis!['dishName'] ?? 'Analyzed Plate',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: textPrimary),
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildMetricItem('Est. Carbs', '${_mealAnalysis!['estimatedCarbsGrams']}g', textPrimary, textSecondary),
                        _buildMetricItem('Glycemic Index', '${_mealAnalysis!['glycemicIndex']}', textPrimary, textSecondary),
                        _buildMetricItem('Glycemic Load', '${_mealAnalysis!['glycemicLoad']}', textPrimary, textSecondary),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'AI Tip: ${_mealAnalysis!['nutritionTip']}',
                      style: TextStyle(fontSize: 13, color: textSecondary, fontStyle: FontStyle.italic),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  // 3. Meds Tab
  Widget _buildMedsTab(Color cardBg, Color textPrimary, Color textSecondary) {
    final checklist = ref.watch(dailyChecklistProvider);
    final notifier = ref.read(dailyChecklistProvider.notifier);

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Prescription Check-off', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: textPrimary)),
          const SizedBox(height: 6),
          Text('Check off doses as you take them today.', style: TextStyle(fontSize: 14, color: textSecondary)),
          const SizedBox(height: 20),

          CheckboxListTile(
            title: const Text('Metformin (500mg) - Morning Dose'),
            subtitle: const Text('Taken with breakfast'),
            value: checklist.breakfastMedChecked,
            activeColor: AppColors.primaryTeal,
            onChanged: (_) => notifier.toggleCheck('breakfastMed'),
          ),
          CheckboxListTile(
            title: const Text('Metformin (500mg) - Evening Dose'),
            subtitle: const Text('Scheduled with dinner'),
            value: checklist.dinnerMedChecked,
            activeColor: AppColors.primaryTeal,
            onChanged: (_) => notifier.toggleCheck('dinnerMed'),
          ),
        ],
      ),
    );
  }

  // 4. Activity Tab
  Widget _buildActivityTab(Color cardBg, Color textPrimary, Color textSecondary) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Log Physical Movement', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: textPrimary)),
          const SizedBox(height: 6),
          Text('Post-meal movement significantly increases muscular glucose uptake.', style: TextStyle(fontSize: 14, color: textSecondary)),
          const SizedBox(height: 20),

          Text('Activity Type: $_activityType', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: textPrimary)),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            children: ['Brisk Walking', 'Cycling', 'Light Resistance', 'Yoga / Stretch'].map((act) {
              return ChoiceChip(
                label: Text(act),
                selected: _activityType == act,
                selectedColor: AppColors.primaryTeal,
                onSelected: (_) => setState(() => _activityType = act),
              );
            }).toList(),
          ),
          const SizedBox(height: 20),

          Text('Duration: $_activityMinutes Minutes', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: textPrimary)),
          Slider(
            value: _activityMinutes.toDouble(),
            min: 5,
            max: 120,
            divisions: 23,
            activeColor: AppColors.primaryTeal,
            label: '$_activityMinutes mins',
            onChanged: (val) => setState(() => _activityMinutes = val.toInt()),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryTeal, foregroundColor: Colors.white),
              onPressed: () {
                ref.read(dailyChecklistProvider.notifier).toggleCheck('exercise');
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Activity logged successfully!')));
              },
              child: const Text('Log Activity', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  // 5. Sleep & Stress Tab
  Widget _buildSleepStressTab(Color cardBg, Color textPrimary, Color textSecondary) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Sleep & Stress Quick-Tap', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: textPrimary)),
          const SizedBox(height: 6),
          Text('Assess sleep duration and stress level for baseline analysis.', style: TextStyle(fontSize: 14, color: textSecondary)),
          const SizedBox(height: 20),

          Text('Sleep Duration: ${_sleepHours.toStringAsFixed(1)} Hours', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: textPrimary)),
          Slider(
            value: _sleepHours,
            min: 4,
            max: 12,
            divisions: 16,
            activeColor: AppColors.primaryTeal,
            onChanged: (val) => setState(() => _sleepHours = val),
          ),
          const SizedBox(height: 20),

          Text('Stress Level (1 = Calm, 5 = High Stress)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: textPrimary)),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(5, (idx) {
              final level = idx + 1;
              final isSel = _stressLevel == level;
              return ChoiceChip(
                label: Text('$level'),
                selected: isSel,
                selectedColor: AppColors.primaryTeal,
                onSelected: (_) => setState(() => _stressLevel = level),
              );
            }),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryTeal, foregroundColor: Colors.white),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sleep & stress rating saved!')));
              },
              child: const Text('Save Assessment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricItem(String label, String value, Color textPrimary, Color textSecondary) {
    return Column(
      children: [
        Text(label, style: TextStyle(fontSize: 12, color: textSecondary)),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: textPrimary)),
      ],
    );
  }
}
