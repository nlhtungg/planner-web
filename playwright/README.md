# Festive Suite Playwright Journey

Playwright project nay chay cac user journey hop le tren giao dien Festive Suite de quan sat hanh vi API `/api/*` trong trinh duyet.

## Cai dat

```bash
cd playwright
npm install
npm run setup:browsers
cp .env.example .env
```

Neu gap loi Linux thieu thu vien khi launch Chromium (vd: `libnspr4.so`), chay them:

```bash
sudo apt-get update
sudo apt-get install -y libnspr4 libnss3
```

## Bien moi truong chinh

```env
FRONTEND_BASE_URL=http://localhost:3000
USER_CREDENTIALS=seeduser1|Password1;seeduser2|Password1;seeduser3|Password1
HEADLESS=true
CONTINUOUS=false
SESSION_COUNT=3
MAX_CONCURRENCY=3
CYCLE_DELAY_MS=5000
MAX_CYCLES=0
ENABLE_WRITE_ACTIONS=false
```

Neu chi dung 1 tai khoan, van co the dung:

```env
LOGIN_IDENTIFIER=seeduser1
LOGIN_PASSWORD=Password1
```

## Chay

```bash
cd playwright
npm run journey
```

Mo trinh duyet:

```bash
cd playwright
npm run journey:headed
```

Chay lien tuc cho den khi dung bang `Ctrl+C`:

```bash
cd playwright
CONTINUOUS=true npm run journey
```

Windows PowerShell:

```powershell
$env:CONTINUOUS="true"
$env:CYCLE_DELAY_MS="5000"
npm run journey
```

Chay nhieu user cung luc:

```powershell
$env:USER_CREDENTIALS="seeduser1|Password1;seeduser2|Password1;seeduser3|Password1"
$env:SESSION_COUNT="3"
$env:MAX_CONCURRENCY="3"
npm run journey
```

## Output

- `output/<timestamp>/events.log`: log tung buoc cua session
- `output/<timestamp>/api-traffic.jsonl`: log request/response `/api/*`
- `output/<timestamp>/summary.json`: tong hop ket qua cac session

Mac dinh journey la read-only. Khi `ENABLE_WRITE_ACTIONS=true`, script co the tao mot personal calendar event qua UI.
