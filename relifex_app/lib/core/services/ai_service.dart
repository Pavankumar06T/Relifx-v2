import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;

class AIService {
  final String? overrideBaseUrl;

  AIService({this.overrideBaseUrl});

  /// Auto-resolve host URL: localhost for Web/Desktop/iOS, 10.0.2.2 for Android emulator
  String get baseUrl {
    if (overrideBaseUrl != null && overrideBaseUrl!.isNotEmpty) {
      return overrideBaseUrl!;
    }
    if (kIsWeb) {
      return 'http://localhost:3000';
    }
    try {
      if (Platform.isAndroid) {
        return 'http://10.0.2.2:3000';
      }
    } catch (_) {
      // Platform check unavailable or desktop environment
    }
    return 'http://localhost:3000';
  }

  /// Fetch nightly / daily AI insight
  Future<Map<String, dynamic>> fetchDailyInsight(String userId, {String scenarioId = 'default'}) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/ai/insights/daily'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'userId': userId, 'scenarioId': scenarioId}),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Server returned ${response.statusCode}');
      }
    } catch (e) {
      return {
        'error': true,
        'insight': 'Maintaining consistent metabolic tracking supports long-term glucose stability.',
        'evidence': 'AI backend is operating in offline mode.',
        'suggestion': 'Keep logging your meals and hydration to unlock personalized AI recommendations.',
      };
    }
  /// Fetch weekly recap AI summary ({ streakCount, bestDay, notablePattern, oneWin })
  Future<Map<String, dynamic>> fetchWeeklyRecap(String userId, {String scenarioId = 'default'}) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/ai/insights/weekly-recap'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'userId': userId, 'scenarioId': scenarioId}),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Server returned ${response.statusCode}');
      }
    } catch (e) {
      return {
        'error': true,
        'streakCount': 0,
        'bestDay': 'Weekly Summary Unavailable',
        'notablePattern': 'AI backend operating in offline fallback mode.',
        'oneWin': 'Keep logging daily to generate your personalized weekly recap.',
      };
    }
  }

  /// Send chat query to RAG AI Coach
  Future<Map<String, dynamic>> sendCoachQuery(String userId, String message) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/ai/chat'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'userId': userId, 'message': message}),
      ).timeout(const Duration(seconds: 12));

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Server returned ${response.statusCode}');
      }
    } catch (e) {
      return {
        'reply': 'AI Coach is temporarily operating in offline fallback mode. Please consult your physician for individualized medical advice.',
        'grounded': false,
        'groundedMode': 'ungrounded',
        'retrievedChunks': [],
        'sources': ['Offline Fallback'],
      };
    }
  }

  /// Send meal photo base64 for Gemini vision analysis
  Future<Map<String, dynamic>> parseMealPhoto(String userId, String imageBase64) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/ai/meal-parse'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'userId': userId, 'imageBase64': imageBase64}),
      ).timeout(const Duration(seconds: 12));

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Server returned ${response.statusCode}');
      }
    } catch (e) {
      return {
        'parseSuccess': false,
        'error': 'Image parsing service failed or timed out',
        'dishName': 'Unrecognized Meal Photo',
        'estimatedCarbsGrams': 0,
        'glycemicIndex': 'Unknown',
        'glycemicLoad': 0,
        'confidenceScore': 0.0,
        'nutritionTip': 'Unable to analyze photo. Please enter meal carb details manually.',
      };
    }
  }

  /// Check health status of AI service
  Future<bool> checkHealth() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/health')).timeout(const Duration(seconds: 4));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
