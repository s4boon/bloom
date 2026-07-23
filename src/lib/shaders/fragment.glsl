#version 300 es
precision highp float;

in vec2 v_local;
in vec2 v_texCoord;
// in float v_radius;
// in float v_max_radius;
in vec4 v_color;

uniform float u_time;
uniform sampler2D u_texture;

out vec4 outColor;

void main() {
  float dist = length(v_local);
  float ratio = .94;
  
  float aa = fwidth(dist);
  float alpha = 1.0 - smoothstep(ratio - aa, ratio + aa, dist);

  vec4 txclr = texture(u_texture, v_texCoord);

  // if (alpha <= 0.0) discard;

  outColor = vec4(v_color.rgb, v_color.a * alpha);
  outColor = txclr;
}