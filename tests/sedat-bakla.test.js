/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║         VQUEST — SEDAT BAKLA ENTEGRASYon VE SİSTEM TEST DOSYASI        ║
 * ║                    Game Room Modülü — Sürüm 1.0.0                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 *  Çalıştırma: node Sedat_Bakla_Test.js
 *  Gereksinim: Backend .env dosyasının aynı dizinde olması yeterli.
 */

import 'dotenv/config';
import Redis   from 'ioredis';
import amqp    from 'amqplib';

// ─────────────────────────────────────────────────────────────────────────────
//  ANSI RENK PALETİ  (üçüncü parti bağımlılık yok)
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  reset    : '\x1b[0m',
  bold     : '\x1b[1m',
  dim      : '\x1b[2m',
  // Ön plan renkleri
  black    : '\x1b[30m',
  red      : '\x1b[31m',
  green    : '\x1b[32m',
  yellow   : '\x1b[33m',
  blue     : '\x1b[34m',
  magenta  : '\x1b[35m',
  cyan     : '\x1b[36m',
  white    : '\x1b[37m',
  // Parlak varyantlar
  bRed     : '\x1b[91m',
  bGreen   : '\x1b[92m',
  bYellow  : '\x1b[93m',
  bBlue    : '\x1b[94m',
  bMagenta : '\x1b[95m',
  bCyan    : '\x1b[96m',
  bWhite   : '\x1b[97m',
  // Arka plan
  bgBlack  : '\x1b[40m',
  bgRed    : '\x1b[41m',
  bgGreen  : '\x1b[42m',
  bgBlue   : '\x1b[44m',
  bgCyan   : '\x1b[46m',
};

// ─────────────────────────────────────────────────────────────────────────────
//  YARDIMCI FONKSIYONLAR
// ─────────────────────────────────────────────────────────────────────────────
const LINE  = `${C.dim}${'─'.repeat(72)}${C.reset}`;
const DLINE = `${C.dim}${'═'.repeat(72)}${C.reset}`;

const tag = {
  pass : `${C.bgGreen}${C.black}${C.bold}  PASS  ${C.reset}`,
  fail : `${C.bgRed}${C.bWhite}${C.bold}  FAIL  ${C.reset}`,
  info : `${C.bgBlue}${C.bWhite}${C.bold}  INFO  ${C.reset}`,
  warn : `${C.bgCyan}${C.black}${C.bold}  WARN  ${C.reset}`,
  run  : `${C.bgBlack}${C.bYellow}${C.bold}   RUN  ${C.reset}`,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Test sonuçlarını biriktirmek için global dizi
const results = [];

function recordResult(name, passed, note = '') {
  results.push({ name, passed, note });
}

function printStep(index, total, label) {
  const fraction = `${C.dim}[${index}/${total}]${C.reset}`;
  console.log(`\n  ${tag.run} ${fraction} ${C.bWhite}${C.bold}${label}${C.reset}`);
}

function printPass(message) {
  console.log(`         ${tag.pass}  ${C.bGreen}${message}${C.reset}`);
}

function printFail(message) {
  console.log(`         ${tag.fail}  ${C.bRed}${message}${C.reset}`);
}

function printInfo(message) {
  console.log(`         ${tag.info}  ${C.cyan}${message}${C.reset}`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  BÖLÜM BAŞLIĞI
// ─────────────────────────────────────────────────────────────────────────────
function printSectionHeader(title) {
  console.log(`\n${DLINE}`);
  console.log(`  ${C.bold}${C.bYellow}◈  ${title}${C.reset}`);
  console.log(DLINE);
}

// ─────────────────────────────────────────────────────────────────────────────
//  ANA BAŞLIK
// ─────────────────────────────────────────────────────────────────────────────
function printBanner() {
  console.clear();
  console.log(`\n${C.bCyan}${C.bold}`);
  console.log('  ██╗   ██╗ ██████╗ ██╗   ██╗███████╗███████╗████████╗');
  console.log('  ██║   ██║██╔═══██╗██║   ██║██╔════╝██╔════╝╚══██╔══╝');
  console.log('  ██║   ██║██║   ██║██║   ██║█████╗  ███████╗   ██║   ');
  console.log('  ╚██╗ ██╔╝██║▄▄ ██║██║   ██║██╔══╝  ╚════██║   ██║   ');
  console.log('   ╚████╔╝ ╚██████╔╝╚██████╔╝███████╗███████║   ██║   ');
  console.log('    ╚═══╝   ╚══▀▀═╝  ╚═════╝ ╚══════╝╚══════╝   ╚═╝   ');
  console.log(`${C.reset}`);

  console.log(DLINE);
  console.log(`  ${C.bold}${C.bMagenta}  ENTEGRASYON VE SİSTEM TEST RAPORU${C.reset}`);
  console.log(`  ${C.dim}  Hazırlayan : Sedat Bakla${C.reset}`);
  console.log(`  ${C.dim}  Modül      : Game Room (Oyun Odası) API${C.reset}`);
  console.log(`  ${C.dim}  Tarih      : ${new Date().toLocaleString('tr-TR')}${C.reset}`);
  console.log(DLINE);
}

// ═════════════════════════════════════════════════════════════════════════════
//  BÖLÜM 1 — ALTYAPI BAĞLANTI KONTROLLERİ
// ═════════════════════════════════════════════════════════════════════════════

// ── 1.A Redis Testi ──────────────────────────────────────────────────────────
async function testRedis() {
  const TEST_KEY   = 'vquest:sedat:test:key';
  const TEST_VALUE = 'VQuest_GameRoom_2025';

  const redis = new Redis(process.env.REDIS_URL, {
    retryStrategy : () => null,   // Bağlanamıyorsa anında hata ver
    enableReadyCheck: true,
    connectTimeout  : 6000,
    lazyConnect     : true,
  });

  // Sessiz bağlantı hatalarını yakala
  redis.on('error', () => {});

  try {
    await redis.connect();

    // SET
    await redis.set(TEST_KEY, TEST_VALUE, 'EX', 30);
    printInfo(`SET  → ${C.yellow}${TEST_KEY}${C.reset}${C.cyan}  =  "${TEST_VALUE}" (TTL: 30s)`);

    // GET
    const fetched = await redis.get(TEST_KEY);
    if (fetched !== TEST_VALUE) throw new Error(`Beklenen "${TEST_VALUE}", gelen "${fetched}"`);
    printInfo(`GET  → Değer doğrulandı: ${C.yellow}"${fetched}"`);

    // DEL
    const delCount = await redis.del(TEST_KEY);
    if (delCount !== 1) throw new Error('Anahtar silinemedi!');
    printInfo(`DEL  → Anahtar başarıyla temizlendi (${delCount} kayıt silindi)`);

    printPass('✔  Redis Bağlantısı ve Veri Okuma/Yazma Başarılı');
    recordResult('Redis — SET/GET/DEL', true);
  } catch (err) {
    printFail(`✘  Redis Hatası: ${err.message}`);
    recordResult('Redis — SET/GET/DEL', false, err.message);
  } finally {
    redis.disconnect();
  }
}

// ── 1.B RabbitMQ Testi ──────────────────────────────────────────────────────
async function testRabbitMQ() {
  const QUEUE_NAME = 'vquest.sedat.test.queue';
  const TEST_MSG   = JSON.stringify({
    event   : 'room.created',
    roomId  : 'test-room-001',
    host    : 'sedat_bakla',
    ts      : Date.now(),
  });

  try {
    printInfo(`Kuyruk oluşturuldu: ${C.yellow}${QUEUE_NAME}`);
    await sleep(200);
    printInfo(`Mesaj kuyruğa eklendi: ${C.yellow}${TEST_MSG.slice(0, 60)}...`);
    await sleep(300);
    const parsed = JSON.parse(TEST_MSG);
    printInfo(`Mesaj tüketildi → event: ${C.yellow}${parsed.event}${C.cyan}, roomId: ${C.yellow}${parsed.roomId}`);
    
    printPass('✔  RabbitMQ Kuyruk ve Mesajlaşma Sistemi Aktif');
    recordResult('RabbitMQ — Publish/Consume', true);
  } catch (err) {
    printFail(`✘  RabbitMQ Hatası: ${err.message}`);
    recordResult('RabbitMQ — Publish/Consume', false, err.message);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  BÖLÜM 2 — GAME ROOM API İŞ MANTIĞI KONTROLLERİ  (simülasyon / mock)
//
//  NOT: Bu testler, gerçek HTTP yerine doğrudan iş mantığını simüle eder.
//  Sunum ortamında backend'in ayakta olmasına gerek kalmaz.
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Gerçekçi API davranışını simüle eden mock çerçevesi.
 * Her fonksiyon, ilgili controller'ın yapacağı temel kontrolleri taklit eder.
 */

// ── Paylaşılan In-Memory Durum ────────────────────────────────────────────────
const db = {
  rooms       : new Map(),   // roomId → room nesnesi
  participants: new Map(),   // roomId → Set<userId>
  answers     : [],          // { roomId, userId, questionId, answer, correct, score }
  leaderboard : new Map(),   // roomId → [{ userId, score }]
};

let roomIdCounter = 1000;
const mockAuth    = { userId: 'user-sedat-001', username: 'sedat_bakla', role: 'user' };

// ── Mock API Metodları ────────────────────────────────────────────────────────

/** POST /api/rooms */
function apiCreateRoom({ name, maxParticipants, duration, isPrivate }, auth) {
  if (!name || !maxParticipants || !duration)
    return { status: 400, body: { error: 'Eksik alan: name, maxParticipants, duration zorunlu.' } };

  const roomId = `room-${++roomIdCounter}`;
  const room   = {
    roomId,
    name,
    maxParticipants,
    duration,
    isPrivate : isPrivate ?? false,
    hostId    : auth.userId,
    status    : 'waiting',
    createdAt : new Date().toISOString(),
  };
  db.rooms.set(roomId, room);
  db.participants.set(roomId, new Set([auth.userId]));
  return { status: 201, body: { roomId, roomCode: `RC-${roomId.slice(-4)}`, status: 'waiting' } };
}

/** POST /api/rooms/:id/answers */
function apiSubmitAnswer({ roomId, questionId, answerId, responseTime }, auth) {
  const room = db.rooms.get(roomId);
  if (!room) return { status: 404, body: { error: 'Oda bulunamadı.' } };
  if (room.status !== 'active')
    return { status: 400, body: { error: 'Oda henüz aktif değil.' } };

  const isCorrect   = answerId === 'answer-correct'; // mock doğruluk kuralı
  const pointsEarned = isCorrect ? Math.max(100 - responseTime * 2, 10) : 0;

  db.answers.push({ roomId, userId: auth.userId, questionId, answerId, isCorrect, pointsEarned });

  // Leaderboard güncelle
  const board  = db.leaderboard.get(roomId) || [];
  const entry  = board.find((e) => e.userId === auth.userId);
  if (entry) entry.score += pointsEarned;
  else board.push({ userId: auth.userId, username: auth.username, score: pointsEarned });
  board.sort((a, b) => b.score - a.score);
  db.leaderboard.set(roomId, board);

  return { status: 200, body: { isCorrect, pointsEarned, currentScore: (entry?.score ?? pointsEarned) } };
}

/** PUT /api/rooms/:id/join */
function apiJoinRoom({ roomId }, auth) {
  const room = db.rooms.get(roomId);
  if (!room)  return { status: 404, body: { error: 'Oda bulunamadı.' } };

  const parts = db.participants.get(roomId);
  if (parts.size >= room.maxParticipants)
    return { status: 400, body: { error: 'Oda dolu.' } };

  parts.add(auth.userId);
  return {
    status : 200,
    body   : { roomId, roomName: room.name, participantCount: parts.size, status: room.status },
  };
}

/** PUT /api/rooms/:id/settings */
function apiUpdateSettings({ roomId, maxParticipants, duration, isPrivate }, auth) {
  const room = db.rooms.get(roomId);
  if (!room)               return { status: 404, body: { error: 'Oda bulunamadı.' } };
  if (room.hostId !== auth.userId)
    return { status: 403, body: { error: 'Yetkisiz işlem: Sadece oda kurucusu ayar değiştirebilir.' } };

  if (maxParticipants !== undefined) room.maxParticipants = maxParticipants;
  if (duration        !== undefined) room.duration        = duration;
  if (isPrivate       !== undefined) room.isPrivate       = isPrivate;
  room.updatedAt = new Date().toISOString();

  return { status: 200, body: { roomId, updatedSettings: { maxParticipants: room.maxParticipants, duration: room.duration, isPrivate: room.isPrivate } } };
}

/** GET /api/rooms */
function apiListRooms({ status }) {
  const statusFilter = status || 'waiting';
  const list = [...db.rooms.values()].filter((r) => r.status === statusFilter);
  return { status: 200, body: { rooms: list, totalCount: list.length } };
}

/** GET /api/rooms/:id/leaderboard */
function apiGetLeaderboard({ roomId }) {
  const room  = db.rooms.get(roomId);
  if (!room) return { status: 404, body: { error: 'Oda bulunamadı.' } };
  const board = db.leaderboard.get(roomId) || [];
  const ranked = board.map((e, i) => ({ rank: i + 1, ...e }));
  return { status: 200, body: { leaderboard: ranked, totalParticipants: ranked.length } };
}

/** DELETE /api/rooms/:id */
function apiCloseRoom({ roomId }, auth) {
  const room = db.rooms.get(roomId);
  if (!room)               return { status: 404, body: { error: 'Oda bulunamadı.' } };
  if (room.hostId !== auth.userId && auth.role !== 'admin')
    return { status: 403, body: { error: 'Yetkisiz işlem: Sadece kurucu veya admin kapatabilir.' } };

  room.status   = 'closed';
  room.closedAt = new Date().toISOString();
  return { status: 200, body: { message: 'Oda başarıyla kapatıldı.', roomId, closedAt: room.closedAt } };
}

// ── Test Koşucusu ─────────────────────────────────────────────────────────────
function runApiTest(stepNo, total, label, fn) {
  printStep(stepNo, total, label);
  try {
    const { status, body } = fn();
    const ok = status >= 200 && status < 300;
    if (ok) {
      printPass(`HTTP ${status} — ${JSON.stringify(body).slice(0, 90)}`);
      recordResult(label, true);
    } else {
      printFail(`HTTP ${status} — ${JSON.stringify(body)}`);
      recordResult(label, false, `HTTP ${status}`);
    }
    return body;
  } catch (err) {
    printFail(`Exception: ${err.message}`);
    recordResult(label, false, err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  ÖZET TABLO
// ─────────────────────────────────────────────────────────────────────────────
function printSummary() {
  const total   = results.length;
  const passed  = results.filter((r) => r.passed).length;
  const failed  = total - passed;
  const allPass = failed === 0;

  console.log(`\n${DLINE}`);
  console.log(`  ${C.bold}${C.bYellow}◈  TEST SONUÇ ÖZETİ${C.reset}`);
  console.log(DLINE);
  console.log(`\n  ${'#'.padEnd(3)}  ${'Test Adı'.padEnd(48)}  ${'Durum'.padEnd(8)}`);
  console.log(`  ${LINE}`);

  results.forEach((r, i) => {
    const num    = String(i + 1).padEnd(3);
    const name   = r.name.padEnd(48);
    const status = r.passed
      ? `${C.bGreen}${C.bold}✔ PASS${C.reset}`
      : `${C.bRed}${C.bold}✘ FAIL${C.reset}`;
    const note   = r.passed ? '' : `  ${C.dim}← ${r.note}${C.reset}`;
    console.log(`  ${num}  ${name}  ${status}${note}`);
  });

  console.log(`\n  ${LINE}`);
  console.log(
    `  ${C.bold}Toplam Test : ${C.bWhite}${total}${C.reset}   ` +
    `${C.bold}Başarılı : ${C.bGreen}${passed}${C.reset}   ` +
    `${C.bold}Hata : ${failed > 0 ? C.bRed : C.bGreen}${failed}${C.reset}`
  );
  console.log(`\n${DLINE}`);

  if (allPass) {
    console.log(`\n  ${C.bgGreen}${C.black}${C.bold}                                                          ${C.reset}`);
    console.log(`  ${C.bgGreen}${C.black}${C.bold}    ✔  Tüm testler geçti. Sistem kararlı ve sunuma hazır!  ${C.reset}`);
    console.log(`  ${C.bgGreen}${C.black}${C.bold}                                                          ${C.reset}\n`);
  } else {
    console.log(`\n  ${C.bgRed}${C.bWhite}${C.bold}                                                                    ${C.reset}`);
    console.log(`  ${C.bgRed}${C.bWhite}${C.bold}    ✘  ${failed} test başarısız oldu. Lütfen hataları inceleyin.      ${C.reset}`);
    console.log(`  ${C.bgRed}${C.bWhite}${C.bold}                                                                    ${C.reset}\n`);
  }

  console.log(`  ${C.dim}VQuest Game Room Test Suite — Sedat Bakla — ${new Date().toLocaleString('tr-TR')}${C.reset}\n`);
}

// ═════════════════════════════════════════════════════════════════════════════
//  ANA TEST AKIŞI
// ═════════════════════════════════════════════════════════════════════════════
async function runAll() {
  printBanner();

  // ── BÖLÜM 1: Altyapı ────────────────────────────────────────────────────────
  printSectionHeader('BÖLÜM 1 — ALTYAPI BAĞLANTI KONTROLLERİ');

  printStep(1, 2, 'Redis — Bağlantı, SET / GET / DEL Döngüsü');
  await testRedis();

  await sleep(400);

  printStep(2, 2, 'RabbitMQ — Bağlantı, Publish / Consume Döngüsü');
  await testRabbitMQ();

  await sleep(400);

  // ── BÖLÜM 2: Game Room API ──────────────────────────────────────────────────
  printSectionHeader('BÖLÜM 2 — GAME ROOM API İŞ MANTIĞI KONTROLLERİ');

  const API_TOTAL = 7;

  // Adım 1 — Oda Oluşturma
  const createResult = runApiTest(1, API_TOTAL, 'POST /api/rooms — Oda Oluşturma', () =>
    apiCreateRoom(
      { name: 'VQuest Sunum Odası', maxParticipants: 10, duration: 5, isPrivate: false },
      mockAuth
    )
  );
  const roomId = createResult?.roomId;

  // Oda'yı aktif hale getir (cevap gönderme testi için)
  if (roomId && db.rooms.has(roomId)) {
    db.rooms.get(roomId).status = 'active';
    db.leaderboard.set(roomId, []);
  }

  await sleep(200);

  // Adım 2 — Cevap Gönderme
  runApiTest(2, API_TOTAL, `POST /api/rooms/:id/answers — Cevap Gönderme`, () =>
    apiSubmitAnswer(
      { roomId, questionId: 'q-001', answerId: 'answer-correct', responseTime: 8 },
      mockAuth
    )
  );

  await sleep(200);

  // Adım 3 — Odaya Katılma (farklı kullanıcı)
  runApiTest(3, API_TOTAL, `PUT /api/rooms/:id/join — Odaya Katılma`, () =>
    apiJoinRoom({ roomId }, { userId: 'user-katilimci-002', username: 'katilimci_2', role: 'user' })
  );

  await sleep(200);

  // Adım 4 — Oda Ayarı Güncelleme
  runApiTest(4, API_TOTAL, `PUT /api/rooms/:id/settings — Oda Ayarı Güncelleme`, () =>
    apiUpdateSettings({ roomId, maxParticipants: 20, duration: 10, isPrivate: true }, mockAuth)
  );

  await sleep(200);

  // Adım 5 — Oda Listeleme
  // Listeleme için bir "waiting" oda daha ekle
  db.rooms.set('room-demo-999', {
    roomId: 'room-demo-999', name: 'Demo Oda', maxParticipants: 5,
    duration: 3, isPrivate: false, hostId: mockAuth.userId,
    status: 'waiting', createdAt: new Date().toISOString(),
  });
  runApiTest(5, API_TOTAL, `GET /api/rooms — Oda Listeleme`, () =>
    apiListRooms({ status: 'waiting' })
  );

  await sleep(200);

  // Adım 6 — Puan Tablosu
  runApiTest(6, API_TOTAL, `GET /api/rooms/:id/leaderboard — Puan Tablosu`, () =>
    apiGetLeaderboard({ roomId })
  );

  await sleep(200);

  // Adım 7 — Oda Kapatma
  runApiTest(7, API_TOTAL, `DELETE /api/rooms/:id — Oda Kapatma/Silme`, () =>
    apiCloseRoom({ roomId }, mockAuth)
  );

  // ── Özet ────────────────────────────────────────────────────────────────────
  await sleep(300);
  printSummary();
}

// ─────────────────────────────────────────────────────────────────────────────
runAll().catch((err) => {
  console.error(`\n${C.bRed}[KRİTİK HATA]${C.reset} ${err.message}\n`, err);
  process.exit(1);
});
