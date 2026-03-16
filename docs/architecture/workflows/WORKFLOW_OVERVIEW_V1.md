# WORKFLOW OVERVIEW V1

Last updated: **2026-03-16**

Bu belge, PERSONEL SERVİS V1 için uçtan uca ortak iş akışını anlatır.

## 1) Uçtan uca ana akış

```mermaid
flowchart LR
    subgraph C1[COMPANY]
      A1[Is / vardiya ihtiyaci olustur]
      A2[Bilgi girisi ve gonderim]
    end

    subgraph R1[ROOM]
      B1[Inceleme]
      B2[Arac / surucu planlama]
      B3[Atama / operasyon karari]
    end

    subgraph D1[DRIVER]
      C1A[Bugun ekraninda gorevi gor]
      C1B[Goreve basla]
      C1C[Sesli rehber / ETA]
    end

    subgraph SYS[SYSTEM]
      S1[API kaydi]
      S2[WS / bildirim]
      S3[GPS update]
      S4[Log / audit]
    end

    A1 --> A2 --> S1 --> B1 --> B2 --> B3 --> S2 --> C1A --> C1B --> S3 --> C1C --> S4
```

## 2) Kim ne yapar?

### COMPANY
- taşıma ihtiyacını açar
- personel / saat / adres / vardiya bilgisini girer
- sonucu ve durumu izler

### ROOM
- operasyon merkezi gibi davranır
- işin planını yapar
- araç ve sürücü seçer
- gerekirse yeniden planlar

### DRIVER
- atanan görevi mobilde görür
- göreve başlar
- sürücünün telefon GPS'i ile canlı veri üretir
- rota / durak / ETA takibi yapar

### SYSTEM
- veriyi kaydeder
- canlı güncellemeyi dağıtır
- denetim izi bırakır

## 3) Yardımcı ortak akışlar

### 3.1 Kimlik doğrulama
```mermaid
flowchart TD
    A[Giris istegi]
    B[Auth kontrolu]
    C[Rol belirleme]
    D[Token / refresh]
    E[Gerekirse deviceId kontrolu]
    F[Gerekirse ek guvenlik adimi]
    G[Panel / mobil erisimi]

    A --> B --> C --> D --> E --> F --> G
```

### 3.2 Canlı durum ve bildirim
```mermaid
flowchart LR
    D[Driver mobil]
    A[API]
    W[WS Hub]
    R[Room panel]
    C[Company panel]
    P[Personel gorunurlugu]

    D --> A --> W --> R
    W --> C
    W --> P
```

## 4) Rol bazlı detaylar

Detay belgeler:
- `roles/ROLE_WORKFLOW_SUPER_ADMIN_V1.md`
- `roles/ROLE_WORKFLOW_ROOM_V1.md`
- `roles/ROLE_WORKFLOW_COMPANY_V1.md`
- `roles/ROLE_WORKFLOW_DRIVER_V1.md`
- `roles/ROLE_WORKFLOW_PERSONEL_V1.md`
