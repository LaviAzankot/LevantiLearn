"""
Speech-to-Text API
Primary:  OpenAI Whisper API (whisper-1, cloud, requires OPENAI_API_KEY)
Fallback: local Whisper model (requires: pip install -r requirements-ml.txt)
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
import tempfile, os, io, logging

logger = logging.getLogger(__name__)
router = APIRouter()

_local_whisper_model = None


def _get_local_whisper():
    global _local_whisper_model
    if _local_whisper_model is None:
        try:
            import whisper
        except ImportError:
            raise RuntimeError("Local Whisper not installed. Run: pip install -r requirements-ml.txt")
        size = os.getenv("WHISPER_MODEL", "small")
        logger.info(f"Loading local Whisper model: {size}")
        _local_whisper_model = whisper.load_model(size)
    return _local_whisper_model


class TranscriptResponse(BaseModel):
    text: str
    language: str = "ar"
    confidence: float = 1.0


@router.post("/transcribe", response_model=TranscriptResponse)
async def transcribe(audio: UploadFile = File(...)):
    """
    Transcribe Arabic speech from an audio file.
    Accepts: webm, mp3, mp4, wav, m4a, ogg
    Returns: { text, language, confidence }
    """
    audio_bytes = await audio.read()
    filename    = audio.filename or "speech.webm"
    ext         = filename.rsplit(".", 1)[-1].lower()

    # ── OpenAI Whisper API (cloud) ────────────────────────────────────────
    if os.getenv("OPENAI_API_KEY"):
        try:
            import httpx
            resp = httpx.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"},
                files={"file": (filename, audio_bytes, audio.content_type or "audio/webm")},
                data={"model": "whisper-1", "language": "ar", "response_format": "text",
                      "prompt": "لهجة فلسطينية شامية. كلمات شائعة: مرحبا، كيفك، شو، هيك، عم، رح، هلق، يلا، تفضل، شكراً، من فضلك"},
                timeout=30,
            )
            resp.raise_for_status()
            return TranscriptResponse(text=resp.text.strip(), language="ar")
        except Exception as e:
            logger.warning(f"OpenAI Whisper failed: {e} — trying local model")

    # ── Local Whisper fallback ────────────────────────────────────────────
    try:
        model = _get_local_whisper()
        with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        result = model.transcribe(tmp_path, language="ar")
        os.unlink(tmp_path)
        return TranscriptResponse(text=result["text"].strip(), language="ar")
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        raise HTTPException(500, f"Transcription failed: {e}")


@router.post("/score")
async def score_pronunciation(
    audio: UploadFile = File(...),
    expected: str = Form(""),   # Form(...) required — multipart field, not query param
):
    """
    Transcribe audio and compare with expected Arabic text.
    Returns a similarity score 0-100.
    """
    result = await transcribe(audio)
    transcript = result.text

    import re

    def normalize(t: str) -> str:
        t = re.sub(r'[\u064B-\u065F\u0670]', '', t)   # strip tashkeel
        t = re.sub(r'\[.*?\]', '', t)                  # strip [placeholder] tokens
        t = re.sub(r'[^\u0600-\u06FF\s]', '', t)       # keep Arabic + spaces only
        # Hamza normalisation — all alef variants → bare alef
        t = re.sub(r'[أإآٱ]', 'ا', t)
        t = t.replace('ة', 'ه')   # taa marbuta → haa (common in spoken dialect)
        t = t.replace('ى', 'ي')   # alef maqsura → yaa
        return t.strip()

    # Greeting synonyms — treat these as equivalent
    SYNONYMS: list[set[str]] = [
        {'اهلا', 'مرحبا', 'هلا', 'هلو', 'سلام'},
        {'تشرفنا', 'شرفنا', 'فرصه سعيده', 'فرصة سعيدة'},
    ]

    def synonyms_match(a: str, b: str) -> bool:
        for group in SYNONYMS:
            if a in group and b in group:
                return True
        return False

    def word_matches(exp_word: str, got_words: list[str], got_str: str) -> bool:
        # 1. Direct match anywhere in transcript string
        if exp_word in got_str:
            return True
        for gw in got_words:
            # 2. Dialect suffix/prefix drop — one is contained in the other (≥4 chars)
            if len(gw) >= 4 and len(exp_word) >= 4:
                if gw in exp_word or exp_word in gw:
                    return True
            # 3. Synonym groups
            if synonyms_match(exp_word, gw):
                return True
        return False

    norm_got      = normalize(transcript)
    norm_expected = normalize(expected)

    got_words      = norm_got.split()
    expected_words = [w for w in norm_expected.split() if len(w) > 1]

    if not expected_words:
        score = 100.0   # only placeholders in expected — auto-pass
    else:
        matches = sum(1 for w in expected_words if word_matches(w, got_words, norm_got))
        score   = matches / len(expected_words) * 100

    return {
        "transcript": transcript,
        "expected":   expected,
        "score":      round(score),
        "passed":     score >= 50,
    }
