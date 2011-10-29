
/* TODO:
 * Add support for empty nodes, i.e. [NP]
 * Disable "save as" until submitted
 */

var level_height;
var width_pad;
var font_size;
var font_style;
var tree_height = 0;
var ctx;

function go() {
	level_height = parseInt(document.f.vertspace.value);
	width_pad = parseInt(document.f.horspace.value);
	font_style = document.getElementById("fontstyle").value;
	font_size = document.f.fontsize.value;
	ctx = document.getElementById('canvas').getContext('2d');
	ctx.textAlign = "center";
	ctx.font = font_size + "pt " + font_style;
	var s = document.f.i.value;
	var root = parse(s, ctx);
	set_widths(root, ctx);
	find_height(root, 0);
	var width = 1.2 * (root.left_width + root.right_width);
	var height = (tree_height + 1) * level_height * 1;
	ctx.canvas.width = width;
	ctx.canvas.height = height;
	ctx.fillStyle = "rgb(255, 255, 255)";
	ctx.fillRect(0, 0, width, height)
	ctx.fillStyle = "rgb(0, 0, 0)";
	ctx.textAlign = "center";
	ctx.font = font_size + "pt " + font_style;
	ctx.translate(root.left_width + 0.1 * (root.left_width + root.right_width), 0.3 * (height / tree_height) + font_size/2);
	draw(root, ctx, 0, 0);
	ctx.canvas.style.visibility = "visible";
	
	// Enable "save as" buttons
	document.f.saveaspng.disabled = false;
	document.f.saveasbmp.disabled = false;
	document.f.saveasjpeg.disabled = false;
	
	/* debug
	ctx.fillText(s.length, 20, 20);
	ctx.fillText(JSON.stringify(root), 20, 40);
	alert(JSON.stringify(root));
	*/
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
	while (ss[start] != " ") {
		start++;
	}
	node.type = ss.substr(1, start-1);
	start++;
	
	node.is_phrase = 0;
	if ((node.type[node.type.length - 1] == "P") && (node.type.length != 1)) {
		node.is_phrase = 1;
	}
	
	if (ss[start] == "[") {
		var current = start;
		var cstart = start;
		var level = 0;
		node.width = 0;
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

function set_widths(n, ctx) {

	var length = n.children.length;

	for (var i = 0; i < length; i++) {
		set_widths(n.children[i], ctx);
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

function find_height(n, h) {

	if ('text' in n) {h++;}
	if (h > tree_height) {
		tree_height = h;
	}
	
	for (var i = 0; i < n.children.length; i++) {
		find_height(n.children[i], h + 1);
	}
}

function draw(n, ctx, x, y) {
	var length = n.children.length;
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
			draw(n.children[i], ctx, left_start + i*(n.step), y + level_height);
			ctx.moveTo(x, y + font_size * 0.2);
			ctx.lineTo(left_start + i*(n.step), y + level_height - font_size * 1.2);
			ctx.stroke();
		}
	}
}