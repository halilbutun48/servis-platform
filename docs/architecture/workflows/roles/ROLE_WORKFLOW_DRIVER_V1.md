# ROLE WORKFLOW — DRIVER V1

## Rol amacı
Sürücü, atanan vardiyayı mobilde görür, görevi icra eder ve canlı operasyon verisini üretir.

## Ana akış

```mermaid
flowchart TD
    A[Surucu Kodu + PIN girisi]
    B[Ilk giriste PIN degisimi]
    C[Bugun ekrani]
    D[Atanmis vardiya / rota / durak ozeti]
    E[Goreve basla]
    F[Surucunun telefon GPS'i akar]
    G[Sesli rehber ve ETA]
    H[Canli operasyon devam eder]
    I[Vardiya tamamlanir]
    J[Guvenli cikis]

    A --> B --> C --> D --> E --> F --> G --> H --> I --> J
```

## Temel işleri
- güvenli giriş yapmak
- PIN değiştirmek
- o günkü görevi görmek
- rota ve durak akışını takip etmek
- sesli rehber / ETA kullanmak
- sürücünün telefon GPS'ini açık ve sağlıklı tutmak
- vardiyayı tamamlamak

## Kritik not
Bu rol, sistemin canlı operasyon verisini üreten ana saha rolüdür.
