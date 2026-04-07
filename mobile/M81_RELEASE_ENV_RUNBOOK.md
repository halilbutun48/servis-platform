# M82.6 Release / Env / Acceptance Runbook

Bu dosya mobil release ve environment disiplinini tek bakista kontrol etmek icin tutulur.

## Temel kurallar
- Preview / internal build icin disaridan erisilebilen HTTPS backend adresi gerekir.
- Localhost, 127.0.0.1, ozel ag IP'leri ve placeholder adresler gercek cihaz kabul testinde kullanilmaz.
- `EXPO_PUBLIC_*` degiskenleri build aninda uygulamaya gomulur; degisirse yeniden build alinmalidir.
- `package.json` ve `app.json` surumu ayni kalmalidir.
- iOS ve Android build profilleri birlikte korunmalidir.
- `eas.json` icindeki API taban adresleri build almadan once gercek HTTPS host ile degistirilmelidir.

## M82.6 icin hizli dogrulama
1. `npm run check:m81.2`
2. `npm run check:m81.4`
3. `npm run check:m82.4`
4. `npm run check:m82.5`
5. `npm run check:m82.6`
6. `npm run acceptance:mobile`
7. `npx expo-doctor`

## Kabuldan once zorunlu bakis
- Login ekranindaki `Release / env kabul kontrolu` karti `READY` olmali.
- Bugun ekranindaki `Release hazirligi` kartinda blocking issue kalmamali.
- API host placeholder veya localhost gorunmemeli.
- Timeout ve release stage build profiline uygun olmali.

## Not
Gercek cihazda `Network request failed` goruluyorsa once build profile icindeki `EXPO_PUBLIC_API_BASE_URL` degerinin ulasilabilir olup olmadigini kontrol et.
