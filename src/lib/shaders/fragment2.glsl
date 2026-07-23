#version 300 es
precision highp float;

uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_time;

out vec4 outColor;

void main() {
   vec2 uv = gl_FragCoord.xy/u_resolution.y;
   vec2 m = u_mouse/u_resolution.y;
   m.y = 1.0-m.y;
   float r = .4;
   float d = distance(uv, m);
   if (d<r) {
    outColor = vec4(0.2, 0.3, 0.14, 1.0);
   }else {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
   }

    outColor = vec4(0.0, 0.0, 0.0, 1.0);
}