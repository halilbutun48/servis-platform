# M81 Release / Env Runbook

Bu dosya M81 mobil sertlestirme asamasinda release ve environment disiplinini tek bakista kontrol etmek icin tutulur.

## Temel kurallar
- Preview / internal build icin disaridan erisilebilen HTTPS backend adresi gerekir.
- Localhost veya gecici kapanmis tunnel adresleri gercek cihaz testinde kullanilmaz.
- `EXPO_PUBLIC_*` degiskenleri build aninda uygulamaya gomulur; degisirse yeniden build alinmalidir.
- `package.json` ve `app.json` surumu ayni kalmalidir.
- iOS ve Android build profilleri birlikte korunmalidir.

## M81 icin hizli dogrulama
1. `npm run check:m81.2`
2. `npm run check:m81.2b`
3. `npm run check:m81.3`
4. `npm run check:m81.4`
5. `npx expo-doctor`

## Not
Gercek cihazda `Network request failed` goruluyorsa once build profile icindeki `EXPO_PUBLIC_API_BASE_URL` degerinin ulasilabilir olup olmadigini kontrol et.