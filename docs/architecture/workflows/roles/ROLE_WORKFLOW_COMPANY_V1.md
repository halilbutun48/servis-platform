# ROLE WORKFLOW — COMPANY V1

## Rol amacı
Şirket, taşıma ihtiyacını oluşturan ve kendi operasyonunun sonucunu takip eden roldür.

## Ana akış

```mermaid
flowchart TD
    A[COMPANY giris]
    B[Yeni is / vardiya ac]
    C[Personel / saat / lokasyon bilgisi gir]
    D[Sisteme gonder]
    E[ROOM inceleme ve planlama]
    F[Durum / atama geri gelir]
    G[Onay / duzeltme / takip]
    H[Vardiya tamamlanir]

    A --> B --> C --> D --> E --> F --> G --> H
```

## Temel işleri
- taşıma ihtiyacı açmak
- vardiya zamanını ve hedef bilgisini girmek
- kendi personelini ve taşıma bilgisini yönetmek
- sonucu, onayı ve operasyon görünürlüğünü takip etmek

## Çıktıları
- yeni iş talebi
- güncellenmiş iş talebi
- operasyon görünürlüğü ve onay kararı
