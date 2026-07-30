#version 300 es
precision highp float;

in vec2 v_local;
in vec2 v_texCoord;

uniform float u_time;
uniform sampler2D u_texture;

out vec4 outColor;

void main() {
  vec4 txclr = texture(u_texture, v_texCoord);
  outColor = txclr;
}