
/* TODO:
 * Movement:
 * Destinations labelled with _# directly after closing square bracket (e.g. [NP Miles]_1)
 * Only numeric labels.
 * Sources indicated with <#> anywhere within text.
 * Make sure that destination is not parent of source.
 * 
 */

var vert_space;
var hor_space;
var font_size;
var font_style;
var tree_height = 0;
var ctx;

function Node() {
	this.type = null;
	this.value = null;
	this.step = null;
	this.is_phrase = null;
	this.label = null;
	this.height = null;
	this.children = new Array();
}

function go() {

	// Initialize the various options.
	vert_space = parseInt(document.f.vertspace.value);
	hor_space = parseInt(document.f.horspace.value);
	font_size = document.f.fontsize.value;
	for (var i = 0; i < 3; i++) {
		if (document.f.fontstyle[i].checked) font_style = document.f.fontstyle[i].value;
	}
	tree_height = 0;
	
	// Initialize the canvas. TODO: make this degrade gracefully.
	// We need to set font options so that measureText works properly.
	ctx = document.getElementById('canvas').getContext('2d');
	ctx.textAlign = "center";
	ctx.font = font_size + "pt " + font_style;
	
	// Get the string and parse it.
	var str = document.f.i.value;

	str = close_brackets(str);
	var root = parse(str);
	root.check_phrase();
	alert(JSON.stringify(root));

	// Find out dimensions of the tree.
	root.set_width();
	root.find_height(0);
	var width = 1.2 * (root.left_width + root.right_width);
	var height = (tree_height + 1) * vert_space * 1;
	
	// Make a new canvas. Required for IE compatability.
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
	
	root.draw(0, 0);
	
	var new_img = Canvas2Image.saveAsPNG(ctx.canvas, true);
	new_img.id = "treeimg";
	new_img.border = "1";
	var old_img = document.getElementById('treeimg');
	old_img.parentNode.replaceChild(new_img, old_img);
	ctx.canvas.style.display = "none";
}

function close_brackets(str) {
	var open = 0;
	for (var i = 0; i < str.length; i++) {
		if (str[i] == "[")
			open++;
		if (str[i] == "]")
			open--;
	}
	while (open > 0) {
		str = str + "]";
		open--;
	}
	return str;
}

function parse(str) {
	// This function should only set the type and value properties.
	var n = new Node();
	
	if (str[0] != "[") { // Text node
		n.type = "text";
		var i = 0;
		while (str[i] == " ")
			i++;
		var j = str.length - 1;
		while (str[j] == " ")
			j--;
		n.value = str.substring(i, j+1);
		return n;
	}
	
	// Element node.
	n.type = "element";
	var i = 1;
	while ((str[i] != " ") && (str[i] != "[") && (str[i] != "]"))
		i++;
	n.value = str.substr(1, i-1);
	while (str[i] == " ")
		i++;
	if (str[i] != "]") {
		var level = 1;
		var start = i;
		for (; i < str.length; i++) {
			var temp = level;
			if (str[i] == "[")
				level++;
			if (str[i] == "]")
				level--;
			if (((temp == 1) && (level == 2)) || ((temp == 1) && (level == 0))) {
				if (str.substring(start, i).search(/\w/) > -1) {
					n.children.push(parse(str.substring(start, i)));
				}
				start = i;
			}
			if ((temp == 2) && (level == 1)) {
				if (str[i+1] == "_") { // Must include label.
					i += 2;
					while (str[i].search(/\w/) > -1)
						i++;
					i--;
				}
				n.children.push(parse(str.substring(start, i+1)));
				start = i+1;
			}
		}
	}
	
	var j = str.length-1;
	while (str[j] != "]")
		j--;
	// j sits on "]", j+1 sits on "_", so the label is j+2 to the end
	if (j+2 < str.length)
		n.label = str.substring(j+2);
	
	return n;
}

Node.prototype.check_phrase = function() {
	this.is_phrase = 0;

	if (this.type == "element") {
		if ((this.value[this.value.length-1] == "P") && (this.value.length > 1))
			this.is_phrase = 1;
	}

	for (var i = 0; i < this.children.length; i++) {
		this.children[i].check_phrase();
	}
}

Node.prototype.set_width = function() {

	var length = this.children.length;

	for (var i = 0; i < length; i++) {
		this.children[i].set_width();
	}
	
	if (this.type == "text") {
		this.left_width = ctx.measureText(this.value).width / 2;
		this.right_width = this.left_width;
	} else {
	
		// Figure out how wide apart the children should be placed.
		// The spacing between them should be equal.
		this.step = 0;
		for (var i = 0; i < length - 1; i++) {
			var space = this.children[i].right_width + hor_space + this.children[i+1].left_width;
			if (space > this.step) {
				this.step = space;
			}
		}
		
		var sub = ((length - 1) / 2) * this.step;
		this.left_width = sub + this.children[0].left_width;
		this.right_width = sub + this.children[length-1].right_width;
	}
}

Node.prototype.find_height = function(h) {
	this.height = h;

	if (h > tree_height) {
		tree_height = h;
	}
	
	for (var i = 0; i < this.children.length; i++) {
		this.children[i].find_height(h + 1);
	}
}

Node.prototype.draw = function(x, y) {
	var length = this.children.length;
	
	if (this.type == "text") {
		ctx.fillText(this.value, x, y);
		return;
	}
	
	ctx.fillText(this.value, x, y);
	for (var i = 0; i < length; i++) {
		var left_start = x - (this.step)*((length-1)/2);
		this.children[i].draw(left_start + i*(this.step), y + vert_space);
	}
	
	// If there is only one child, it is a text node, and I am a phrase node, draw triangle.
	if ((length == 1) && (this.children[0].type == "text") && (this.is_phrase)) {
		ctx.moveTo(x, y + font_size * 0.2);
		ctx.lineTo(x - this.left_width, y + vert_space - font_size * 1.2);
		ctx.lineTo(x + this.right_width, y + vert_space - font_size * 1.2);
		ctx.lineTo(x, y + font_size * 0.2);
		ctx.stroke();
	} else { // Draw lines to all children
		for (var i = 0; i < length; i++) {
			var left_start = x - (this.step)*((length-1)/2);
			ctx.moveTo(x, y + font_size * 0.2);
			ctx.lineTo(left_start + i*(this.step), y + vert_space - font_size * 1.2);
			ctx.stroke();
		}
	}
}
