'use strict';

var formatSize = require('../lib/format_size');
var substitute = require('../lib/substitute');

/**
 * Render a generic file view
 * @param {Element} panel
 * @param {Object} data
 */
module.exports = function(panel, data, options){
	var div = document.createElement('div');
	div.classList.add('finder__file-details');

	var tpl = '<dl>' +
		'<dt>Name</dt><dd>{{ name }}</dd>' +
		'<dt>Path</dt><dd>{{ path }}</dd>' +
		'<dt>File size</dt><dd>{{ size }}</dd>' +
	'</dl>';

	div.innerHTML = substitute(tpl, {
		name: data.name,
		path: data.relative_path,
		size: formatSize(data.size)
	});

	panel.appendChild(div);
};
