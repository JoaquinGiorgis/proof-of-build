"use client";

import { useEffect, useRef } from "react";

/**
 * POB · Liquid Black — the hero shader.
 *
 * Domain-warped fbm height field, normal from the height gradient, then
 * Blinn-Phong specular (pow 64) + sheen (pow 8) + a Fresnel rim. Monochrome:
 * base 0.012 + H·0.035, vignetted to the edges, fine grain on top.
 *
 * Pointer shifts the light position ±25% and the surface offset ±6%.
 * Mobile drops to 3 octaves, renders at half resolution and ignores the mouse.
 * Reduced motion renders a single static frame.
 *
 * Figma reference: shader fill "POB · Liquid Black"
 * e33b824a-80d2-4925-9254-3dd4e13d8c83.
 */

const VERTEX_SHADER = /* glsl */ `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShader = (octaves: number) => /* glsl */ `
precision highp float;

uniform vec2  u_resolution;
uniform float u_time;
uniform vec2  u_pointer;   // -1..1, smoothed
uniform float u_speed;
uniform float u_scale;
uniform float u_depth;
uniform float u_specular;
uniform float u_grain;

// -- value noise -------------------------------------------------------------

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < ${octaves}; i++) {
    sum += amp * noise(p);
    p = rot * p * 2.02;
    amp *= 0.5;
  }
  return sum;
}

// Domain warp: fbm of an fbm-displaced sample point. This is what gives the
// field its poured-liquid folds instead of generic cloud noise.
float height(vec2 p, float t) {
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.15)), fbm(p + vec2(5.2, 1.3 - t * 0.1)));
  vec2 r = vec2(
    fbm(p + 3.4 * q + vec2(1.7 + t * 0.12, 9.2)),
    fbm(p + 3.4 * q + vec2(8.3, 2.8 - t * 0.09))
  );
  return fbm(p + 3.0 * r);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

  float t = u_time * u_speed;
  vec2 p = uv * u_scale + u_pointer * 0.06; // surface offset ±6%

  // Height + gradient-derived normal. The epsilon lives in noise space, not
  // pixel space: tying it to the pixel makes the normal a per-pixel random
  // number and the specular term turns into white speckle.
  const float e = 0.02;
  float h  = height(p, t);
  float hx = height(p + vec2(e, 0.0), t);
  float hy = height(p + vec2(0.0, e), t);
  vec3 normal = normalize(vec3((h - hx) * u_depth, (h - hy) * u_depth, e));

  vec3 view = vec3(0.0, 0.0, 1.0);
  vec3 light = normalize(vec3(-0.45 + u_pointer.x * 0.25, 0.75 + u_pointer.y * 0.25, 0.65));
  vec3 halfway = normalize(light + view);

  float spec  = pow(max(dot(normal, halfway), 0.0), 64.0) * u_specular;
  float sheen = pow(max(dot(normal, halfway), 0.0), 8.0);
  float fresnel = pow(1.0 - max(dot(normal, view), 0.0), 3.0);

  // Monochrome: base 0.012 + H·0.035. The lighting terms are scaled into the
  // same range — this is a black plate that catches light, not a chrome
  // texture. Anything brighter and the hero type stops being readable.
  float lum = 0.012 + h * 0.030 + spec * 0.095 + sheen * 0.022 + fresnel * 0.016;

  // Light pools where the light comes from and falls away to the edges, so the
  // plate melts into the page background.
  vec2 pool = uv - vec2(light.x, -light.y) * 0.35;
  float falloff = smoothstep(1.25, 0.15, length(pool));
  float vignette = smoothstep(1.2, 0.3, length(uv));
  lum *= mix(0.35, 1.0, falloff) * vignette;

  // Fine grain — breaks the banding that 8-bit near-black gradients produce.
  float grain = (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * u_grain;
  lum += grain;

  gl_FragColor = vec4(vec3(max(lum, 0.0)), 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("[liquid-black]", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function LiquidBlack({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const program = gl.createProgram();
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentShader(isMobile ? 3 : 5));
    if (!program || !vs || !fs) return;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("[liquid-black]", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const positionLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const u = {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      time: gl.getUniformLocation(program, "u_time"),
      pointer: gl.getUniformLocation(program, "u_pointer"),
      speed: gl.getUniformLocation(program, "u_speed"),
      scale: gl.getUniformLocation(program, "u_scale"),
      depth: gl.getUniformLocation(program, "u_depth"),
      specular: gl.getUniformLocation(program, "u_specular"),
      grain: gl.getUniformLocation(program, "u_grain"),
    };

    gl.uniform1f(u.speed, 0.35);
    gl.uniform1f(u.scale, 1.6);
    gl.uniform1f(u.depth, 0.45);
    gl.uniform1f(u.specular, 1.0);
    gl.uniform1f(u.grain, 0.014);

    // Half-res on a phone, capped at 2x elsewhere. Read per resize rather than
    // once at mount: a window dragged from narrow to wide would otherwise keep
    // rendering at the old scale and upsample a quarter-size canvas.
    const scaleFactor = () =>
      window.matchMedia("(max-width: 767px)").matches
        ? 0.5
        : Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const dprCap = scaleFactor();
      const { clientWidth: w, clientHeight: h } = canvas;
      const width = Math.max(1, Math.floor(w * dprCap));
      const height = Math.max(1, Math.floor(h * dprCap));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      gl.uniform2f(u.resolution, canvas.width, canvas.height);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const pointer = { x: 0, y: 0 };
    const smoothed = { x: 0, y: 0 };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = 1 - ((event.clientY - rect.top) / rect.height) * 2;
    };
    if (!isMobile && !reduced) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    // Pause while offscreen — a hero shader running behind five sections of
    // scrolled content is pure battery drain.
    let visible = true;
    const visibility = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !reduced) frame = requestAnimationFrame(render);
      },
      { threshold: 0 },
    );
    visibility.observe(canvas);

    let frame = 0;
    const start = performance.now();

    const render = (now: number) => {
      smoothed.x += (pointer.x - smoothed.x) * 0.05;
      smoothed.y += (pointer.y - smoothed.y) * 0.05;
      gl.uniform2f(u.pointer, smoothed.x, smoothed.y);
      gl.uniform1f(u.time, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (visible) frame = requestAnimationFrame(render);
    };

    if (reduced) {
      // One static frame, seeded so it is not a flat plate.
      gl.uniform2f(u.pointer, 0, 0);
      gl.uniform1f(u.time, 12);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      frame = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
