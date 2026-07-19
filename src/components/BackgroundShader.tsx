/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';

export default function BackgroundShader() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext;
    } catch (e) {
      console.error('WebGL not supported', e);
    }
    if (!gl) return;

    // Vertex Shader Source
    const vsSource = `
      attribute vec2 position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    // Fragment Shader Source
    const fsSource = `
      precision highp float;
      varying vec2 v_texCoord;
      uniform float u_time;
      uniform vec2 u_resolution;

      void main() {
        vec2 uv = v_texCoord;
        float t = u_time * 0.12;
        
        // Procedural fluid background for Color Finder (Bento Grid Theme)
        vec3 color1 = vec3(0.0, 0.94, 1.0); // Neon Cyan #00F0FF
        vec3 color2 = vec3(0.31, 0.18, 1.0); // Neon Indigo #4F2EFF
        vec3 bg = vec3(0.007, 0.015, 0.05); // Deep Slate-950 #020617
        
        vec2 p1 = vec2(0.5 + 0.35 * cos(t * 1.1), 0.5 + 0.35 * sin(t * 1.3));
        vec2 p2 = vec2(0.5 + 0.35 * cos(t * 0.9 + 2.0), 0.5 + 0.35 * sin(t * 1.0 + 3.0));
        
        float d1 = length(uv - p1);
        float d2 = length(uv - p2);
        
        float f1 = 0.45 / (1.0 + d1 * 5.5);
        float f2 = 0.45 / (1.0 + d2 * 5.5);
        
        vec3 finalColor = mix(bg, color1, f1);
        finalColor = mix(finalColor, color2, f2);
        
        // Add noise grain for premium texture
        float noise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
        finalColor += (noise - 0.5) * 0.015;
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    // Helper to compile shaders
    function compileShader(source: string, type: number): WebGLShader | null {
      const shader = gl!.createShader(type);
      if (!shader) return null;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl!.getShaderInfoLog(shader));
        gl!.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = compileShader(vsSource, gl.VERTEX_SHADER);
    const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    // Program Setup
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    // Quad Geometry
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, 'u_time');
    const uResolution = gl.getUniformLocation(program, 'u_resolution');

    // Handle resizing
    function handleResize() {
      if (!canvas || !gl) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    }

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(canvas);
    }
    handleResize();

    // Render loop
    let animationFrameId: number;
    function render(time: number) {
      if (!gl) return;
      gl.useProgram(program);
      gl.uniform1f(uTime, time * 0.001);
      if (uResolution) {
        gl.uniform2f(uResolution, canvas!.width, canvas!.height);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (gl && program) {
        gl.deleteProgram(program);
      }
      if (gl && vs) gl.deleteShader(vs);
      if (gl && fs) gl.deleteShader(fs);
      if (gl && buffer) gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <canvas
      id="bg-fluid-shader"
      ref={canvasRef}
      className="fixed inset-0 w-full h-full object-cover z-0 opacity-60 pointer-events-none"
      style={{ background: '#020617' }}
    />
  );
}
