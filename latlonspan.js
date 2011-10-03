// cached lat - lon spans
// ......................
// used both on server and client side

var lls = exports;


// based on zoom = 3 and 1280x800 viewport
// that is 800px, since we matter only height in Mercator projection

function getSpans(i, zoom) {
	var map_ = map.map,
		max = 6,
		vname = 'lat';

	map_.setZoom(zoom);
	map_.setCenter(new gmaps.LatLng(i, 0));
	span = map_.getBounds().toSpan();
	console.log(vname + '[' + i + '] = ' + span.lat() + ';');
	
	if (i < max) {
		setTimeout( function(){
			getSpans(i+1, zoom);
		},
		1000 );
	}
};



lls.lngSpan = function (zoom) {
	var lng = 225;
	return Math.min(lng * Math.pow(2, 3 - zoom), 180);
};


// memoizing latitude function
lls.latSpan = (function () {
	var memo = [], len = 25;
	while (len--) memo[len] = [];
	
	
	var lspan = function (latitude, zoom) {
		var latitude = Math.ceil( Math.abs( latitude ) ),
				span = memo[zoom][latitude];
		
		if (typeof span !== 'number') {
			span = latscr[ latitude ] * Math.pow(2, 3 - zoom);
			memo[zoom][latitude] = span;
		}
		return span;
	};
	
	return lspan;
})();



var latscr = [];

latscr[0] = 114.65304245043417;
latscr[1] = 114.64511058036075;
latscr[2] = 114.62130711258408;
latscr[3] = 114.58160846064365;
latscr[4] = 114.52597526778717;
latscr[5] = 114.45435233793859;
latscr[6] = 114.36666853894585;
latscr[7] = 114.26283667800337;
latscr[8] = 114.14275334911737;
latscr[9] = 114.00629875246021;
latscr[10] = 113.85333648543902;
latscr[11] = 113.68371330528974;
latscr[12] = 113.49725886299827;
latscr[13] = 113.29378540834719;
latscr[14] = 113.07308746589221;
latscr[15] = 112.83494148168704;
latscr[16] = 112.57910544059908;
latscr[17] = 112.30531845409905;
latscr[18] = 112.01330031845698;
latscr[19] = 111.70275104334823;
latscr[20] = 111.37335035096243;
latscr[21] = 111.02475714581806;
latscr[22] = 110.6566089556248;
latscr[23] = 110.26852134370196;
latscr[24] = 109.86008729366262;
latscr[25] = 109.43087656731414;
latscr[26] = 108.98043503701092;
latscr[27] = 108.50828399402971;
latscr[28] = 108.01391943493354;
latscr[29] = 107.49681132834813;
latscr[30] = 106.95640286510898;
latscr[31] = 106.39210969535546;
latscr[32] = 105.80331915686062;
latscr[33] = 105.18938949970524;
latscr[34] = 104.54964911334417;
latscr[35] = 103.88339576318558;
latscr[36] = 103.18989584502776;
latscr[37] = 102.46838366708545;
latscr[38] = 101.71806077091026;
latscr[39] = 100.93809530428305;
latscr[40] = 100.12762146115111;
latscr[41] = 99.28573900591726;
latscr[42] = 98.41151290188122;
latscr[43] = 97.50397306640434;
latscr[44] = 96.56211427843391;
latscr[45] = 95.58489626739036;
latscr[46] = 94.57124401610814;
latscr[47] = 93.52004831452095;
latscr[48] = 92.43016660509274;
latscr[49] = 91.3004241655984;
latscr[50] = 90.129615679717;
latscr[51] = 88.91650725096302;
latscr[52] = 87.65983892067017;
latscr[53] = 86.35832775595358;
latscr[54] = 85.01067157865943;
latscr[55] = 83.61555341109214;
latscr[56] = 82.17164671854229;
latscr[57] = 80.67762153204067;
latscr[58] = 79.13215153697311;
latscr[59] = 77.5339222137877;
latscr[60] = 75.88164011550933;
latscr[61] = 74.17404336257252;
latscr[62] = 72.4099134279541;
latscr[63] = 70.58808827402345;
latscr[64] = 68.70747688618883;
latscr[65] = 66.76707522654053;
latscr[66] = 64.7659836025475;
latscr[67] = 62.70342541080774;
latscr[68] = 60.57876717339064;
latscr[69] = 58.39153973419967;
latscr[70] = 56.14146042513282;
latscr[71] = 53.82845594718346;
latscr[72] = 51.45268564116262;
latscr[73] = 49.01456474826338;
latscr[74] = 46.514787184857155;
latscr[75] = 43.95434728215396;
latscr[76] = 41.33455987395539;
latscr[77] = 38.6570780596793;
latscr[78] = 35.9239079306856;
latscr[79] = 33.13741953145193;
latscr[80] = 30.30035333892718;
latscr[81] = 27.41582158827314;
latscr[82] = 24.487303854770737;
latscr[83] = 21.51863642150822;
latscr[84] = 18.513995119773412;
latscr[85] = 15.477871520080214;
latscr[86] = 12;
