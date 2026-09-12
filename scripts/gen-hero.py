import json, os, sys, time, urllib.request, urllib.error

KEY = os.environ["FAL_KEY"]
MODEL = "fal-ai/nano-banana-2"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "assets", "hero-candidates")
os.makedirs(OUT, exist_ok=True)

BASE = ("Ultra-premium 3D product render, single hero object floating in the center of the frame against a PURE SOLID BLACK background (#000000, no gradient, no floor, no horizon). "
 "STRICTLY MONOCHROME: black, graphite, gunmetal and white only, absolutely no colored light, no blue, no purple, no gold. "
 "Material: black liquid chrome and smoked black glass, mirror-like, with crisp white specular highlights, soft white rim light from the upper left, subtle refraction and internal reflections. "
 "A few faint wisps of dark smoke drift around the object. Studio product photography feel, octane-style render, shallow depth of field, fine analog film grain. "
 "The object occupies about 60% of the frame height, centered, with generous empty black space around it. "
 "CRITICAL: no text, no lettering, no logos, no UI, no watermark, no people, no hands.")

PROMPTS = {
  "seal": ("Object: a heavy circular seal / medallion of black liquid chrome, thick beveled edge with fine concentric machined ridges, a slightly domed mirror-black face with one softly embossed abstract checkmark stroke, tilted about 20 degrees toward the camera as if suspended mid-air, a single drip of liquid chrome hanging from its lower edge. " + BASE),
  "monolith": ("Object: a tall rounded-rectangle slab of smoked black glass, proportioned like a credential card standing upright and floating, edges catching a single sharp white light streak, a thin sheet of black liquid chrome wrapping and dripping over its top corner, faint internal refraction. " + BASE),
  "knot": ("Object: an abstract organic form of black liquid chrome, a smooth flowing torus-knot-like loop, seamless and glossy, catching long white specular reflections along its curves, one droplet detaching in mid-air. " + BASE),
}

def req(url, body=None):
    r = urllib.request.Request(url, data=json.dumps(body).encode() if body else None,
        headers={"Authorization": f"Key {KEY}", "Content-Type": "application/json"})
    with urllib.request.urlopen(r) as resp: return json.load(resp)

def main():
    names = sys.argv[1:] or list(PROMPTS)
    subs = {}
    for n in names:
        body = {"prompt": PROMPTS[n], "aspect_ratio": "4:5", "resolution": "2K", "output_format": "png", "num_images": 2}
        try:
            j = req(f"https://queue.fal.run/{MODEL}", body); subs[n] = j; print(n, "submitted", j.get("request_id"), flush=True)
        except urllib.error.HTTPError as e:
            print(n, "HTTP", e.code, e.read().decode()[:600], flush=True)
    done = {}
    while len(done) < len(subs):
        for n, s in subs.items():
            if n in done: continue
            st = req(s["status_url"])
            if st.get("status") == "COMPLETED":
                res = req(s["response_url"]); paths = []
                for i, im in enumerate(res["images"]):
                    p = os.path.join(OUT, f"{n}_v{i+1}.png"); urllib.request.urlretrieve(im["url"], p); paths.append(p)
                done[n] = paths; print(n, "DONE", paths, flush=True)
            elif st.get("status") not in ("IN_QUEUE", "IN_PROGRESS"):
                print(n, "STATUS", st, flush=True); done[n] = []
        time.sleep(4)

main()
