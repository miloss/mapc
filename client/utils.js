//  CUT  ///////////////////////////////////////////////////////////////////
/* This license and copyright apply to all code until the next "CUT"
http://github.com/jherdman/javascript-relative-time-helpers/

The MIT License

Copyright (c) 2009 James F. Herdman

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


 * Returns a description of this past date in relative terms.
 * Takes an optional parameter (default: 0) setting the threshold in ms which
 * is considered "Just now".
 *
 * Examples, where new Date().toString() == "Mon Nov 23 2009 17:36:51 GMT-0500 (EST)":
 *
 * new Date().toRelativeTime()
 * --> 'Just now'
 *
 * new Date("Nov 21, 2009").toRelativeTime()
 * --> '2 days ago'
 *
 * // One second ago
 * new Date("Nov 23 2009 17:36:50 GMT-0500 (EST)").toRelativeTime()
 * --> '1 second ago'
 *
 * // One second ago, now setting a now_threshold to 5 seconds
 * new Date("Nov 23 2009 17:36:50 GMT-0500 (EST)").toRelativeTime(5000)
 * --> 'Just now'
 *
 */
Date.prototype.toRelativeTime = function(now_threshold) {
  var delta = new Date() - this;

  now_threshold = parseInt(now_threshold, 10);

  if (isNaN(now_threshold)) {
    now_threshold = 0;
  }

  if (delta <= now_threshold) {
    return 'Just now';
  }

  var units = null;
  var conversions = {
    millisecond: 1, // ms    -> ms
    second: 1000,   // ms    -> sec
    minute: 60,     // sec   -> min
    hour:   60,     // min   -> hour
    day:    24,     // hour  -> day
    month:  30,     // day   -> month (roughly)
    year:   12      // month -> year
  };

  for (var key in conversions) {
    if (delta < conversions[key]) {
      break;
    } else {
      units = key; // keeps track of the selected key over the iteration
      delta = delta / conversions[key];
    }
  }

  // pluralize a unit when the difference is greater than 1.
  delta = Math.floor(delta);
  if (delta !== 1) { units += "s"; }
  return [delta, units].join(" ");
};

/*
 * Wraps up a common pattern used with this plugin whereby you take a String
 * representation of a Date, and want back a date object.
 */
Date.fromString = function(str) {
  return new Date(Date.parse(str));
};

//  CUT  ///////////////////////////////////////////////////////////////////



// utility functions

util = {
  urlRE: /https?:\/\/([-\w\.]+)+(:\d+)?(\/([^\s]*(\?\S+)?)?)?/g, 

  //  html sanitizer 
  toStaticHTML: function(inputHtml) {
    inputHtml = inputHtml.toString();
    return inputHtml.replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
  }, 

  //pads n with zeros on the left,
  //digits is minimum length of output
  //zeroPad(3, 5); returns "005"
  //zeroPad(2, 500); returns "500"
  zeroPad: function (digits, n) {
    n = n.toString();
    while (n.length < digits) 
      n = '0' + n;
    return n;
  },

  //it is almost 8 o'clock PM here
  //timeString(new Date); returns "19:49"
  timeString: function (date) {
    var minutes = date.getMinutes().toString();
    var hours = date.getHours().toString();
    return this.zeroPad(2, hours) + ":" + this.zeroPad(2, minutes);
  },

  //does the argument only contain whitespace?
  isBlank: function(text) {
    var blank = /^\s*$/;
    return (text.match(blank) !== null);
  }
};



// CONSOLE
// *******
// setup new console object (IE fail) for testing
window['console'] = (function (){
	var prevConsole = (typeof console !== 'undefined') ? console : false;
	
	return {
		log: function (item) {
			if (prevConsole) {
				prevConsole.log(item);
			} else {
				//alert('[console]'+'\n'+item)
			}
		}
	};
})();



// MESSAGES
// ********
// Object for managing notifications.
var Messages = {
	divid: '#messages',
	fadeDelay: 0,
	maxCnt: 15,
	
	
	push: function (nick, type, text, timestamp) {
		var div = $(this.divid),
				time = (typeof timestamp === 'undefined') ? new Date() : new Date(timestamp),
				klass = '';

		switch (type) {
		case "error":
			klass += ' error';
			break;
			
		case "join":
		case "part":
			klass += ' joinpart';
			break;
		}

    // replace URLs with links
    text = text.replace(util.urlRE, '<a target="_blank" href="$&">$&</a>');
    
		
		div.append('<div class="message' + klass + '"><span class="date">' + util.timeString(time) + '</span>' 
					+ '<span class="uname">' + util.toStaticHTML(nick) + '</span> '
					+ text + '</div>');
					
					
		// fade messages
		if (this.fadeDelay > 0) {
			setTimeout(function(){
				Messages.pop();
			}, this.fadeDelay);
		}
		
		// have MAX messages displayed
		if (this.maxCnt) {
			this.popCount();
		}

	},

	
	// FIFO hides messages based on maxMessages
	popCount: function () {
		var div = $(this.divid).find(".message");
		
		if (div.length <= this.maxCnt) return;
		
		$(div.get(0)).slideUp(function(){
			$(this).remove();
			Messages.popCount();
		});
	},
	
	// fades latest message
	pop: function () {
		var div = $(this.divid).find(".message");
		$(div.get(0)).fadeOut(function(){
			$(this).remove();
		});
	},
	
	
	// clears all messages
	clear: function () {
		var div = $(this.divid);
		
		div = div.find('.message');
		div.hide();
	}
};


