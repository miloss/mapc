var vars = exports;
vars.HOST = 'localhost';
vars.PORT = process.env.PORT || 5000;

// Server static files

vars.staticPath = 'client/';

vars.staticFiles = [
	'style.css',
	'jquery.min.js',
	'utils.js',
	'latlonspan.js',
	'app.js',
	'client.js',
	'map.js',
	'images/crosshair.png',
	'images/sprite.png'
];
