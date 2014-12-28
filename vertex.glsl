/*
The zlib/libpng License

Copyright (c) 2014 grafi (Shunsuke Shimizu)

This software is provided 'as-is', without any express or implied warranty. In no event will the authors be held liable for any damages arising from the use of this software.

Permission is granted to anyone to use this software for any purpose, including commercial applications, and to alter it and redistribute it freely, subject to the following restrictions:

	1. The origin of this software must not be misrepresented; you must not claim that you wrote the original software. If you use this software in a product, an acknowledgment in the product documentation would be appreciated but is not required.

	2. Altered source versions must be plainly marked as such, and must not be misrepresented as being the original software.

	3. This notice may not be removed or altered from any source distribution.
*/

precision mediump float;

attribute aCoord;
#ifdef PROCESS_CURVE

#endif

uniform uParticleCoords;

varying vec3 vTextureCoord;
varying bool vIsConvex;

vec2 calculateShift() {
	vec2 p, q = crevas[0];
	vec2 pqn, pqnt;
	vec2 apn, qan = normalize(q - a);
	float weight;
	vec2 shift = 0;
	for (int i = 1; i < n; i++,
			shift += weight * pqnt) {
		/*
		There are a point A and a line segment PQ.
		Here, calculating `weight` by following:
			sin(APQ) if angle(APQ) > pi/2
			sin(AQP) if angle(AQP) > pi/2
			       1 otherwise
		*/
		p = q;
		q = crevas[i];
		pqn = normalize(q - p);
		pqnt.x = -pqn.y, pqnt.y = pqn.x;
		apn = -qan,
		qan = normalize(q - a);
#ifdef PROCESS_CURVE
		if () {
			weight = isleft ? 1.0 : -1.0;
			continue;
		}
#endif
		float maxcos = max(0.0, max(dot(pqn, apn), dot(pqn, qan)));
		weight = sign(dot(pqnt, ap)) * sqrt(1.0 - maxcos*maxcos);
	}
	return shift;
}

vec2 calculateColor(vec2 shift) {
	vec3 color;
	for (int i = 0; i < n; i++) {
		vec2 p = particleCoords[i];
		vec4 pcol = particleColors[i];
		vec2 d2 = dot(a - p, a - p);
		color += (pcol.a / d2) * pcol.rgb;
	}
	return color;
}

void main() {
	vec2 s = calculateShift();
	vec2 c = calculateColor(s);
}
