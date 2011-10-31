
/* TODO:
 * Spaces between brackets should be ignored.
 * Multiple spaces should be condensed to one space.
 * Rename level_height and width_pad to vertical and horizontal spacing.
 * Read is_phrase attribute to draw triangles.
 * Check well-formedness of XML.
 * There are many redundancies between XML and square bracket format.
 */

var level_height;
var width_pad;
var font_size;
var font_style;
var tree_height = 0;
var ctx;

function go() {

	// Initialize the various options.
	level_height = parseInt(document.f.vertspace.value);
	width_pad = parseInt(document.f.horspace.value);
	font_size = document.f.fontsize.value;
	for (var i = 0; i < 3; i++) {
		if (document.f.fontstyle[i].checked) font_style = document.f.fontstyle[i].value;
	}
	
	// Initialize the canvas. TODO: make this degrade gracefully.
	ctx = document.getElementById('canvas').getContext('2d');
	ctx.textAlign = "center";
	ctx.font = font_size + "pt " + font_style;
	
	// Get the string and parse it.
	var s = document.f.i.value;
	if (s[0] == "[") {
		var root = parse(s, ctx);
	
		// Find out dimensions of the tree and set the size of the canvas to suit.
		set_widths(root);
		find_height(root, 0);
		var width = 1.2 * (root.left_width + root.right_width);
		var height = (tree_height + 1) * level_height * 1;
		ctx.canvas.width = width;
		ctx.canvas.height = height;
		
		// Set various styles. Recursively draw.
		ctx.fillStyle = "rgb(255, 255, 255)";
		ctx.fillRect(0, 0, width, height)
		ctx.fillStyle = "rgb(0, 0, 0)";
		ctx.textAlign = "center";
		ctx.font = font_size + "pt " + font_style;
		ctx.translate(root.left_width + 0.1 * (root.left_width + root.right_width), 0.3 * (height / tree_height) + font_size/2);
		draw(root, 0, 0);
		ctx.canvas.style.visibility = "visible";
		
	} else if (s[0] == "<") {
		var xml = $.parseXML(s);
		var root = xml.documentElement;
		Node.prototype.check_phrase_xml = check_phrase_xml;
		Node.prototype.set_widths_xml = set_widths_xml;
		Node.prototype.find_height_xml = find_height_xml;
		Node.prototype.draw_xml = draw_xml;
		
		root.check_phrase_xml();
		root.set_widths_xml();
		root.find_height_xml(0);
		var width = 1.2 * (root.left_width + root.right_width);
		var height = (tree_height + 1) * level_height * 1;
		ctx.canvas.width = width;
		ctx.canvas.height = height;
		
		// Set various styles. Recursively draw.
		ctx.fillStyle = "rgb(255, 255, 255)";
		ctx.fillRect(0, 0, width, height)
		ctx.fillStyle = "rgb(0, 0, 0)";
		ctx.textAlign = "center";
		ctx.font = font_size + "pt " + font_style;
		ctx.translate(root.left_width + 0.1 * (root.left_width + root.right_width), 0.3 * (height / tree_height) + font_size/2);
		root.draw_xml(0, 0);
		ctx.canvas.style.visibility = "visible";
		
	} else {
		alert("Ill-formed. Input must start with a bracket.");
	}
		
	// Enable "save as" buttons
	document.f.saveaspng.disabled = false;
	document.f.saveasbmp.disabled = false;
	document.f.saveasjpeg.disabled = false;
	
	/* debug
	alert(JSON.stringify(root));
	*/
}

function check_phrase_xml() {
	this.is_phrase = 0;
	if (this.nodeType == 1) {
		if ((this.nodeName[this.nodeName.length - 1] == "P")
				&& (this.nodeName.length != 1)) {
			this.is_phrase = 1;
		}
		for (var i = 0, current = this.firstChild;
				i < this.childNodes.length; 
				i++, current = current.nextSibling) {
			current.check_phrase_xml();
		}
	}
}

function parse(ss, ctx) {
	var node = new Object();
	node.children = new Array();
	var cchild = 0;
	
	if ((ss[0] != "[") || (ss[ss.length - 1] != "]")) {
		alert("Ill-formed.");
		return 0;
	}
	
	var start = 1;
	while ((ss[start] != " ") && (ss[start] != "[") && (ss[start] != "]")) {
		start++;
	}
	if (ss[start] == "]") {
		node.text = ss.substr(1, start-1);
		return node;
	}
	
	node.type = ss.substr(1, start-1);
	node.is_phrase = 0;
	if ((node.type[node.type.length - 1] == "P") && (node.type.length != 1)) {
		node.is_phrase = 1;
	}
	while (ss[start] == " ") {
		start++;
	}
	
	if (ss[start] == "[") {
		var current = start;
		var cstart = start;
		var level = 0;
		while (current < ss.length - 1) {
		
			if (ss[current] == "[") {
				level++;
				if (level == 1) {
					cstart = current;
				}
			}
			
			if (ss[current] == "]") {
				level--;
				if (level == 0) {
					node.children[cchild] = parse(ss.substr(cstart, current - cstart + 1), ctx);
					cchild++;
				}
			}
			
			current++;
		}
	} else {
		node.text = ss.substr(start, ss.length - start - 1);
	}
	
	return node;
}

function set_widths(n) {

	var length = n.children.length;

	for (var i = 0; i < length; i++) {
		set_widths(n.children[i]);
	}
	
	if ('text' in n) {
		n.left_width = ctx.measureText(n.text).width / 2;
		n.right_width = n.left_width;
	} else {
	
		// Figure out how wide apart the children should be placed.
		// The spacing between them should be equal.
		n.step = 0;
		for (var i = 0; i < length - 1; i++) {
			var space = n.children[i].right_width + width_pad + n.children[i+1].left_width;
			if (space > n.step) {
				n.step = space;
			}
		}
		
		var sub = ((length - 1) / 2) * n.step;
		n.left_width = sub + n.children[0].left_width;
		n.right_width = sub + n.children[length-1].right_width;
	}
}

function set_widths_xml() {
	switch(this.nodeType) {
	case 1:
		for (var i = 0, current = this.firstChild;
				i < this.childNodes.length; 
				i++, current = current.nextSibling) {
			current.set_widths_xml();
		}
		
		// Figure out how wide apart the children should be placed.
		// The spacing between them should be equal.
		this.step = 0;
		for (var i = 0, current = this.firstChild;
				i < this.childNodes.length - 1; 
				i++, current = current.nextSibling) {
			var space = current.right_width + width_pad + current.nextSibling.left_width;
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

function find_height(n, h) {

	if ('text' in n) {h++;}
	if (h > tree_height) {
		tree_height = h;
	}
	
	for (var i = 0; i < n.children.length; i++) {
		find_height(n.children[i], h + 1);
	}
}

function find_height_xml(h) {
	if (h > tree_height) {
		tree_height = h;
	}
	
	for (var i = 0, current = this.firstChild;
			i < this.childNodes.length; 
			i++, current = current.nextSibling) {
		current.find_height_xml(h+1);
	}
}

function draw(n, x, y) {
	var length = n.children.length;
	
	if ('type' in n) {
		ctx.fillText(n.type, x, y);
		if ('text' in n) {
			ctx.fillText(n.text, x, y + level_height);
			if (n.is_phrase) {
				ctx.moveTo(x, y + font_size * 0.2);
				ctx.lineTo(x - n.left_width, y + level_height - font_size * 1.2);
				ctx.lineTo(x + n.right_width, y + level_height - font_size * 1.2);
				ctx.lineTo(x, y + font_size * 0.2);
				ctx.stroke();
			} else {
				ctx.moveTo(x, y + font_size * 0.2);
				ctx.lineTo(x, y + level_height - font_size * 1.2);
				ctx.stroke();
			}
		} else {
			for (var i = 0; i < length; i++) {
				var left_start = x - (n.step)*((length-1)/2);
				draw(n.children[i], left_start + i*(n.step), y + level_height);
				ctx.moveTo(x, y + font_size * 0.2);
				ctx.lineTo(left_start + i*(n.step), y + level_height - font_size * 1.2);
				ctx.stroke();
			}
		}
	} else {
		ctx.fillText(n.text, x, y);
	}
}

function draw_xml(x, y) {
	switch (this.nodeType) {
	case 1:
		ctx.fillText(this.nodeName, x, y);
		for (var i = 0, current = this.firstChild;
				i < this.childNodes.length; 
				i++, current = current.nextSibling) {
			var left_start = x - (this.step)*((this.childNodes.length-1)/2);
			current.draw_xml(left_start + i*(this.step), y + level_height);
		}
		
		// If there is only one child, it is a text node, and I am a phrase node, draw triangle.
		if ((this.childNodes.length == 1)
				&& (this.firstChild.nodeType == 3)
				&& (this.is_phrase)) {
			ctx.moveTo(x, y + font_size * 0.2);
			ctx.lineTo(x - this.left_width, y + level_height - font_size * 1.2);
			ctx.lineTo(x + this.right_width, y + level_height - font_size * 1.2);
			ctx.lineTo(x, y + font_size * 0.2);
			ctx.stroke();
		} else { // Draw lines to all children
			for (var i = 0, current = this.firstChild;
					i < this.childNodes.length; 
					i++, current = current.nextSibling) {
				var left_start = x - (this.step)*((this.childNodes.length-1)/2);
				ctx.moveTo(x, y + font_size * 0.2);
				ctx.lineTo(left_start + i*(this.step), y + level_height - font_size * 1.2);
				ctx.stroke();
			}
		}
		
		break;
	case 3: // Text node
		ctx.fillText(this.nodeValue, x, y);
		break;
	}
}
