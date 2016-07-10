Router.route('/', function () {
	this.render('main');
	if (!Session.get("currentView")) {
		Session.set("currentView", "startmenu");
	}
	GAnalytics.pageview("main");
});
