precision mediump float;

varying vec3 vColor0;
#ifndef PROCESS_CURVE
varying vec3 vColor1;
varying vec3 vColor2;
varying vec3 vColor3;
#endif

#ifdef PROCESS_CURVE
varying vec3 vTexCoord;
#endif

#ifdef PROCESS_CURVE
void calculateCurveAlpha() {
	// Using the argorithm for drawing 2D bezier curve
	// http://http.developer.nvidia.com/GPUGems3/gpugems3_ch25.html
	// http://research.microsoft.com/apps/pubs/default.aspx?id=78197
	vec2 st = vTexCoord.st;
	float convexSign = vTextureCoord.p;
	float fst = (st.s * st.s - st.t) * convexSign;
#ifdef GL_OES_standard_derivatives
	#extension GL_OES_standard_derivatives: enable
	vec2 dstdx = dFdx(st);
	vec2 dstdy = dFdy(st);
	float dfdx = (2.0 * st.s) * dstdx.s - dstdx.t;
	float dfdy = (2.0 * st.s) * dstdy.s - dstdy.t;
	float dist = fst / sqrt(dfdx * dfdx + dfdy * dfdy);
	float alpha = clamp(0.5 - dist, 0.0, 1.0);
#else
	float alpha = (sign(fst) + 1.0) / 2.0;
#endif
	gl_FragColor.a = alpha;
}
#endif

void main() {
	gl_FragColor.rgb = vColor;
#ifdef PROCESS_CURVE
	calculateCurveAlpha();
#endif
}
