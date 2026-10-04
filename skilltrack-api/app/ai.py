"""Thin wrapper around the Gemini API that returns validated, structured output."""
import logging
import re
import time

from fastapi import HTTPException, status
from google import genai
from google.genai import errors, types
from pydantic import BaseModel

from .config import GEMINI_API_KEY, GEMINI_FALLBACK_MODELS, GEMINI_MODEL

log = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are an academic advisor for an engineering college's skill-certification platform. "
    "Be specific, concise and encouraging. Use only the data provided and never invent scores or facts "
    "about the student. If the data is limited, say so plainly."
)

_client: genai.Client | None = None

MAX_TRIES = 2  # one retry when Gemini is briefly overloaded (503) or rate-limited (429 with a short wait)


def _retry_wait(err: errors.APIError) -> float | None:
    """Seconds to wait before retrying, or None if the error is not worth retrying."""
    if err.code == 503:
        return 3.0
    if err.code == 429:
        match = re.search(r"retry in ([\d.]+)s", str(err.message or ""))
        if match and float(match.group(1)) <= 25:
            return float(match.group(1)) + 1
    return None


def _get_client() -> genai.Client:
    global _client
    if not GEMINI_API_KEY:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "AI is not configured. Add GEMINI_API_KEY to the API's .env file and restart the server.",
        )
    if _client is None:
        _client = genai.Client(api_key=GEMINI_API_KEY, http_options=types.HttpOptions(timeout=45_000))
    return _client


def generate(prompt: str, schema: type[BaseModel]) -> BaseModel:
    client = _get_client()
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        response_mime_type="application/json",
        response_schema=schema,
        temperature=0.4,
    )
    models = [GEMINI_MODEL, *[m for m in GEMINI_FALLBACK_MODELS if m != GEMINI_MODEL]]
    try:
        for i, model in enumerate(models):
            last_model = i == len(models) - 1
            try:
                for attempt in range(MAX_TRIES):
                    try:
                        response = client.models.generate_content(model=model, contents=prompt, config=config)
                        break
                    except errors.APIError as err:
                        wait = _retry_wait(err)
                        if wait is None or attempt == MAX_TRIES - 1:
                            raise
                        log.warning("Gemini error %s on %s, retrying in %.0fs", err.code, model, wait)
                        time.sleep(wait)
                break
            except errors.APIError as err:
                # Overloaded / rate-limited main model: fall back to the next one. A missing fallback is skipped.
                if last_model or err.code not in (503, 429) and not (err.code == 404 and i > 0):
                    raise
                log.warning("Gemini %s failed with %s, trying %s", model, err.code, models[i + 1])
    except errors.APIError as err:
        log.warning("Gemini API error %s: %s", err.code, err.message)
        if err.code == 503:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "The AI service is overloaded right now. Try again in a minute.")
        if err.code == 429:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "The AI service is busy or out of quota. Try again in a minute.")
        if err.code == 404:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, f"The AI model '{model}' is not available. Change GEMINI_MODEL (or GEMINI_FALLBACK_MODELS) in the API's .env file.")
        if err.code in (400, 401, 403):
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "The AI service rejected the request. Check GEMINI_API_KEY and GEMINI_MODEL.")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "The AI service failed. Try again shortly.")
    except Exception:
        log.exception("Unexpected Gemini failure")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "The AI service could not be reached. Try again shortly.")

    if response.parsed is None:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "The AI returned an unusable answer. Try again.")
    return response.parsed
