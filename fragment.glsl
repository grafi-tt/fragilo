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

varying vec3 vTextureCoord;
varying bool vIsConvex;

vec2 calculateCurveAlpha() {
	// Using the argorithm for drawing 2D bezier curve
	// http://http.developer.nvidia.com/GPUGems3/gpugems3_ch25.html
	// http://research.microsoft.com/apps/pubs/default.aspx?id=78197
	vec2 st = vTextureCoord;
	float fst st.s * st.s - st.t;
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
	return alpha;
}

void main() {
	calculateCurveAlpha();
}
