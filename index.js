'use strict';

var request = require('superagent');
var getParent = require('domhelpers/getParent');

var Finder = function(options){
	if (!(this instanceof Finder)) return new Finder(options);
	this.options = options;
};

/**
 * Build basic elements for the finder
 */
Finder.prototype.build = function(){
	if (this.wrap) return;

	var wrap = document.createElement('div');
	wrap.classList.add('finder-wrap');
	this.wrap = wrap;

	var main = document.createElement('main');
	main.classList.add('finder-main');
	wrap.appendChild(main);
	this.main = main;

	var panels = document.createElement('section');
	panels.classList.add('finder-panels');
	main.appendChild(panels);
	this.panels = panels;

	var footer = document.createElement('footer');
	footer.classList.add('finder-footer');
	wrap.appendChild(footer);
	this.footer = footer;

	this.active = [];
	this.widths = [];

	this.setEvents();
};

/**
 * Set required events
 */
Finder.prototype.setEvents = function(){
	var self = this;

	this.panels.addEventListener('click', function(e){
		if (!e.target.dataset.path || e.target.classList.contains('is-selected')) return;

		e.preventDefault();

		// get panel for current click target
		var panel = getParent(e.target, '.finder-panel');

		// kill all panels that are active after this one
		while (self.active.length){
			if (self.active[self.active.length - 1] !== panel){
				self.panels.removeChild(self.active.pop());
			} else {
				break;
			}
		}

		// kill all widhts that just got removed
		self.widths = self.widths.slice(0, self.active.length);

		// clear all selected items
		var selected = panel.querySelector('.is-selected');
		if (selected){
			selected.classList.remove('is-selected');
		}

		// set clicked item to selected
		e.target.classList.add('is-selected');

		// load selected item
		self.loadPath(e.target.dataset.path);
	});
};

/**
 * Append the finder html to the given dom node
 * @param {Element} parent
 */
Finder.prototype.attach = function(parent){
	this.build();
	parent.appendChild(this.wrap);
	var rect = this.main.getBoundingClientRect();
	this.width = rect.width || rect.right - rect.left;
	this.loadPath('/');
};

/**
 * Fetch data for given path
 */
Finder.prototype.loadPath = function(path){
	var panel = document.createElement('div');
	panel.classList.add('finder-panel');
	panel.classList.add('is-loading');
	this.panels.appendChild(panel);

	var self = this;
	request.get(this.options.endpoint + '?path=' + path).end(function(err, response){
		if (err){
			return console.error('Failed to fetch directory listing', err);
		}
		if (response.status !== 200){
			return console.error('Failed to fetch directory listing');
		}

		panel.classList.remove('is-loading');
		self.active.push(panel);

		if (response.body.type === 'directory'){
			self.buildDir(panel, response.body);
		} else {
			self.buildImage(panel, response.body);
		}

		var rect = self.active[self.active.length - 1].getBoundingClientRect();
		self.widths.push(rect.width || rect.right - rect.left);

		var width = 0;
		for (var i = 0; i < self.widths.length; i++) width += self.widths[i];

		self.panels.style.width = width + 'px';
		self.main.scrollLeft = Math.max(0, width - self.width);
	});
};

Finder.prototype.buildDir = function(panel, data){
	panel.classList.add('finder-dir');

	var ul = document.createElement('ul');
	var file, li;
	for (var i = 0; i < data.files.length; i++){
		file = data.files[i];
		li = document.createElement('li');
		li.textContent = file.name;
		li.dataset.path = file.relative_path;
		ul.appendChild(li);
	}

	panel.appendChild(ul);
};

Finder.prototype.buildImage = function(panel, data){
	panel.classList.add('finder-image');

	var fig = document.createElement('figure');
	var img = new Image();
	fig.appendChild(img);
	img.addEventListener('load', function(){
		img.classList.add('is-loaded');
	});
	img.src = this.options.path + data.relative_path;

	panel.appendChild(fig);
};

module.exports = Finder;
