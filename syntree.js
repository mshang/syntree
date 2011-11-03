
/* TODO:
 * Read is_phrase attribute to draw triangles.
 * Check well-formedness of XML.
 * Escape characters for "<", ">", "[", "]", " ", in both tag names and data.
 * Subscripts.
 * Support for "<NP></NP>" in XML.
 * Exceptions for ill-formed.
 * remove_spaces, replace and square_to_xml should be prototype methods of string, called with dot.
 * Note in help file that there must be a space between "[NP" and data.
 * 
 */

var vert_space;
var hor_space;
var font_size;
var font_style;
var tree_height = 0;
var ctx;

function go() {

	// Initialize the various options.
	vert_space = parseInt(document.f.vertspace.value);
	hor_space = parseInt(document.f.horspace.value);
	font_size = document.f.fontsize.value;
	for (var i = 0; i < 3; i++) {
		if (document.f.fontstyle[i].checked) font_style = document.f.fontstyle[i].value;
	}
	
	// Initialize the canvas. TODO: make this degrade gracefully.
	// We need to set font options so that measureText works properly.
	ctx = document.getElementById('canvas').getContext('2d');
	ctx.textAlign = "center";
	ctx.font = font_size + "pt " + font_style;
	
	// Get the string and parse it.
	var str = document.f.i.value;
	if (str[0] == "[") {
		str = remove_spaces(square_to_xml(str));
	}
		
	if (str[0] == "<") {
		try{ var xml = $.parseXML(str); } catch(err) {
			alert("Ill-formed XML");
		}
		var root = xml.documentElement;
		Node.prototype.check_phrase = check_phrase;
		Node.prototype.set_widths = set_widths;
		Node.prototype.find_height = find_height;
		Node.prototype.draw = draw;
		
		root.check_phrase();
		root.set_widths();
		root.find_height(0);
		var width = 1.2 * (root.left_width + root.right_width);
		var height = (tree_height + 1) * vert_space * 1;
		clear(root, width, height);
		root.draw(0, 0);
		
	} else {
		alert("Ill-formed. Input must start with a bracket.");
	}
	
	var new_img = Canvas2Image.saveAsPNG(ctx.canvas, true);
	new_img.id = "treeimg";
	new_img.border = "1";
	var old_img = document.getElementById('treeimg');
	old_img.parentNode.replaceChild(new_img, old_img);
	ctx.canvas.style.display = "none";
	
	/* debug
	alert(JSON.stringify(root));
	*/
}

function clear(root, width, height) {
	var canvas = document.createElement("canvas");
	canvas.id = "canvas";
	canvas.width = width;
	canvas.height = height;
	ctx.canvas.parentNode.replaceChild(canvas, ctx.canvas);
	ctx = canvas.getContext('2d');
	ctx.fillStyle = "rgb(255, 255, 255)";
	ctx.fillRect(0, 0, width, height);
	ctx.fillStyle = "rgb(0, 0, 0)";
	ctx.textAlign = "center";
	ctx.font = font_size + "pt " + font_style;
	var x_shift = root.left_width + 0.1 * (root.left_width + root.right_width);
	var y_shift = 0.3 * (height / tree_height) + font_size/2;
	ctx.translate(x_shift, y_shift);
	// Ready to draw.
}

function square_to_xml(str) {
	for (var i = 0; i < str.length; i++) {
		if (str[i] == "[") {
			var j = i + 1;
			while (test_alpha(str[j])) {
				j++;
			}
			if (j == i + 1) {
				alert("Ill-formed.");
				return 0;
			}
			var cat = str.substring(i+1, j)
			str = replace(str, i, j, "<" + cat + ">");
			
			var level = 1;
			for (j = i + 1; j < str.length; j++) {
				if (str[j] == "[") {
					level++;
				} else if (str[j] == "]") {
					level--;
					if (level == 0) {
						// Do stuff.
						str = replace(str, j, j+1, "</" + cat + ">");
						break;
					}
				}
			}
		}
	}
	return str;
}

function replace(str, from, to, ins) {
	// Character at position "from" will not be in the output, "to" will.
	return str.substring(0, from) + ins + str.substring(to);
}

function test_alpha(ch) {
	return (ch.search(/\w/) != -1);
}

function check_phrase() {
	this.is_phrase = 0;
	if (this.nodeType == 1) {
		if ((this.nodeName[this.nodeName.length - 1] == "P")
				&& (this.nodeName.length != 1)) {
			this.is_phrase = 1;
		}
		for (var i = 0, current = this.firstChild;
				i < this.childNodes.length; 
				i++, current = current.nextSibling) {
			current.check_phrase();
		}
	}
}

function remove_spaces(str) {
	for (var i = 0; i < str.length; i++) {
		if (str[i] == ">") {
			var j = i + 1;
			while (str[j] == " ") {
				str = str.substring(0, j) + str.substring(j + 1);
				j++;
			}
		}
	}

	for (var i = str.length-1; i < 0; i--) {
		if (str[i] == "<") {
			while (str[i-1] == " ") {
				str = str.substring(0, i-2) + str.substring(i-1);
				i--;
			}
		}
	}
	return str;
}

function set_widths() {
	switch(this.nodeType) {
	case 1:
		for (var i = 0, current = this.firstChild;
				i < this.childNodes.length; 
				i++, current = current.nextSibling) {
			current.set_widths();
		}
		
		// Figure out how wide apart the children should be placed.
		// The spacing between them should be equal.
		this.step = 0;
		for (var i = 0, current = this.firstChild;
				i < this.childNodes.length - 1; 
				i++, current = current.nextSibling) {
			var space = current.right_width + hor_space + current.nextSibling.left_width;
			if (space > this.step) {
				this.step = space;
			}
		}
		
		var sub = ((this.childNodes.length - 1) / 2) * this.step;
		this.left_width = sub + this.firstChild.left_width;
		this.right_width = sub + this.lastChild.right_width;
		
		break;
	case 3: // Text node
		this.left_width = ctx.measureText(this.nodeValue).width / 2;
		this.right_width = this.left_width;
		break;
	}
}

function find_height(h) {
	if (h > tree_height) {
		tree_height = h;
	}
	
	for (var i = 0, current = this.firstChild;
			i < this.childNodes.length; 
			i++, current = current.nextSibling) {
		current.find_height(h+1);
	}
}

function draw(x, y) {
	switch (this.nodeType) {
	case 1:
		ctx.fillText(this.nodeName, x, y);
		for (var i = 0, current = this.firstChild;
				i < this.childNodes.length; 
				i++, current = current.nextSibling) {
			var left_start = x - (this.step)*((this.childNodes.length-1)/2);
			current.draw(left_start + i*(this.step), y + vert_space);
		}
		
		// If there is only one child, it is a text node, and I am a phrase node, draw triangle.
		if ((this.childNodes.length == 1)
				&& (this.firstChild.nodeType == 3)
				&& (this.is_phrase)) {
			ctx.moveTo(x, y + font_size * 0.2);
			ctx.lineTo(x - this.left_width, y + vert_space - font_size * 1.2);
			ctx.lineTo(x + this.right_width, y + vert_space - font_size * 1.2);
			ctx.lineTo(x, y + font_size * 0.2);
			ctx.stroke();
		} else { // Draw lines to all children
			for (var i = 0, current = this.firstChild;
					i < this.childNodes.length; 
					i++, current = current.nextSibling) {
				var left_start = x - (this.step)*((this.childNodes.length-1)/2);
				ctx.moveTo(x, y + font_size * 0.2);
				ctx.lineTo(left_start + i*(this.step), y + vert_space - font_size * 1.2);
				ctx.stroke();
			}
		}
		
		break;
	case 3: // Text node
		ctx.fillText(this.nodeValue, x, y);
		break;
	}
}
