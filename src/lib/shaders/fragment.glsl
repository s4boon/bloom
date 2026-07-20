#version 300 es
precision highp float;

in vec2 v_local;
in float v_radius;
in float v_max_radius;
in vec4 v_color;

uniform float u_time;

out vec4 outColor;

void main() {
  float dist = length(v_local) * v_max_radius;

  float edge = 1.5;
  float alpha = 1.0 - smoothstep(v_radius - edge, v_radius + edge, dist);

  if (alpha <= 0.0) discard;

  outColor = vec4(v_color.rgb, v_color.a * alpha);
}