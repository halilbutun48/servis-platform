# M72 GeoReview Token Hotfix

Amaç:
- Company > Personel Konum Seçici ekranındaki `token is not defined` UI hatasını kapatmak.
- Yenile butonunun `load` fonksiyonuna DOM event nesnesi göndermesini önlemek.

Değişiklik:
- `GeoReviewPanel.jsx` artık `useSession()` içinden `token` da alır.
- `Yenile` butonu `onClick={() => load()}` ile güvenli çağrı yapar.
