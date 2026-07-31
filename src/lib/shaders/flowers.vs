#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_texCoord;

in vec2 a_origin;
in float a_max_radius;
in float a_spawn_time;
in float a_animation_time;
in float a_despawn_time;
in vec2 a_flower;
in float a_rotation;

uniform vec2 u_resolution;
uniform float u_time;

out vec2 v_texCoord;
out vec2 v_local;


const float TAU = 6.28318530718;

void main() {
  float growDelta = u_time - a_spawn_time;
  float growRate = clamp(growDelta / a_animation_time, 0.0, 1.0);
  float radius = a_max_radius * growRate;

  if (a_despawn_time >= 0.0) {
    float shrinkDelta = u_time - a_despawn_time;
    float shrinkRate = clamp(shrinkDelta / a_animation_time, 0.0, 1.0);
    radius *= (1.0 - shrinkRate);
  }

  float theta = mod(u_time * a_rotation, TAU); // flowers start blinking after large values of u_time, this might be the cluprit
  float xr = a_position.x * cos(theta) - a_position.y * sin(theta);
  float yr = a_position.x * sin(theta) + a_position.y * cos(theta);

  vec2 worldPos = a_origin + vec2(xr, yr) * radius; 

  vec2 zeroToOne = worldPos / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace.x, -clipSpace.y, 0, 1);

  v_texCoord = a_texCoord / 5.0; //5x5 grid
  v_texCoord = vec2(v_texCoord.x + a_flower.x/5.0, v_texCoord.y + a_flower.y/5.0);

  v_local = a_position;
}