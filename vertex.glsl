attribute vec2 aCoord;
#ifdef PROCESS_CURVE
// 32bit float suffice for represent integer
attribute float aCrevasPos;
#endif

uniform vec2 uParticleCoords[PARTICLES_MAXN];
uniform vec4 uParticleColors[PARTICLES_MAXN];
uniform int  uParticleN;

uniform vec4 uCrevasPointsX[CREVAS_POINTS_MAXN/4];
uniform vec4 uCrevasPointsY[CREVAS_POINTS_MAXN/4];
uniform vec4 uCrevasUnitVecsX[CREVAS_POINTS_MAXN/4];
uniform vec4 uCrevasUnitVecsY[CREVAS_POINTS_MAXN/4];

varying vec3 vColor;
varying vec3 vTextureCoord;

vec2 calculateShift() {
#ifdef PROCESS_CURVE
	int crevasPos = int(abs(aCrevasPos));
	float directionSign = sign(aCrevasPos);
	int crevasPos4 = crevasPos / 4;
	vec4 mask = vec4(0.0);
	int modulo = crevasPos - crevasPos4*4;
	if (modulo == 0) mask[0] = 1.0;
	if (modulo == 1) mask[1] = 1.0;
	if (modulo == 2) mask[2] = 1.0;
	if (modulo == 3) mask[3] = 1.0;
#endif

	vec4 apux, apuy;
	vec4 qaux, qauy;
	vec4 ap4x, ap4y, ap4invabs;
	vec4 ap4ux, ap4uy;

	vec4 pqux, pquy;
	vec4 pqunx, pquny;

	ap4x = uCrevasPointsX[0] - vec4(aCoord.x);
	ap4y = uCrevasPointsY[0] - vec4(aCoord.y);
	ap4invabs = inversesqrt(ap4x * ap4x + ap4y * ap4y);
	ap4ux = ap4invabs * ap4x;
	ap4uy = ap4invabs * ap4y;

	vec4 shiftx = vec4(0.0);
	vec4 shifty = vec4(0.0);

	for (int i = 0; i < CREVAS_POINTS_MAXN/4; i++) {
		/*
		There are a point A and a line segment PQ.
		Here, calculating `weight` by following:
			sin(APQ) if angle(APQ) > pi/2
			sin(AQP) if angle(AQP) > pi/2
			       1 otherwise
		*/
		apux = ap4ux;
		apuy = ap4uy;

		ap4x = uCrevasPointsX[i+1] - vec4(aCoord.x);
		ap4y = uCrevasPointsY[i+1] - vec4(aCoord.y);
		ap4invabs = inversesqrt(ap4x * ap4x + ap4y * ap4y);
		ap4ux = ap4invabs * ap4x;
		ap4uy = ap4invabs * ap4y;

		qaux = -vec4(apux.tpq, ap4ux.s);
		qauy = -vec4(apuy.tpq, ap4uy.s);

		pqux = uCrevasUnitVecsX[i];
		pquy = uCrevasUnitVecsY[i];
		pqunx = -pquy;
		pquny = pqux;

		vec4 pqu_apu = pqux * apux + pquy * apuy;
		vec4 pqu_qau = pqux * qaux + pquy * qauy;
		vec4 maxcos = max(vec4(0.0), max(pqu_apu, pqu_qau));

		vec4 dir = sign(pqunx * apux + pquny * apuy);
		vec4 weightabs = dir * sqrt(1.0 - maxcos*maxcos);
#ifdef PROCESS_CURVE
		if (i == crevasPos4) {
			weightabs = max(weightabs, mask);
		}
#endif
		vec4 weight = dir * weightabs;

		shiftx += pqunx * weight;
		shifty += pquny * weight;
	}

	vec2 shift;
	shift.x = shiftx.s + shiftx.t + shiftx.p + shiftx.q;
	shift.y = shifty.s + shifty.t + shifty.p + shifty.q;
	return shift;
}

vec3 calculateColor(vec2 shift) {
	vec3 color;
	for (int i = 0; i < PARTICLES_MAXN; i++) {
		vec2 p = uParticleCoords[i];
		vec4 pcol = uParticleColors[i];
		float d2 = dot(aCoord - p, aCoord - p);
		color += vec3(pcol.a / d2) * pcol.rgb;
	}
	return color;
}

void main() {
	vec2 shift = calculateShift();
	vColor = calculateColor(shift);
	gl_Position = vec4(aCoord, 0.0, 1.0);
}
