attribute vec2 aCoord;
attribute vec2 aShift0;
#ifndef PROCESS_CURVE
attribute vec2 aShift1;
#endif

uniform vec2 uParticleCoords[PARTICLES_MAXN];
uniform vec4 uParticleColors[PARTICLES_MAXN];
uniform int  uParticleN;

varying vec3 vColor0;
#ifndef PROCESS_CURVE
varying vec3 vColor1;
#endif

#ifdef PROCESS_CURVE
attribute vec2 aTexCoord;
varying vec2 vTexCoord;
#else
attribute float aShiftSel;
varying float vShiftSel;
#endif

// TODO: horizontal SIMD may be faster
void calculateColor() {
#ifndef PROCESS_CURVE
	vec2 coord0 = aCoord + aShift0;
	vec2 coord1 = aCoord - aShift1;
#else
	vec2 coord0 = aCoord + aShift0;
#endif

	for (int i = 0; i < PARTICLES_MAXN; i++) {
		vec2 p = uParticleCoords[i];
		vec4 pcol = uParticleColors[i];
		vec3 coldiff = vec3(pcol.a) * pcol.rgb;

		float dd0 = dot(coord0 - p, coord0 - p);
#ifndef PROCESS_CURVE
		float dd1 = dot(coord1 - p, coord1 - p);
#endif

		vColor0 += coldiff * vec3(1.0/dd0);
#ifndef PROCESS_CURVE
		vColor1 += coldiff * vec3(1.0/dd1);
#endif
	}
}

void main() {
	calculateColor();

	gl_Position.xy = aCoord;
	gl_Position.zw = vec2(0.0, 1.0);
#ifdef PROCESS_CURVE
	vTexCoord = aTexCoord;
#else
	vShiftSel = aShiftSel;
#endif
}
