var gmaps = google.maps;

// map
// ---

var map = new function(){
	
	var gmap;
	
	var opts;	
	
	
	this.init = function () {
		var center;
		
		opts = { 
			mapTypeId: gmaps.MapTypeId.ROADMAP,
			maxZoom: 20,
			minZoom: 3,
			streetViewControl: false
		};
		
		// Try W3C Geolocation
		//if (navigator.geolocation) {
		if (false) {
			navigator.geolocation.getCurrentPosition(function (position) {
				center = new gmaps.LatLng(position.coords.latitude,position.coords.longitude);
				map.init_b( center );
			}, function() {
				map.init_b();
			});
		} else {
			map.init_b();
		}
	};
	
	
	this.init_b = function (center) {
		var zoom = 7, cdata;
		
		if (typeof center === 'undefined') {
			var cdata = this.getRandomLocation();
			center = new gmaps.LatLng(cdata[1], cdata[2]);
			zoom = cdata[0];
			
			Messages.push('', '', 'We couldn\'t get your location, so we put you in <b>' + cdata[3] + '</b>!');
		}
		
		
		// init
		opts.center = center;
		opts.zoom = zoom;
		gmap = new gmaps.Map(document.getElementById('map_container'), opts);

		// bind events
		gmaps.event.addListener(gmap, 'dragstart', events.dragStart);
		gmaps.event.addListener(gmap, 'dragend', events.dragEnd);
		gmaps.event.addListener(gmap, 'drag', events.drag);
		
		gmaps.event.addListener(gmap, 'center_changed', events.newCenter);
		gmaps.event.addListener(gmap, 'zoom_changed', events.zoomChanged);
		gmaps.event.addListener(gmap, 'idle', events.mapIdle);
		
		// try moving copyright div left
		setTimeout(function () {
			$( $('#map_container > div > div').get(2) ).css('margin-right', '290px');
		}, 1000);
		
		this.updateZoom();
	};
	
	this.getRandomLocation = function () {
		var data = [];
		
		data.push( [7, 60, 105, 'Siberia'] );
		data.push( [12, 41.9, 12.49, 'Rome'] );
		data.push( [11, -13.16, -72.55, 'Machu Picchu'] );
		data.push( [5, 23.22, 10.9, 'Sahhara'] );
		data.push( [9, 41, -112.43, 'Great Salt Lake'] );
		data.push( [16, 39.9176, 116.3972, 'Forbidden City'] );
		data.push( [10, 21.46, -158, 'Oahu'] );
		
		return data[ Math.floor(Math.random()*data.length) ];
	};
	
	
	//XXX use for marker creation only, or beware!!! bad things will happen
	this.gmap = function () {
		return gmap;
	};
	
	
	//getters
	this.get = function (key) {
		switch (key) {
		case 'center':
			return gmap.getCenter();
			break;
			
		case 'loc':
			return [gzoom, gmap.getCenter().lat(), gmap.getCenter().lng()];
			break;
			
		case 'zoom':
			return gzoom;
			break;
		}
	};
	
	
	//setters
	this.set = function (key, value) {
		switch (key) {
		case 'center':
			gmap.setCenter( value );
			break;
				
		}		
	};
	
	
	// test functions...
	this.logBounds = function () {
		var bds = gmap.getBounds(),
				ne = bds.getNorthEast(),
				sw = bds.getSouthWest();
		
		console.log( sw + '---' + ne );
	};
	
	this.getSpan = function () {
		var span = gmap.getBounds().toSpan();
		
		return [ span.lat(), span.lng() ];
	};
	
	this.getSpanCached = function () {
		var cnt = this.get('center'),
				zoom = this.get('zoom');
		
		return [ latSpan(cnt.lat(), zoom), lngSpan(zoom) ];
	};
	
	

	
	// zoom
	// ----
	
	var gzoom;
	
	var previousZoom;
	
	this.updateZoom = function (callback) {
		previousZoom = gzoom;
		gzoom = gmap.getZoom();
		
		if (typeof callback === 'function')
			callback();
	};



	
	// Interresting events
	
	var moves = [];
	
	//log moves to queue
	this.queueMove = function (move) {
		var cnt = moves.length;
		
		while (cnt--) {
			// only one move per client
			if (moves[cnt].id === move.id) {
				moves.splice(cnt, 1);
			}
		}
		
		moves.push( move );
	};
	
	
	//empty queue with moves -> execute them
	this.processMoves = function () {
		var tsOffset, move,
				mObj = map.markers,
				updatecb;
		
		if (!moves.length) return;
		
		//earliest timestamp, using for scheduling moves
		tsOffset = moves[0].timestamp;
		
		
		while (moves.length) {
			
			move = moves.shift();
			
			// update marker
			setTimeout( function(){
				map.markers.updatePosition( move.id, move.zoom, move.lat, move.lng );
			}, tsOffset );
			
		}
		
	};
	
	
};


// TODO: Append to "move" object
var moveUpdatePosition = function (delay) {
	setTimeout(function () {
		map.markers.updatePosition( this.id, this.zoom, this.lat, this.lng );
	}, delay);
};


	
map['markers'] = (function(){
	
	// Container
	var markers = {};
	
	
	// Private functions
	
	// Memoizing function for different marker images/sizes
	var getImage = (function(){
		var data = [];
		var	url = 'images/sprite.png',
				size_opts = [ [150, 150],
							[75, 75],
							[38, 38],
							[20, 20] ],
				origin_opts = [ [105, 0],
								[255, 0],
								[330, 0],
								[368, 0] ];
		
		var image = function (sizemod) {// sizemod in [-1,0,1,2] XXX [-2 .. 3]
			var size_offset = 1;
			var key = sizemod + size_offset;
			var gimg = data[ key ];
			
			if (typeof gimg == 'undefined') {
				var size = size_opts[ key ];
				var origin = origin_opts[ key ];
				var half = Math.ceil( size[0]/2 );
				
				//url:string, size?:Size, origin?:Point, anchor?:Point, scaledSize?:Size
				gimg = new gmaps.MarkerImage( url,
							new gmaps.Size(size[0], size[1]),
							new gmaps.Point(origin[0], origin[1]),
							new gmaps.Point(half, half) );
							
				data[ key ] = gimg;
			}
			return gimg;
		};
		
		return image;
	})();
	
	
	// Interface to markers object
	
	return {
		
		//test
		get: function () {
			return markers;
		},
		
		// puts new with position/zoom/dzoom values
		put: function (id, position, zoom, dzoom) {
			var mrk, icon,
					visible = (dzoom < 3 && dzoom > -2),
					title = userNick(id);
					
			icon =  visible ? getImage(dzoom) : '';
			
			mrk = markers[id] = new gmaps.Marker({
				animation:	gmaps.Animation.DROP,
				icon:				icon,
				clickable: 	true,
				cursor:			'-moz-grab',//XXX firefox only
				flat: 			true,
				position: 	position,
				visible: 		visible,
				title:			title,
				map:				map.gmap()
			});
			
			
			mrk['zoom'] = zoom;
		},
		
		
		// updates position/zoom of marker
		updatePosition: function (id, zoom, lat, lng) {
			var mk,
					hostzoom = map.get('zoom'),
					dzoom = zoom - hostzoom,
					position, visible, icon;


			//console.log( id + ':' + dzoom + '->' + lat + ',' + lng);
			//TODO check map bounds --> get new positions
			
			
			if (dzoom > 3 || dzoom < -2) {
				///out of zoom bounds - remove it
				if (typeof markers[id] !== 'undefined')
					this.remove( id );
					
			}	else {
				///inside zoom bounds
				
				// is position passed?
				position = (typeof lat !== 'undefined') ? new gmaps.LatLng( lat, lng ) : false;
				
				if (position && typeof markers[id] === 'undefined') {
					// new marker
					this.put( id, position, zoom, dzoom );
					return;
				}
				
				
				// update existing marker
				mk = markers[id];
				mk.zoom = zoom;
				
				// update position
				if (position) {
					mk.setPosition( position ); //TODO callback setting new icon (zoom)...
				}
				
				// update icon/visibility
				visible = dzoom > -2 && dzoom < 3;
				icon =  visible ? getImage(dzoom) : '';
				
				mk.setVisible( visible );
				mk.setIcon( icon );
				
			}
		},
		
		// removes
		remove: function (id) {
			if (typeof markers[id] === 'undefined') return;
			markers[id].setMap( null );
			delete markers[id];
		},
		
		// handles viewport zoom change
		newZoom: function () {
			var id, zoom;
			
			for (id in markers) {
				zoom = markers[id].zoom;
				this.updatePosition( id, zoom );
			}
		},
		
		// users that were online before
		renderOnlineUsers: function (nicks) {
			var i, nick;
			
			for (i = 0; i < nicks.length; i++) {
				nick = nicks[i];
				if (typeof markers[nick.id] !== 'undefined') continue;
				
				this.updatePosition(nick.id, nick.loc[0], nick.loc[1], nick.loc[2]);
			}
		}
		
	};
	
})();


// Animation functions, to be binded to marker
map['Animation'] = {
	
	MOVETO: function (latlng) {
		//...
	},
	
	FADE: function (inout) {
		//...
	},
	
	setTo: function (marker, anim) {
		//TODO
		var start = 0;
		var func = this[anim](marker);
		setTimeout(func, 100);
	}
};



var events = {
	dragg: false,
	
	dragStart: function () {
		//console.log('drags-->');
		this.dragg = true;
	},
	
	dragEnd: function () {
		//console.log('drage');
		this.dragg = false;
	},
	
	// continously fired, beware!
	drag: function () {
		client.crosshairShow();
	},
	
	newCenter: function () {
		if (!this.dragg) {
			//console.log('NEW');
			client.crosshairShow();
		}
	},
	
	zoomChanged: function () {
		//console.log('zoomc');
		//client.sendMove();
		client.crosshairShow();
		
		map.updateZoom(function () {
			map.markers.newZoom();
		});
	},
	
	mapIdle: function () {
		//console.log('idle');
		client.sendMove();
	}
};

