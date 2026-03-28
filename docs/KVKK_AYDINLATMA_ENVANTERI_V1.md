# KVKK AYDINLATMA ENVANTERİ V1

Tarih: 2026-03-28  
Durum: M77.1 content-foundation

## Amaç
Bu dosya hangi kullanıcı grubu için hangi aydınlatma / açık rıza metni gerektiğini tek yerde toplar.

## Önemli not
Canlı sistemde bugün gerçekten aktif olan zorunlu belge akışı sınırlıdır:
- `LOCATION_NOTICE`
- `LOCATION_CONSENT`
- aktif roller: `DRIVER`, `PARENT`

Aşağıdaki envanter bunun üstüne gelecek tam kapsamlı hedefi gösterir. Yani bu dosya **envanter + hedef plan** belgesidir; tek başına enforcement değildir.

## Belge kataloğu
| Hedef kullanıcı | Belge anahtarı | Tür | Durum | Bloklayıcı mı | Kısa amaç |
|---|---|---|---|---|---|
| DRIVER | `LOCATION_NOTICE` | NOTICE | aktif | evet | sürücünün telefon GPS'i, canlı takip ve saklama süresi anlatılır |
| DRIVER | `LOCATION_CONSENT` | CONSENT | aktif | evet | canlı konum ve ilgili ekranlar için açık rıza |
| PARENT | `LOCATION_NOTICE` | NOTICE | aktif | evet | bağlı çocuk için canlı takip amacını anlatır |
| PARENT | `LOCATION_CONSENT` | CONSENT | aktif | evet | canlı takip ekranı için açık rıza |
| PERSONEL | `SERVICE_NOTICE` | NOTICE | planlanan | evet | servis eşleşmesi, durak, check-in, canlı araç yaklaşımı |
| PERSONEL | `SERVICE_TRACKING_CONSENT` | CONSENT | planlanan | koşullu | canlı yaklaşım ve public canlı link davranışı |
| COMPANY / SCHOOL / ORGANIZATION kullanıcısı | `OPERATOR_NOTICE` | NOTICE | planlanan | evet | personel/öğrenci verisi, vardiya, teklif, sözleşme, görünürlük sınırı |
| COMPANY / SCHOOL / ORGANIZATION kullanıcısı | `OPERATOR_AUDIT_NOTICE` | NOTICE | planlanan | hayır | işlem kaydı, audit, export ve erişim izi bilgisi |
| ROOM | `ROOM_OPERATOR_NOTICE` | NOTICE | planlanan | evet | sürücü, araç, rota, atama ve canlı operasyon verisi sınırı |
| ROOM | `ROOM_EXPORT_NOTICE` | NOTICE | planlanan | koşullu | log/export ekranlarında işlem izi ve amaç sınırı |
| SUPER_ADMIN | `ADMIN_PRIVILEGED_ACCESS_NOTICE` | NOTICE | planlanan | evet | ayrıcalıklı erişim, export, retention, denetim izi |

## Kanal önerisi
- Login sonrası ilk kritik giriş: notice + consent akışı
- `/shared/kvkk`: mevcut ve gelecek belge görünürlük yüzeyi
- kritik ekran bloklama: sadece gerçekten canlı çalışan belge anahtarları aktif olduğunda
- audit: her accept/revoke aksiyonu kayıt altına alınır

## Versiyonlama kuralı
- Belge metni anlamlı değişirse `docVersion` artırılır
- yeni sürüm gelince önce notice gösterilir, sonra consent gerekiyorsa tekrar alınır
- eski kabul kaydı hukuki iz olarak saklanır, ama aktif kullanım için son sürüm aranır

## M77.1 çıkışı
- hangi belge bugün aktif, hangisi planlanan netleşti
- driver ve parent dışındaki roller için belge omurgası isimlendirildi
- enforcement işi sonraki alt adımda, panel/API bazında açılacak
