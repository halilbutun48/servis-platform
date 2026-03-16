# ROLE WORKFLOW — SUPER_ADMIN V1

## Rol amacı
Sistem genelini yöneten üst roldür. Organizasyon, güvenlik, denetim ve bakım işlerini yönetir.

## Ana akış

```mermaid
flowchart TD
    A[SUPER_ADMIN giris]
    B[Ek guvenlik / step-up]
    C[Admin paneli]
    D[Org / rol / sistem ayarlari]
    E[Log / retention / backup / guvenlik kontrolu]
    F[Rapor ve sorun inceleme]
    G[Gerekirse mudahale]

    A --> B --> C --> D
    C --> E
    C --> F --> G
```

## Temel işleri
- sistem ayarlarını görmek ve değiştirmek
- güvenlik / retention / backup durumunu takip etmek
- audit ve operasyonel anormallikleri incelemek
- gerekirse üst seviye müdahale yapmak

## Çıktıları
- politika ve ayar değişikliği
- yönetim kararı
- denetim ve izleme kaydı
