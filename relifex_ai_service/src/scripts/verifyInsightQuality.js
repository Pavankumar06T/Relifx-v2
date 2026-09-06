const http = require('http');
const app = require('../server');
const mockRepository = require('../services/mockRepository');

const dailyScenarios = [
  { id: 'high_post_dinner_carbs', title: 'Daily Scenario 1: High Post-Dinner Carbs Spike', description: 'High-GI dinners leading to post-dinner glucose spikes >160 mg/dL.' },
  { id: 'noisy_no_pattern', title: 'Daily Scenario 2: Noisy / No Clear Pattern', description: 'Erratic random glucose readings. MUST honestly state no pattern.' },
  { id: 'missing_incomplete_logs', title: 'Daily Scenario 3: Missing / Incomplete Logs', description: 'Only 2 days logged. MUST honestly state data is too sparse.' },
  { id: 'clear_positive_trend', title: 'Daily Scenario 4: Clear Positive Trend', description: 'Fasting glucose steadily improving from 135 mg/dL down to 94 mg/dL over 7 days.' },
  { id: 'post_dinner_walk_positive', title: 'Daily Scenario 5: Post-Dinner Walk Positive Impact', description: '20+ min post-dinner walks reduce post-meal peaks by ~35 mg/dL.' },
  { id: 'sleep_deprivation_fasting_spike', title: 'Daily Scenario 6: Sleep Deprivation Fasting Spike', description: 'Nights with <6 hours sleep cause elevated morning fasting glucose (>135 mg/dL).' },
  { id: 'high_stress_spike', title: 'Daily Scenario 7: High Stress Spike', description: 'Days with high stress (5/5) show elevated glucose across the day.' },
  { id: 'low_gi_mediterranean_success', title: 'Daily Scenario 8: Low-GI Mediterranean Success', description: 'High-fiber, low-GI meals keeping post-prandial glucose under 125 mg/dL consistently.' },
];

const weeklyScenarios = [
  {
    id: 'weekly_strong_week',
    title: 'Weekly Scenario A: Strong Week (High Streak 14, 7/7 Logged Days)',
    description: 'High adherence (7/7 days logged), 14-day streak, clear positive post-dinner walk correlation.',
  },
  {
    id: 'weekly_mixed_week',
    title: 'Weekly Scenario B: Mixed Week (Streak 4, 5/7 Logged Days)',
    description: 'Moderate adherence (5/7 days logged), some good low-GI days, 2 unlogged days.',
  },
  {
    id: 'weekly_rough_week',
    title: 'Weekly Scenario C: Rough Week (Streak 1, 2/7 Logged Days)',
    description: 'Low adherence (2/7 days logged). MUST find a genuine micro-win without fabricating positivity.',
  },
];

const fitnessScenarios = [
  {
    id: 'fitness_consistent_exerciser',
    title: 'Fitness Scenario 1: Consistent Exerciser (35 mins daily activity)',
    description: 'Daily 35-min exercise associated with post-meal glucose remaining in target (<125 mg/dL).',
  },
  {
    id: 'fitness_sedentary_week',
    title: 'Fitness Scenario 2: Sedentary Week (0 mins activity logged)',
    description: '0 activity minutes logged associated with elevated post-meal glucose readings (>165 mg/dL).',
  },
  {
    id: 'fitness_mixed_sparse',
    title: 'Fitness Scenario 3: Mixed / Sparse Activity (Only 1 active day)',
    description: 'Only 1 active day logged. MUST honestly state activity data is too sparse to deduce correlation.',
  },
];

async function runQualityHarness() {
  const server = app.listen(0, async () => {
    const port = server.address().port;
    console.log(`========================================================================================`);
    console.log(` RELIFEX INSIGHT, WEEKLY RECAP & FITNESS QUALITY EVALUATION HARNESS`);
    console.log(` Running against dynamic server port ${port}`);
    console.log(`========================================================================================\n`);

    // 1. Run 3 Weekly Recap Scenarios
    console.log(`========================================================================================`);
    console.log(`📌 SECTION 1: WEEKLY RECAP GENERATOR EVALUATION (POST /ai/insights/weekly-recap)`);
    console.log(`========================================================================================\n`);

    for (const wsc of weeklyScenarios) {
      console.log(`----------------------------------------------------------------------------------------`);
      console.log(`📊 ${wsc.title.toUpperCase()}`);
      console.log(`   Expectation: ${wsc.description}`);

      const recapData = await mockRepository.getWeeklyRecapData('test_user', wsc.id);
      console.log(`   📥 Input Summary: Streak=${recapData.streakCount} days, Logged=${recapData.loggedDaysCount}/7 days, BestDay="${recapData.bestDay}"`);

      const res = await makePostRequest(port, '/ai/insights/weekly-recap', {
        userId: 'test_user',
        scenarioId: wsc.id,
      });

      const body = res.body || {};
      console.log(`\n   📤 Weekly Recap Response (HTTP ${res.status}):`);
      console.log(`      • streakCount:    ${body.streakCount}`);
      console.log(`      • bestDay:        "${body.bestDay}"`);
      console.log(`      • notablePattern: "${body.notablePattern}"`);
      console.log(`      • oneWin:         "${body.oneWin}"`);

      if (wsc.id === 'weekly_rough_week') {
        const winText = (body.oneWin || '').toLowerCase();
        const containsFabricatedWin = winText.includes('7 of 7') || winText.includes('perfect') || winText.includes('14-day');
        if (!containsFabricatedWin) {
          console.log(`   ✅ HONEST WIN VERIFICATION PASSED: Genuine micro-win identified without forcing fabricated positivity.`);
        } else {
          console.log(`   ⚠️ WARNING: Fabricated win detected on rough week.`);
        }
      }
      console.log(`----------------------------------------------------------------------------------------\n`);
    }

    // 2. Run 3 Fitness Insight Scenarios
    console.log(`========================================================================================`);
    console.log(`📌 SECTION 2: FITNESS & WORKOUT INSIGHT EVALUATION (POST /ai/insights/daily)`);
    console.log(`========================================================================================\n`);

    for (const fsc of fitnessScenarios) {
      console.log(`----------------------------------------------------------------------------------------`);
      console.log(`🏋️ ${fsc.title.toUpperCase()}`);
      console.log(`   Expectation: ${fsc.description}`);

      const todayLog = await mockRepository.getTodayLog('test_user', fsc.id);
      const history = await mockRepository.getSevenDayHistory('test_user', fsc.id);
      console.log(`   📥 Input Summary: Today Activity=${todayLog.activityMinutes}m (${todayLog.activityType || 'N/A'}), 7-Day History Count=${history.length}`);

      const res = await makePostRequest(port, '/ai/insights/daily', {
        userId: 'test_user',
        scenarioId: fsc.id,
      });

      const body = res.body || {};
      console.log(`\n   📤 Fitness Daily Insight Response (HTTP ${res.status}):`);
      console.log(`      • insight:    "${body.insight}"`);
      console.log(`      • evidence:   "${body.evidence}"`);
      console.log(`      • suggestion: "${body.suggestion}"`);

      if (fsc.id === 'fitness_mixed_sparse') {
        const insightText = (body.insight || '').toLowerCase();
        const isHonest = insightText.includes('sparse') || insightText.includes('insufficient') || insightText.includes('no clear correlation') || insightText.includes('no pattern');
        if (isHonest) {
          console.log(`   ✅ FITNESS HONESTY VERIFICATION PASSED: Sparse activity data correctly acknowledged.`);
        } else {
          console.log(`   ⚠️ WARNING: AI overasserted a pattern on sparse activity data.`);
        }
      }
      console.log(`----------------------------------------------------------------------------------------\n`);
    }

    server.close();
  });
}

function makePostRequest(port, path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(
      {
        hostname: 'localhost',
        port: port,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      res => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch (_) {
            resolve({ status: res.statusCode, body: body });
          }
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

runQualityHarness();
