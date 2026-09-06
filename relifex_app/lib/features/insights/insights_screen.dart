import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../core/constants/app_colors.dart';

class InsightsScreen extends ConsumerStatefulWidget {
  const InsightsScreen({super.key});

  @override
  ConsumerState<InsightsScreen> createState() => _InsightsScreenState();
}

class _InsightsScreenState extends ConsumerState<InsightsScreen> {
  String _selectedRange = '7 Days';

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.darkSurface : AppColors.lightSurface;
    final textPrimary = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
    final textSecondary = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Metabolic Insights'),
        actions: [
          DropdownButton<String>(
            value: _selectedRange,
            underline: const SizedBox(),
            dropdownColor: cardBg,
            items: ['7 Days', '14 Days', '30 Days'].map((r) {
              return DropdownMenuItem(value: r, child: Text(r, style: TextStyle(color: textPrimary, fontSize: 13)));
            }).toList(),
            onChanged: (val) {
              if (val != null) setState(() => _selectedRange = val);
            },
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Health Score Summary Grid
              Row(
                children: [
                  Expanded(child: _buildSummaryCard('Metbolic Score', '88 / 100', 'Optimal', AppColors.healthGreen, cardBg, textPrimary, textSecondary)),
                  const SizedBox(width: 12),
                  Expanded(child: _buildSummaryCard('Time-in-Range', '92%', '80 - 130 mg/dL', AppColors.primaryTeal, cardBg, textPrimary, textSecondary)),
                ],
              ),

              const SizedBox(height: 20),

              // Glucose Trend Line Chart Card
              Text('7-Day Glucose Trajectory', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: textPrimary)),
              const SizedBox(height: 6),
              Text('Fasting (Green) vs Post-Prandial Peak (Teal) readings.', style: TextStyle(fontSize: 13, color: textSecondary)),
              const SizedBox(height: 14),

              Container(
                height: 240,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(18)),
                child: LineChart(
                  LineChartData(
                    gridData: FlGridData(show: true, drawVerticalLine: false, horizontalInterval: 30),
                    titlesData: FlTitlesData(
                      rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          getTitlesWidget: (val, meta) {
                            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                            if (val.toInt() >= 0 && val.toInt() < days.length) {
                              return Text(days[val.toInt()], style: TextStyle(fontSize: 10, color: textSecondary));
                            }
                            return const Text('');
                          },
                        ),
                      ),
                    ),
                    borderData: FlBorderData(show: false),
                    minY: 70,
                    maxY: 180,
                    lineBarsData: [
                      // Fasting line
                      LineChartBarData(
                        spots: const [
                          FlSpot(0, 105),
                          FlSpot(1, 108),
                          FlSpot(2, 102),
                          FlSpot(3, 110),
                          FlSpot(4, 98),
                          FlSpot(5, 104),
                          FlSpot(6, 101),
                        ],
                        isCurved: true,
                        color: AppColors.healthGreen,
                        barWidth: 3,
                        dotData: const FlDotData(show: true),
                      ),
                      // Post-meal peak line
                      LineChartBarData(
                        spots: const [
                          FlSpot(0, 142),
                          FlSpot(1, 138),
                          FlSpot(2, 148),
                          FlSpot(3, 132),
                          FlSpot(4, 128),
                          FlSpot(5, 135),
                          FlSpot(6, 125),
                        ],
                        isCurved: true,
                        color: AppColors.primaryTeal,
                        barWidth: 3,
                        dotData: const FlDotData(show: true),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Correlation Insights Section
              Text('Key Metabolic Correlations', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: textPrimary)),
              const SizedBox(height: 12),

              _buildCorrelationCard(
                title: 'Sleep Duration vs Fasting Glucose',
                description: 'On nights with 7.5+ hours of continuous sleep, your morning fasting glucose is on average 9 mg/dL lower.',
                icon: Icons.bedtime,
                accentColor: AppColors.purpleAccent,
                cardBg: cardBg,
                textPrimary: textPrimary,
                textSecondary: textSecondary,
              ),

              const SizedBox(height: 10),

              _buildCorrelationCard(
                title: 'Carb Intake vs 2-Hr Glucose Peak',
                description: 'Meals with estimated carbs under 45g and fiber over 8g consistently stay below the 140 mg/dL target threshold.',
                icon: Icons.restaurant,
                accentColor: AppColors.warningOrange,
                cardBg: cardBg,
                textPrimary: textPrimary,
                textSecondary: textSecondary,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryCard(String title, String value, String sub, Color badgeColor, Color cardBg, Color textPrimary, Color textSecondary) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(fontSize: 12, color: textSecondary)),
          const SizedBox(height: 6),
          Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: textPrimary)),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: badgeColor.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
            child: Text(sub, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: badgeColor)),
          ),
        ],
      ),
    );
  }

  Widget _buildCorrelationCard({
    required String title,
    required String description,
    required IconData icon,
    required Color accentColor,
    required Color cardBg,
    required Color textPrimary,
    required Color textSecondary,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: accentColor.withOpacity(0.12), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: accentColor, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: textPrimary)),
                const SizedBox(height: 4),
                Text(description, style: TextStyle(fontSize: 12, color: textSecondary, height: 1.3)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
