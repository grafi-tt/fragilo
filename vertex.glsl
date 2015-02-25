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
varying vec3 vColor2;
varying vec3 vColor3;
#endif

#ifdef PROCESS_CURVE
attribute vec2 aTexCoord;
varying vec2 vTexCoord;
#else
attribute float aShiftSel0;
attribute float aShiftSel1;
varying float vShiftSel0;
varying float vShiftSel1;
#endif

void calculateColor() {
#ifndef PROCESS_CURVE
	vec2 coord0 = aCoord - aShift0 - aShift1;
	vec2 coord1 = aCoord - aShift0 + aShift1;
	vec2 coord2 = aCoord + aShift0 - aShift1;
	vec2 coord3 = aCoord + aShift0 + aShift1;
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
		float dd2 = dot(coord2 - p, coord2 - p);
		float dd3 = dot(coord3 - p, coord3 - p);
#endif

		vColor0 += coldiff * vec3(1/dd0);
#ifndef PROCESS_CURVE
		vColor1 += coldiff * vec3(1/dd1);
		vColor2 += coldiff * vec3(1/dd2);
		vColor3 += coldiff * vec3(1/dd3);
#endif
	}
}

void main() {
	calculateColor();

	gl_Position = aCoord;
#ifdef PROCESS_CURVE
	vTexCoord = aTexCoord;
#else
	vShiftSel0 = aShiftSel0;
	vShiftSel1 = aShiftSel1;
#endif
}
