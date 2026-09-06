import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'providers/app_providers.dart';
import 'features/onboarding/onboarding_screen.dart';
import 'features/home/home_screen.dart';
import 'features/logging/logging_screen.dart';
import 'features/ai_coach/ai_coach_screen.dart';
import 'features/journey/journey_screen.dart';
import 'features/insights/insights_screen.dart';
import 'features/profile/profile_screen.dart';

void main() {
  runApp(
    const ProviderScope(
      child: ReLifeXApp(),
    ),
  );
}

class ReLifeXApp extends ConsumerWidget {
  const ReLifeXApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp(
      title: 'ReLifeX Health Platform',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,
      home: const MainNavigationShell(),
    );
  }
}

class MainNavigationShell extends ConsumerStatefulWidget {
  const MainNavigationShell({super.key});

  @override
  ConsumerState<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends ConsumerState<MainNavigationShell> {
  int _currentIndex = 0;
  bool _isOnboardingActive = false;

  void _navigateToTab(int index) {
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    if (_isOnboardingActive) {
      return OnboardingScreen(
        onOnboardingComplete: () {
          setState(() => _isOnboardingActive = false);
        },
      );
    }

    final screens = [
      HomeScreen(onNavigateTab: _navigateToTab),
      const LoggingScreen(),
      const AICoachScreen(),
      const JourneyScreen(),
      const InsightsScreen(),
      ProfileScreen(
        onReopenOnboarding: () {
          setState(() => _isOnboardingActive = true);
        },
      ),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.today), label: 'Today'),
          BottomNavigationBarItem(icon: Icon(Icons.add_box_outlined), label: 'Logger'),
          BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline), label: 'AI Coach'),
          BottomNavigationBarItem(icon: Icon(Icons.donut_large), label: 'Journey'),
          BottomNavigationBarItem(icon: Icon(Icons.insights), label: 'Insights'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
        ],
      ),
    );
  }
}
