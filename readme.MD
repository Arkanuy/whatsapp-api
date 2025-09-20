# WhatsApp Web API

API sederhana untuk mengirim pesan WhatsApp menggunakan whatsapp-web.js dengan Express.js.

## 📋 Fitur

- ✅ Mengirim pesan WhatsApp via API
- ✅ Autentikasi menggunakan secret key
- ✅ Format nomor telepon otomatis (Indonesia)
- ✅ Status monitoring client WhatsApp
- ✅ Restart client WhatsApp
- ✅ Validasi nomor telepon
- ✅ Error handling yang comprehensive

## 🛠️ Prerequisites

- Node.js (versi 16 atau lebih tinggi)
- npm atau yarn
- Google Chrome atau Chromium (untuk Puppeteer)

## 📦 Instalasi

1. Clone repository ini:
```bash
git clone <repository-url>
cd whatsapp-web-api
```

2. Install dependencies:
```bash
npm install
```

3. Copy file `.env.example` ke `.env` dan sesuaikan konfigurasi:
```bash
cp .env.example .env
```

4. Edit file `.env`:
```env
SECRET_KEY=4ac539495691a1e8fb45ddb2f0aedfb6
PORT=3000
```

## 🚀 Menjalankan Aplikasi

1. Start server:
```bash
npm start
```

2. Scan QR code yang muncul di terminal dengan aplikasi WhatsApp di ponsel Anda

3. Tunggu hingga status client menjadi `CONNECTED`

## 📡 API Endpoints

### 1. Mengirim Pesan
**POST** `/send-message`

Mengirim pesan WhatsApp ke nomor yang dituju.

#### Headers
```
Content-Type: application/json
x-secret-key: your_secret_key_here
```

#### Body
```json
{
    "number": "6281234567890",
    "message": "Halo, ini pesan dari API WhatsApp!",
    "secret_key": "your_secret_key_here"
}
```

#### Response Success
```json
{
    "status": true,
    "message": "Pesan berhasil dikirim",
    "to": "6281234567890@c.us",
    "messageId": "3EB0C431C5BD8E5B1234567890ABCDEF"
}
```

#### Response Error
```json
{
    "status": false,
    "message": "WhatsApp client tidak ready. Status: LOADING. Tunggu beberapa saat lagi."
}
```

### 2. Status Client
**GET** `/status`

Mengecek status koneksi WhatsApp client.

#### Headers
```
x-secret-key: 4ac539495691a1e8fb45ddb2f0aedfb6
```

#### Response
```json
{
    "status": true,
    "message": "API WhatsApp berjalan normal",
    "clientReady": true,
    "clientState": "CONNECTED",
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 3. Restart Client
**GET** `/restart`

Restart WhatsApp client (berguna jika terjadi error atau disconnect).

#### Headers
```
x-secret-key: 4ac539495691a1e8fb45ddb2f0aedfb6
```

#### Response
```json
{
    "status": true,
    "message": "Client WhatsApp sedang di-restart"
}
```

## 📝 Contoh Penggunaan

### Menggunakan cURL

1. **Mengirim Pesan:**
```bash
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -H "x-secret-key: 4ac539495691a1e8fb45ddb2f0aedfb6" \
  -d '{
    "number": "62895617632726",
    "message": "Halo dari API WhatsApp!"
  }'
```

2. **Cek Status:**
```bash
curl -X GET http://localhost:3000/status \
  -H "x-secret-key: 4ac539495691a1e8fb45ddb2f0aedfb6"
```

3. **Restart Client:**
```bash
curl -X GET http://localhost:3000/restart \
  -H "x-secret-key: 4ac539495691a1e8fb45ddb2f0aedfb6"
```

### Menggunakan JavaScript (fetch)

```javascript
// Mengirim pesan
const sendMessage = async () => {
  const response = await fetch('http://localhost:3000/send-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-secret-key': '4ac539495691a1e8fb45ddb2f0aedfb6'
    },
    body: JSON.stringify({
      number: '62895617632726',
      message: 'Halo dari JavaScript!'
    })
  });
  
  const result = await response.json();
  console.log(result);
};

sendMessage();
```

### Menggunakan Python (requests)

```python
import requests

# Konfigurasi
url = "http://localhost:3000/send-message"
headers = {
    "Content-Type": "application/json",
    "x-secret-key": "4ac539495691a1e8fb45ddb2f0aedfb6"
}

# Data pesan
data = {
    "number": "62895617632726",
    "message": "Halo dari Python!"
}

# Kirim request
response = requests.post(url, json=data, headers=headers)
result = response.json()

print(result)
```

## 📞 Format Nomor Telepon

API ini mendukung berbagai format nomor telepon Indonesia:

- `085617632726` → otomatis menjadi `62895617632726@c.us`
- `+62895617632726` → otomatis menjadi `62895617632726@c.us`
- `62895617632726` → otomatis menjadi `62895617632726@c.us`
- `62895617632726@c.us` → tetap sama

## 🔒 Keamanan

API ini menggunakan secret key untuk autentikasi. Secret key dapat dikirim melalui:

1. **Header** `x-secret-key`
2. **Body** `secret_key`

**⚠️ Penting:** Ganti secret key default di file `.env` dengan key yang lebih aman untuk production.

## 📊 Status Client

Status client yang mungkin muncul:

- `INITIALIZING` - Client sedang diinisialisasi
- `QR_GENERATED` - QR code telah dibuat, scan dengan WhatsApp
- `LOADING` - Sedang loading setelah scan QR
- `AUTHENTICATED` - Berhasil autentikasi
- `CONNECTED` - Siap menerima request
- `DISCONNECTED` - Terputus dari WhatsApp
- `AUTH_FAILURE` - Gagal autentikasi
- `ERROR` - Terjadi error
- `RESTARTING` - Sedang restart

## 🐛 Error Handling

API mengembalikan berbagai error message yang informatif:

- `Secret key tidak valid` - Secret key salah
- `Parameter number dan message wajib diisi` - Parameter tidak lengkap
- `Format nomor telepon tidak valid` - Format nomor salah
- `WhatsApp client tidak ready` - Client