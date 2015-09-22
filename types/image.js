'use strict';

var formatSize = require('../lib/format_size');
var substitute = require('../lib/substitute');

/**
 * Render an image file view
 * @param {Element} panel
 * @param {Object} data
 */
module.exports = function(panel, data, options){
	panel.classList.add('finder-image');

	var fig = document.createElement('figure');
	var div = document.createElement('div');
	div.classList.add('finder-file-details');

	var tpl = '<dl>' +
		'<dt>Name</dt><dd>{{ name }}</dd>' +
		'<dt>Path</dt><dd>{{ path }}</dd>' +
		'<dt>Dimensions</dt><dd data-name>Fetching...</dd>' +
		'<dt>File size</dt><dd>{{ size }}</dd>' +
	'</dl>';

	div.innerHTML = substitute(tpl, {
		name: data.name,
		path: data.relative_path,
		size: formatSize(data.size)
	});
	var dim = div.querySelector('[data-name]');

	panel.appendChild(fig);
	panel.appendChild(div);

	var r = fig.getBoundingClientRect();
	var maxWidth = r.right - r.left - 50;
	var maxHeight = r.bottom - r.top - 50;
	var width, height, ratio;

	var img = new Image();
	fig.appendChild(img);
	img.addEventListener('load', function(){
		width = img.naturalWidth;
		height = img.naturalHeight;

		if (width > maxWidth){
			ratio = maxWidth / width;
			width = maxWidth;
			height = height * ratio;
		}
		if (height > maxHeight){
			ratio = maxHeight / height;
			height = maxHeight;
			width = width * ratio;
		}

		img.style.width = Math.floor(width) + 'px';
		img.style.height = Math.floor(height) + 'px';
		img.classList.add('is-loaded');
		dim.innerHTML = img.naturalWidth + ' x ' + img.naturalHeight;
	});
	img.src = options.path + data.relative_path;
};
