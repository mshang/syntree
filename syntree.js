
/* TODO:
 *
 * Deal with empty categories.
 * 
 */

var debug = 1;
var padding = 15; // Number of pixels from tree to edge on each side.
var space_above_text = 4; // Lines will end this may pixels above text.
var space_below_text = 4;
var vert_space;
var hor_space;
var font_size;
var font_style;
var ctx;
var root;
var movement_lines = new Array();

function Node() {
	this.type = null; // "text" or "element"
	this.value = null;
	this.step = null; // Horizontal distance between children.
	this.is_phrase = null; // Should draw triangle?
	this.label = null; // Head of movement.
	this.tail = null; // Tail of movement.
	this.height = null; // Distance from root, where root has height 0.
	this.max_height = null; // Distance of the descendent of this node that is farthest from root.
	this.children = new Array();
	this.parent = null;
	this.x = null; // Where the node will eventually be drawn.
	this.y = null;
}

function MovementLine() {
	this.head = null;
	this.tail = null;
	this.lca = null;
	this.dest_x = null;
	this.dest_y = null;
	this.bottom_y = null;
}

function handler() {
	if (debug) {
		go();
	} else {
		try {
			go();
		} catch (err) {	}
	}
}

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

	str = close_brackets(str);
	root = parse(str, null);
	root.check_phrase();

	// Find out dimensions of the tree.
	root.set_width();
	root.find_height(0);
	root.assign_location(0, 0);
	movement_lines = new Array();
	root.find_movement();
	set_up_movement();
	set_up_canvas();
	root.draw();
	draw_movement();
	swap_out_image();
	//alert(JSON.stringify(root));
}

function set_up_canvas() {
	var width = root.left_width + root.right_width + 2 * padding;
	var height = set_window_height();
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
	var x_shift = root.left_width + padding;
	var y_shift = parseInt(font_size) + padding;
	ctx.translate(x_shift, y_shift);
}

function swap_out_image() {
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

Node.prototype.get_tail = function(str) {
	// Get any movement information.
	// Make sure to collapse any spaces around <X> to one space, even if there is no space.
	for (var i = 0; i < str.length; i++) {
		if (str[i] == "<") {
			var j = i;
			while ((j < str.length) && (str[j] != ">"))
				j++;
			if (j == str.length)
				throw "Did not find matching angle bracket.";
			if (i+1 < j)
				this.tail = str.substring(i+1, j);
			// i lies on "<", j lies on ">"
			i--;
			while (str[i] == " ")
				i--;
			j++;
			while (str[j] == " ")
				j++;
			return str.substring(0, i+1) + " " + str.substring(j);
		}
	}
	return str;
}

function parse(str, parent) {
	var n = new Node();
	n.parent = parent;
	
	if (str[0] != "[") { // Text node
		n.type = "text";
		str = n.get_tail(str);
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
					n.children.push(parse(str.substring(start, i), n));
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
				n.children.push(parse(str.substring(start, i+1), n));
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
	var val_width = ctx.measureText(this.value).width;

	for (var i = 0; i < length; i++) {
		this.children[i].set_width();
	}
	
	if (this.type == "text") {
		this.left_width = val_width / 2;
		this.right_width = val_width / 2;
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
		
		this.left_width = Math.max(this.left_width, val_width / 2);
		this.right_width = Math.max(this.right_width, val_width / 2);
	}
}

Node.prototype.find_height = function(h) {
	this.height = h;
	
	this.max_height = 0;
	if (this.children.length == 0) {
		this.max_height = this.height;
	}
	
	for (var i = 0; i < this.children.length; i++) {
		this.children[i].find_height(h + 1);
		if (this.max_height < this.children[i].max_height)
			this.max_height = this.children[i].max_height;
	}
}

Node.prototype.assign_location = function(x, y) {
	this.x = x;
	this.y = y;
	
	if (this.type == "element") {
		var length = this.children.length;
		var left_start = x - (this.step)*((length-1)/2);
		
		for (var i = 0; i < length; i++) {
			this.children[i].assign_location(left_start + i*(this.step), y + vert_space);
		}
	}
}

Node.prototype.draw = function() {
	var length = this.children.length;
	
	if (this.type == "text") {
		ctx.fillText(this.value, this.x, this.y);
		return;
	}
	
	ctx.fillText(this.value, this.x, this.y);
	for (var i = 0; i < length; i++) {
		this.children[i].draw();
	}
	
	// If there is only one child, it is a text node, and I am a phrase node, draw triangle.
	if ((length == 1) && (this.children[0].type == "text") && (this.is_phrase)) {
		var child = this.children[0];
		ctx.moveTo(this.x, this.y + space_below_text);
		ctx.lineTo(child.x - child.left_width, child.y - font_size - space_above_text);
		ctx.lineTo(child.x + child.right_width, child.y - font_size - space_above_text);
		ctx.lineTo(this.x, this.y + space_below_text);
		ctx.stroke();
	} else { // Draw lines to all children
		for (var i = 0; i < length; i++) {
			var child = this.children[i];
			ctx.moveTo(this.x, this.y + space_below_text);
			ctx.lineTo(child.x, child.y - font_size - space_above_text);
			ctx.stroke();
		}
	}
}

function draw_movement() {
	for (var i = 0; i < movement_lines.length; i++) {
		var m = movement_lines[i];
		ctx.moveTo(m.tail.x, m.tail.y + space_below_text);
		ctx.quadraticCurveTo(m.tail.x, m.bottom_y, (m.tail.x + m.dest_x) / 2, m.bottom_y);
		ctx.quadraticCurveTo(m.dest_x, m.bottom_y, m.dest_x, m.dest_y + space_below_text);
		ctx.stroke();
		// Arrowhead
		ctx.beginPath();
		ctx.lineTo(m.dest_x + 3, m.dest_y + space_below_text + 10);
		ctx.lineTo(m.dest_x - 3, m.dest_y + space_below_text + 10);
		ctx.lineTo(m.dest_x, m.dest_y + space_below_text);
		ctx.closePath();
		ctx.fillStyle = "#000000";
		ctx.fill();
	}
}

Node.prototype.find_head = function(label) {
	for (var i = 0; i < this.children.length; i++) {
		var res = this.children[i].find_head(label);
		if (res != null)
			return res;
	}
	
	if (this.label == label) {
		return this;
	} else {
		return null;
	}
}

Node.prototype.find_movement = function() {
	if (this.type == "element") {
		for (var i = 0; i < this.children.length; i++) {
			this.children[i].find_movement();
		}
	} else if (this.type == "text") {
		if (this.tail != null) {
			var m = new MovementLine;
			m.tail = this;
			m.head = root.find_head(this.tail);
			movement_lines.push(m);
		}
	} else {
		throw "Trying to find movement. type not recognized.";
	}
}

function set_up_movement() {
	for (var i = 0; i < movement_lines.length; i++) {
		var m = movement_lines[i];
		if ((m.tail == null) || (m.head == null))
			throw "Null head or tail.";
		// Check to see if head is parent of tail,
		// while also marking tail chain to easily detect last common ancestor.
		var n = m.tail;
		while (n.parent != null) {
			n = n.parent;
			if (n == m.head)
				throw "Head of movement is parent of tail.";
			n.tail_chain = 1;
		}
		
		// Find the max height intervening between tail and head.
		// First, must find the last common ancestor.
		n = m.head;
		m.lca = null;
		while (n.parent != null) {
			n = n.parent;
			if (n.tail_chain) {
				m.lca = n;
				break;
			}
		}
		if (m.lca == null)
			throw "Could not find common ancestor.";
		
		m.dest_x = m.head.x;
		m.dest_y = m.head.max_height * vert_space;
		m.bottom_y = (m.lca.max_height + 1) * vert_space;
	}
}

function set_window_height() {
	var h = (root.max_height) * vert_space + parseInt(font_size) + 2 * padding;
	// Problem: movement lines may protrude from bottom.
	for (var i = 0; i < movement_lines.length; i++) {
		var m = movement_lines[i];
		if (m.lca.max_height == root.max_height)
			h += vert_space;
	}
	return h;
}