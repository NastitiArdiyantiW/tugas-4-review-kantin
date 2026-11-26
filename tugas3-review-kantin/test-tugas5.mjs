const CANDIDATES = [
  'http://localhost:3000/api/v1',
  'http://localhost:3000/api',
  'http://localhost:3000',
];

let BASE = '';
for (const candidate of CANDIDATES) {
  const probe = await fetch(`${candidate}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (probe.status !== 404) {
    BASE = candidate;
    break;
  }
}

if (!BASE) {
  console.error('Endpoint /auth/login tidak ditemukan di port 3000. Cek file frontend/.env untuk melihat URL backend.');
  process.exit(1);
}
console.log('BASE URL terdeteksi:', BASE);

async function hit(judul, url, options = {}) {
  const res = await fetch(url, options);
  const body = await res.json();
  console.log('\n========================================');
  console.log(`${judul}`);
  console.log(`HTTP ${res.status}`);
  console.log(JSON.stringify(body, null, 2));
  return { status: res.status, body };
}

// 1. Login Admin
const adminLogin = await hit('1. POST /auth/login (Admin)', `${BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@kantin.test', password: 'rahasia123' }),
});
const adminToken = adminLogin.body.data.token;
const adminHeader = { Authorization: `Bearer ${adminToken}` };

// 2. GET /audit-logs dengan filter userId & targetId (200 OK)
const listRes = await hit(
  '2. GET /audit-logs?userId=1&targetId=1&page=1&pageSize=3 (200 OK)',
  `${BASE}/audit-logs?userId=1&targetId=1&page=1&pageSize=3`,
  { headers: adminHeader },
);
const firstId = listRes.body.data.items[0]?.id ?? 1;

// 3. GET /audit-logs/:id (200 OK)
await hit(`3. GET /audit-logs/${firstId} (200 OK)`, `${BASE}/audit-logs/${firstId}`, {
  headers: adminHeader,
});

// 4. GET /audit-logs/999999 (404 Not Found - Skenario Gagal)
await hit('4. GET /audit-logs/999999 (404 Not Found)', `${BASE}/audit-logs/999999`, {
  headers: adminHeader,
});

// 5. Validasi Gagal (400 Bad Request - Skenario Gagal)
await hit('5a. GET /audit-logs?page=0 (400 Validasi)', `${BASE}/audit-logs?page=0`, {
  headers: adminHeader,
});
await hit('5b. GET /audit-logs?asal=123 (400 Parameter Asing)', `${BASE}/audit-logs?asal=123`, {
  headers: adminHeader,
});
await hit(
  '5c. GET /audit-logs?from=2026-11-25&to=2026-11-20 (400 from > to)',
  `${BASE}/audit-logs?from=2026-11-25&to=2026-11-20`,
  { headers: adminHeader },
);

// 6. Tanpa Token (401 Unauthorized - Skenario Gagal)
await hit('6. GET /audit-logs TANPA TOKEN (401 Unauthorized)', `${BASE}/audit-logs`);

// 7. Role Customer (403 Forbidden - Skenario Gagal)
const custLogin = await hit('7a. POST /auth/login (Customer)', `${BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'bagas@student.test', password: 'rahasia123' }),
});
const custToken = custLogin.body.data.token;
await hit('7b. GET /audit-logs pakai Token Customer (403 Forbidden)', `${BASE}/audit-logs`, {
  headers: { Authorization: `Bearer ${custToken}` },
});

// 8. POST /auth/logout (Admin - 200 OK)
await hit('8. POST /auth/logout (Admin - 200 OK)', `${BASE}/auth/logout`, {
  method: 'POST',
  headers: adminHeader,
});