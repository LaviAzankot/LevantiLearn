"""
Text-to-Speech API
Primary:  OpenAI TTS (tts-1-hd, accurate Arabic, requires OPENAI_API_KEY)
Fallback: edge-tts (free, no key needed, lower quality)
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
import io, os, hashlib, logging

logger = logging.getLogger(__name__)
router = APIRouter()

AUDIO_CACHE_DIR = os.path.join(os.path.dirname(__file__), "../data/audio_cache")
os.makedirs(AUDIO_CACHE_DIR, exist_ok=True)

TTS_VOICE       = os.getenv("OPENAI_TTS_VOICE", "onyx")   # onyx is clear and neutral
EDGE_TTS_VOICE  = os.getenv("EDGE_TTS_VOICE",  "ar-EG-SalmaNeural")


def _cache_key(text: str) -> str:
    return hashlib.md5(text.encode()).hexdigest()


def _cache_path(text: str) -> str:
    return os.path.join(AUDIO_CACHE_DIR, f"{_cache_key(text)}.mp3")


def _synthesize_openai(text: str) -> bytes:
    """OpenAI TTS — accurate multilingual including Arabic."""
    from openai import OpenAI
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    response = client.audio.speech.create(
        model="tts-1-hd",
        voice=TTS_VOICE,
        input=text,
        response_format="mp3",
    )
    return response.content


async def _synthesize_edge(text: str) -> bytes:
    """edge-tts fallback — free but lower Arabic quality."""
    import edge_tts
    communicate = edge_tts.Communicate(text, voice=EDGE_TTS_VOICE)
    chunks = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            chunks.append(chunk["data"])
    if not chunks:
        raise RuntimeError("edge-tts returned no audio")
    return b"".join(chunks)


@router.get("/synthesize")
async def synthesize(text: str = Query(..., description="Arabic text to speak")):
    """Returns MP3 audio. Results are disk-cached — repeated calls are instant."""
    cache = _cache_path(text)
    if os.path.exists(cache):
        with open(cache, "rb") as f:
            data = f.read()
        return StreamingResponse(io.BytesIO(data), media_type="audio/mpeg",
                                 headers={"X-Cache": "HIT", "Access-Control-Allow-Origin": "*"})

    # Try OpenAI first, fall back to edge-tts
    data: bytes
    if os.getenv("OPENAI_API_KEY"):
        try:
            data = _synthesize_openai(text)
        except Exception as e:
            logger.warning(f"OpenAI TTS failed: {e} — falling back to edge-tts")
            data = await _synthesize_edge(text)
    else:
        logger.info("No OPENAI_API_KEY — using edge-tts")
        data = await _synthesize_edge(text)

    with open(cache, "wb") as f:
        f.write(data)

    return StreamingResponse(io.BytesIO(data), media_type="audio/mpeg",
                             headers={"X-Cache": "MISS", "Access-Control-Allow-Origin": "*"})


@router.get("/preload/{lesson_id}")
async def preload_lesson_audio(lesson_id: str):
    """Pre-generate and cache all audio for a lesson."""
    import json
    path = os.path.join(os.path.dirname(__file__), f"../data/lessons/{lesson_id}.json")
    if not os.path.exists(path):
        raise HTTPException(404, "Lesson not found")
    with open(path, encoding="utf-8") as f:
        lesson = json.load(f)

    prompts: list[str] = []
    for stage in lesson.get("stages", []):
        if stage["type"] == "vocabulary_intro":
            for w in stage.get("words", []):
                prompts.append(w["arabic"])
        elif stage["type"] == "dialogue":
            for line in stage.get("lines", []):
                prompts.append(line["arabic"])

    newly_cached = 0
    for prompt in prompts:
        if not os.path.exists(_cache_path(prompt)):
            try:
                if os.getenv("OPENAI_API_KEY"):
                    data = _synthesize_openai(prompt)
                else:
                    data = await _synthesize_edge(prompt)
                with open(_cache_path(prompt), "wb") as f:
                    f.write(data)
                newly_cached += 1
            except Exception as e:
                logger.error(f"Preload failed for '{prompt}': {e}")

    return {"lesson_id": lesson_id, "total": len(prompts), "newly_cached": newly_cached}
