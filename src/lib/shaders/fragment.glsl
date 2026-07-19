#version 300 es

precision highp float;

out vec4 outColor;

uniform vec4 u_color;
uniform vec3 u_lifetime;
uniform vec2 u_resolution;
uniform vec2 u_origin;
uniform float u_radius;
uniform float u_time;

void main() { 
  float delta = u_time - u_lifetime.x;
  float rate = clamp(delta / u_lifetime.z,0.0, 1.0);

  float r = u_radius * rate;

    vec2 center = vec2(
        u_origin.x,
        u_resolution.y - u_origin.y
    );

    float d = distance(center, gl_FragCoord.xy);

    float edge = 1.5;

    // Throw away fragments well outside the circle.
    if (d > u_radius + edge) {
        discard;
    }

    // Fade only across the edge.
    float alpha = 1.0 - smoothstep(
        r - edge,
        r + edge,
        d
    );

    outColor = vec4(u_color.rgb * alpha, alpha);
}