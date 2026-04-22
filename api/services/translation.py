import logging
import os
import threading

try:
    import requests
except ImportError:  # pragma: no cover - depends on runtime environment
    requests = None

from api.db import get_cursor

logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES = {
    "english": "en",
    "spanish": "es",
    "chinese": "zh-CN",
}

LANGUAGE_ALIASES = {
    "en": "english",
    "en-us": "english",
    "english": "english",
    "es": "spanish",
    "es-es": "spanish",
    "spanish": "spanish",
    "zh": "chinese",
    "zh-cn": "chinese",
    "chinese": "chinese",
}

TRANSLATION_PROVIDER = os.environ.get(
    "TRANSLATION_PROVIDER",
    "google_gtx",
).strip().lower()
TRANSLATION_TIMEOUT_SECONDS = float(
    os.environ.get("TRANSLATION_TIMEOUT_SECONDS", "5"),
)
GOOGLE_GTX_URL = os.environ.get(
    "GOOGLE_GTX_URL",
    "https://translate.googleapis.com/translate_a/single",
).strip()
LIBRETRANSLATE_URL = os.environ.get("LIBRETRANSLATE_URL", "").strip()
LIBRETRANSLATE_API_KEY = os.environ.get("LIBRETRANSLATE_API_KEY", "").strip()

_CACHE_TABLE_READY = False
_CACHE_TABLE_LOCK = threading.Lock()


def normalize_language(language):
    key = str(language or "english").strip().lower()
    return LANGUAGE_ALIASES.get(key, "english")


def localize_entity_rows(rows, entity_type, fields, language):
    language = normalize_language(language)
    fields = tuple(fields or ())

    localized_rows = [dict(row) for row in rows]
    for row in localized_rows:
        for field in fields:
            row[_display_field_name(field)] = row.get(field)

    if language == "english" or not localized_rows or not fields:
        return localized_rows

    cached_rows = _load_cached_translations(
        entity_type,
        [row.get("id") for row in localized_rows if row.get("id") is not None],
        fields,
        language,
    )

    resolved_text = {}
    pending_cache_writes = []

    for row in localized_rows:
        entity_id = row.get("id")
        for field in fields:
            source_text = row.get(field)
            if not source_text:
                continue

            display_field = _display_field_name(field)
            cache_key = (entity_id, field)
            cached = cached_rows.get(cache_key)
            if cached and cached["source_text"] == source_text:
                row[display_field] = cached["translated_text"]
                continue

            text_key = (field, source_text)
            if text_key not in resolved_text:
                resolved_text[text_key] = _translate_text(source_text, language)

            translated_text, provider = resolved_text[text_key]
            row[display_field] = translated_text

            if provider and entity_id is not None:
                pending_cache_writes.append(
                    {
                        "entity_type": entity_type,
                        "entity_id": entity_id,
                        "field": field,
                        "language": language,
                        "source_text": source_text,
                        "translated_text": translated_text,
                        "provider": provider,
                    },
                )

    _upsert_translations(pending_cache_writes)
    return localized_rows


def _display_field_name(field):
    return f"display{field[:1].upper()}{field[1:]}"


def _translate_text(text, language):
    if TRANSLATION_PROVIDER == "none":
        return text, None

    if requests is None:
        logger.warning("requests is not installed; automatic translation is disabled")
        return text, None

    try:
        if TRANSLATION_PROVIDER == "libretranslate":
            translated = _translate_via_libretranslate(text, language)
            return translated or text, "libretranslate" if translated else None

        translated = _translate_via_google_gtx(text, language)
        return translated or text, "google_gtx" if translated else None
    except Exception as exc:
        logger.warning("translation lookup failed for %r: %s", text, exc)
        return text, None


def _translate_via_google_gtx(text, language):
    target = SUPPORTED_LANGUAGES[language]
    response = requests.get(
        GOOGLE_GTX_URL,
        params={
            "client": "gtx",
            "sl": "en",
            "tl": target,
            "dt": "t",
            "q": text,
        },
        timeout=TRANSLATION_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    payload = response.json()
    return "".join(
        chunk[0]
        for chunk in payload[0]
        if isinstance(chunk, list) and chunk and chunk[0]
    ).strip()


def _translate_via_libretranslate(text, language):
    if not LIBRETRANSLATE_URL:
        return None

    url = LIBRETRANSLATE_URL
    if not url.endswith("/translate"):
        url = f"{url.rstrip('/')}/translate"

    payload = {
        "q": text,
        "source": "en",
        "target": SUPPORTED_LANGUAGES[language],
        "format": "text",
    }
    if LIBRETRANSLATE_API_KEY:
        payload["api_key"] = LIBRETRANSLATE_API_KEY

    response = requests.post(
        url,
        json=payload,
        timeout=TRANSLATION_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    body = response.json()
    return str(body.get("translatedText") or "").strip() or None


def _ensure_cache_table():
    global _CACHE_TABLE_READY
    if _CACHE_TABLE_READY:
        return

    with _CACHE_TABLE_LOCK:
        if _CACHE_TABLE_READY:
            return

        with get_cursor(commit=True) as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS translated_text_cache (
                    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    entity_type VARCHAR(50) NOT NULL,
                    entity_id INT NOT NULL,
                    field VARCHAR(50) NOT NULL,
                    language VARCHAR(20) NOT NULL,
                    source_text TEXT NOT NULL,
                    translated_text TEXT NOT NULL,
                    provider VARCHAR(50),
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    UNIQUE (entity_type, entity_id, field, language)
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS ix_translated_text_cache_lookup
                ON translated_text_cache (entity_type, language, entity_id, field)
                """
            )

        _CACHE_TABLE_READY = True


def _load_cached_translations(entity_type, entity_ids, fields, language):
    if not entity_ids:
        return {}

    try:
        _ensure_cache_table()
        with get_cursor() as cur:
            cur.execute(
                """
                SELECT entity_id, field, source_text, translated_text
                FROM translated_text_cache
                WHERE entity_type = %s
                  AND language = %s
                  AND entity_id = ANY(%s)
                  AND field = ANY(%s)
                """,
                (entity_type, language, list(entity_ids), list(fields)),
            )
            rows = cur.fetchall()
    except Exception as exc:
        logger.warning("translation cache read failed: %s", exc)
        return {}

    return {
        (row[0], row[1]): {
            "source_text": row[2],
            "translated_text": row[3],
        }
        for row in rows
    }


def _upsert_translations(entries):
    if not entries:
        return

    try:
        _ensure_cache_table()
        with get_cursor(commit=True) as cur:
            for entry in entries:
                cur.execute(
                    """
                    INSERT INTO translated_text_cache (
                        entity_type,
                        entity_id,
                        field,
                        language,
                        source_text,
                        translated_text,
                        provider
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (entity_type, entity_id, field, language)
                    DO UPDATE SET
                        source_text = EXCLUDED.source_text,
                        translated_text = EXCLUDED.translated_text,
                        provider = EXCLUDED.provider,
                        updated_at = NOW()
                    """
                    ,
                    (
                        entry["entity_type"],
                        entry["entity_id"],
                        entry["field"],
                        entry["language"],
                        entry["source_text"],
                        entry["translated_text"],
                        entry["provider"],
                    ),
                )
    except Exception as exc:
        logger.warning("translation cache write failed: %s", exc)
