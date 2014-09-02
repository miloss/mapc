var vars = require("./vars");

var HOST = vars.HOST;
var PORT = vars.PORT;


// When the daemon started
var starttime = (new Date()).getTime();

var mem = process.memoryUsage();

// Every 10 seconds poll for the memory.
setInterval(function () {
  mem = process.memoryUsage();
}, 10*1000);


var fu = require("./fu")
  , sys = require("sys")
  , url = require("url")
  , qs = require("querystring")
  , lls = require("./latlonspan");

var MESSAGE_BACKLOG = 200
  , SESSION_TIMEOUT = 60 * 1000;

fu.staticPath = vars.staticPath;

var staticFiles = vars.staticFiles;



// Channel
// -------

var channel = new function () {
  var messages = []
	  , callbacks = []
	  , locations = {};

  // Appends messages to this channel, stream to all
  this.appendMessage = function (nick, type, text, id) {
    var m = {
      nick: nick,
      type: type, // "msg", "join", "part"
      text: text,
      timestamp: (new Date()).getTime(),
      id: id
    };
    
    switch (type) {
      case "msg":
        sys.puts("<" + nick + "> " + text);
        break;
      case "join":
        sys.puts(nick + " join");
        break;
      case "part":
        sys.puts(nick + " part");
        break;
    }

    messages.push( m );

	  // Go trough callbacks queue
	  while (callbacks.length)
		  callbacks.shift().callback([m], []);

    while (messages.length > MESSAGE_BACKLOG)
      messages.shift();
  };


  // Append moves to this channel, stream to collisioned only
  this.appendMove = function (id, zoom, lat, lng, nick) {
	  var m = {
		  id: id,
		  zoom: zoom,
		  lat: lat,
		  lng: lng,
		  timestamp: (new Date()).getTime()
	  };
	  var j = 0;

  	sys.puts("(" + nick + ") -> " + zoom + ':(' + lat + ',' + lng + ')' );

  	// FIXME: Possible overhead, storing ID also in "move" as a field
  	locations[id] = m;

    // TODO:
	  // if "moved enough"
    // re-scan locations -> respond to "self" callback

  	while (j < callbacks.length)
		if ( isVisibleTo(m, j) )
			callbacks.splice(j, 1)[0].callback([], [m]);
	  else j++;
  };
  
  // Check collision for move
  // Maybe add easy check (zoom level)?
  function isVisibleTo(m, j) {
  	var cb = callbacks[j]
	    , session = cb.id || false;
  	
  	if ( !session ) return false;
  	if ( session === m.id ) return false;
  	if ( !collisioners.hasOwnProperty(session) ) return false;
  	
  	return collisioners[ session ](m.zoom, m.lat, m.lng);
  };


  // Responds to queries
  this.querychannel = function (since, lastmove, callback, id) {
	  var matching = []
	    , matchingmoves = []
	    , i, key, message, move;
    
    // Get messages
    for (i = 0; i < messages.length; i++) {
      message = messages[i];

      if ( message.timestamp > since )
      	  matching.push(message);
    }
    
    // Get moves
    // FIXME: Check collision from here also?
    // do not return moves for non-sessioned
    if (id !== '') {
    	for (key in locations) {
    		if ( key == id ) continue;
    		move = locations[key];
    		
    		if ( move.timestamp > lastmove )
    			matchingmoves.push(move);
    	}
    }
    
    if (matching.length != 0 || matchingmoves.length != 0) {
      callback(matching, matchingmoves);
    } else {
      callbacks.push({ timestamp: new Date(), callback: callback, id: id });
    }
  };

  // Clear old callbacks
	// they can hang around for at most 30 seconds.
  setInterval(function () {
    var now = new Date();
    while (callbacks.length > 0 && now - callbacks[0].timestamp > 30*1000) {
      callbacks.shift().callback([], []);
    }
  }, 3000);
  
};



// Sessions
// --------

// In addition to sessions, we also mantain "collisioners" callbacks
// that we use for location - targeted response

var sessions = {};
var collisioners = {};

function createSession (nick) {
  if (nick.length > 50) return null;
  if (/[^\w_\-^!]/.exec(nick)) return null;

	var session;

  for (var i in sessions) {
	  session = sessions[i];
    if (session && session.nick === nick) return null;
  }

	session = {
		nick: nick, 
		id: Math.floor(Math.random()*99999999999).toString(),
		timestamp: new Date(),

    poke: function () {
      session.timestamp = new Date();
    },
    
    // Update session collision callback
    locate: function (zoom, lat, lng) {
    	session.loc = [zoom, lat, lng];
     	collisioners[session.id] = collisionCallback(zoom, lat, lng);
    },

    destroy: function () {
      channel.appendMessage(session.nick, "part", null, session.id);
      delete sessions[session.id];
      delete collisioners[session.id];
    }
  };

  sessions[session.id] = session;
  return session;
}

// Interval to kill off old sessions
setInterval(function () {
  var now = new Date();
  for (var id in sessions) {
    if (!sessions.hasOwnProperty(id)) continue;
    var session = sessions[id];

    if (now - session.timestamp > SESSION_TIMEOUT) {
      session.destroy();
    }
  }
}, 1000);


// Fu
// --

fu.listen(Number(process.env.PORT || PORT), HOST);

// Static files
fu.get("/", fu.staticHandler("index.html"));

for (var i = 0; i < staticFiles.length; i++) {
	fu.get("/" + staticFiles[i], fu.staticHandler( staticFiles[i] ) );
}


// Requests

fu.get("/who", function (req, res) {
  var nicks = [];
  for (var id in sessions) {
    if (!sessions.hasOwnProperty(id)) continue;
    var session = sessions[id];
    nicks.push({nick: session.nick, id: id, loc: session.loc});
  }
  res.simpleJSON(200, { nicks: nicks
                      , rss: mem.rss
                      });
});


fu.get("/join", function (req, res) {
	sys.puts('join:');
	var obj = qs.parse(url.parse(req.url).query);
	sys.puts(url.parse(req.url).query);
	sys.puts(obj.nick);
  var nick = qs.parse(url.parse(req.url).query).nick;
  if (nick == null || nick.length == 0) {
    res.simpleJSON(400, {error: "Bad nick."});
    return;
  }
  var session = createSession(nick);
  if (session == null) {
    res.simpleJSON(400, {error: "Nick in use"});
    return;
  }

  sys.puts("connection: " + nick + "@" + res.connection.remoteAddress);

  channel.appendMessage(session.nick, "join", null, session.id);
  res.simpleJSON(200, { id: session.id
                      , nick: session.nick
                      , rss: mem.rss
                      , starttime: starttime
                      });
});


fu.get("/part", function (req, res) {
  var id = qs.parse(url.parse(req.url).query).id;
  var session;
  if (id && sessions[id]) {
    session = sessions[id];
    session.destroy();
  }
  res.simpleJSON(200, { rss: mem.rss });
});


fu.get("/recv", function (req, res) {
  if (!qs.parse(url.parse(req.url).query).since) {
    res.simpleJSON(400, { error: "Must supply since parameter" });
    return;
  }
  var id = qs.parse(url.parse(req.url).query).id;
  var session;
  
  if (id && sessions[id]) {
    session = sessions[id];
    session.poke();
  }

  var since = parseInt(qs.parse(url.parse(req.url).query).since, 10);
  var lastmove = parseInt(qs.parse(url.parse(req.url).query).mvmt, 10);

  channel.querychannel(since, lastmove, function (messages, moves) {
    if (session) session.poke();
    res.simpleJSON(200, { messages: messages, moves: moves, rss: mem.rss });
  }, id);
});




fu.post("/send", function (post, res) {
	var qvars = qs.parse(post.toString()),
	    id = qvars.id,
	    text = qvars.text;

  var session = sessions[id];
  if (!session || !text) {
    res.simpleJSON(400, { error: "No such session id" });
    return;
  }

  session.poke();

  channel.appendMessage(session.nick, "msg", text);
  res.simpleJSON(200, { rss: mem.rss });
});


fu.post("/move", function (post, res) {
	var qvars = qs.parse(post.toString());
  var id = qvars.id,
      zoom = qvars.zm,
      lat = qvars.lt,
      lng = qvars.ln;

  var session = sessions[id];
  if (!session) {
    res.simpleJSON(400, { error: "No such session id" });
    return;
  }
  
  if (!zoom || !lat || !lng) {
  	res.simpleJSON(400, { error: "Can't move there" });
  	return;
  }
  
  zoom = parseInt(zoom, 10);
  lat = parseFloat(lat);
  lng = parseFloat(lng);
  
  session.poke();
  session.locate(zoom, lat, lng);

  channel.appendMove(id, zoom, lat, lng, session.nick);
  res.simpleJSON(200, { rss: mem.rss });
});



// Check visibility for location, against another location
var collisionCallback = function (zoom, lat, lng) {

	// Span coefficients, that we multiply with screen height.
	// point is, we don't want to display too much points on higher zoom
	// levels. calculate them based on zoom delta (for higher zooms)
	//          -2   -1   0    1    2    3
	var	latC = [0.7, 0.7, 0.7, 0.6, 0.5, 0.4]
	  , lngC = [0.7, 0.7, 0.7, 0.6, 0.5, 0.4];

	// Zero-offset for arrays above
	var zoff = 2;

	return function (a, b, c) {
		//delta zoom allowed is -2..3
		var dz = a - zoom
		  , lats, lngs;

		// Zoom not inside host bounds
		if ( dz < -2 || dz > 3 ) return false;

		// Check longitude
		lngs = lls.lngSpan(zoom) * lngC[dz + zoff];
		if ( c < (lng - lngs) || c > (lng + lngs) ) return false;

		// Check latitude
		lats = lls.latSpan(lat, zoom) * latC[dz + zoff];
		if ( b < (lat - lats) || b > (lat + lats) ) return false;

		return true;
	};

};

