var http = require("follow-redirects").http;
var https = require("follow-redirects").https;
var domain = require('domain');
var fs = require("fs");
var util = require("util");

var router = JSON.parse(fs.readFileSync("router-config.json"));

var loginUrl = util.format("http://192.168.0.254/log/in?un=%s&pw=%s&rd=%2Fuir%2Fbanner.htm&rd2=%2Fuir%2Flogin1.htm&Nrd=1&_dlg=", router.username, router.password);
var rebootUrl = "http://192.168.0.254/uir/rebo.htm";
var localPingUrl = "http://192.168.0.254";
var remotePingUrl = "https://www.google.com";

var PING_INTERVAL = 60000; 
var PING_FAIL_TRESHOLD = 10;

var pingFailCount = 0;

var localDomain = domain.create();
var remoteDomain = domain.create();

localDomain.on('error', function(err) {
	pingFailCount = 0;
	console.log("Router or network down: " + err.code);
});

remoteDomain.on('error', function(err) {
	pingFailCount++;
	console.log("Remote ping failed! Fail count: " + pingFailCount);			
});

var ping = function() {
	var pingSuccess = function(res) {
		if (res.statusCode === 200) {
			console.log("Local ping ok, router running");
			remoteDomain.run(function() {
				pingRemote();
			});
		}
		else {
			console.log("Router down, response: " + res.statusCode);
		}
	} 
	localDomain.add(pingSuccess);
	localDomain.run(function() {
		pingLocal(pingSuccess);
	});
};

var pingLocal = function(cb) {
	http.get(localPingUrl, cb);
};

var pingRemote = function() {
	if (pingFailCount >= PING_FAIL_TRESHOLD) {
		console.log("Rebooting router");
		localDomain.run(function() {
			rebootRouter();
		});
	}
	else {
		console.log("Pinging remote: " + remotePingUrl);
		try {
			https.get(remotePingUrl, remotePingHandler);
		}
		catch (e) {			
			pingFailCount++;
			console.log("Remote ping failed! Fail count: " + pingFailCount);			
		}
	}
};
remoteDomain.add(pingRemote);

var remotePingHandler = function(res) {
	if (res.statusCode === 200) {
		console.log("Remote ok, sleeping now");
		pingFailCount = 0;
	}
	else {
		pingFailCount++;
		console.log("Remote ping failed! Fail count: " + pingFailCount);
		console.log("Response: " + res.statusCode);
	}
};

var routerLoginCallback = function(res) {
	if (res.statusCode === 200) {
		console.log("Logged in to router");
		http.get(rebootUrl, function rebootCallback(res) {
			console.log("Rebooted! Response: " + res.statusCode);
			pingFailCount = 0;
		});
	}
	else {
		console.log("Router login failed: " + res.statusCode);
	}

}
var rebootRouter = function() {
	http.get(loginUrl, routerLoginCallback);
};
localDomain.add(rebootRouter);

process.on("ENETUNREACH", function() {
	console.log("No network");
});

ping();
setInterval(ping, PING_INTERVAL);
