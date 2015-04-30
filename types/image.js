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

	var img = new Image();
	fig.appendChild(img);
	img.addEventListener('load', function(){
		img.classList.add('is-loaded');
		dim.innerHTML = img.naturalWidth + 'x' + img.naturalHeight;
	});
	img.src = options.path + data.relative_path;

	panel.appendChild(fig);
	panel.appendChild(div);
};
