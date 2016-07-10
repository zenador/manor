function cleanUpCollections(){
	var cutOff = moment().subtract(5, 'hours').toDate();

	var numGamesRemoved = Games.remove({
		createdAt: {$lt: cutOff}
	});

	var numPlayersRemoved = Players.remove({
		createdAt: {$lt: cutOff}
	});
}

function cleanUpMessages(){
	var cutOff = moment().subtract(1, 'hours').toDate();

	var numMessagesRemoved = Messages.remove({
		createdAt: {$lt: cutOff}
	});
}

Meteor.startup(function () {
	// Delete all collections on startup
	Games.remove({});
	Players.remove({});
	Messages.remove({});
});

var MyCron = new Cron(60000);

MyCron.addJob(60, cleanUpCollections);
MyCron.addJob(15, cleanUpMessages);
