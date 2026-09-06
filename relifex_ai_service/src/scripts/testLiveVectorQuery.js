const { ChromaClient, DefaultEmbeddingFunction } = require('chromadb');

async function testLiveQuery() {
  const client = new ChromaClient({ path: 'http://localhost:8000' });
  const embedder = new DefaultEmbeddingFunction();

  try {
    console.log('[Live Test]: Getting collection relifex_diabetes_kb with embeddingFunction...');
    const collection = await client.getCollection({
      name: 'relifex_diabetes_kb',
      embeddingFunction: embedder,
    });

    console.log('[Live Test]: Collection retrieved! Item count:', await collection.count());

    console.log('[Live Test]: Executing live vector query...');
    const results = await collection.query({
      queryTexts: ['How does post-meal walking lower blood sugar spikes?'],
      nResults: 2,
    });

    console.log('[Live Test]: SUCCESS! Query results from live ChromaDB:');
    console.log(JSON.stringify(results, null, 2));
  } catch (e) {
    console.error('[Live Test Error]:', e);
  }
}

testLiveQuery();
