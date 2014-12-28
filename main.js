/*
The zlib/libpng License

Copyright (c) 2014 grafi (Shunsuke Shimizu)

This software is provided 'as-is', without any express or implied warranty. In no event will the authors be held liable for any damages arising from the use of this software.

Permission is granted to anyone to use this software for any purpose, including commercial applications, and to alter it and redistribute it freely, subject to the following restrictions:

	1. The origin of this software must not be misrepresented; you must not claim that you wrote the original software. If you use this software in a product, an acknowledgment in the product documentation would be appreciated but is not required.

	2. Altered source versions must be plainly marked as such, and must not be misrepresented as being the original software.

	3. This notice may not be removed or altered from any source distribution.
*/

function Fragilo() {
	var gl;
	var vShader;
	var ptcMan, ptcHeapView;

	var width, height;
	var resetSchedId;
	var resetWait = 1000; // world will be reset 1000ms after last resizing

	var mouseSttX = -1, mouseSttY = -1, mouseEndX = -1, mouseEndY = -1;

	function init() {
		var c = document.getElementById('fragilo');
		c.addEventListener("mousemove", onMouseMove, false);
		c.addEventListener("mouseover", onMouseOver, false);
		c.addEventListener("mouseout" , onMouseOut , false);

		gl = c.getContext('webgl') || c.getContext('experimental-webgl');
		var shader;
		gl.shaderSource(shader, hoge);
		gl.compileShader(shader);

		var w = c.clientWidth;
		var h = c.clientHeight;
		reset(w, h);
		gl.viewport(0, 0, w, h);
	}

	function reset(w, h) {
		resetSchedId = null;
		genVertexes(w, h);

		var time = Time.now();
		var ptcHeapNew = new ArrayBuffer(ParticleMangerSupport.heapBytes(width, height));
		if (ptcMan) {
			ParticleMangerSupport.heapResize(ptcHeap, width, height, ptcMan.getParticleCount(),
					ptcHeapNew, w, h);
		} else {
			// initParticle
		}
		ptcMan = ParticleManager(window, null, ptcHeapNew);
		ptcMan.init(ptcBytes, w, h);
		ptcHeap = ptcHeapNew;

		gl.viewport(0, 0, w, h);
		width = w, height = h;
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
		var time = Time.now();
		ptcMan.progressTime(time-prevTime);
		render(time);
	}

	function render(startTime) {
		gl.drawElements();
		gl.flush();
		requestAnimationFrame(renderUpdate.bind(undefined, startTime));
	}

	function checkResize() {
		var w = canvas.clientWidth;
		var h = canvas.clientHeight;
		var resized = 0;
		if (canvas.width != w || canvas.height != h) {
			canvas.width  = w;
			canvas.height = h;
			if (resetSchedId != null) {
				clearTimeout(resetSchedId);
				resetSchedId = null;
			}
			resized = 1;
		}
		if (width != w || height != h) {
			if (resetSchedId == null) {
				resetSchedId = setTimeout(reset, resetWait);
			}
		} else {
			if (resetSchedId != null) {
				resetSchedId = setTimeout(reset, resetWait);
				resetSchedId = null;
			}
		}
		return resized;
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

	return { init: init };
}

window.onload = function() { Fragilo().init(); };
