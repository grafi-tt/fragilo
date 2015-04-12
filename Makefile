fragilo.js: LICENSE fragment.glsl vertex.glsl main.js particle.js delaunay/delaunay.js
	@> $@
	@echo "/*" >> $@
	@cat LICENSE >> $@
	@echo "*/" >> $@
	@echo "(function(){" >> $@
	@echo "var VertexSource =" >> $@
	@sed -e's/"/\"/g' -e's/\\/\\\\/g' -e's/^/"/' -e's/$$/\\n"+/' -e'$$s/\+$$/;/' vertex.glsl >> $@
	@echo "var FragmentSource =" >> $@
	@sed -e's/"/\"/g' -e's/\\/\\\\/g' -e's/^/"/' -e's/$$/\\n"+/' -e'$$s/\+$$/;/' fragment.glsl >> $@
	@gcc -E -P -x c++ main.js >> $@
	@gcc -E -P -x c++ particle.js >> $@
	@echo "// Delaunay: https://github.com/ironwallaby/delaunay" >> $@
	@echo "// CC0 License" >> $@
	@cat delaunay/delaunay.js >> $@
	@echo "})();" >> $@

.PHONY: clean
clean:
	rm -f fragilo.js
