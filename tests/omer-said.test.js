/**
 * test_redis_rabbitmq.js
 *
 * Hazırlayan : Ömer Said Karaküş
 * Görev      : VQuest Mobil Backend (API Entegrasyon) Görevleri
 *
 * Bu test dosyası, görev belgesine göre implement edilen
 * Redis ve RabbitMQ özelliklerini otomatik olarak doğrular.
 *
 *  TEST 1 — Redis JWT Token Blacklist (Task 2 / Logout)
 *    Login → Logout (token Redis'e blacklist) → Eski token ile istek → 401 beklenir
 *
 *  TEST 2 — RabbitMQ Account Deletion Queue (Task 7)
 *    Yeni kullanıcı oluştur → Login → DELETE /api/profile → 204 beklenir → Worker siler
 *
 *  TEST 3 — Redis Rate Limiter (Task 1 & 2)
 *    Aynı endpoint'e hızlı istekler → 429 beklenir
 *
 * Çalıştırma:
 *   node test_redis_rabbitmq.js
 */

const BASE_URL = 'https://vquest-backend-api.onrender.com/api';

const timestamp = Date.now();
const TEST_USER = {
  username: `testuser_${timestamp}`,
  email: `test_${timestamp}@vquest.com`,
  password: 'TestSifre123!',
};
const TEST_USER_DEL = {
  username: `testdel_${timestamp}`,
  email: `testdel_${timestamp}@vquest.com`,
  password: 'TestSifre123!',
};

function log(label, pass, detail = '') {
  const icon = pass ? '✅' : '❌';
  console.log(`  ${icon} [${label}] ${detail}`);
}

async function req(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  return { status: res.status, data };
}

// ── TEST 1: Redis Token Blacklist ────────────────────────────────────────────

async function testBlacklist() {
  console.log('\n┌─────────────────────────────────────────────────┐');
  console.log('│  TEST 1 — Redis JWT Token Blacklist (Logout)    │');
  console.log('└─────────────────────────────────────────────────┘');

  const reg = await req('POST', '/auth/register', TEST_USER);
  log('REGISTER', reg.status === 201, `HTTP ${reg.status}`);
  if (reg.status !== 201) { console.log('   Hata:', reg.data?.message); return; }

  const loginRes = await req('POST', '/auth/login', { email: TEST_USER.email, password: TEST_USER.password });
  log('LOGIN', loginRes.status === 200, `HTTP ${loginRes.status}`);
  const token = loginRes.data?.token;
  if (!token) { log('TOKEN', false, 'Token alınamadı'); return; }
  console.log(`   Token (ilk 40 karakter): ${token.slice(0, 40)}...`);

  const before = await req('GET', '/profile', null, token);
  log('GET /profile (token geçerli)', before.status === 200, `HTTP ${before.status}`);

  const logoutRes = await req('POST', '/auth/logout', null, token);
  log('POST /auth/logout', logoutRes.status === 200, `HTTP ${logoutRes.status} → "${logoutRes.data?.message}"`);
  console.log('   🔒 Token Redis\'te BL_<token> anahtarıyla kara listeye alındı');

  const after = await req('GET', '/profile', null, token);
  const blacklisted = after.status === 401;
  log(
    'GET /profile (kara listedeki token)',
    blacklisted,
    `HTTP ${after.status} (Beklenen: 401) → ${blacklisted ? '✅ Blacklist ÇALIŞIYOR' : '⚠️  Blacklist çalışmıyor!'}`
  );
  if (!blacklisted) console.log('   Mesaj:', after.data?.message);
}

// ── TEST 2: Redis Rate Limiter ───────────────────────────────────────────────

async function testRateLimit() {
  console.log('\n┌─────────────────────────────────────────────────┐');
  console.log('│  TEST 2 — Redis Rate Limiter (5 istek / 1 dk)  │');
  console.log('└─────────────────────────────────────────────────┘');
  console.log('   authLimiter → maks 5 istek/dakika | 6. istekte 429 bekleniyor\n');

  let rateLimited = false;
  for (let i = 1; i <= 6; i++) {
    const r = await req('POST', '/auth/login', { email: `dummy_${i}_${timestamp}@test.com`, password: 'yanlis' });
    const isLimit = r.status === 429;
    console.log(`   İstek ${i}: HTTP ${r.status}${isLimit ? ' 🚫 RATE LIMIT!' : ''}`);
    if (isLimit) {
      rateLimited = true;
      log('RATE LIMITER', true, `İstek ${i}'de 429 döndü → Redis rate limiter ÇALIŞIYOR ✅`);
      console.log('   Mesaj:', r.data?.message);
      break;
    }
  }
  if (!rateLimited) {
    log('RATE LIMITER', false, '6 istekten sonra 429 gelmedi → Redis rate limiter aktif değil');
  }
}

// ── TEST 3: RabbitMQ Account Deletion ───────────────────────────────────────

async function testRabbitMQ() {
  console.log('\n┌─────────────────────────────────────────────────┐');
  console.log('│  TEST 3 — RabbitMQ account_deletion_queue       │');
  console.log('└─────────────────────────────────────────────────┘');

  const reg = await req('POST', '/auth/register', TEST_USER_DEL);
  log('REGISTER (silme testi)', reg.status === 201, `HTTP ${reg.status}`);
  if (reg.status !== 201) { console.log('   Hata:', reg.data?.message); return; }

  const loginRes = await req('POST', '/auth/login', { email: TEST_USER_DEL.email, password: TEST_USER_DEL.password });
  log('LOGIN', loginRes.status === 200, `HTTP ${loginRes.status}`);
  const token = loginRes.data?.token;
  const userId = loginRes.data?.user?.id;
  if (!token) { log('TOKEN', false, 'Token alınamadı'); return; }
  console.log(`   userId: ${userId}`);

  console.log('\n   ► DELETE /api/profile gönderiliyor...');
  console.log('   ► Bu istek anında 204 döner, silme işlemi kuyruğa alınır');
  const delRes = await req('DELETE', '/profile', null, token);
  log(
    'DELETE /profile (kuyruğa aldı)',
    delRes.status === 204,
    `HTTP ${delRes.status} (Beklenen: 204) → ${delRes.status === 204 ? 'Mesaj kuyruğa eklendi ✅' : 'HATA!'}`
  );

  if (delRes.status !== 204) {
    console.log('   Hata:', delRes.data?.message);
    console.log('   ⚠️  RabbitMQ bağlantısı kontrol edin.');
    return;
  }

  console.log('\n   ⏳ Worker\'ın mesajı işlemesi için 4 saniye bekleniyor...');
  console.log('   (Terminalde şunu görmelisiniz: "✅ userId: ... MongoDB\'den başarıyla silindi")');
  await new Promise(r => setTimeout(r, 4000));

  const retryLogin = await req('POST', '/auth/login', { email: TEST_USER_DEL.email, password: TEST_USER_DEL.password });
  const workerWorked = retryLogin.status === 401;
  log(
    'WORKER DOĞRULAMA (silinen kullanıcıyla login)',
    workerWorked,
    `HTTP ${retryLogin.status} (Beklenen: 401) → ${workerWorked ? 'Worker kullanıcıyı sildi ✅ RabbitMQ ÇALIŞIYOR' : 'Worker henüz işlemedi veya bağlı değil'}`
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   VQuest — Redis & RabbitMQ Özellik Doğrulama    ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log(`  Backend  : ${BASE_URL}`);

  try {
    await testBlacklist();   // Test 1: Redis blacklist (register + login kullanır)
    await testRabbitMQ();    // Test 2: RabbitMQ (register + login kullanır) — limiti tüketmeden önce!
    await testRateLimit();   // Test 3: Rate limiter (en son — limiti kasıtlı tüketir)
  } catch (err) {
    console.error('\n❌ Bağlantı hatası:', err.message);
    if (err.cause?.code === 'ECONNREFUSED') {
      console.error('  Backend çalışmıyor! Önce "npm run dev" çalıştırın.');
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Tüm testler tamamlandı.');
  console.log('═══════════════════════════════════════════════════\n');
}

main();
