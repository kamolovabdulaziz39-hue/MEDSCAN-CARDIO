# MEDSCAN CARDIO Android App Wrapper

Ushbu katalogda MEDSCAN CARDIO ilovasining Android telefonlari uchun mo'ljallangan mobil dastur loyihasi (Android Studio Wrapper) joylagan.

## Loyiha Xususiyatlari:
1. **WebView Integratsiyasi**: Kompyuterdagi mahalliy serveringizga (`http://192.168.1.42:8000`) avtomatik ulanadi.
2. **Kamera Ruxsatnomalari**: EKG suratlarini olish uchun telefondan maxsus kamera ruxsatnomalarini (`Manifest.permission.CAMERA`) avtomatik boshqaradi va so'raydi.
3. **Standlone Rejim**: Dastur telefonda brauzersiz, to'liq ekranli mobil ilova shaklida ochiladi.

## Qanday qilib APK faylini olish mumkin:

1. **Android Studio** dasturini yuklab oling va kompyuteringizga o'rnating.
2. Android Studio orqali ushbu `medscan-cardio-android` katalogini oching (`Open project`).
3. Dastur sinxronizatsiya (Gradle Sync) bo'lgandan so'ng, yuqori menyudan:
   - **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)** tugmasini bosing.
4. Android Studio loyihani avtomatik tarzda APK formatiga o'tkazib beradi.
5. Tayyor bo'lgan `.apk` faylini telefoningizga o'tkazib, o'rnating!
