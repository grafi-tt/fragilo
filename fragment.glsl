precision mediump float;

varying vec3 vColor0;
#ifndef PROCESS_CURVE
varying vec3 vColor1;
#endif

#ifdef PROCESS_CURVE
varying vec2 vTexCoord;
#else
varying float vShiftSel;
#endif

#ifdef PROCESS_CURVE
float calculateCurveAlpha() {
	// Using following argorithm to draw 2D bezier curve
	// http://http.developer.nvidia.com/GPUGems3/gpugems3_ch25.html
	// http://research.microsoft.com/apps/pubs/default.aspx?id=78197
	vec2 st = vTexCoord.st;
	float fst = st.s * st.s - st.t;
#ifdef GL_OES_standard_derivatives
	#extension GL_OES_standard_derivatives: enable
	vec2 dstdx = dFdx(st);
	vec2 dstdy = dFdy(st);
	float dfdx = (2.0 * st.s) * dstdx.s - dstdx.t;
	float dfdy = (2.0 * st.s) * dstdy.s - dstdy.t;
	float dist = fst / sqrt(dfdx * dfdx + dfdy * dfdy);
	float alpha = clamp(0.5 - dist, 0.0, 1.0);
#else
	// no anti aliasing
	float alpha = (sign(fst) + 1.0) / 2.0;
#endif
	return alpha;
}
#endif

void main() {
#ifdef PROCESS_CURVE
	gl_FragColor.rgb = vColor0;
	gl_FragColor.a = calculateCurveAlpha();
#else
	if (vShiftSel < 0.0)
		gl_FragColor.rgb = vColor0;
	else
		gl_FragColor.rgb = vColor1;
	gl_FragColor.a = 1.0;
#endif
}
