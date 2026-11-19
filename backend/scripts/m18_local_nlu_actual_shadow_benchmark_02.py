"""M18 Task-12 local Turkish NLU shadow benchmark.

Development-only.  This file never imports or mutates product decision code.
It records linguistic observations for the 11 already-created frontier probes.
"""

from __future__ import annotations

import json
import os
import platform
import statistics
import time
from pathlib import Path

import stanza


CASES = [
    ("SYN-EXPLAIN-01", "COMPANY", "EXPLAIN", "Vardiya ekranını bana açıklar mısın?"),
    ("SYN-EXPLAIN-02", "ROOM", "EXPLAIN", "Bu operasyon alanının amacı nedir?"),
    ("SYN-NAV-01", "SCHOOL", "NAVIGATE", "Vardiya ekranına geçebilir misin?"),
    ("SYN-NAV-02", "ORGANIZATION", "NAVIGATE", "Sözleşmeler sayfasını bul."),
    ("SYN-VIEW-02", "PARENT", "VIEW", "Öğrenci kaydını görüntülemek istiyorum."),
    ("SYN-VIEW-01", "DRIVER", "VIEW", "Bugünkü vardiyaları gösterir misin?"),
    ("SYN-COMPARE-01", "COMPANY", "COMPARE", "İki sözleşmeyi kıyasla."),
    ("SYN-COMPARE-02", "SUPER_ADMIN", "COMPARE", "Bu iki operasyon kaydını karşılaştır."),
    ("SYN-CREATE-01", "COMPANY", "CREATE", "Yeni vardiya oluşturmak istiyorum."),
    ("SYN-CREATE-02", "ORGANIZATION", "CREATE", "Yeni planı başlat."),
    ("SYN-UPDATE-01", "COMPANY", "UPDATE", "Vardiya saatini değiştir."),
    ("SYN-CONTINUE-01", "COMPANY", "CONTINUE", "Önceki plan açıklamasına devam edelim."),
    ("SYN-CONTINUE-02", "PERSONEL", "CONTINUE", "Kaldığımız yerden sürdürelim."),
    ("SYN-RECOVERY-01", "ROOM", "RECOVERY", "Bu işte kayboldum, tekrar yönlendir."),
    ("SYN-RECOVERY-02", "SCHOOL", "RECOVERY", "Bulamadım, doğru ekrana geri götür."),
    ("SYN-ROLE-01", "COMPANY", "EXPLAIN", "Şirket tarafında hangi işleri ben yürütürüm?"),
    ("SYN-ROLE-02", "ROOM", "EXPLAIN", "Oda yönetiminde sorumluluğum nedir?"),
    ("SYN-ROLE-03", "SCHOOL", "EXPLAIN", "Okul olarak hangi kararları alabilirim?"),
    ("SYN-ROLE-04", "ORGANIZATION", "EXPLAIN", "Organizasyon kapsamımın sınırı nedir?"),
    ("SYN-ROLE-05", "DRIVER", "EXPLAIN", "Sürücü olarak hangi süreci yürütürüm?"),
    ("SYN-ROLE-06", "PERSONEL", "EXPLAIN", "Personel olarak benden ne beklenir?"),
    ("SYN-ROLE-07", "PARENT", "EXPLAIN", "Veli olarak hangi erişimim var?"),
    ("SYN-ROLE-08", "SUPER_ADMIN", "EXPLAIN", "Sistem yöneticisi olarak hangi alanlardan sorumluyum?"),
    ("SYN-ASPECT-01", "COMPANY", "EXPLAIN", "Neye yetkim var, neyi yapamam?"),
    ("SYN-ASPECT-02", "ROOM", "EXPLAIN", "Hangi süreci ben yönetirim?"),
    ("SYN-ASPECT-03", "SCHOOL", "EXPLAIN", "Önce hangi alanı öğrenmeliyim?"),
    ("SYN-ASPECT-04", "ORGANIZATION", "EXPLAIN", "Kararı kim verir, bende olan nedir?"),
    ("SYN-ASPECT-05", "DRIVER", "EXPLAIN", "Bu işin sınırı ve kısıtı nedir?"),
    ("SYN-DEICTIC-01", "COMPANY", "EXPLAIN", "Bu ekran ne işe yarıyor?"),
    ("SYN-DEICTIC-02", "ROOM", "VIEW", "Buradaki kayıtları göster."),
    ("SYN-NEGATION-01", "SCHOOL", "EXPLAIN", "Bu işi yapamam; görevim nedir?"),
    ("SYN-QUESTION-01", "PARENT", "EXPLAIN", "Bana düşen iş hangisi?"),
    ("SYN-OOS-01", "COMPANY", "NONE", "İstanbul için hava tahmini nedir?"),
    ("SYN-OOS-02", "ROOM", "NONE", "Bir şiir yazar mısın?"),
    ("SYN-ENTITY-01", "SCHOOL", "EXPLAIN", "Sözleşme kelimesi ne demek?"),
    ("SYN-UNKNOWN-01", "SUPER_ADMIN", "NONE", "Bunu nasıl yorumlamalıyım?"),
]


def rss_bytes() -> int | None:
    try:
        import psutil  # type: ignore

        return psutil.Process().memory_info().rss
    except Exception:
        return None


def observe(pipeline, row):
    case_id, role, expected_action, text = row
    started = time.perf_counter()
    document = pipeline(text)
    elapsed_ms = (time.perf_counter() - started) * 1000
    tokens = []
    sentences = []
    for sentence in document.sentences:
        sentence_rows = []
        for word in sentence.words:
            item = {
                "id": word.id,
                "text": word.text,
                "lemma": word.lemma,
                "upos": word.upos,
                "xpos": word.xpos,
                "feats": word.feats,
                "head": word.head,
                "deprel": word.deprel,
            }
            tokens.append(item)
            sentence_rows.append(item)
        sentences.append(sentence_rows)
    return {
        "caseId": case_id,
        "role": role,
        "expectedAction": expected_action,
        "tokenCount": len(tokens),
        "sentenceCount": len(sentences),
        "tokens": tokens,
        "latencyMs": elapsed_ms,
    }


def main() -> None:
    model_dir = Path(os.environ["STANZA_RESOURCES_DIR"])
    processors = "tokenize,mwt,pos,lemma,depparse"
    started = time.perf_counter()
    pipeline = stanza.Pipeline(
        lang="tr",
        processors=processors,
        dir=str(model_dir),
        tokenize_pretokenized=False,
        use_gpu=False,
        verbose=False,
    )
    cold_ms = (time.perf_counter() - started) * 1000
    warm_rows = [observe(pipeline, row) for row in CASES]
    repeated = []
    for row in CASES:
        repeated.append(observe(pipeline, row))
    latencies = [row["latencyMs"] for row in repeated]
    all_features = [
        token.get("lemma") or token.get("upos") or token.get("feats") or token.get("deprel")
        for row in warm_rows
        for token in row["tokens"]
    ]
    useful_tokens = [item for item in all_features if item]
    print(json.dumps({
        "benchmarkId": "M18-LOCAL-TURKISH-NLU-ACTUAL-SHADOW-02",
        "developmentOnly": True,
        "productDecisionEffect": 0,
        "remoteInference": 0,
        "processors": processors,
        "stanzaVersion": stanza.__version__,
        "pythonVersion": platform.python_version(),
        "platform": platform.platform(),
        "modelDir": str(model_dir),
        "caseCount": len(CASES),
        "coldStartMs": cold_ms,
        "meanLatencyMs": statistics.mean(latencies),
        "p50LatencyMs": statistics.median(latencies),
        "p95LatencyMs": sorted(latencies)[max(0, int(len(latencies) * 0.95) - 1)],
        "rssBytesAfterLoad": rss_bytes(),
        "featureCoverage": {
            "tokensWithLemmaOrPosOrMorphOrDependency": len(useful_tokens),
            "tokenCount": len(all_features),
            "ratio": (len(useful_tokens) / len(all_features)) if all_features else 0,
        },
        "firstPass": warm_rows,
        "warmPassMetrics": [{
            "caseId": row["caseId"],
            "latencyMs": row["latencyMs"],
            "tokenCount": row["tokenCount"],
        } for row in repeated],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
