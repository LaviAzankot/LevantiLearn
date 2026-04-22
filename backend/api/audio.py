"""
Short UI feedback sounds — generated with Python's wave module.
Served as audio/wav so the frontend can play them without TTS.
"""

import io, math, struct, wave
from fastapi import APIRouter
from fastapi.responses import Response

router = APIRouter()

def _beep(freqs: list[tuple[float, float]], *, sample_rate: int = 22050, volume: float = 0.45) -> bytes:
    """Generate a WAV composed of sequential tones. freqs = [(hz, seconds), ...]"""
    buf = io.BytesIO()
    all_frames: list[bytes] = []
    for freq, duration in freqs:
        n = int(sample_rate * duration)
        for i in range(n):
            t = i / sample_rate
            fade = min(1.0, t / 0.01) * min(1.0, (duration - t) / 0.03)
            sample = math.sin(2 * math.pi * freq * t) * volume * fade
            all_frames.append(struct.pack('<h', max(-32767, min(32767, int(sample * 32767)))))
    with wave.open(buf, 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sample_rate)
        f.writeframes(b''.join(all_frames))
    return buf.getvalue()


# Pre-generate once at import time
_CORRECT  = _beep([(880, 0.08), (1320, 0.18)], volume=0.42)           # bright two-note ding
_WRONG    = _beep([(200, 0.18), (160, 0.18)], volume=0.40)             # low descending thud
_COMPLETE = _beep([(660, 0.12), (880, 0.12), (1100, 0.28)], volume=0.45)  # ascending fanfare


@router.get("/correct")
def correct_sound():
    return Response(_CORRECT, media_type="audio/wav", headers={"Cache-Control": "max-age=86400"})


@router.get("/wrong")
def wrong_sound():
    return Response(_WRONG, media_type="audio/wav", headers={"Cache-Control": "max-age=86400"})


@router.get("/complete")
def complete_sound():
    return Response(_COMPLETE, media_type="audio/wav", headers={"Cache-Control": "max-age=86400"})
