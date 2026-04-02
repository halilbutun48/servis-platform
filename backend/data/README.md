# backend/data

Bu klasör runtime JSON store dosyaları için kullanılır.

Kurallar:
- runtime `.json` dosyaları repoda takip edilmez
- uygulama yoksa dosyaları kendisi yeniden oluşturur
- çoklu instance üretim kurulumlarında bu store modeli tek kaynak kabul edilmez
- kalıcı/çok yazarlı state için DB tercih edilmelidir
