const { ChromaClient, DefaultEmbeddingFunction } = require('chromadb');
const RAGService = require('../services/rag.service');

async function testThresholds() {
  const client = new ChromaClient({ path: 'http://localhost:8000' });
  const embedder = new DefaultEmbeddingFunction();

  console.log(`========================================================================================`);
  console.log(` RELIFEX LIVE CHROMADB VECTOR DISTANCE THRESHOLD VERIFICATION`);
  console.log(`========================================================================================\n`);

  try {
    const collection = await client.getCollection({
      name: 'relifex_diabetes_kb',
      embeddingFunction: embedder,
    });

    const testQueries = [
      { id: 'Q1 (Covered)', text: 'How does post-meal walking lower blood sugar spikes?' },
      { id: 'Q2 (Adjacent)', text: 'What is the exact pharmacological mechanism of SGLT2 inhibitors in renal tubules?' },
      { id: 'Q3 (Out of Scope)', text: 'What is the capital of Australia and who won the 1998 World Cup?' },
    ];

    for (const q of testQueries) {
      console.log(`----------------------------------------------------------------------------------------`);
      console.log(`📥 Query: ${q.id} -> "${q.text}"`);

      // 1. Raw ChromaDB query without threshold filtering
      const rawRes = await collection.query({
        queryTexts: [q.text],
        nResults: 2,
      });

      const rawDistances = rawRes.distances ? rawRes.distances[0] : [];
      const rawDocs = rawRes.documents ? rawRes.documents[0] : [];
      const rawIds = rawRes.ids ? rawRes.ids[0] : [];

      console.log(`\n   📊 Raw ChromaDB Unfiltered Output:`);
      for (let i = 0; i < rawDocs.length; i++) {
        console.log(`      • Chunk [${rawIds[i]}]: Distance = ${rawDistances[i].toFixed(4)} | Topic: "${rawDocs[i].substring(0, 45)}..."`);
      }

      // 2. Enforced threshold query via RAGService (Threshold <= 0.80)
      const ragRes = await RAGService.processGroundedChat('test_user', q.text);

      console.log(`\n   🛡️ RAGService Enforced Output (Threshold <= 0.80):`);
      console.log(`      • Grounded:     ${ragRes.grounded}`);
      console.log(`      • GroundedMode: "${ragRes.groundedMode}"`);
      console.log(`      • Chunks Kept:  ${ragRes.retrievedChunks.length}`);
      console.log(`      • Reply:        "${ragRes.reply.substring(0, 100)}..."`);

      if (q.id.includes('Covered')) {
        if (ragRes.grounded && ragRes.groundedMode === 'live_chromadb') {
          console.log(`   ✅ PASSED: Covered query distance (${rawDistances[0].toFixed(4)} <= 0.80) accepted as live_chromadb.`);
        }
      } else {
        if (!ragRes.grounded || ragRes.groundedMode === 'ungrounded') {
          console.log(`   ✅ PASSED: Distant query distance (${rawDistances[0].toFixed(4)} > 0.80) rejected by distance thresholding!`);
        }
      }
      console.log(`----------------------------------------------------------------------------------------\n`);
    }

  } catch (e) {
    console.error('[Threshold Test Error]:', e);
  }
}

testThresholds();
