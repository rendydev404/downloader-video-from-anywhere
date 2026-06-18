const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER:', msg.text()));

  await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.log("No webgl context");
      return;
    }

    const fsSource = `
  precision highp float;

  uniform vec2 u_resolution;
  uniform float u_time;
  
  // Simple 2D hash for noise
  vec2 hash(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  // 2D Simplex Noise
  float noise(vec2 p) {
      const float K1 = 0.366025404; // (sqrt(3)-1)/2;
      const float K2 = 0.211324865; // (3-sqrt(3))/6;

      vec2 i = floor(p + (p.x + p.y) * K1);
      vec2 a = p - i + (i.x + i.y) * K2;
      float m = step(a.y, a.x);
      vec2 o = vec2(m, 1.0 - m);

      vec2 b = a - o + vec2(K2);
      vec2 c = a - vec2(1.0) + vec2(2.0 * K2);

      vec3 h = max(vec3(0.5) - vec3(dot(a, a), dot(b, b), dot(c, c)), vec3(0.0));
      vec3 n = h * h * h * h * vec3(dot(a, hash(i + vec2(0.0))), dot(b, hash(i + o)), dot(c, hash(i + vec2(1.0))));

      return dot(n, vec3(70.0));
  }

  // Fractional Brownian Motion
  float fbm(vec2 uv) {
      float f = 0.0;
      float amp = 0.5;
      for(int i = 0; i < 4; i++) {
          f += amp * noise(uv);
          uv *= 2.0;
          amp *= 0.5;
      }
      return f;
  }

  void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      
      // Animate UV
      vec2 q = uv * 2.0 - vec2(1.0);
      q.y *= -1.0;
      
      // Add warp
      q += 0.5 * vec2(sin(q.y * 3.0 + u_time * 0.5), cos(q.x * 3.0 + u_time * 0.5)) * 0.1;
      
      // Create dark veil effect using fbm
      vec2 p = uv * 3.0;
      float f = fbm(p + vec2(u_time * 0.1, u_time * 0.15));
      float f2 = fbm(p * 2.0 - vec2(u_time * 0.2, u_time * 0.05));
      
      // Mix colors for a dark, fluid veil
      vec3 color1 = vec3(0.02, 0.03, 0.06); // very dark blue
      vec3 color2 = vec3(0.1, 0.15, 0.25); // dark grey-blue
      vec3 color3 = vec3(0.15, 0.1, 0.2); // slight purple tint
      
      vec3 col = mix(color1, color2, f);
      col = mix(col, color3, f2 * 0.5);
      
      // Scanlines
      float scanline_val = sin(gl_FragCoord.y * 800.0) * 0.5 + 0.5;
      col *= 1.0 - (scanline_val * scanline_val) * 0.05;
      
      // Noise
      col += (fract(sin(dot(gl_FragCoord.xy + vec2(u_time), vec2(12.9898,78.233))) * 43758.5453) - 0.5) * 0.04;
      
      // Output with 70% opacity for glass layering
      gl_FragColor = vec4(clamp(col, vec3(0.0), vec3(1.0)), 0.7);
  }
    `;

    const shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, fsSource);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.log("Compile Error: " + gl.getShaderInfoLog(shader));
    } else {
      console.log("Compile Success!");
    }
  });

  await browser.close();
})();
