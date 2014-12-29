/* Heap layout
particleCoords = [x0, y0, x1, y1, ...] : float[2*SIZE]
particleSpeeds = [v0, v0, v1, v1, ...] : float[2*SIZE]
particleColors = [r0, g0, b0, a0, r1, g1, b1, a1, ...] : float[4*SIZE]
*/

var ParticleMangerSupport = (function(){
	function heapBytes(w, h) {
		var n = w * h / 1024;
		var size;
		for (size = 1; size < n; size <<= 1);
		return 32 * size;
	}
	function heapView(heap) {
		var size = heap.byteLength;
	}
	function heapResize(oldHeap, oldW, oldH, n, newHeap, newW, newH) {
		var oldSize = oldHeap.byteLength >> 32;
		var newSize = newHeap.byteLength >> 32;
		var fOldHeap = new Float32Array(oldHeap);
		var fNewHeap = new Float32Array(newHeap);
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

	return {
		heapBytes:  heapBytes,
		heapView:   heapView,
		heapResize: heapResize
	}
})();

function ParticleManager(stdlib, foreign, heap) {
	"use asm";
	var sqrt = stdlib.Math.sqrt;
	var log  = stdlib.Math.log;
	var exp  = stdlib.Math.exp;
	var fHeap = new stdlib.Float32Array(heap);

	var particleN = 0;
	var particleCoordsOffset = 0;
	var particleSpeedsOffset = 0;
	var particleColorsOffset = 0;

	var width = 0, height = 0;
	var noMoved = 0;

	var userMoveAccumTime = 0;
	var userMoveThreshold = 10;
	var userMoveSttX, userMoveSttY, userMoveEndX, userMoveEndY;

	function init(size, w, h) {
		size = size|0;
		w = w|0, h = h|0;

		particleCoordsOffset = 0;
		particleSpeedsOffset = 8 * size | 0;
		particleColorsOffset = 16 * size | 0;
		width = w;
		height = h;
	}

	function updateParticleSpeeds(time) {
		time = +time;

		var px = 0.0, py = 0.0, qx = 0.0, qy = 0.0;
		var pvx = 0.0, pvy = 0.0, qvx = 0.0, qvy = 0.0;
		var ax = 0.0, ay = 0.0;

		var userMoveTime = 0.0;
		var userMoveFired = 0;
		var sx = 0.0, sy = 0.0, tx = 0.0, ty = 0.0;
		var stx = 0.0, sty = 0.0;
		var stnx = 0.0, stny = 0.0, stabs = 0.0;
		var stsp = 0.0, stpt = 0.0;
		var distToUserMove = 0.0;
		var scaleUserMove = 0.0;

		var dx = 0.0, dy = 0.0;
		var d2 = 0.0;
		var resistance = 0.0;
		var ParticleRadius2 = 0.0;

		var i = 0, j = 0, n8 = 0, end = 0;

		sx = +userMoveSttX, sy = +userMoveSttY, tx = +userMoveEndX, ty = +userMoveEndY;
		stx = +(tx - sx), sty = +(ty - sy);
		stabs = +sqrt(+(wx * wx) + +(wy * wy));
		stnx = +(stx / stabs), stny = +(sty / stabs);
		userMoveTime = userMoveAccumTime + time;
		userMoveFired = stabs > userMoveThreshold2;
		userMoveAccumTime = userMoveFired ? 0.0 : userMoveTime;

		ParticleRadius2 = 500.0;
		n8 = 8*partcleN|0;
		// assume that particleCoordsOffset == 0
		for (i = 0; i < n8; i = i+8|0) {
			px = fHeap[i>>2];
			py = fHeap[((i+1)|0)>>2];
			pvx = fHeap[((i+particleSpeedsOffset)|0)>>2];
			pvy = fHeap[((((i+1)|0)+particleSpeedsOffset)|0)>>2];

			if (userMoveFired) {
				stsp = +(stnx * +(px - sx)) + +(stny * +(py - sx));
				stpt = +(stnx * +(tx - px)) + +(stny * +(ty - px));
				if (+(stsp * stpt) >= 0.0) {
					distToUserMove = +(-stny * +(px - sx)) + +(stnx * +(py - sx));
					scaleUserMove = exp(-distToUserMove);
					pvx = +(pvx + +(scaleUserMove * stx));
					pvy = +(pvy + +(scaleUserMove * sty));
				}
			}

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

	function updateParticleCoords(time) {
		time = +time;
		var v;
		var n8 = 0, noMoving = 1;

		n8 = 8*partcleN|0;
		for (i = 0; i < n8; i = i+8|0) {
			x = fHeap[i>>2];
			y = fHeap[((i+1)|0)>>2];
			vx = fHeap[((i+particleSpeedsOffset)|0)>>2];
			vy = fHeap[((((i+1)|0)+particleSpeedsOffset)|0)>>2];
			fHeap[i>>2] = +(x + +(time * vx));
			fHeap[((i+1)|0)>>2] = +(y + +(time * vy));
			noMoving = noMoving & (vx == 0.0 & vy == 0.0);
		}
		noMoved = noMoving;
	}

	function addParticles() {
	}

	function reportUserMove(sttX, sttY, endX, endY) {
		sttX = sttX|0, sttY = sttY|0;
		endX = endX|0, endY = endY|0;

		if (sttX != userMoveEndX || sttY != userMoveEndY)
			userMoveSttX = sttX, userMoveSttY = sttY;
		userMoveEndX = endX, userMoveEndY = endY;
		noMoved = 1;
	}

	function getParticleCount() {
		return particleN|0;
	}

	function progressTime(timems) {
		timems = timems|0;
		var time = 0.0;

		time = +timems * 0.001;
		if (!noMoved) {
			addParticles();
			updateParticleSpeeds(time);
			updateParticleCoords(time);
		}
		return noMoved|0;
	}

	return {
		init:               init,
		reportUserMove:     reportUserMove,
		getParticleCount:   getParticleCount,
		progressTime:       progressTime,
	}
}
