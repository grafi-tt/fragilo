function Fragilo() {
	var canvas, gl;
	var curveProg, plainProg;
	var ptcMan, ptcHeapView;

	var width, height, scale;

	var resetTimer;
	var ResetWait = 1000; // world will be reset 1000ms after last resizing

	var mouseSttX = -1, mouseSttY = -1, mouseEndX = -1, mouseEndY = -1;

	var VerticesDensity = 1.0 / 200;

	var verticesN, trianglesN;
	var vertices, triangles;
	var adjacencyDataIdx, adjacencyData;


	function init() {
		scale = window.devicePixelRatio || 1;
		canvas = document.getElementById('fragilo');
		gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

		canvas.addEventListener("mousemove", onMouseMove, false);
		canvas.addEventListener("mouseover", onMouseOver, false);
		canvas.addEventListener("mouseout" , onMouseOut , false);

		reset();
	}

	function reset() {
		resetTimer = Infinity;

		var w = canvas.clientWidth;
		var h = canvas.clientHeight;

		var time = Date.now();
		var ptcBytes = ParticleMangerSupport.heapBytes(w, h);
		var ptcHeapNew = new ArrayBuffer(ptcBytes);
		if (ptcMan) {
			ParticleMangerSupport.heapResize(ptcHeap, width, height, ptcMan.getParticleCount(),
					ptcHeapNew, w, h);
		} else {
			// initParticle
		}
		ptcMan = ParticleManager(window, null, ptcHeapNew);
		ptcMan.init(ptcBytes, w, h);
		ptcHeap = ptcHeapNew;

		genVertices(w, h);

		var vCurveShader = newShader(VertexSource, gl.VERTEX_SHADER, {PROCESS_CURVE: 1});
		var vPlainShader = newShader(VertexSource, gl.VERTEX_SHADER, {});
		var fCurveShader = newShader(FragmentSource, gl.FRAGMENT_SHADER, {});
		curveProg = gl.createProgram();
		gl.attachShader(curveProg, vCurveShader);
		gl.attachShader(curveProg, vPlainShader);
		gl.linkProgram(curveProg);
		plainProg = gl.createProgram();
		gl.attachShader(plainProg, vPlainShader);
		gl.linkProgram(plainProg);

		gl.viewport(0, 0, scale*w, scale*h);

		canvas.width = width = w, canvas.height = height = h;
		render(time);
	}


	function renderUpdate(prevTime) {
		reportMouseMove();
		if (checkResize()) {
			gl.viewport(0, 0, canvas.width, canvas.height);
		} else {
			reportMouseMove();
		}
		clearMouseMove();
		var time = Date.now();
		ptcMan.progressTime(time-prevTime);
		checkReset();
		render(time);
	}

	function render(startTime) {
		gl.useProgram(plainProg);
		gl.drawElements();
		gl.useProgram(curveProg);
		gl.drawElements();
		gl.flush();
		requestAnimationFrame(renderUpdate.bind(undefined, startTime));
	}

	function checkResize() {
		var w = canvas.clientWidth;
		var h = canvas.clientHeight;
		var resized = 0;
		if (canvas.width !== w || canvas.height !== h) {
			canvas.width  = w;
			canvas.height = h;
			if (resetTimer !== Infinity)
				resetTimer = Infinity;
			resized = 1;
		}
		if (width !== w || height !== h) {
			if (resetTimer == Infinity)
				resetTimer = Date.now() + ResetWait;
		} else {
			if (resetTimer !== Infinity)
				resetTimer = Infinity;
		}
		return resized;
	}

	function checkReset() {
		var toreset = Date.now() > resetTimer;
		if (toreset) reset();
		return toreset;
	}

	function reportMouseMove() {
		if (mouseSttX > 0 && mouseEndX > 0) {
			var rect = e.target.getBoundingClientRect();
			var offX = rect.top, offY = rect.left;
			ptcMan.reportWind(mouseSttX - offX, mouseSttY - offY, mouseEndX - offX, mouseEndY - offY);
		}
	}
	function clearMouseMove() {
		mouseSttX = -1, mouseSttY = -1, mouseEndX = -1, mouseEndY = -1;
	}
	function onMouseMove(ev) {
		if (mouseSttX < 0)
			mouseSttX = ev.clientX, mouseSttY = ev.clientY;
		else
			mouseEndX = ev.clientX, mouseEndY = ev.clientY;
	}
	function onMouseOver(ev) {
		mouseSttX = ev.clientX, mouseSttY = ev.clientY;
	}
	function onMouseOut(ev) {
		mouseEndX = ev.clientX, mouseEndY = ev.clientY;
	}

	function newShader(src, type, option) {
		var shader = gl.createShader(type);

		var macros = "";
		for (var k in option) {
			var v = option[k];
			if (v == null)
				macros += "#define " + k + "\n";
			else
				macros += "#define " + k + " " + v + "\n";
		}

		gl.shaderSource(shader, macros + src);
		gl.compileShader(shader);
		if (gl.getShaderParameter(shader, gl.COMPILE_STATUS))
			return shader;
		else
			console.error(gl.getShaderInfoLog(shader));
	}

	function genVertices(w, h) {
		var vn = Math.round(w * h * VerticesDensity);
		var tn = 2*vn - 6; // it is the strict value, because the envelope is a tetragon
		verticesN = vn;
		trianglesN = tn;
	 	vertices = new Float32Array(2*vn);
		triangles = new Int32Array(3*tn);
		adjacencyDataIdx = new Int32Array(vn);
		adjacencyData = new Int32Array(3*tn);

		// init vertices
		for (var i = 0; i < 2*vn; ) {
			var x = w * Math.random();
			vertices[i++] = x;
			var y = h * Math.random();
			vertices[i++] = y;
		}

		// triangulate
		// TODO: port delaunay to asm.js
		var verticesAoS = [];
		for (var i = 0; i < vn; i++) {
			verticesAoS[i] = [];
			verticesAoS[i][0] = vertices[2*i];
			verticesAoS[i][1] = vertices[2*i+1];
		}
		var trianglesAoS = Delaunay.triangulate(verticesAoS);
		for (var i = 0; i < tn; i++) {
			triangles[3*i]   = trianglesAoS[i].i;
			triangles[3*i+1] = trianglesAoS[i].j;
			triangles[3*i+2] = trianglesAoS[i].k;
		}

		// get histgram
		for (var i = 0; i < 3*tn; ) {
			var p = triangles[i++];
			var q = triangles[i++];
			var r = triangles[i++];
			adjacencyDataIdx[p]++;
			adjacencyDataIdx[q]++;
			adjacencyDataIdx[r]++;
		}
		adjacencyDataIdx[0]++;
		adjacencyDataIdx[1]++;
		adjacencyDataIdx[2]++;
		adjacencyDataIdx[3]++;

		// accumrate histgram
		for (var i = 0, sum = 0; i < vn; i++) {
			v = adjacencyDataIdx[i];
			adjacencyDataIdx[i] = sum;
			adjacencyData[sum] = -v;
			sum += v;
		}

		// order data
		for (var i = 0; i < tn; ) {
			var a = triangles[i++];
			var b = triangles[i++];
			var c = triangles[i++];

			var add = function(p, q, r) {
				if (q < r) {
					var s = q;
					q = r;
					r = s;
				}
				// loop fusion can be faster, but it is complex and tiresome
				var j = adjacencyDataIdx[p];
				for (var stage = 0; stage < 2; q = r, stage++) {
					while (1) {
						var k = j++;
						v = adjacencyData[k];
						if (v === 0) {
							adjacencyData[k] = q;
							break;
						}
						if (q === v) {
							break;
						}
						if (q < v) {
							adjacencyData[k] = q;
							while (1) {
								w = adjacencyData[j];
								adjacencyData[j++] = v;
								if (w === 0) break;
								v = w;
							}
							break;
						}
					}
				}
			}
			add(a, b, c);
			add(b, c, a);
			add(c, a, b);
		}
	}

	return { init: init };
}

window.onload = function() { Fragilo().init(); };
