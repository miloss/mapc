$(document).ready(function(){
	
	// initialize map
	map.init();
	
	showConnect();
	
	// start polling for messages and/or users right now
	longPoll();
	
	
	// update the daemon uptime every 10 seconds
	setInterval(function () {
		updateUptime();
	}, 10*1000);


	if (CONFIG.debug) {
		$("#chatbox .connect").hide();
		$("#chatbox .connecting").hide();
		// scrollDown();
		return;
	}


	
	// --- CHAT ---
	//sending a chat message
	$('#chatbox .message').keydown(function (e) {
		var $el = $(this);
		
		// pressed enter
		if (e.keyCode === 13) {
			client.sendText( $el.val(), function (resp) {
				if (resp.ok) {
					$el.val('');
					
				} else {
					//TODO "notification" style display
					alert( resp.message );
				}
			});
		}
	});
	
	
	
	
	// --- CONNECT ---
	//try joining the chat when the user clicks the connect button
	$("#chatbox .connect form").submit(function () {
		var nick = $("#chatbox .connect .name").attr("value");
		
		//lock the UI while waiting for a response
		showLoad();

		
		//dont bother the backend if we fail easy validations
		if (nick.length > 50) {
			alert("Nick too long. 50 character max.");
			showConnect();
			return false;
		}
		if (nick.length < 3) {
			alert("Nick too short. 3 characters min.");
			showConnect();
			return false;
		}
		
		//more validations
		if (/[^\w_\-^!]/.exec(nick)) {
			alert("Bad character in nick. Can only have letters, numbers, and '_', '-', '^', '!'");
			showConnect();
			return false;
		}
		

		//make the actual join request to the server
		$.ajax({ cache: false
				, type: "GET" // XXX should be POST
				, dataType: "json"
				, url: "/join"
				, data: { nick: nick }
				, success: onConnect
				, error: function (data) {
					var err = (typeof JSON !== 'undefined') ? JSON.parse(data.responseText).error : "error connecting to the server";
					alert( err );
					showConnect();
				}
				});
				
		return false;
		
	});
	// end connect
	
	
	//output list of online users
	//---
	//$("#usersLink").click(outputUsers);

});


//if we can, notify the server that we're going away.
$(window).unload(function () {
	jQuery.get("/part", {id: CONFIG.id}, function (data) { }, "json");
});


function robotConversation() {
	Messages.push( 'pera', 'joinpart', 'joined' );
	Messages.push( 'mika', 'joinpart', 'joined' );
	Messages.push( 'pera', '', 'hi guys! how do you like it here?' );
	Messages.push( 'mika', '', 'yeah, its very cool though i don\'t get it what this thing exactly does?' );
	Messages.push( 'xxx', 'joinpart', 'joined' );
	Messages.push( 'pera', 'joinpart', 'left' );
	Messages.push( 'mika', '', 'oooh :( why did you leave?' );
	Messages.push( 'xxx', '', 'screw him! let\'s get this party started!' );
};
