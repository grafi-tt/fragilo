/* Heap layout
64KiB
particleCoords = [x0, y0, x1, y1, ...] : float[2*2048]
particleSpeeds = [v0, v0, v1, v1, ...] : float[2*2048]
particleColors = [r0, g0, b0, a0, r1, g1, b1, a1, ...] : float[4*2048]
*/

#define particleCoordsPtr 0
#define particleSpeedsPtr 16384
#define particleColorsPtr 32768

function ParticleManager(stdlib, foreign, heap) {
	"use asm";
	var sqrt = stdlib.Math.sqrt;
	var log  = stdlib.Math.log;
	var exp  = stdlib.Math.exp;

	var fround = stdlib.Math.fround;

	var fHeap = new stdlib.Float32Array(heap);

	var particleN = 0;
	var particleMaxN = 0;

	var width = 0, height = 0;
	var noMoved = 0;

	var userMoveAccumTime = 0.0;
	var userMoveThreshold = 10.0;
	var userMoveSttX = 0, userMoveSttY = 0, userMoveEndX = 0, userMoveEndY = 0;

	function setRect(w, h) {
		w = w|0; h = h|0;
		var n8 = 0, i = 0, scaleX = fround(0.0), scaleY = fround(0.0);

		scaleX = fround(+(w|0) / +(width |0));
		scaleY = fround(+(h|0) / +(height|0));

		n8 = 8*particleN|0;
		for ( ; (i|0) < (n8|0); i = i+8|0) {
			fHeap[particleCoordsPtr+i   >>2] = fround(scaleX * fHeap[particleCoordsPtr+i   >>2]);
			fHeap[particleCoordsPtr+i+1 >>2] = fround(scaleY * fHeap[particleCoordsPtr+i+1 >>2]);
			fHeap[particleSpeedsPtr+i   >>2] = fround(scaleX * fHeap[particleSpeedsPtr+i   >>2]);
			fHeap[particleSpeedsPtr+i+1 >>2] = fround(scaleY * fHeap[particleSpeedsPtr+i+1 >>2]);
		}

		width = w;
		height = h;
		particleMaxN = 2048;
	}

	function getParticleMaxN() {
		return particleMaxN|0;
	}

	function updateParticleSpeeds(time) {
		time = +time;

		var px = 0.0, py = 0.0, qx = 0.0, qy = 0.0,
		    pqx = 0.0, pqy = 0.0, pq2 = 0.0,
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
		    ParticleRadius2 = 0.0, LogParticleRadius2 = 0.0,

		    i = 0, j = 0, n8 = 0, end = 0;

		sx = +(userMoveSttX|0), sy = +(userMoveSttY|0), tx = +(userMoveEndX|0), ty = +(userMoveEndY|0);
		stx = tx - sx, sty = ty - sy;
		stabs = sqrt(stx * stx + sty * sty);
		stnx = stx / stabs, stny = sty / stabs;
		userMoveTime = userMoveAccumTime + time;
		userMoveFired = stabs > userMoveThreshold;
		userMoveAccumTime = userMoveFired ? 0.0 : userMoveTime;

		ParticleRadius2 = 500.0;
		LogParticleRadius2 = log(ParticleRadius2);

		n8 = 8*particleN|0;
		// assume that particleCoordsPtr == 0
		for (i = 0; (i|0) < (n8|0); i = i+8|0) {
			px  = +fHeap[particleCoordsPtr+i   >>2];
			py  = +fHeap[particleCoordsPtr+i+1 >>2];
			pvx = +fHeap[particleSpeedsPtr+i   >>2];
			pvy = +fHeap[particleSpeedsPtr+i+1 >>2];

			if (userMoveFired) {
				stsp = stnx * (px - sx) + stny * (py - sy);
				stpt = stnx * (tx - px) + stny * (ty - py);
				if (stsp * stpt >= 0.0) {
					distToUserMove = -stny * (px - sx) + stnx * (py - sy);
					scaleUserMove = exp(-distToUserMove);
					pvx = pvx + scaleUserMove * stx;
					pvy = pvy + scaleUserMove * sty;
				}
			}

			for (j = i+1|0; (j|0) < (n8|0); j = j+8|0) {
				qx = +fHeap[particleCoordsPtr+j   >>2];
				qy = +fHeap[particleCoordsPtr+j+1 >>2];

				pqx = qx - px, pqy = qy - py;
				pq2 = pqx * pqx + pqy * pqy;
				if (pq2 < ParticleRadius2) {
					// calculate -2log(|pq|/r)
					resistance = LogParticleRadius2 - log(pq2);

					ax = pqx * resistance;
					ay = pqy * resistance;

					pvx = pvx + ax, pvy = pvy + ay;

					qvx = +fHeap[particleSpeedsPtr+j   >>2];
					qvy = +fHeap[particleSpeedsPtr+j+1 >>2];
					qvx = qvx - ax, qvy = qvy - ay;
					fHeap[particleSpeedsPtr+j   >>2] = qvx;
					fHeap[particleSpeedsPtr+j+1 >>2] = qvy;
				}
			}

			fHeap[particleSpeedsPtr+i   >>2] = pvx;
			fHeap[particleSpeedsPtr+i+1 >>2] = pvy;
		}
	}

	function updateParticleCoords(time) {
		time = +time;
		var i = 0, n8 = 0, noMoving = 1,
		    x = 0.0, y = 0.0, vx = 0.0, vy = 0.0;

		n8 = 8*particleN|0;
		for ( ; (i|0) < (n8|0); i = i+8|0) {
			x  = +fHeap[particleCoordsPtr+i   >>2];
			y  = +fHeap[particleCoordsPtr+i+1 >>2];
			vx = +fHeap[particleSpeedsPtr+i   >>2];
			vy = +fHeap[particleSpeedsPtr+i+1 >>2];
			fHeap[particleCoordsPtr+i   >>2] = x + time * vx;
			fHeap[particleCoordsPtr+i+1 >>2] = y + time * vy;
			noMoving = noMoving & (vx == 0.0 & vy == 0.0);
		}
		noMoved = noMoving;
	}

	function addParticles() {
	}

	function reportUserMove(sttX, sttY, endX, endY) {
		sttX = sttX|0; sttY = sttY|0;
		endX = endX|0; endY = endY|0;

		if ((sttX|0) != (userMoveEndX|0) | (sttY|0) != (userMoveEndY|0))
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

		time = +(timems|0) * 0.001;
		if (!noMoved) {
			addParticles();
			updateParticleSpeeds(time);
			updateParticleCoords(time);
		}
		return noMoved|0;
	}

	return {
		setRect:            setRect,
		getParticleMaxN:    getParticleMaxN,
		reportUserMove:     reportUserMove,
		getParticleCount:   getParticleCount,
		progressTime:       progressTime,
	}
}
