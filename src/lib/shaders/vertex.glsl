#version 300 es

// Per-vertex: unit quad corner, -1..1
in vec2 a_position;

// Per-instance
in vec2 a_origin;
in float a_max_radius;
in vec4 a_color;
in float a_spawn_time;
in float a_animation_time;
in float a_despawn_time; // -1.0 means "not despawning"

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_despawn_duration;

out vec2 v_local;
out float v_radius;
out float v_max_radius;
out vec4 v_color;

void main() {
  float growDelta = u_time - a_spawn_time;
  float growRate = clamp(growDelta / a_animation_time, 0.0, 1.0);
  float radius = a_max_radius * growRate;

  if (a_despawn_time >= 0.0) {
    float shrinkDelta = u_time - a_despawn_time;
    float shrinkRate = clamp(shrinkDelta / u_despawn_duration, 0.0, 1.0);
    radius *= (1.0 - shrinkRate);
  }

  vec2 worldPos = a_origin + a_position * a_max_radius;

  vec2 zeroToOne = worldPos / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace.x, -clipSpace.y, 0, 1);

  v_local = a_position;
  v_radius = radius;
  v_max_radius = a_max_radius;
  v_color = a_color;
}