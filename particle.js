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
		var size = heap.byteLength / 32;
		return {
			particleCoords: new Float32Array(heap,       0, 2*size),
			particleSpeeds: new Float32Array(heap,  8*size, 2*size),
			particleColors: new Float32Array(heap, 16*size, 4*size),
			particlesMaxN: size
		};
	}
	function heapResize(oldHeap, oldW, oldH, n, newHeap, newW, newH) {
		var oldView = heapView(oldHeap);
		var newView = heapView(newHeap);
		var scaleX = newW / oldW;
		var scaleY = newH / oldH;

		var j = 0;
		for (var i = 0; i < n; i++) {
			// TODO considering weight of particle for dropping may be better
			if (i < n - newView.size) continue;
			newView.particleCoords[2*j  ] = scaleX * oldView.particleCoords[2*i  ];
			newView.particleCoords[2*j+1] = scaleY * oldView.particleCoords[2*i+1];

			newView.particleSpeeds[2*j  ] = scaleX * oldView.particleSpeeds[2*i  ];
			newView.particleSpeeds[2*j+1] = scaleY * oldView.particleSpeeds[2*i+1];

			newView.particleColors[4*j  ] = oldView.particleColors[4*i  ];
			newView.particleColors[4*j+1] = oldView.particleColors[4*i+1];
			newView.particleColors[4*j+2] = oldView.particleColors[4*i+2];
			newView.particleColors[4*j+3] = oldView.particleColors[4*i+3];
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
	var particleCoordsPtr = 0;
	var particleSpeedsPtr = 0;
	var particleColorsPtr = 0;

	var width = 0, height = 0;
	var noMoved = 0;

	var userMoveAccumTime = 0;
	var userMoveThreshold = 10;
	var userMoveSttX, userMoveSttY, userMoveEndX, userMoveEndY;

	function init(size, w, h) {
		size = size|0;
		w = w|0; h = h|0;

		particleCoordsPtr = 0;
		particleSpeedsPtr = 8 * size | 0;
		particleColorsPtr = 16 * size | 0;
		width = w;
		height = h;
	}

	function updateParticleSpeeds(time) {
		time = +time;

		var px = 0.0, py = 0.0, qx = 0.0, qy = 0.0,
		    pvx = 0.0, pvy = 0.0, qvx = 0.0, qvy = 0.0,
		    ax = 0.0, ay = 0.0,

		    userMoveTime = 0.0,
		    userMoveFired = 0,
		    sx = 0.0, sy = 0.0, tx = 0.0, ty = 0.0,
		    stx = 0.0, sty = 0.0,
		    stnx = 0.0, stny = 0.0, stabs = 0.0,
		    stsp = 0.0, stpt = 0.0,
		    distToUserMove = 0.0,
		    scaleUserMove = 0.0,

		    dx = 0.0, dy = 0.0,
		    d2 = 0.0,
		    resistance = 0.0,
		    ParticleRadius2 = 0.0,

		    i = 0, j = 0, n8 = 0, end = 0;

		sx = +userMoveSttX, sy = +userMoveSttY, tx = +userMoveEndX, ty = +userMoveEndY;
		stx = +(tx - sx), sty = +(ty - sy);
		stabs = +sqrt(+(stx * stx) + +(sty * sty));
		stnx = +(stx / stabs), stny = +(sty / stabs);
		userMoveTime = userMoveAccumTime + time;
		userMoveFired = stabs > userMoveThreshold;
		userMoveAccumTime = userMoveFired ? 0.0 : userMoveTime;

		ParticleRadius2 = 500.0;
		n8 = 8*particleN|0;
		// assume that particleCoordsPtr == 0
		for (i = 0; i < n8; i = i+8|0) {
			px = fHeap[i>>2];
			py = fHeap[((i+1)|0)>>2];
			pvx = fHeap[((i+particleSpeedsPtr)|0)>>2];
			pvy = fHeap[((((i+1)|0)+particleSpeedsPtr)|0)>>2];

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

					qvx = fHeap[((j+particleSpeedsPtr)|0)>>2];
					qvy = fHeap[((((j+1)|0)+particleSpeedsPtr)|0)>>2];
					qvx = +(qvx - ax), qvy = +(qvy - ay);
					fHeap[((j+particleSpeedsPtr)|0)>>2] = qvx;
					fHeap[((((j+1)|0)+particleSpeedsPtr)|0)>>2] = qvy;
				}
			}

			fHeap[((i+particleSpeedsPtr)|0)>>2] = pvx;
			fHeap[((((i+1)|0)+particleSpeedsPtr)|0)>>2] = pvy;
		}
	}

	function updateParticleCoords(time) {
		time = +time;
		var vx = 0.0, vy = 0.0,
		    n8 = 0, noMoving = 1;

		n8 = 8*particleN|0;
		for (i = 0; i < n8; i = i+8|0) {
			x = fHeap[i>>2];
			y = fHeap[((i+1)|0)>>2];
			vx = fHeap[((i+particleSpeedsPtr)|0)>>2];
			vy = fHeap[((((i+1)|0)+particleSpeedsPtr)|0)>>2];
			fHeap[i>>2] = +(x + +(time * vx));
			fHeap[((i+1)|0)>>2] = +(y + +(time * vy));
			noMoving = noMoving & (vx == 0.0 & vy == 0.0);
		}
		noMoved = noMoving;
	}

	function addParticles() {
	}

	function reportUserMove(sttX, sttY, endX, endY) {
		sttX = sttX|0; sttY = sttY|0;
		endX = endX|0; endY = endY|0;

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
