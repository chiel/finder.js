'use strict';

var request = require('superagent');
var getClosest = require('domhelpers/getClosest');
var getParent = require('domhelpers/getParent');
var forOwn = require('mout/object/forOwn');
var ltrim = require('mout/string/ltrim');
var map = require('mout/array/map');
var formatSize = require('./lib/format_size');
var defaultType = require('./types/default');

/**
 * Create new finder with given option
 * @param {Object} options
 */
var Finder = function(options){
	if (!(this instanceof Finder)) return new Finder(options);
	this.options = options;
	this.currentPath = '';
	this.active = [];
	this.widths = [];
};

require('inherits')(Finder, require('events').EventEmitter);

/**
 * Build basic elements for the finder
 */
Finder.prototype.build = function(){
	if (this.wrap) return;

	var wrap = document.createElement('div');
	wrap.classList.add('finder');
	this.wrap = wrap;

	var main = document.createElement('main');
	main.classList.add('finder__main');
	wrap.appendChild(main);
	this.main = main;

	var panels = document.createElement('section');
	panels.classList.add('finder__panels');
	main.appendChild(panels);
	this.panels = panels;

	var footer = document.createElement('footer');
	footer.classList.add('finder__footer');
	wrap.appendChild(footer);
	this.footer = footer;

	var actions = document.createElement('div');
	actions.classList.add('finder__actions');
	footer.appendChild(actions);
	this.actions = actions;

	var selectButton = document.createElement('button');
	selectButton.classList.add('finder__btn');
	selectButton.setAttribute('type', 'button');
	selectButton.textContent = 'Select';
	actions.appendChild(selectButton);
	this.selectButton = selectButton;

	this.setEvents();
};

/**
 * Set finder events
 */
Finder.prototype.setEvents = function(){
	var self = this;

	this.panels.addEventListener('click', function(e){
		if (!e.target.dataset.loadPath || e.target.classList.contains('is-selected')) return;

		e.preventDefault();

		// get panel for current click target
		var panel = getParent(e.target, '.finder__panel');

		self.clearPanels(panel);

		// clear currently selected items
		var selected = panel.querySelector('.is-selected');
		if (selected){
			selected.classList.remove('is-selected');
		}

		// set clicked item to selected
		e.target.classList.add('is-selected');

		// load selected item
		self.loadPath(e.target.dataset.loadPath);
	});

	this.panels.addEventListener('dragover', function(e){
		e.preventDefault();
	});

	this.panels.addEventListener('dragend', function(e){
		e.preventDefault();
	});

	this.panels.addEventListener('drop', function(e){
		e.preventDefault();

		var dir = getClosest(e.target, '.finder__dir');
		if (!dir) return;

		self.uploadFiles(dir.dataset.path, e.dataTransfer.files, dir);
	});

	this.selectButton.addEventListener('click', function(e){
		e.preventDefault();
		self.emit('file.selected', self.currentPath);
	});
};

/**
 * Clear all panels after given panel
 *
 * Clears all panels if no panel is given
 * @param {Element} panel
 */
Finder.prototype.clearPanels = function(panel){
	while (this.active.length){
		if (this.active[this.active.length - 1] !== panel){
			this.panels.removeChild(this.active.pop());
		} else{
			break;
		}
	}

	this.widths = this.widths.slice(0, this.active.length);
};

/**
 * Open the finder in given parent element
 * @param {Element} parent
 */
Finder.prototype.open = function(parent, path){
	this.build();
	parent.appendChild(this.wrap);
	var rect = this.main.getBoundingClientRect();
	this.width = rect.width || rect.right - rect.left;
	this.widths = [];
	while (this.active.length){
		this.panels.removeChild(this.active.pop());
	}

	if (path){
		var completePath = '';
		path = map(ltrim(path, '/').split('/'), function(item){
			completePath += '/' + item;
			return completePath;
		});
		path.unshift('/');

		var self = this;
		var prevPanel;
		var loadNext = function(){
			if (!path.length) return;
			var curPath = path.shift();
			self.loadPath(curPath, function(panel){
				if (prevPanel){
					var item = prevPanel.querySelector('[data-load-path^="' + curPath + '"]');
					if (item) item.classList.add('is-selected');
				}
				prevPanel = panel;
				loadNext();
			});
		};
		loadNext();
	} else{
		this.loadPath('/');
	}
};

/**
 * Upload files to a path
 * @param {String} path
 * @param {FileList} files
 * @param {Element} panel
 */
Finder.prototype.uploadFiles = function(path, files, panel){
	var self = this;

	var overlay = document.createElement('div');
	overlay.classList.add('finder__upload-overlay');
	var progressWrap = document.createElement('span');
	progressWrap.classList.add('finder__upload-progress-wrap');
	var progress = document.createElement('span');
	progress.classList.add('finder__upload-progress');
	progressWrap.appendChild(progress);
	overlay.appendChild(progressWrap);

	var ul = document.createElement('ul');
	overlay.appendChild(ul);

	var req = request.post(this.options.endpoints.upload + '?path=' + path);
	for (var i = 0; i < files.length; i++){
		req.field('file', files[i]);
		var li = document.createElement('li');
		li.classList.add('finder__upload');
		li.innerHTML = '<span class="finder__upload-name">' + files[i].name + '</span>' +
			'<span class="finder__upload-size">' + formatSize(files[i].size) + '</span>';
		ul.appendChild(li);
	}

	panel.appendChild(overlay);

	req.on('progress', function(e){
		progress.style.width = Math.round(e.percent) + '%';
	})
	.end(function(err, response){
		self.clearPanels(panel.previousSibling);
		self.loadPath(path);
		panel.removeChild(overlay);
	});
};

/**
 * Fetch data for given path
 */
Finder.prototype.loadPath = function(path, cb){
	var panel = document.createElement('div');
	panel.classList.add('finder__panel');
	panel.classList.add('is-loading');
	this.panels.appendChild(panel);

	var self = this;
	request.get(this.options.endpoints.list + '?path=' + path).end(function(err, response){
		if (err){
			return console.error('Failed to fetch directory listing', err);
		}
		if (response.status !== 200){
			return console.error('Failed to fetch directory listing');
		}

		panel.classList.remove('is-loading');
		self.active.push(panel);
		self.currentPath = path;

		panel.dataset.path = path;

		if (response.body.type === 'directory'){
			self.buildDir(panel, response.body);
		} else{
			self.buildFile(panel, response.body);
		}

		var rect = self.active[self.active.length - 1].getBoundingClientRect();
		self.widths.push(rect.width || rect.right - rect.left);

		var width = 0;
		for (var i = 0; i < self.widths.length; i++) width += self.widths[i];

		self.panels.style.width = width + 'px';
		self.main.scrollLeft = Math.max(0, width - self.width);

		if (cb) cb(panel);
	});
};

Finder.prototype.buildDir = function(panel, data){
	panel.classList.add('finder__dir');

	var ul = document.createElement('ul');
	var file, li;
	for (var i = 0; i < data.files.length; i++){
		file = data.files[i];
		li = document.createElement('li');
		li.textContent = file.name;
		li.dataset.loadPath = file.relative_path;
		ul.appendChild(li);
	}

	panel.appendChild(ul);
};

Finder.prototype.buildFile = function(panel, data){
	panel.classList.add('finder__file');

	var self = this;
	var found;
	forOwn(Finder.types, function(type){
		if (found || !type.regex.test(data.name)) return;

		type(panel, data, self.options);
		found = true;
	});

	if (!found){
		defaultType(panel, data, this.options);
	}
};

/**
 * Expose types
 */
Finder.types = {
	image: require('./types/image')
};

module.exports = Finder;
