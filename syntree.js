
/* TODO:
 * Quotation marks to ignore special characters.
 * Should use a real parser / lexer, maybe regex
 * Deal with empty text nodes due to <> tags. Deal with this in lexer.
 * Add control points for movement lines below corners of lowest hanging intervening nodes.
 * 
 */

var debug = 0;
var padding = 15; // Number of pixels from tree to edge on each side.
var space_above_text = 4; // Lines will end this many pixels above text.
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
	this.draw_triangle = null;
	this.label = null; // Head of movement.
	this.tail = null; // Tail of movement.
	this.height = null; // Distance from root, where root has height 0.
	this.max_height = null; // Distance of the descendent of this node that is farthest from root.
	this.children = new Array();
	this.has_children;
	this.first = null;
	this.last = null;
	this.parent = null;
	this.next = null;
	this.previous = null;
	this.x = null; // Where the node will eventually be drawn.
	this.y = null;
	this.head_chain = null;
	this.tail_chain = null;
	this.starred = null;
}

Node.prototype.set_siblings = function(parent) {
	for (var i = 0; i < this.children.length; i++) {
		this.children[i].set_siblings(this);
	}
	
	this.has_children = (this.children.length > 0);
	this.parent = parent;
	
	if (this.has_children) {
		this.first = this.children[0];
		this.last = this.children[this.children.length - 1];
	}
	
	for (var i = 0; i < this.children.length - 1; i++) {
		this.children[i].next = this.children[i+1];
	}
	
	for (var i = 1; i < this.children.length; i++) {
		this.children[i].previous = this.children[i-1];
	}
}

function MovementLine() {
	this.head = null;
	this.tail = null;
	this.lca = null;
	this.dest_x = null;
	this.dest_y = null;
	this.bottom_y = null;
	this.max_height = null;
	this.should_draw = null;
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
	font_size = parseInt(document.f.fontsize.value);
	for (var i = 0; i < 3; i++) {
		if (document.f.fontstyle[i].checked) font_style = document.f.fontstyle[i].value;
	}
	
	// Initialize the canvas. TODO: make this degrade gracefully.
	// We need to set font options so that measureText works properly.
	try {
		ctx = document.getElementById('canvas').getContext('2d');
	} catch (err) {
		alert("Sorry, your browser is too outdated.");
	}
	ctx.textAlign = "center";
	ctx.font = font_size + "pt " + font_style;
	
	// Get the string and parse it.
	var str = document.f.i.value;

	str = close_brackets(str);
	root = parse(str);
	root.set_siblings(null);
	root.check_triangle();

	// Find out dimensions of the tree.
	root.set_width();
	root.find_height();
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
	var y_shift = font_size + padding;
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
	if (open < 0)
		throw "Too many open brackets.";
	while (open > 0) {
		str = str + "]";
		open--;
	}
	return str;
}

function get_tail(n, str) {
	// Get any movement information.
	// Make sure to collapse any spaces around <X> to one space, even if there is no space.	
	str = str.replace(/\s*<(\w+)>\s*/, 
	function(match, tail) {
		n.tail = tail;
		return " ";
	});
	return str;
}

function get_label(n, str) {
	str = str.replace(/_(\w+)$/, 
	function(match, label) {
		n.label = label;
		return "";
	});
	return str;
}

function parse(str) {
	var n = new Node();
	
	if (str[0] != "[") { // Text node
		n.type = "text";
		str = get_tail(n, str);
		str = str.replace(/^\s+/, "");
		str = str.replace(/\s+$/, "");
		n.value = str;
		return n;
	}

	n.type = "element";
	str = get_label(n, str);
	var i = 1;
	while ((str[i] != " ") && (str[i] != "[") && (str[i] != "]"))
		i++;
	if (str[i-1] == "*") {
		n.starred = 1;
		n.value = str.substr(1, i-2);
	} else {
		n.starred = 0;
		n.value = str.substr(1, i-1);
	}
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
	return n;
}



Node.prototype.check_triangle = function() {
	this.draw_triangle = 0;

	if ((this.type == "element") &&
		(this.children.length == 1) &&
		(this.first.type == "text") &&
		(this.starred)) {
			this.draw_triangle = 1;
	}

	for (var child = this.first; child != null; child = child.next) {
		child.check_triangle();
	}
}

Node.prototype.set_width = function() {

	var val_width = ctx.measureText(this.value).width;

	for (var child = this.first; child != null; child = child.next)
		child.set_width();
	
	if (this.type == "text") {
		this.left_width = val_width / 2;
		this.right_width = val_width / 2;
		return;
	}
	
	// Figure out how wide apart the children should be placed.
	// The spacing between them should be equal.
	this.step = 0;
	for (var child = this.first; (child != null) && (child.next != null); child = child.next) {
		var space = child.right_width + hor_space + child.next.left_width;
		this.step = Math.max(this.step, space);
	}
	
	this.left_width = 0.0;
	this.right_width = 0.0;
	
	if (this.has_children) {
		var sub = ((this.children.length - 1) / 2) * this.step;
		this.left_width = sub + this.first.left_width;
		this.right_width = sub + this.last.right_width;
	}
	
	this.left_width = Math.max(this.left_width, val_width / 2);
	this.right_width = Math.max(this.right_width, val_width / 2);

}

Node.prototype.find_height = function() {
	if (this.parent == null) {
		this.height = 0;
	} else {
		this.height = this.parent.height + 1;
	}
	
	this.max_height = 0;
	if (!this.has_children)
		this.max_height = this.height;
	
	for (var child = this.first; child != null; child = child.next) {
		child.find_height();
		this.max_height = Math.max(this.max_height, child.max_height);
	}
}



Node.prototype.assign_location = function(x, y) {
	this.x = x;
	this.y = y;
	
	if (this.type == "element") {
		var left_start = x - (this.step)*((this.children.length-1)/2);
		
		for (var i = 0; i < this.children.length; i++) {
			this.children[i].assign_location(left_start + i*(this.step), y + vert_space);
		}
	}
}

Node.prototype.draw = function() {
	
	if (this.type == "text") {
		ctx.fillText(this.value, this.x, this.y);
		return;
	}
	
	ctx.fillText(this.value, this.x, this.y);
	for (var child = this.first; child != null; child = child.next)
		child.draw();
	
	if (this.draw_triangle) {
		ctx.moveTo(this.x, this.y + space_below_text);
		ctx.lineTo(this.first.x - this.first.left_width, this.first.y - font_size - space_above_text);
		ctx.lineTo(this.first.x + this.first.right_width, this.first.y - font_size - space_above_text);
		ctx.lineTo(this.x, this.y + space_below_text);
		ctx.stroke();
	} else { // Draw lines to all children
		for (var child = this.first; child != null; child = child.next) {
			ctx.moveTo(this.x, this.y + space_below_text);
			ctx.lineTo(child.x, child.y - font_size - space_above_text);
			ctx.stroke();
		}
	}
}

MovementLine.prototype.draw = function() {
	ctx.moveTo(this.tail.x, this.tail.y + space_below_text);
	ctx.quadraticCurveTo(this.tail.x, this.bottom_y, (this.tail.x + this.dest_x) / 2, this.bottom_y);
	ctx.quadraticCurveTo(this.dest_x, this.bottom_y, this.dest_x, this.dest_y + space_below_text);
	ctx.stroke();
	// Arrowhead
	ctx.beginPath();
	ctx.lineTo(this.dest_x + 3, this.dest_y + space_below_text + 10);
	ctx.lineTo(this.dest_x - 3, this.dest_y + space_below_text + 10);
	ctx.lineTo(this.dest_x, this.dest_y + space_below_text);
	ctx.closePath();
	ctx.fillStyle = "#000000";
	ctx.fill();
}

function draw_movement() {
	for (var i = 0; i < movement_lines.length; i++) {
		if (movement_lines[i].should_draw) {
			movement_lines[i].draw();
		}
	}
}

Node.prototype.find_head = function(label) {
	for (var child = this.first; child != null; child = child.next) {
		var res = child.find_head(label);
		if (res != null)
			return res;
	}
	
	if (this.label == label) {
		return this;
	}
	return null;
}

Node.prototype.find_movement = function() {
	if (this.type == "element") {
		for (var child = this.first; child != null; child = child.next)
			child.find_movement();
	}
	if (this.tail != null) {
		var m = new MovementLine;
		m.tail = this;
		m.head = root.find_head(this.tail);
		movement_lines.push(m);
	}
}

Node.prototype.reset_chains = function() {
	this.head_chain = null;
	this.tail_chain = null;
	
	for (var child = this.first; child != null; child = child.next)
		child.reset_chains();
}

function set_up_movement() {
	for (var i = 0; i < movement_lines.length; i++) {
		root.reset_chains();
		movement_lines[i].set_up();
	}
}

MovementLine.prototype.set_up = function() {
	this.should_draw = 0;
	if ((this.tail == null) || (this.head == null))
		return;
	
	// Check to see if head is parent of tail,
	if (!this.check_head())
		return;
	
	// Find the last common ancestor.
	this.find_lca();
	if (this.lca == null)
		return;
	
	// Find out the greatest intervening height.
	this.find_intervening_height();
	
	this.dest_x = this.head.x;
	this.dest_y = this.head.max_height * vert_space;
	this.bottom_y = (this.max_height + 1) * vert_space;
	this.should_draw = 1;
	return;
}

MovementLine.prototype.check_head = function() {
	var n = this.tail;
	n.tail_chain = 1;
	while (n.parent != null) {
		n = n.parent;
		if (n == this.head)
			return 0;
		n.tail_chain = 1;
	}
	return 1;
}

MovementLine.prototype.find_lca = function() {
	var n = this.head;
	n.head_chain = 1;
	this.lca = null;
	while (n.parent != null) {
		n = n.parent;
		n.head_chain = 1;
		if (n.tail_chain) {
			this.lca = n;
			break;
		}
	}
}

MovementLine.prototype.find_intervening_height = function() {
	this.max_height = 0;
	var n = this.lca;
	var child = n.first;
	for (; child != null; child = child.next) {
		if ((child.head_chain) || (child.tail_chain)) {
			this.max_height = Math.max(child.find_intervening_height("right"), this.max_height);
			child = child.next;
			break;
		}
	}
	
	for (; child != null; child = child.next) {
		if ((child.head_chain) || (child.tail_chain)) {
			this.max_height = Math.max(child.find_intervening_height("left"), this.max_height);
			break;
		} else {
			this.max_height = Math.max(child.find_intervening_height("all"), this.max_height);
		}
	}
}

Node.prototype.find_intervening_height = function(direction) {
	var length = this.children.length;
	var max_height = this.height;
	
	if (!this.has_children) {
		return this.height;
	}
	
	if (direction == "all") {
		for (var child = this.first; child != null; child = child.next)
			max_height = Math.max(child.find_intervening_height("all"), max_height);
		return max_height;
	}
	
	var child = this.first;
	for (; child != null; child = child.next) {
		if ((child.head_chain) || (child.tail_chain)) {
			max_height = Math.max(child.find_intervening_height(direction), max_height);
			break;
		}
	}
	
	if (child == null) {
		return this.max_height;
	}
	
	while (child != null) {
		if (direction == "right")
			child = child.next;
		if (direction == "left")
			child = child.previous;
		if (child != null)
			max_height = Math.max(child.find_intervening_height("all"), max_height);
	}
	
	return max_height;
}

function set_window_height() {
	var h = (root.max_height) * vert_space + font_size + 2 * padding;
	// Problem: movement lines may protrude from bottom.
	for (var i = 0; i < movement_lines.length; i++) {
		var m = movement_lines[i];
		if (m.max_height == root.max_height)
			h += vert_space;
	}
	return h;
}