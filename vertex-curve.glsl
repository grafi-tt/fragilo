attribute aCoord;

uniform uParticleCoords;

varying vec3 vTextureCoord;
varying bool vIsConvex;

vec2 calculateShift() {
	vec2 p, q = crevas[0];
	vec2 pqn, pqnt;
	vec2 apn, qan = normalize(q - a);
	vec2 shift = 0;
	for (int i = 1; i < n; i++) {
		p = q;
		q = crevas[i];
		pqn = normalize(q - p);
		apn = -qan;
		qan = normalize(q - a);
		if (i == is) {
			pqnt.x = -pqn.y, pqnt.y = pqn.x;
			vec2 maxcos = max(0, max(dot(pqn, apn), dot(pqn, qan)));
			vec2 weight = sqrt(1 - maxcos*maxcos);
		}
		shift += weight * pqnt;
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
