import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/services/ai_service.dart';

// Theme Mode Provider
final themeModeProvider = StateProvider<ThemeMode>((ref) => ThemeMode.dark);

// AI Service Provider
final aiServiceProvider = Provider<AIService>((ref) => AIService());

// User Onboarding Baseline State
class UserProfileState {
  final String diabetesType;
  final List<String> medications;
  final String sleepSchedule;
  final String dietPattern;
  final String healthGoal;
  final bool isCompleted;

  UserProfileState({
    this.diabetesType = 'Type 2 Diabetes',
    this.medications = const ['Metformin (500mg)'],
    this.sleepSchedule = '7-8 hours (11 PM - 7 AM)',
    this.dietPattern = 'Moderate Carb & Mediterranean',
    this.healthGoal = 'Maintain Fasting Glucose < 110 mg/dL',
    this.isCompleted = true,
  });

  UserProfileState copyWith({
    String? diabetesType,
    List<String>? medications,
    String? sleepSchedule,
    String? dietPattern,
    String? healthGoal,
    bool? isCompleted,
  }) {
    return UserProfileState(
      diabetesType: diabetesType ?? this.diabetesType,
      medications: medications ?? this.medications,
      sleepSchedule: sleepSchedule ?? this.sleepSchedule,
      dietPattern: dietPattern ?? this.dietPattern,
      healthGoal: healthGoal ?? this.healthGoal,
      isCompleted: isCompleted ?? this.isCompleted,
    );
  }
}

final userProfileProvider = StateNotifierProvider<UserProfileNotifier, UserProfileState>((ref) {
  return UserProfileNotifier();
});

class UserProfileNotifier extends StateNotifier<UserProfileState> {
  UserProfileNotifier() : super(UserProfileState());

  void updateBaseline({
    String? diabetesType,
    List<String>? medications,
    String? sleepSchedule,
    String? dietPattern,
    String? healthGoal,
  }) {
    state = state.copyWith(
      diabetesType: diabetesType,
      medications: medications,
      sleepSchedule: sleepSchedule,
      dietPattern: dietPattern,
      healthGoal: healthGoal,
      isCompleted: true,
    );
  }
}

// 66-Day Journey State
class JourneyState {
  final int currentDay; // e.g. Day 14 out of 66
  final int currentStreak; // e.g. 14 days
  final List<bool> completedDays;

  JourneyState({
    this.currentDay = 14,
    this.currentStreak = 14,
    List<bool>? completedDays,
  }) : completedDays = completedDays ?? List.generate(66, (index) => index < 14);

  double get progressPercentage => (currentDay / 66.0).clamp(0.0, 1.0);
}

final journeyProvider = StateNotifierProvider<JourneyNotifier, JourneyState>((ref) {
  return JourneyNotifier();
});

class JourneyNotifier extends StateNotifier<JourneyState> {
  JourneyNotifier() : super(JourneyState());

  void markTodayComplete() {
    if (state.currentDay < 66) {
      final updated = List<bool>.from(state.completedDays);
      updated[state.currentDay] = true;
      state = JourneyState(
        currentDay: state.currentDay + 1,
        currentStreak: state.currentStreak + 1,
        completedDays: updated,
      );
    }
  }
}

// Daily Logging & Checklist State
class GlucoseReading {
  final double value; // mg/dL
  final String tag; // Fasting, Post-breakfast, Post-lunch, Pre-bed
  final DateTime timestamp;

  GlucoseReading({
    required this.value,
    required this.tag,
    required this.timestamp,
  });
}

class DailyChecklistState {
  final bool fastingGlucoseLogged;
  final bool breakfastMedChecked;
  final bool dinnerMedChecked;
  final bool mealPhotoLogged;
  final bool exerciseLogged;
  final List<GlucoseReading> glucoseReadings;

  DailyChecklistState({
    this.fastingGlucoseLogged = true,
    this.breakfastMedChecked = true,
    this.dinnerMedChecked = false,
    this.mealPhotoLogged = true,
    this.exerciseLogged = false,
    List<GlucoseReading>? glucoseReadings,
  }) : glucoseReadings = glucoseReadings ??
            [
              GlucoseReading(
                value: 108.0,
                tag: 'Fasting',
                timestamp: DateTime.now().subtract(const Duration(hours: 4)),
              ),
              GlucoseReading(
                value: 135.0,
                tag: 'Post-Breakfast',
                timestamp: DateTime.now().subtract(const Duration(hours: 2)),
              ),
            ];

  int get completedCount {
    int c = 0;
    if (fastingGlucoseLogged) c++;
    if (breakfastMedChecked) c++;
    if (dinnerMedChecked) c++;
    if (mealPhotoLogged) c++;
    if (exerciseLogged) c++;
    return c;
  }
}

final dailyChecklistProvider = StateNotifierProvider<DailyChecklistNotifier, DailyChecklistState>((ref) {
  return DailyChecklistNotifier();
});

class DailyChecklistNotifier extends StateNotifier<DailyChecklistState> {
  DailyChecklistNotifier() : super(DailyChecklistState());

  void toggleCheck(String key) {
    switch (key) {
      case 'fastingGlucose':
        state = DailyChecklistState(
          fastingGlucoseLogged: !state.fastingGlucoseLogged,
          breakfastMedChecked: state.breakfastMedChecked,
          dinnerMedChecked: state.dinnerMedChecked,
          mealPhotoLogged: state.mealPhotoLogged,
          exerciseLogged: state.exerciseLogged,
          glucoseReadings: state.glucoseReadings,
        );
        break;
      case 'breakfastMed':
        state = DailyChecklistState(
          fastingGlucoseLogged: state.fastingGlucoseLogged,
          breakfastMedChecked: !state.breakfastMedChecked,
          dinnerMedChecked: state.dinnerMedChecked,
          mealPhotoLogged: state.mealPhotoLogged,
          exerciseLogged: state.exerciseLogged,
          glucoseReadings: state.glucoseReadings,
        );
        break;
      case 'dinnerMed':
        state = DailyChecklistState(
          fastingGlucoseLogged: state.fastingGlucoseLogged,
          breakfastMedChecked: state.breakfastMedChecked,
          dinnerMedChecked: !state.dinnerMedChecked,
          mealPhotoLogged: state.mealPhotoLogged,
          exerciseLogged: state.exerciseLogged,
          glucoseReadings: state.glucoseReadings,
        );
        break;
      case 'mealPhoto':
        state = DailyChecklistState(
          fastingGlucoseLogged: state.fastingGlucoseLogged,
          breakfastMedChecked: state.breakfastMedChecked,
          dinnerMedChecked: state.dinnerMedChecked,
          mealPhotoLogged: !state.mealPhotoLogged,
          exerciseLogged: state.exerciseLogged,
          glucoseReadings: state.glucoseReadings,
        );
        break;
      case 'exercise':
        state = DailyChecklistState(
          fastingGlucoseLogged: state.fastingGlucoseLogged,
          breakfastMedChecked: state.breakfastMedChecked,
          dinnerMedChecked: state.dinnerMedChecked,
          mealPhotoLogged: state.mealPhotoLogged,
          exerciseLogged: !state.exerciseLogged,
          glucoseReadings: state.glucoseReadings,
        );
        break;
    }
  }

  void addGlucoseReading(double value, String tag) {
    final updatedReadings = List<GlucoseReading>.from(state.glucoseReadings)
      ..add(GlucoseReading(
        value: value,
        tag: tag,
        timestamp: DateTime.now(),
      ));

    state = DailyChecklistState(
      fastingGlucoseLogged: tag == 'Fasting' ? true : state.fastingGlucoseLogged,
      breakfastMedChecked: state.breakfastMedChecked,
      dinnerMedChecked: state.dinnerMedChecked,
      mealPhotoLogged: state.mealPhotoLogged,
      exerciseLogged: state.exerciseLogged,
      glucoseReadings: updatedReadings,
    );
  }
}
