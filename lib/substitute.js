'use strict';

var get = require('mout/object/get');
var trim = require('mout/string/trim');

module.exports = function(str, locals){
	locals = locals || {};
	return str.replace(/\{\{([^\}]+)\}\}/g, function(match, key){
		return get(locals, trim(key)) || '';
	});
};
