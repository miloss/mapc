var CONFIG = { debug: false
             , nick: "#"   // set in onConnect
             , id: ''      // set in onConnect
             , last_message_time: 1
             , last_move_time: 1
             , focus: true //event listeners bound in onConnect XXX killed
             , unread: 0 //updated in the message-processing loop XXX killed
             };

// users online
var nicks = [];

// daemon start time
var starttime;

// daemon memory usage
var rss;

// initial map location
var initloc;



// UI functions
// ------------


//updates the users link to reflect the number of active users
function updateUsersLink ( ) {
  var t = nicks.length.toString() + " user";
  if (nicks.length != 1) t += "s";
  $("#usersLink").text(t);
}


//handles another person joining chat
function userJoin(nick, timestamp, id) {
  //put it in the stream
  addMessage(nick, "joined", timestamp, "join");
  
  //if we already know about this user, ignore it
  for (var i = 0; i < nicks.length; i++) {
  	if (nicks[i].nick == nick) return;
  }
    
  //otherwise, add the user to the list
  nicks.push({nick: nick, id: id});
  
  //update the UI
  updateUsersLink();
}


//handles someone leaving
function userPart(nick, timestamp, id) {
  //put it in the stream
  addMessage(nick, "left", timestamp, "part");
  //remove user from map
  map.markers.remove( id );
  
  //remove the user from the list
  for (var i = 0; i < nicks.length; i++) {
    if (nicks[i].nick == nick) {
      nicks.splice(i,1)
      break;
    }
  }
  
  //update the UI
  updateUsersLink();
}


function userNick (id) {
  var cnt = nicks.length;
  while (cnt--)
  	if (nicks[cnt].id == id)
  		return nicks[cnt].nick;

	return '';
}

function updateRSS () {
  var bytes = parseInt(rss);
  if (bytes) {
    var megabytes = bytes / (1024*1024);
    megabytes = Math.round(megabytes*10)/10;
    $("#rss").text(megabytes.toString() + 'MB');
  }
}

function updateUptime () {
  if (starttime) {
    $("#uptime").text(starttime.toRelativeTime());
  }
}

//we want to show a count of unread messages when the window does not have focus
//---
//function updateTitle(){
//  if (CONFIG.unread) {
//    document.title = "(" + CONFIG.unread.toString() + ") mapc";
//  } else {
//    document.title = "mapc";
//  }
//}



var transmission_errors = 0;
var first_poll = true;


//process updates if we have any, request updates from the server,
// and call again with response. the last part is like recursion except the call
// is being made from the response handler, and not at some point during the
// function's execution.
function longPoll (data) {
	
  if (transmission_errors > 2) {
  	Messages.push('', 'error' ,'error communicating to server');
    showConnect();
    return;
  }

  if (data && data.rss) {
    rss = data.rss;
    updateRSS();
  }

  //process any updates we may have
  //data will be null on the first call of longPoll
  if (data && data.messages) {
  	
    for (var i = 0; i < data.messages.length; i++) {
      var message = data.messages[i];

      //track oldest message so we only request newer messages from server
      if (message.timestamp > CONFIG.last_message_time)
        CONFIG.last_message_time = message.timestamp;

      //dispatch new messages to their appropriate handlers
      switch (message.type) {
        case "msg":
          addMessage(message.nick, message.text, message.timestamp);
          break;

        case "join":
          userJoin(message.nick, message.timestamp, message.id);
          break;

        case "part":
          userPart(message.nick, message.timestamp, message.id);
          break;
      }
    }
    
    //only after the first request for messages do we want to show who is here
    if (first_poll) {
      first_poll = false;
      who();
    }
    
  } // end messages
  

  
  //process any movements we have recieved
  //filter any self-movements, and add to queue to render later
  if (data && data.moves) {
  	
  	for (var i = 0; i < data.moves.length; i++) {
      var move = data.moves[i];
      
	    //track oldest moves seen
      if (move.timestamp > CONFIG.last_move_time)
        CONFIG.last_move_time = move.timestamp;
        
      // do not process self-moves
      if (move.id === CONFIG.id) continue;
      
      // add move to queue
      map.queueMove( move );//FIXME remove this if not needed
   	}
   	
   	map.processMoves();
   	
  } // end moves
  
  

  //make another request
  $.ajax({ cache: false
         , type: "GET"
         , url: "/recv"
         , dataType: "json"
         , data: { since: CONFIG.last_message_time, mvmt: CONFIG.last_move_time, id: CONFIG.id }
         , error: function () {
             addMessage("", "long poll error. trying again...", new Date(), "error");
             transmission_errors += 1;
             //don't flood the servers on error, wait 10 seconds before retrying
             setTimeout(longPoll, 10*1000);
           }
         , success: function (data) {
             transmission_errors = 0;
             //if everything went well, begin another request immediately
             //the server will take a long time to respond
             //how long? well, it will wait until there is another message
             //and then it will return it to us and close the connection.
             //since the connection is closed when we get data, we longPoll again
             longPoll(data);
           }
         });
}


//handle the server's response to our nickname and join request
function onConnect (session) {
	if (session.error) {
		alert("error connecting: " + session.error);
		showConnect();
		return;
	}

	CONFIG.nick = session.nick;
	CONFIG.id	= session.id;
	starttime	= new Date(session.starttime);
	rss			= session.rss;
	updateRSS();
	updateUptime();
	
	// send initial map location - initloc
	sendLocation( initloc );

	//update the UI to show the chat
	showChat( CONFIG.nick );
	
	// render users allready online (allready in "nicks")
	map.markers.renderOnlineUsers( nicks );
	
	//listen for browser events so we know to update the document title
	/*
	$(window).bind("blur", function() {
		CONFIG.focus = false;
		updateTitle();
	});

	$(window).bind("focus", function() {
		CONFIG.focus = true;
		CONFIG.unread = 0;
		updateTitle();
	});
	*/
}


//Transition the page to the state that prompts the user for a nickname
function showConnect () {
  $("#chatbox_status").removeClass('online').addClass('offline');
  $("#chatbox .connect").show();
  $("#chatbox .connecting").hide();
  $("#chatbox .message").hide();
  $("#chatbox .connect .name").focus();
}

//transition the page to the loading screen
function showLoad () {
  $("#chatbox .connect").hide();
  $("#chatbox .connecting").show();
  $("#chatbox .message").hide();
}

//transition the page to the main chat view, putting the cursor in the textfield
function showChat (nick) {
  $("#chatbox_status").removeClass('offline').addClass('online');
  $("#chatbox .message").show();
  $("#chatbox .connect .message").focus();
	
  $("#chatbox .connect").hide();
  $("#chatbox .connecting").hide();
  // scrollDown();
}


// proxy to Messages namespace (notifications)
function addMessage (from, text, time, _class) {
	Messages.push( from, _class, text, time );
}


//get a list of the users presently in the room, and add it to the stream
function who () {
  jQuery.get("/who", {}, function (data, status) {
    if (status != "success") return;
    nicks = data.nicks;
    
    //---
    //outputUsers();
  }, "json");
}



//used to keep the most recent messages visible
//---
//function scrollDown () {
//  return false;
//  
//  window.scrollBy(0, 100000000000000000);
//  $("#entry").focus();
//}



//add a list of present chat members to the stream
//---
//function outputUsers () {
//  var nick_string = nicks.length > 0 ? nicks.join(", ") : "(none)";
//  addMessage("users:", nick_string, new Date(), "notice");
//  return false;
//}






// client object
// -------------

var client = {};


client.sendMove = function () {
	var cnt = map.get('center'),
			loc = { zoom: map.get('zoom')
						, lat: cnt.lat()
						, lng: cnt.lng() };
		
	// user not logged in yet
	if (!CONFIG.id) {
		initloc = loc;
		return;
	}

	//SEND move
	sendLocation( loc );
};

var sendLocation = function (loc) {
	$.ajax({
		type: "POST",
		url: "/move",
		dataType: "json",
		data: {id: CONFIG.id, zm: loc.zoom, lt: loc.lat , ln: loc.lng },
		success: function (data) { },
		error: function (data) {
			if (transmission_errors > 2) return;
			addMessage("", "error when trying to move ...", new Date(), "error");
		}
		});
};


client.sendText = function (text, callback) {
	var resp;
	
	// some validation on message
	if (text.length < 140) {
		jQuery.post("/send", {id: CONFIG.id, text: text}, function (data) { }, "json");
		resp = { ok: true };
		
	} else {
		resp = { ok: false, message: "Maximum 140 characters!" };
	}
	
	callback(resp);
};


client.crosshairShow = (function(){
	// timeout counter
	var to = 0,
			divid = '#map_center';
	
	// display crosshair based on activity
	return function () {
		
		clearTimeout( to );
		
		$(divid).show();
		
		to = setTimeout(function(){
			$(divid).fadeOut();
		}, 500);
	};
})();
