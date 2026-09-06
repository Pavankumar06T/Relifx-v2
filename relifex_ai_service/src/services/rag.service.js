const { ChromaClient, DefaultEmbeddingFunction } = require('chromadb');
const fs = require('fs');
const path = require('path');
const geminiService = require('./gemini.service');

class RAGService {
  constructor() {
    this.chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
    this.collectionName = 'relifex_diabetes_kb';
    this.chromaClient = new ChromaClient({ path: this.chromaUrl });
    this.embedder = new DefaultEmbeddingFunction();
    this.localKnowledgeBase = [];

    this._loadLocalKnowledgeBase();
    this.checkChromaConnection();
  }

  async checkChromaConnection() {
    try {
      const heartbeat = await this.chromaClient.heartbeat();
      console.log(`[RAGService]: ChromaDB connected successfully at ${this.chromaUrl}! (Heartbeat: ${heartbeat})`);
    } catch (e) {
      console.warn(`[RAGService Notice]: ChromaDB not reachable at ${this.chromaUrl}. Operating in local JSON fallback mode.`);
    }
  }

  _loadLocalKnowledgeBase() {
    try {
      const kbPath = path.join(__dirname, '../../data/diabetes_knowledge.json');
      if (fs.existsSync(kbPath)) {
        this.localKnowledgeBase = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
      }
    } catch (e) {
      console.warn('[RAGService]: Local knowledge base fallback file not loaded.');
    }
  }

  /**
   * Search relevant context chunks with similarity distance scoring
   */
  async retrieveContext(query, topK = 2) {
    try {
      // Pass embedder explicitly to avoid TypeError on collection.query
      const collection = await this.chromaClient.getCollection({
        name: this.collectionName,
        embeddingFunction: this.embedder,
      });

      const results = await collection.query({
        queryTexts: [query],
        nResults: topK,
      });

      if (results && results.documents && results.documents[0] && results.documents[0].length > 0) {
        const distances = (results.distances && results.distances[0]) ? results.distances[0] : [];
        const ids = (results.ids && results.ids[0]) ? results.ids[0] : [];
        const metadatas = (results.metadatas && results.metadatas[0]) ? results.metadatas[0] : [];

        const validChunks = [];
        for (let i = 0; i < results.documents[0].length; i++) {
          const distance = distances[i] !== undefined ? parseFloat(distances[i].toFixed(4)) : 0.45;
          // Cosine/L2 distance thresholding: ignore distant non-matches (> 0.85)
          if (distance <= 0.85) {
            validChunks.push({
              id: ids[i] || `kb_vec_${i}`,
              topic: metadatas[i]?.topic || 'Vector Chunk',
              text: results.documents[0][i],
              distanceScore: distance, // Real float score e.g. 0.6626
            });
          }
        }

        if (validChunks.length > 0) {
          return {
            chunks: validChunks,
            groundedMode: 'live_chromadb',
            sourceLabel: 'ChromaDB Vector Store (Port 8000)',
          };
        }
      }
    } catch (error) {
      console.warn('[RAGService Vector Error]:', error.message);
      // Fallback to local keyword search
    }

    // Fallback keyword search over local KB
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const domainKeywords = ['glucose', 'blood', 'walk', 'exercise', 'glut4', 'sleep', 'cortisol', 'fiber', 'glycemic', 'hba1c', 'hydration', 'dawn', 'somogyi', 'carbohydrate', 'insulin'];

    const isDomainRelated = queryWords.some(w => domainKeywords.some(k => k.includes(w) || w.includes(k)));
    if (!isDomainRelated) {
      return { chunks: [], groundedMode: 'ungrounded', sourceLabel: 'None (Out of Scope)' };
    }

    const scoredChunks = [];
    for (const doc of this.localKnowledgeBase) {
      const fullText = `${doc.topic}: ${doc.content}`.toLowerCase();
      const matchCount = queryWords.filter(word => fullText.includes(word)).length;

      if (matchCount >= 2 || (queryWords.length <= 2 && matchCount >= 1)) {
        scoredChunks.push({
          id: doc.id,
          topic: doc.topic,
          text: `${doc.topic}: ${doc.content}`,
          matchScore: matchCount,
        });
      }
    }

    if (scoredChunks.length > 0) {
      scoredChunks.sort((a, b) => b.matchScore - a.matchScore);
      return {
        chunks: scoredChunks.slice(0, topK),
        groundedMode: 'fallback_local_kb',
        sourceLabel: 'Local Diabetes Knowledge Base (Fallback)',
      };
    }

    return {
      chunks: [],
      groundedMode: 'ungrounded',
      sourceLabel: 'None (Adjacent Uncovered)',
    };
  }

  /**
   * Process Chat Q&A with RAG Grounding & Chunk Transparency
   */
  async processGroundedChat(userId, message) {
    const retrieval = await this.retrieveContext(message);

    if (!retrieval.chunks || retrieval.chunks.length === 0) {
      return {
        reply: "I do not have specific grounded clinical evidence in my knowledge base to answer this question. For your health and safety, please consult a certified medical professional.",
        grounded: false,
        groundedMode: 'ungrounded',
        retrievedChunks: [],
        sources: [retrieval.sourceLabel],
      };
    }

    const contextText = retrieval.chunks.map(c => c.text).join('\n\n');
    const prompt = `
Answer the user's question STRICTLY based on the provided context below.
If the context does not contain enough information to answer the question, state honestly that you do not have sufficient grounded evidence in your knowledge base.

USER QUESTION: "${message}"
`;

    const aiReply = await geminiService.generateResponse({
      prompt: prompt,
      context: contextText,
      temperature: 0.3,
    });

    return {
      reply: aiReply,
      grounded: true,
      groundedMode: retrieval.groundedMode, // 'live_chromadb' or 'fallback_local_kb'
      retrievedChunks: retrieval.chunks,
      sources: [retrieval.sourceLabel],
    };
  }
}

module.exports = new RAGService();
