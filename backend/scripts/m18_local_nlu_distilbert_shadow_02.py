"""Development-only DistilBERTurk encoder shadow probe.

No fine-tuning, no classifier heads, no product imports, no remote inference,
and no authorization/tenant/write fields are permitted here.
"""

from __future__ import annotations

import json
import os
import platform
import statistics
import time

import psutil
import torch
from transformers import AutoModel, AutoTokenizer


MODEL_ID = "dbmdz/distilbert-base-turkish-cased"
MODEL_REVISION = "8ecd4d034c2612d4c5940795b4f2552a9f3543d6"
CASES = [
    ("SYN-EXPLAIN-01", "Vardiya ekranını bana açıklar mısın?"),
    ("SYN-EXPLAIN-02", "Bu operasyon alanının amacı nedir?"),
    ("SYN-NAV-01", "Vardiya ekranına geçebilir misin?"),
    ("SYN-NAV-02", "Sözleşmeler sayfasını bul."),
    ("SYN-VIEW-02", "Öğrenci kaydını görüntülemek istiyorum."),
    ("SYN-VIEW-01", "Bugünkü vardiyaları gösterir misin?"),
    ("SYN-COMPARE-01", "İki sözleşmeyi kıyasla."),
    ("SYN-COMPARE-02", "Bu iki operasyon kaydını karşılaştır."),
    ("SYN-CREATE-01", "Yeni vardiya oluşturmak istiyorum."),
    ("SYN-CREATE-02", "Yeni planı başlat."),
    ("SYN-UPDATE-01", "Vardiya saatini değiştir."),
    ("SYN-CONTINUE-01", "Önceki plan açıklamasına devam edelim."),
    ("SYN-CONTINUE-02", "Kaldığımız yerden sürdürelim."),
    ("SYN-RECOVERY-01", "Bu işte kayboldum, tekrar yönlendir."),
    ("SYN-RECOVERY-02", "Bulamadım, doğru ekrana geri götür."),
    ("SYN-ROLE-01", "Şirket tarafında hangi işleri ben yürütürüm?"),
    ("SYN-ROLE-02", "Oda yönetiminde sorumluluğum nedir?"),
    ("SYN-ROLE-03", "Okul olarak hangi kararları alabilirim?"),
    ("SYN-ROLE-04", "Organizasyon kapsamımın sınırı nedir?"),
    ("SYN-ROLE-05", "Sürücü olarak hangi süreci yürütürüm?"),
    ("SYN-ROLE-06", "Personel olarak benden ne beklenir?"),
    ("SYN-ROLE-07", "Veli olarak hangi erişimim var?"),
    ("SYN-ROLE-08", "Sistem yöneticisi olarak hangi alanlardan sorumluyum?"),
    ("SYN-ASPECT-01", "Neye yetkim var, neyi yapamam?"),
    ("SYN-ASPECT-02", "Hangi süreci ben yönetirim?"),
    ("SYN-ASPECT-03", "Önce hangi alanı öğrenmeliyim?"),
    ("SYN-ASPECT-04", "Kararı kim verir, bende olan nedir?"),
    ("SYN-ASPECT-05", "Bu işin sınırı ve kısıtı nedir?"),
    ("SYN-DEICTIC-01", "Bu ekran ne işe yarıyor?"),
    ("SYN-DEICTIC-02", "Buradaki kayıtları göster."),
    ("SYN-NEGATION-01", "Bu işi yapamam; görevim nedir?"),
    ("SYN-QUESTION-01", "Bana düşen iş hangisi?"),
    ("SYN-OOS-01", "İstanbul için hava tahmini nedir?"),
    ("SYN-OOS-02", "Bir şiir yazar mısın?"),
    ("SYN-ENTITY-01", "Sözleşme kelimesi ne demek?"),
    ("SYN-UNKNOWN-01", "Bunu nasıl yorumlamalıyım?"),
]


def main() -> None:
    started = time.perf_counter()
    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_ID,
        revision=MODEL_REVISION,
        use_fast=True,
    )
    model = AutoModel.from_pretrained(
        MODEL_ID,
        revision=MODEL_REVISION,
        use_safetensors=True,
        local_files_only=False,
    )
    model.eval()
    cold_ms = (time.perf_counter() - started) * 1000
    rows = []
    with torch.inference_mode():
        for case_id, text in CASES:
            t0 = time.perf_counter()
            inputs = tokenizer(text, return_tensors="pt")
            output = model(**inputs)
            pooled = output.last_hidden_state[:, 0, :]
            rows.append({
                "caseId": case_id,
                "tokenCount": int(inputs["input_ids"].shape[-1]),
                "hiddenSize": int(pooled.shape[-1]),
                "latencyMs": (time.perf_counter() - t0) * 1000,
                "embeddingL2": float(torch.linalg.vector_norm(pooled).item()),
            })
    latencies = [row["latencyMs"] for row in rows]
    rss = psutil.Process().memory_info().rss
    print(json.dumps({
        "benchmarkId": "M18-LOCAL-TURKISH-NLU-DISTILBERT-SHADOW-02",
        "developmentOnly": True,
        "productDecisionEffect": 0,
        "remoteInference": 0,
        "modelId": MODEL_ID,
        "modelRevision": MODEL_REVISION,
        "weightsFormat": "safetensors",
        "pythonVersion": platform.python_version(),
        "torchVersion": torch.__version__,
        "coldStartMs": cold_ms,
        "meanLatencyMs": statistics.mean(latencies),
        "p50LatencyMs": statistics.median(latencies),
        "p95LatencyMs": sorted(latencies)[max(0, int(len(latencies) * 0.95) - 1)],
        "rssBytesAfterLoad": rss,
        "caseCount": len(CASES),
        "headMetrics": "NOT_RUN_INSUFFICIENT_APPROVED_TRAINING_DATA; encoder-only probe",
        "templateOverlapCount": "NOT_APPLICABLE_NO_TRAINING",
        "rows": rows,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
