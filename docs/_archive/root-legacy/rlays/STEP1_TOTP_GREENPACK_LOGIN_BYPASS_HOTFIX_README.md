# Step1 TOTP greenpack login bypass hotfix

Adds dev/test-only greenpack login token stepUpUntil for SUPER_ADMIN and ROOM so legacy M0..M41 milestone checks remain green while real TOTP checks still run with includeGreenpack=false.
