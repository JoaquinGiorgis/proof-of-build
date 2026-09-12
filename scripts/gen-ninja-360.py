"""Genera el giro 360 del ninja con fal.

    FAL_KEY=... python3 scripts/gen-ninja-360.py video     # turntable en MP4
    FAL_KEY=... python3 scripts/gen-ninja-360.py 3d        # malla GLB (Trellis)

El riesgo real de los dos caminos es el mismo: el texto de la base
("CÓRDOBA HACK 2026 · BUILDER") y el logo NX del pecho. Los modelos
generativos alucinan tipografía, así que lo primero que hay que mirar
del resultado es si esas dos cosas sobreviven al giro.

La clave NUNCA va en el archivo: sale de FAL_KEY.
"""

import base64
import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.request

KEY = os.environ["FAL_KEY"]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "public", "assets", "cordoba-hack-proof.png")
OUT = os.path.join(ROOT, "public", "assets", "ninja-360")

PROMPT = (
    "The golden ninja trophy rotates slowly and smoothly a full 360 degrees on its "
    "vertical axis, like a turntable product shot. The camera does not move and the "
    "object does not move up, down or sideways — only the rotation. "
    "Keep the lighting, the gold material and the engraved lettering on the base exactly "
    "as they are. Studio product photography on a pure black background, no new objects, "
    "no text changes, no camera shake, no zoom."
)

NEGATIVE = (
    "camera movement, zoom, pan, handheld shake, morphing, warping, melting, "
    "changing text, extra limbs, background objects, people, watermark"
)


def request(url, body=None, method=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method or ("POST" if data else "GET"),
        headers={"Authorization": f"Key {KEY}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as response:
        return json.load(response)


def data_uri(path):
    """fal acepta la imagen inline. Evita depender de que el sitio esté deployado."""
    mime = mimetypes.guess_type(path)[0] or "image/png"
    with open(path, "rb") as handle:
        return f"data:{mime};base64," + base64.b64encode(handle.read()).decode()


def status_base(model):
    """El status vive bajo el app id base, no bajo la ruta completa.

    Se envía a `fal-ai/kling-video/v2/master/image-to-video` pero se pregunta
    por `fal-ai/kling-video/requests/<id>/status`. Con la ruta larga contesta
    405, que es lo que costó media tarde la primera vez.
    """
    return "/".join(model.split("/")[:2])


def poll(model, request_id, label):
    base = status_base(model)
    status_url = f"https://queue.fal.run/{base}/requests/{request_id}/status"
    started = time.time()
    while True:
        state = request(status_url)
        status = state.get("status")
        if status == "COMPLETED":
            return request(f"https://queue.fal.run/{base}/requests/{request_id}")
        if status in ("FAILED", "CANCELLED"):
            raise SystemExit(f"{label}: {status}\n{json.dumps(state)[:800]}")
        print(f"  {label}: {status} ({int(time.time() - started)}s)", flush=True)
        time.sleep(6)


def download(url, filename):
    os.makedirs(OUT, exist_ok=True)
    target = os.path.join(OUT, filename)
    with urllib.request.urlopen(url) as response, open(target, "wb") as handle:
        handle.write(response.read())
    print(f"  → {target} ({os.path.getsize(target) / 1_000_000:.1f} MB)")
    return target


def run(model, payload, label):
    print(f"{label}: enviando…", flush=True)
    try:
        queued = request(f"https://queue.fal.run/{model}", payload)
    except urllib.error.HTTPError as error:
        raise SystemExit(f"{label}: HTTP {error.code}\n{error.read().decode()[:800]}")
    print(f"  request_id {queued['request_id']}", flush=True)
    return poll(model, queued["request_id"], label)


def video():
    model = "fal-ai/kling-video/v2/master/image-to-video"
    result = run(
        model,
        {
            "prompt": PROMPT,
            "negative_prompt": NEGATIVE,
            "image_url": data_uri(SOURCE),
            "duration": "5",
            "aspect_ratio": "1:1",
        },
        "video",
    )
    url = (result.get("video") or {}).get("url")
    if not url:
        raise SystemExit(f"sin video en la respuesta:\n{json.dumps(result)[:800]}")
    download(url, "ninja-360.mp4")


def three_d():
    model = "fal-ai/trellis"
    result = run(model, {"image_url": data_uri(SOURCE)}, "3d")
    url = (result.get("model_mesh") or {}).get("url")
    if not url:
        raise SystemExit(f"sin malla en la respuesta:\n{json.dumps(result)[:800]}")
    download(url, "ninja.glb")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "video"
    {"video": video, "3d": three_d}[mode]()
