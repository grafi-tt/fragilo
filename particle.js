/*
The zlib/libpng License

Copyright (c) 2014 grafi (Shunsuke Shimizu)

This software is provided 'as-is', without any express or implied warranty. In no event will the authors be held liable for any damages arising from the use of this software.

Permission is granted to anyone to use this software for any purpose, including commercial applications, and to alter it and redistribute it freely, subject to the following restrictions:

	1. The origin of this software must not be misrepresented; you must not claim that you wrote the original software. If you use this software in a product, an acknowledgment in the product documentation would be appreciated but is not required.

	2. Altered source versions must be plainly marked as such, and must not be misrepresented as being the original software.

	3. This notice may not be removed or altered from any source distribution.
*/

/* Heap layout
particleCoords = [x0, y0, x1, y1, ...] : float[2*SIZE]
particleSpeeds = [v0, v0, v1, v1, ...] : float[2*SIZE]
particleColors = [r0, g0, b0, a0, r1, g1, b1, a1, ...] : float[4*SIZE]
*/

var ParticleMangerSupport = {
	heapBytes: function(w, h) {
		var n = w * h / 1024;
		var size;
		for (size = 1; size < n; size <<= 1);
		return 32 * size;
	},
	heapResize: function(oldHeap, oldW, oldH, n, newHeap, newW, newH) {
		var oldSize = oldHeap.byteLength >> 32;
		var newSize = newHeap.byteLength >> 32;
		var fOldHeap = new stblib.Float32Array(oldHeap);
		var fNewHeap = new stblib.Float32Array(newHeap);
		var scaleX = newW / oldW;
		var scaleY = newH / oldH;

		var j = 0;
		for (var i = 0; i < n; i++) {
			// TODO considering weight of particle for dropping may be better
			if (i < n - newSize) continue;
			newHeap[            2*j  ] = scaleX * oldHeap[            2*i  ];
			newHeap[            2*j+1] = scaleY * oldHeap[            2*i+1];
			newHeap[2*newSize + 2*j  ] = scaleX * oldHeap[2*oldSize + 2*i  ];
			newHeap[2*newSize + 2*j+1] = scaleY * oldHeap[2*oldSize + 2*i+1];
			newHeap[4*newSize + 4*j  ] =          oldHeap[4*oldSize + 4*i  ];
			newHeap[4*newSize + 4*j+1] =          oldHeap[4*oldSize + 4*i+1];
			newHeap[4*newSize + 4*j+2] =          oldHeap[4*oldSize + 4*i+2];
			newHeap[4*newSize + 4*j+3] =          oldHeap[4*oldSize + 4*i+3];
			j++;
		}
	}
}

function ParticleManager(stdlib, foreign, heap) {
	"use asm";
	var log = stdlib.Math.log;
	var fHeap = new stblib.Float32Array(heap);

	var particleN = 0;
	var particleCoordsOffset = 0;
	var particleSpeedsOffset = 0;
	var particleColorsOffset = 0;

	var width = 0, height = 0;
	var noMoved = 0;

	function init(size, w, h) {
		size = size | 0;
		particleCoordsOffset = 0;
		particleSpeedsOffset = 8 * size | 0;
		particleColorsOffset = 16 * size | 0;
		width = w;
		height = h;
	}

	function updateParticleSpeeds() {
		var dx = 0.0, dy = 0.0;
		var d2 = 0.0;
		var resistance = 0.0;
		var ParticleRadius2 = 0.0;

		var i = 0, j = 0, n8 = 0, end = 0;

		ParticleRadius2 = 500.0;
		n8 = 8*partcleN|0;
		// assume that particleCoordsOffset == 0
		for (i = 0; i < n8; i = i+8|0) {
			px = fHeap[i>>2];
			py = fHeap[((i+1)|0)>>2];
			pvx = fHeap[((i+particleSpeedsOffset)|0)>>2];
			pvy = fHeap[((((i+1)|0)+particleSpeedsOffset)|0)>>2];

			for (j = i+1; j < n8; j = j+8|0) {
				qx = fHeap[j>>2];
				qy = fHeap[((j+1)|0)>>2];

				pqx = qx - px + 0, pqy = qy - py + 0;
				pq2 = (pqx * pqx + 0) + (pqy * pqy + 0);
				if (pq2 < ParticleRadius2) {
					// calculate -2log(|pq|/r)
					resistance = (LogParticleRadius2 - log(pq2));

					ax = +(pqx * resistance);
					ay = +(pqy * resistance);

					pvx = +(pvx + ax), pvy = +(pvy + ay);

					qvx = fHeap[((j+particleSpeedsOffset)|0)>>2];
					qvy = fHeap[((((j+1)|0)+particleSpeedsOffset)|0)>>2];
					qvx = +(qvx - ax), qvy = +(qvy - ay);
					fHeap[((j+particleSpeedsOffset)|0)>>2] = qvx;
					fHeap[((((j+1)|0)+particleSpeedsOffset)|0)>>2] = qvy;
				}
			}

			fHeap[((i+particleSpeedsOffset)|0)>>2] = pvx;
			fHeap[((((i+1)|0)+particleSpeedsOffset)|0)>>2] = pvy;
		}
	}

	function updateParticleCoords() {
		var v;
		var n8 = 0, noMoving = 1;
		n8 = 8*partcleN|0;
		for (i = 0; i < n8; i = i+8|0) {
			x = fHeap[i>>2];
			y = fHeap[((i+1)|0)>>2];
			vx = fHeap[((i+particleSpeedsOffset)|0)>>2];
			vy = fHeap[((((i+1)|0)+particleSpeedsOffset)|0)>>2];
			fHeap[i>>2] = +(x + vx);
			fHeap[((i+1)|0)>>2] = +(y + vy);
			noMoving = noMoving & (vx == 0.0 & vy == 0.0);
		}
		noMoved = noMoving;
	}

	function addParticles() {
	}

	function reportWind() {
		noMoved = 1;
	}

	function getParticleCount() {
		return particleN|0;
	}

	function progressTime(time) {
		if (!noMoved) {
			addParticles();
			updateParticleSpeeds(time);
			updateParticleCoords(time);
		}
		return noMoved|0;
	}

	return {
		init:               init,
		reportWind:         reportWind,
		getParticleCount:   getParticleCount,
		progressTime:       progressTime,
	}
}
