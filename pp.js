const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const app = express();
const http = require('http').Server(app);

// 1. Veritabanı Kurulumu (Adres sütunu panelin için aktif)
const db = new sqlite3.Database('./hali.db');
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS siparisler (id INTEGER PRIMARY KEY AUTOINCREMENT, musteri TEXT, telefon TEXT, m2 REAL, fiyat REAL, adres TEXT, tarih DATETIME DEFAULT CURRENT_TIMESTAMP)");
});

app.use(express.json());

// 2. WhatsApp Botu
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-extensions'] 
    }
});

client.on('qr', (qr) => {
    console.log('--- HASAN REİS QR KODU TARA ---');
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => { 
    console.log('🛡️ VİP HALI YIKAMA: SİSTEM HAZIR VE TETİKTE!'); 
});

client.initialize();

// 3. Mobil Uyumlu Panel Arayüzü
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>VİP Halı Yıkama</title>
        <style>
            :root { --ana: #25d366; --arka: #0f172a; --kart: #1e293b; --yazi: #f8fafc; --sil: #ef4444; }
            body { font-family: 'Segoe UI', sans-serif; background: var(--arka); color: var(--yazi); padding: 10px; margin: 0; }
            .container { max-width: 500px; margin: auto; }
            .card { background: var(--kart); padding: 20px; border-radius: 15px; border: 1px solid #334155; margin-bottom: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.3); }
            input, textarea { width: 100%; padding: 15px; margin: 8px 0; border-radius: 10px; border: 1px solid #334155; font-size: 16px; background: #334155; color: white; box-sizing: border-box; }
            textarea { height: 80px; resize: none; }
            .btn { width: 100%; padding: 18px; background: var(--ana); color: black; font-weight: bold; border: none; border-radius: 12px; cursor: pointer; font-size: 18px; transition: 0.3s; }
            .btn-basarili { background: #059669 !important; color: white !important; }
            .liste-item { background: var(--kart); padding: 15px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border-left: 5px solid var(--ana); cursor: pointer; }
            #modal { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:999; justify-content:center; align-items:center; }
            .modal-icerik { background:var(--kart); padding:25px; border-radius:20px; width:85%; max-width:400px; border:2px solid var(--ana); }
            .modal-icerik p { margin: 12px 0; border-bottom: 1px solid #334155; padding-bottom: 8px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2 style="text-align:center; color:var(--ana);">VİP HALI YIKAMA</h2>
            <div class="card">
                <input type="text" id="musteri" placeholder="Müşteri Ad Soyad">
                <input type="tel" id="telefon" placeholder="Telefon (Sıfırsız: 5xxxxxxxxx)">
                <input type="number" id="m2" placeholder="Toplam Metrekare" oninput="document.getElementById('t').innerText=(this.value*70).toFixed(2)">
                <textarea id="adres" placeholder="Müşteri Adresi (Sadece senin panelinde gözükür)"></textarea>
                <div style="text-align:center; margin:10px 0;">Tutar: <span id="t" style="color:var(--ana); font-weight:bold;">0</span> TL</div>
                <button class="btn" id="anaBtn" onclick="islemYap()">KAYDET VE MESAJ AT</button>
            </div>
            <h3>Kayıtlı Siparişler</h3>
            <div id="liste"></div>
        </div>
        <div id="modal"><div class="modal-icerik" id="mIcerik"></div></div>

        <script>
            window.onload = listeYukle;
            async function listeYukle() {
                const res = await fetch('/liste');
                const veriler = await res.json();
                const liste = document.getElementById('liste');
                liste.innerHTML = ""; 
                veriler.forEach(is => {
                    liste.innerHTML += \`
                        <div class="liste-item">
                            <div style="flex:1" onclick="detayAc(\\\`\${is.musteri}\\\`, \\\`\${is.telefon}\\\`, \\\`\${is.m2}\\\`, \\\`\${is.fiyat}\\\`, \\\`\${is.adres}\\\`, \\\`\${is.tarih}\\\`)">
                                <strong>\${is.musteri}</strong><br><small>\${is.m2} m² - \${is.fiyat} TL</small>
                            </div>
                            <button style="background:none; border:none; color:var(--sil); font-size:20px;" onclick="kayitSil(\${is.id})">🗑️</button>
                        </div>\`;
                });
            }

            async function islemYap() {
                const btn = document.getElementById('anaBtn');
                const mus = document.getElementById('musteri').value;
                const tel = document.getElementById('telefon').value;
                const m2 = document.getElementById('m2').value;
                const adr = document.getElementById('adres').value;

                if(!mus || !tel || !m2) return alert("Hasan Reis, eksikleri doldur!");
                btn.disabled = true; btn.innerText = "MESAJ GÖNDERİLİYOR...";

                try {
                    const res = await fetch('/islem', {
                        method:'POST',
                        headers:{'Content-Type':'application/json'},
                        body:JSON.stringify({ musteri: mus, telefon: "90" + tel, m2: m2, fiyat: (m2 * 70).toFixed(2), adres: adr })
                    });
                    const sonuc = await res.json();
                    if(sonuc.success) {
                        btn.innerText = "✅ İŞLEM TAMAMLANDI";
                        btn.classList.add('btn-basarili');
                        document.querySelectorAll('input, textarea').forEach(i => i.value = "");
                        document.getElementById('t').innerText = "0";
                        listeYukle();
                        setTimeout(() => { btn.disabled = false; btn.innerText = "KAYDET VE MESAJ AT"; btn.classList.remove('btn-basarili'); }, 3000);
                    } else { alert("Hata: Mesaj gitmedi!"); btn.disabled = false; btn.innerText = "KAYDET VE MESAJ AT"; }
                } catch (e) { alert("Sistem Hatası!"); btn.disabled = false; }
            }

            function detayAc(m, t, m2, f, a, tar) {
                document.getElementById('mIcerik').innerHTML = \`
                    <h3 style="color:var(--ana); text-align:center;">Müşteri Bilgisi</h3>
                    <p><b>👤 Müşteri:</b> \${m}</p>
                    <p><b>📞 Telefon:</b> \${t}</p>
                    <p><b>📏 Ölçü:</b> \${m2} m²</p>
                    <p><b>💰 Tutar:</b> \${f} TL</p>
                    <p><b>📍 Adres:</b> \${a || 'Kayıtlı Adres Yok'}</p>
                    <p><b>📅 Tarih:</b> \${tar}</p>
                    <button class="btn" style="background:#475569; color:white; margin-top:10px;" onclick="document.getElementById('modal').style.display='none'">KAPAT</button>\`;
                document.getElementById('modal').style.display = 'flex';
            }

            async function kayitSil(id) {
                if(confirm("Bu kaydı sileyim mi Hasan Reis?")) {
                    await fetch('/sil/' + id, { method: 'DELETE' });
                    listeYukle();
                }
            }
        </script>
    </body>
    </html>
    `);
});

// 4. API - Müşteriye Mesaj Atılan Kısım (Adres Mesajdan Çıkarıldı)
app.post('/islem', async (req, res) => {
    const { musteri, telefon, m2, fiyat, adres } = req.body;
    db.run("INSERT INTO siparisler (musteri, telefon, m2, fiyat, adres) VALUES (?, ?, ?, ?, ?)", [musteri, telefon, m2, fiyat, adres], async function() {
        // Müşteriye giden mesajın içinde ADRES YOK!
        const mesaj = "Sayın " + musteri + ", " + m2 + " m2 halınız " + fiyat + " TL bedelle teslim alınmıştır. İşleminiz tamamlandığında tarafınıza bilgi verilecektir. Bizi tercih ettiğiniz için teşekkür ederiz. - VİP Halı Yıkama";
        try {
            await client.sendMessage(telefon + "@c.us", mesaj);
            res.json({ success: true });
        } catch (e) {
            res.json({ success: false });
        }
    });
});

app.get('/liste', (req, res) => {
    db.all("SELECT * FROM siparisler ORDER BY id DESC", [], (err, rows) => res.json(rows || []));
});

app.delete('/sil/:id', (req, res) => {
    db.run("DELETE FROM siparisler WHERE id = ?", req.params.id, () => res.json({ success: true }));
});

http.listen(3000, '0.0.0.0', () => { 
    console.log('🚀 VİP HALI YIKAMA SİSTEMİ ÇALIŞIYOR: http://localhost:3000'); 
});
