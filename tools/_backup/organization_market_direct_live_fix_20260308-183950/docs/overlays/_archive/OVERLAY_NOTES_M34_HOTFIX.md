M34 HOTFIX — pendingFocusSet is not defined

Fix:
- Company ShiftsPanel: finalItems filter zincirinde yanlışlıkla pendingFocusSet kullanılmıştı. pendingFocusSet sadece pendingItems memo scope'unda tanımlı olduğu için runtime ReferenceError üretiyordu.
- finalItems artık pendingFocusSet ile filtrelenmiyor (final liste filtre kriterleri: onlyAgreement + finalStatus + finalQ).
