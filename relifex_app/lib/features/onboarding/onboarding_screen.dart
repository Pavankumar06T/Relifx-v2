import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/app_providers.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  final VoidCallback onOnboardingComplete;

  const OnboardingScreen({super.key, required this.onOnboardingComplete});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  int _currentStep = 0;

  // Selected state options
  String _diabetesType = 'Type 2 Diabetes';
  final List<String> _selectedMeds = ['Metformin (500mg)'];
  String _sleepSchedule = '7-8 hours (11 PM - 7 AM)';
  String _dietPattern = 'Moderate Carb & Mediterranean';
  String _healthGoal = 'Maintain Fasting Glucose < 110 mg/dL';

  final List<String> _diabetesOptions = [
    'Type 2 Diabetes',
    'Pre-diabetes',
    'Type 1 Diabetes',
    'Gestational Diabetes',
    'General Metabolic Wellness',
  ];

  final List<String> _medOptions = [
    'Metformin (500mg)',
    'GLP-1 Receptor Agonist',
    'Insulin (Basal/Bolus)',
    'SGLT2 Inhibitors',
    'Sulfonylureas',
    'No Prescription Meds',
  ];

  final List<String> _sleepOptions = [
    '7-8 hours (Consistent 11 PM - 7 AM)',
    '6-7 hours (Occasional night wakeups)',
    'Less than 6 hours (High stress/insomnia)',
    'Shift Work / Irregular Schedule',
  ];

  final List<String> _dietOptions = [
    'Moderate Carb & Mediterranean',
    'Low Glycemic Index (Low-GI)',
    'Strict Low Carb / Keto',
    'Plant-Based High Fiber',
    'Unstructured / Flexible',
  ];

  final List<String> _goalOptions = [
    'Maintain Fasting Glucose < 110 mg/dL',
    'Reduce HbA1c below 6.5%',
    'Eliminate Post-Meal Spikes (> 140 mg/dL)',
    'Build Consistent 66-Day Habit Routine',
    'Weight & Insulin Sensitivity Optimization',
  ];

  void _nextStep() {
    if (_currentStep < 4) {
      setState(() => _currentStep++);
    } else {
      // Save baseline to provider
      ref.read(userProfileProvider.notifier).updateBaseline(
            diabetesType: _diabetesType,
            medications: _selectedMeds,
            sleepSchedule: _sleepSchedule,
            dietPattern: _dietPattern,
            healthGoal: _healthGoal,
          );
      widget.onOnboardingComplete();
    }
  }

  void _prevStep() {
    if (_currentStep > 0) {
      setState(() => _currentStep--);
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
        title: const Text('ReLifeX Assessment'),
        centerTitle: true,
        leading: _currentStep > 0
            ? IconButton(
                icon: const Icon(Icons.arrow_back_ios_new, size: 18),
                onPressed: _prevStep,
              )
            : null,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Progress Bar Header
              Row(
                children: List.generate(
                  5,
                  (index) => Expanded(
                    child: Container(
                      height: 6,
                      margin: EdgeInsets.only(right: index < 4 ? 8 : 0),
                      decoration: BoxDecoration(
                        color: index <= _currentStep
                            ? AppColors.primaryTeal
                            : (isDark ? AppColors.darkSurfaceSubtle : AppColors.lightSurfaceSubtle),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Step ${_currentStep + 1} of 5',
                style: TextStyle(
                  color: AppColors.primaryTeal,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 16),

              // Dynamic Step Content
              Expanded(
                child: SingleChildScrollView(
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    child: _buildStepContent(context, cardBg, textPrimary, textSecondary),
                  ),
                ),
              ),

              // Navigation Buttons
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryTeal,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                  ),
                  onPressed: _nextStep,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _currentStep == 4 ? 'Complete Setup' : 'Continue',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Icon(_currentStep == 4 ? Icons.check_circle_outline : Icons.arrow_forward, size: 20),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepContent(
    BuildContext context,
    Color cardBg,
    Color textPrimary,
    Color textSecondary,
  ) {
    switch (_currentStep) {
      case 0:
        return _buildSelectableStep(
          key: const ValueKey(0),
          title: 'What is your metabolic profile?',
          subtitle: 'Select the primary diagnosis or focus for your health journey.',
          options: _diabetesOptions,
          selected: _diabetesType,
          onSelect: (val) => setState(() => _diabetesType = val),
          cardBg: cardBg,
          textPrimary: textPrimary,
          textSecondary: textSecondary,
        );
      case 1:
        return _buildMultiSelectStep(
          key: const ValueKey(1),
          title: 'What medications do you currently take?',
          subtitle: 'Choose all that apply. This helps tailor safety insights.',
          options: _medOptions,
          selectedList: _selectedMeds,
          onToggle: (val) {
            setState(() {
              if (_selectedMeds.contains(val)) {
                if (_selectedMeds.length > 1) _selectedMeds.remove(val);
              } else {
                _selectedMeds.add(val);
              }
            });
          },
          cardBg: cardBg,
          textPrimary: textPrimary,
          textSecondary: textSecondary,
        );
      case 2:
        return _buildSelectableStep(
          key: const ValueKey(2),
          title: 'What is your regular sleep schedule?',
          subtitle: 'Sleep quality directly impacts morning cortisol and fasting glucose.',
          options: _sleepOptions,
          selected: _sleepSchedule,
          onSelect: (val) => setState(() => _sleepSchedule = val),
          cardBg: cardBg,
          textPrimary: textPrimary,
          textSecondary: textSecondary,
        );
      case 3:
        return _buildSelectableStep(
          key: const ValueKey(3),
          title: 'What best describes your dietary pattern?',
          subtitle: 'Helps our Gemini AI meal analyzer calibrate glycemic estimations.',
          options: _dietOptions,
          selected: _dietPattern,
          onSelect: (val) => setState(() => _dietPattern = val),
          cardBg: cardBg,
          textPrimary: textPrimary,
          textSecondary: textSecondary,
        );
      case 4:
      default:
        return _buildSelectableStep(
          key: const ValueKey(4),
          title: 'What is your primary 66-day health goal?',
          subtitle: 'Your primary metric target for your habit transformation ring.',
          options: _goalOptions,
          selected: _healthGoal,
          onSelect: (val) => setState(() => _healthGoal = val),
          cardBg: cardBg,
          textPrimary: textPrimary,
          textSecondary: textSecondary,
        );
    }
  }

  Widget _buildSelectableStep({
    required Key key,
    required String title,
    required String subtitle,
    required List<String> options,
    required String selected,
    required ValueChanged<String> onSelect,
    required Color cardBg,
    required Color textPrimary,
    required Color textSecondary,
  }) {
    return Column(
      key: key,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: textPrimary,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          subtitle,
          style: TextStyle(fontSize: 14, color: textSecondary),
        ),
        const SizedBox(height: 24),
        ...options.map((opt) {
          final isSelected = selected == opt;
          return GestureDetector(
            onTap: () => onSelect(opt),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isSelected ? AppColors.primaryTeal : Colors.transparent,
                  width: 2,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isSelected ? AppColors.primaryTeal : Colors.transparent,
                      border: Border.all(
                        color: isSelected ? AppColors.primaryTeal : textSecondary,
                        width: 2,
                      ),
                    ),
                    child: isSelected
                        ? const Icon(Icons.check, size: 14, color: Colors.white)
                        : null,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      opt,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                        color: textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildMultiSelectStep({
    required Key key,
    required String title,
    required String subtitle,
    required List<String> options,
    required List<String> selectedList,
    required ValueChanged<String> onToggle,
    required Color cardBg,
    required Color textPrimary,
    required Color textSecondary,
  }) {
    return Column(
      key: key,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: textPrimary,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          subtitle,
          style: TextStyle(fontSize: 14, color: textSecondary),
        ),
        const SizedBox(height: 24),
        ...options.map((opt) {
          final isSelected = selectedList.contains(opt);
          return GestureDetector(
            onTap: () => onToggle(opt),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isSelected ? AppColors.primaryTeal : Colors.transparent,
                  width: 2,
                ),
              ),
              child: Row(
                children: [
                  Checkbox(
                    value: isSelected,
                    onChanged: (_) => onToggle(opt),
                    activeColor: AppColors.primaryTeal,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      opt,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                        color: textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }
}
