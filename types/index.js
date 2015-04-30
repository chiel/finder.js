'use strict';

module.exports = [
	{
		regex: /\.(jpe?g|gif|png)$/,
		fn: require('./image')
	}
];
