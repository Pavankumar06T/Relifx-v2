import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/app_providers.dart';

class ChatMessage {
  final String text;
  final bool isUser;
  final bool isGrounded;
  final String groundedMode; // 'live_chromadb', 'fallback_local_kb', 'ungrounded'
  final String sourceLabel;
  final DateTime timestamp;

  ChatMessage({
    required this.text,
    required this.isUser,
    this.isGrounded = false,
    this.groundedMode = 'ungrounded',
    this.sourceLabel = '',
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();
}

class AICoachScreen extends ConsumerStatefulWidget {
  const AICoachScreen({super.key});

  @override
  ConsumerState<AICoachScreen> createState() => _AICoachScreenState();
}

class _AICoachScreenState extends ConsumerState<AICoachScreen> {
  final TextEditingController _textController = TextEditingController();
  final List<ChatMessage> _messages = [
    ChatMessage(
      text: 'Hello Alex! I am your ReLifeX AI Health Coach, grounded in clinical diabetes guidelines. How can I support your metabolic routine today?',
      isUser: false,
      isGrounded: true,
      groundedMode: 'fallback_local_kb',
      sourceLabel: 'Local Diabetes Knowledge Base (Fallback)',
    ),
  ];
  bool _isTyping = false;

  final List<String> _suggestedPrompts = [
    'How does post-meal walking lower blood sugar spikes?',
    'What is the exact pharmacological mechanism of SGLT2 inhibitors?',
    'What is the capital of Australia?',
  ];

  Future<void> _sendMessage(String text) async {
    if (text.trim().isEmpty) return;

    final userMsg = ChatMessage(text: text, isUser: true);
    setState(() {
      _messages.add(userMsg);
      _isTyping = true;
    });
    _textController.clear();

    final aiService = ref.read(aiServiceProvider);
    final response = await aiService.sendCoachQuery('user_mock_123', text);

    if (mounted) {
      final sources = response['sources'] as List?;
      final sourceLabel = (sources != null && sources.isNotEmpty) ? sources.first.toString() : 'N/A';
      final mode = response['groundedMode'] ?? (response['grounded'] == true ? 'fallback_local_kb' : 'ungrounded');

      setState(() {
        _messages.add(ChatMessage(
          text: response['reply'] ?? 'AI Coach is temporarily operating in offline mode. Please consult your physician.',
          isUser: false,
          isGrounded: response['grounded'] ?? false,
          groundedMode: mode,
          sourceLabel: sourceLabel,
        ));
        _isTyping = false;
      });
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
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primaryTeal.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.auto_awesome, color: AppColors.primaryTeal, size: 18),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('AI Health Coach', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                Text('RAG-Grounded • Gemini 2.0 Flash', style: TextStyle(fontSize: 11, color: AppColors.primaryTeal)),
              ],
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: AppColors.warningOrange.withOpacity(0.12),
              child: Row(
                children: [
                  const Icon(Icons.shield_outlined, size: 16, color: AppColors.warningOrange),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'AI Coach provides evidence-based metabolic education, not diagnostic medical advice.',
                      style: TextStyle(fontSize: 11, color: textPrimary, fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
            ),

            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final msg = _messages[index];
                  return _buildMessageBubble(msg, cardBg, textPrimary, textSecondary);
                },
              ),
            ),

            if (_isTyping)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Row(
                  children: [
                    const SizedBox(width: 10),
                    const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primaryTeal),
                    ),
                    const SizedBox(width: 10),
                    Text('AI Coach retrieving grounded context...', style: TextStyle(fontSize: 12, color: textSecondary, fontStyle: FontStyle.italic)),
                  ],
                ),
              ),

            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: _suggestedPrompts.map((prompt) {
                  return Container(
                    margin: const EdgeInsets.only(right: 8),
                    child: ActionChip(
                      backgroundColor: cardBg,
                      label: Text(prompt, style: TextStyle(fontSize: 12, color: textPrimary)),
                      onPressed: () => _sendMessage(prompt),
                    ),
                  );
                }).toList(),
              ),
            ),

            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: cardBg,
                border: Border(top: BorderSide(color: isDark ? AppColors.darkBorder : AppColors.lightBorder)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _textController,
                      style: TextStyle(color: textPrimary),
                      decoration: InputDecoration(
                        hintText: 'Ask about glucose, meals, or sleep...',
                        hintStyle: TextStyle(color: textSecondary, fontSize: 14),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14),
                      ),
                      onSubmitted: _sendMessage,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.send_rounded, color: AppColors.primaryTeal),
                    onPressed: () => _sendMessage(_textController.text),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageBubble(ChatMessage msg, Color cardBg, Color textPrimary, Color textSecondary) {
    final align = msg.isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start;
    final bubbleBg = msg.isUser
        ? AppColors.primaryTeal
        : (Theme.of(context).brightness == Brightness.dark ? AppColors.darkSurfaceSubtle : AppColors.lightSurfaceSubtle);
    final textColor = msg.isUser ? Colors.white : textPrimary;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: align,
        children: [
          Container(
            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.82),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: bubbleBg,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(16),
                topRight: const Radius.circular(16),
                bottomLeft: Radius.circular(msg.isUser ? 16 : 4),
                bottomRight: Radius.circular(msg.isUser ? 4 : 16),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  msg.text,
                  style: TextStyle(color: textColor, fontSize: 14, height: 1.35),
                ),
                if (!msg.isUser) ...[
                  const SizedBox(height: 10),
                  _buildGroundedBadge(msg.groundedMode, msg.sourceLabel),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Helper rendering 3 visually distinct citation badges
  Widget _buildGroundedBadge(String mode, String sourceLabel) {
    Color badgeBg;
    Color borderCol;
    Color iconCol;
    IconData icon;
    String label;

    switch (mode) {
      case 'live_chromadb':
        badgeBg = AppColors.healthGreen.withOpacity(0.18);
        borderCol = AppColors.healthGreen;
        iconCol = AppColors.healthGreen;
        icon = Icons.verified;
        label = 'Grounded (Vector DB: $sourceLabel)';
        break;

      case 'fallback_local_kb':
        badgeBg = AppColors.primaryTeal.withOpacity(0.18);
        borderCol = AppColors.primaryTeal;
        iconCol = AppColors.primaryTeal;
        icon = Icons.fact_check;
        label = 'Grounded (Local KB Fallback)';
        break;

      case 'ungrounded':
      default:
        badgeBg = AppColors.warningOrange.withOpacity(0.18);
        borderCol = AppColors.warningOrange;
        iconCol = AppColors.warningOrange;
        icon = Icons.warning_amber_rounded;
        label = 'Ungrounded Query (Not in Knowledge Base)';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: badgeBg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderCol, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: iconCol),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: iconCol,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
