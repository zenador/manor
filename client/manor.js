Meteor.startup(function() {

	WebFontConfig = {
		google: { families: [ 'Open+Sans:400,700:latin,latin-ext', 'Raleway:400,700'] }
	};
	(function() {
		var wf = document.createElement('script');
		wf.src = ('https:' == document.location.protocol ? 'https' : 'http') +
			'://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
		wf.type = 'text/javascript';
		wf.async = 'true';
		var s = document.getElementsByTagName('script')[0];
		s.parentNode.insertBefore(wf, s);
		//console.log("async fonts loaded", WebFontConfig);
	})();

});

$( document ).ready(function() {
	var lastTouchY = 0;
	var preventPullToRefresh = false;

	$('body').on('touchstart', function (e) {
		if (e.originalEvent.touches.length != 1) { return; }
		lastTouchY = e.originalEvent.touches[0].clientY;
		preventPullToRefresh = window.pageYOffset == 0;
	});

	$('body').on('touchmove', function (e) {
		var touchY = e.originalEvent.touches[0].clientY;
		var touchYDelta = touchY - lastTouchY;
		lastTouchY = touchY;
		if (preventPullToRefresh) {
			// To suppress pull-to-refresh it is sufficient to preventDefault the first overscrolling touchmove.
			preventPullToRefresh = false;
			if (touchYDelta > 0) {
				e.preventDefault();
				return;
			}
		}
	});
});

window.addEventListener("beforeunload", function (e) {
	if ( (getGameState() == 'inProgress') || (getGameState() == 'waitingForPlayers') ) {
		if (isCreator()) {
			var confirmationMessage = TAPi18n.__("ui.dialog.host close window");
		} else {
			var confirmationMessage = TAPi18n.__("ui.dialog.player close window");			
		}
		(e || window.event).returnValue = confirmationMessage; //Gecko + IE
		return confirmationMessage;                            //Webkit, Safari, Chrome
	}
});

Template.registerHelper('equals', function (a, b) {
	return a === b;
});

Template.registerHelper('lessThan', function (a, b) {
	return a < b;
});

Template.registerHelper('isGameOnline', isGameOnline);

Template.registerHelper('isYou', function (thisPlayerID) {
	var playerID = Session.get("playerID");
	if (playerID == thisPlayerID)
		return true;
	else
		return false;
});

Template.registerHelper('countPlayersStillThinking', function (section) {
	return countPlayersStillThinking(section);
});

Template.registerHelper('listPlayersStillThinking', function (section) {
	return listPlayersStillThinking(section);
});

Template.main.helpers({
	whichView: function() {
		return Session.get('currentView');
	}
});

Template.main.events({
	'click button.btn-tooltip': function (event) {
		showInfoMessage($(event.target).attr('data-tooltip'));
	},
});

Template.startmenu.helpers({
	playerName: function() {
		return Session.get('playerName');
	},
	accessCode: function() {
		return Session.get('accessCode');
	}
});

Template.startmenu.events({
	'click button#newgame': function () {
		var playerName = $('#playername').val();
		if (!playerName) {
			showErrorMessage(TAPi18n.__("ui.validation.form.player name"));
			return false;
		}

		var game = generateNewGame();
		var player = generateNewPlayer(game, playerName, true);

		Session.set("playerName", playerName);
		Session.set("accessCode", game.accessCode);
		Session.set("gameID", game._id);
		Session.set("playerID", player._id);
		Session.set("currentView", "lobby");
		Session.set("mode", "online");
	},
	'click button#joingame': function () {
		var playerName = $('#playername').val().trim();
		if (!playerName) {
			showErrorMessage(TAPi18n.__("ui.validation.form.player name"));
			return false;
		}
		var accessCode = $('#accessCode').val().trim().toLowerCase();
		
		var game = Games.findOne({
			accessCode: accessCode
		});

		if (game) {
			if (game.state == 'inProgress') {
			showErrorMessage(TAPi18n.__("ui.validation.form.game already started"));
				return false;
			}

			var player = generateNewPlayer(game, playerName, false);

			Session.set("playerName", playerName);
			Session.set("accessCode", accessCode);
			Session.set("gameID", game._id);
			Session.set("playerID", player._id);
			Session.set("currentView", "lobby");
			Session.set("mode", "online");
		} else {
			showErrorMessage(TAPi18n.__("ui.validation.form.access code"));
		}
	},
	'click button#playgame': function () {
		Session.set("gameID", null);
		Session.set("playerID", null);
		Session.set("currentView", "ingame");
		Session.set("mode", "offline");
	},
	'click button#randomise': function () {
		Session.set("currentView", "randomise");
	}
});

Template.lobby.helpers({
	game: function () {
		return getCurrentGame();
	},
	accessCode: function () {
		var game = getCurrentGame();
		if (!game) {
			return null;
		}
		return game.accessCode;
	},
	accessLink: function () {
		return getAccessLink();
	},
	player: function () {
		return getCurrentPlayer();
	},
	players: function () {
		return getPlayersInRoom('any');
	},
	isCreator: isCreator,
	isGameState: function (state) {
		return getGameState() == state;
	},
});

Template.lobby.events({
	'click button': function () {//this must be before the specific buttons, otherwise messages may never appear (if they are cleared immediately)
		clearMessage();
	},
	'click button#startgame': function () {
		var game = getCurrentGame();
		if (!game)
			return null;
		var players = Players.find({gameID: game._id}).fetch();

		var MAX_PLAYER_COUNT = rolesets[game.roleSet].length;

		if (players.length < MIN_PLAYER_COUNT) {
			showErrorMessage(TAPi18n.__("ui.validation.start game min", MIN_PLAYER_COUNT));
			return false;
		} else if (players.length > MAX_PLAYER_COUNT) {
			showErrorMessage(TAPi18n.__("ui.validation.start game max", MAX_PLAYER_COUNT));
			return false;
		}

		assignPlayers(players, rolesets[game.roleSet], characters, maps[game.map].length);
		
		Games.update(game._id, {$set: {state: 'inProgress'}});
	},
	'click button.leavegame.inlobby': leaveGame,
	'change select#optionMap': function () {
		var game = getCurrentGame();
		if (!game)
			return null;
		Games.update(game._id, {$set: {map: $('select#optionMap').val()}});
	},
	'change input#optionRadar': function () {
		var isOnRadarMode = false;
		if ($('#optionRadar').is(':checked'))
			isOnRadarMode = true;
		var game = getCurrentGame();
		if (!game)
			return null;
		Games.update(game._id, {$set: {isOnRadarMode: isOnRadarMode}});
	},
	'change input#turnLimit': function () {
		var game = getCurrentGame();
		if (!game)
			return null;
		var turnLimit = parseInt($('#turnLimit').val());
		if (!turnLimit || turnLimit <= 0)
			turnLimit = 100;
		Games.update(game._id, {$set: {turnLimit: turnLimit}});
	},
	'change select#optionRoleSet': function () {
		var game = getCurrentGame();
		if (!game)
			return null;
		Games.update(game._id, {$set: {roleSet: $('select#optionRoleSet').val()}});
	},
	'change input#optionEyewitness': function () {
		var needsEyewitness = false;
		if ($('#optionEyewitness').is(':checked'))
			needsEyewitness = true;
		var game = getCurrentGame();
		if (!game)
			return null;
		Games.update(game._id, {$set: {needsEyewitness: needsEyewitness}});
	}
});

function leaveGame () {
	var player = getCurrentPlayer();
	var game = getCurrentGame();
	if (player && player.state != 0 && game && game.state != "over")
		Players.remove(player._id);
	Session.set("playerID", null);
	Session.set("gameID", null);
	Session.set("currentView", "startmenu");
	Session.set("mode", null);
	Session.set("accessCode", null);
	Session.set("actionCards", null);

	if (game && player) {
		if (game.state == 'inProgress' && player.state != 0) {
			Games.update(game._id, {$set: {state: 'playerQuit'}});
		} else if (player.isCreator) {
			var newHost = Players.findOne({gameID: game._id, isCreator: false});
			if (newHost)
				Players.update(newHost._id, {$set: {isCreator: true}});
			Players.update(player._id, {$set: {isCreator: false}});
		}
	}
}

function assignPlayers(players, nowroles, characters, roomCount){
	nowroles = nowroles.slice(0, players.length);
	characters = characters.slice(0, players.length);

	var default_role = nowroles[nowroles.length - 1];
	var shuffled_roles = shuffleArray(nowroles);
	var role = null;
	players.forEach(function(player){
		role = shuffled_roles.pop();
		if (role === undefined){
			role = default_role;
		}
		Players.update(player._id, {$set: {role: role, isGood: role.isGood}});
		if (role.id == 'witness') {
			Players.update(player._id, {$set: {isEyewitness: 1}});
		}
	});

	var default_cter = characters[characters.length - 1];
	var shuffled_cters = shuffleArray(characters);
	var cter = null;
	players.forEach(function(player){
		cter = shuffled_cters.pop();
		if (cter === undefined){
			cter = default_cter;
		}
		Players.update(player._id, {$set: {character: cter}});
	});

	var room = null;
	players.forEach(function(player){
		room = Math.floor(Math.random() * roomCount);
		Players.update(player._id, {$set: {room: room}});
	});
}

function shuffleArray(array) {
	for (var i = array.length - 1; i > 0; i--) {
			var j = Math.floor(Math.random() * (i + 1));
			var temp = array[i];
			array[i] = array[j];
			array[j] = temp;
	}
	return array;
}

function isGameOnline() {
	var mode = Session.get("mode");
	if (!mode)
		return false;
	return mode == "online";
}

function getAccessLink(){
	var game = getCurrentGame();
	if (!game){
		return;
	}
	return Meteor.settings.public.url + game.accessCode + "/";
}

function generateAccessCode(){
	var code = "";
	var possible = "abcdefghijklmnopqrstuvwxyz";

	for(var i=0; i < 6; i++){
		code += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return code;
}

function getCurrentGame(){
	var gameID = Session.get("gameID");
	if (gameID) {
		return Games.findOne(gameID);
	}
}

function getCurrentPlayer(){
	var playerID = Session.get("playerID");

	if (playerID) {
		return Players.findOne(playerID);
	}
}

function isCreator() {
	var player = getCurrentPlayer();
	if (!player) {
		return null;
	}
	return player.isCreator;
}

function generateNewGame(){
	var game = {
		accessCode: generateAccessCode(),
		state: "waitingForPlayers",
		map: 'fourroom',
		roleSet: 'organised',
		isOnRadarMode: true,
		needsEyewitness: false,
		turnLimit: 10,
		turn: 1,
		phase: 'movement',
		createdAt: new Date()
	};

	var gameID = Games.insert(game);
	game = Games.findOne(gameID);

	return game;
}

function generateNewPlayer(game, name, isCreator){
	var player = {
		gameID: game._id,
		name: name,
		role: null,
		character: null,
		room: null,
		state: 1,
		isWinner: 0,
		isEyewitness: 0,
		isGood: -2,
		isCreator: isCreator,
		cards_action: null,
		cards_movement: null,
		has_chosen_action: false,
		has_chosen_movement: false,
		createdAt: new Date()
	};

	var playerID = Players.insert(player);

	return Players.findOne(playerID);
}

Template.infoBox.helpers({
	knownPlayers: function () {
		return getKnownPlayers();
	},
	isCreator: isCreator,
});

Template.infoBox.events({
	'click button#toggleinfo': function () {
		$('#infoBox').toggleClass("hidden");
		if ($("#toggleinfo").text()==TAPi18n.__("ui.button.game menu.hide info"))
			$("#toggleinfo").text(TAPi18n.__("ui.button.game menu.show info"));
		else
			$("#toggleinfo").text(TAPi18n.__("ui.button.game menu.hide info"));
	}
});

Template.roleBox.helpers({
	currentRoles: function () {
		var game = getCurrentGame();
		if (!game) {
			return null;
		}
		var numPlayers = Players.find({gameID: game._id}).count();
		var currentRoles = rolesets[game.roleSet].slice(0, numPlayers);
		return currentRoles;
	}
});

Template.gameInfo.helpers({
	mapName: function () {
		var game = getCurrentGame();
		if (!game) {
			return null;
		}
		return "game.map."+game.map+".name";
	},
	isOnRadarMode: function () {
		var game = getCurrentGame();
		if (!game) {
			return null;
		}
		if (game.isOnRadarMode) {
			return TAPi18n.__("ui.title.true");
		} else {
			return TAPi18n.__("ui.title.false");
		}
	},
	turnLimit: function () {
		var game = getCurrentGame();
		if (!game) {
			return null;
		}
		return game.turnLimit;
	},
	roleSet: function () {
		var game = getCurrentGame();
		if (!game) {
			return null;
		}
		return "game.role set."+game.roleSet;
	},
	needsEyewitness: function () {
		var game = getCurrentGame();
		if (!game) {
			return null;
		}
		if (game.needsEyewitness) {
			return TAPi18n.__("ui.title.true");
		} else {
			return TAPi18n.__("ui.title.false");
		}
	}
});

Template.gameOptions.helpers({
	mapNameSel: function (thisMapName) {
		var game = getCurrentGame();
		if (!game) {
			return null;
		}
		if (game.map==thisMapName)
			return true;
		else
			return false;
	},
	isOnRadarModeVal: function () {
		var game = getCurrentGame();
		if (!game) {
			return null;
		}
		if (game.isOnRadarMode) {
			return true;
		} else {
			return false;
		}
	},
	turnLimit: function () {
		var game = getCurrentGame();
		if (!game) {
			return null;
		}
		return game.turnLimit;
	},
	roleSetSel: function (thisRoleSet) {
		var game = getCurrentGame();
		if (!game) {
			return null;
		}
		if (game.roleSet==thisRoleSet)
			return true;
		else
			return false;
	},
	needsEyewitnessVal: function () {
		var game = getCurrentGame();
		if (!game) {
			return null;
		}
		if (game.needsEyewitness) {
			return true;
		} else {
			return false;
		}
	}
});

Template.turn_number.helpers({
	turn: getTurn,
	phase: getPhase
});

function getTurn() {
	var game = getCurrentGame();
	if (!game)
		return null;
	return game.turn;
}

function getPhase() {
	var game = getCurrentGame();
	if (!game)
		return null;
	return game.phase;
}

Template.log.helpers({
	logs: function () {
		var game = getCurrentGame();
		if (!game) {
			return null;
		}
		var logs = Logs.find({'gameID': game._id}, {sort: {createdAt: -1}}).fetch();
		return logs;
	}
});

Template.chat.helpers({
	messages: function () {
		var game = getCurrentGame();
		if (!game) {
			return null;
		}
		var messages = Messages.find({'gameID': game._id}, {sort: {createdAt: -1}, limit: 10}).fetch();
		return messages;
	}
});

Template.chat.events({
	'click button#sendmsg': sendChatMsg,
	'keydown #msg': function (event) {
		if (event.keyCode == 13) {
			sendChatMsg();
			return false;
		}
	}
});

function sendChatMsg () {
	var msg = $('#msg').val().trim();
	if (!msg)
		return false;
	createMessage(msg, getCurrentPlayer().name, getCurrentGame()._id);
	$('#msg').val('');
}

function createMessage(msg, playerName, gameID){
	var message = {
		content: msg,
		sender: playerName,
		gameID: gameID,
		createdAt: new Date()
	};

	Messages.insert(message);
}

function createLog(msg){
	var game = getCurrentGame();
	if (!game)
		return;

	var log = {
		content: msg,
		gameID: game._id,
		createdAt: new Date()
	};

	Logs.insert(log);
}

function showErrorMessage(msg) {
	FlashMessages.sendError(msg);
}

function showInfoMessage(msg) {
	FlashMessages.sendInfo(msg);
}

function clearMessage() {
	FlashMessages.clear();
}

Template.audience_list.helpers({
	isEmpty: isEmpty,
	playersInSameRoom: function () {
		return getPlayersInRoom('same');
	}
});

Template.display_room.helpers({
	isEmpty: isEmpty,
	playersInSameRoom: function () {
		return getPlayersInRoom('same');
	},
	getCard: function (listname, index) {
		return getCard(listname, index);
	}
});

Template.my_display_room.helpers({
	cards_action: function () {
		return Session.get('actionCards');
	},
	getCard: function (listname, index) {
		return getCard(listname, index);
	}
});

function isEmpty() {
	var playersHere = getPlayersInRoom('same');
	if (playersHere)
		return playersHere.length <= 0;
	else
		return true;
}

function getCard(listname, index) {
	if (listname == "roles")
		return roles[index];
	else if (listname == "characters")
		return characters[index];
	else if (listname == "miscards")
		return miscards[index];
	else if (listname == "items")
		return items[index];
	else
		return null;
}

function getPlayersInRoom(whichRoom) {
	return getPlayersInRoomOf(whichRoom, 55);
}

function getPlayersInRoomOf(whichRoom, whichPlayer) {
	var game = getCurrentGame();
	if (!game) {
		return null;
	}

	if (whichPlayer == 55) {
		whichPlayer = getCurrentPlayer();
	}

	if (!whichPlayer) {
		return null;
	}

	if (whichRoom == 'same') {
		var players = Players.find({'gameID': game._id, 'room': whichPlayer.room, _id: {$ne: whichPlayer._id}}).fetch();
	} else if (whichRoom == 'same alive') {
		var players = Players.find({'gameID': game._id, 'room': whichPlayer.room, _id: {$ne: whichPlayer._id}, state: {$ne: 0}}).fetch();
	} else if (whichRoom == 'any') {
		var players = Players.find({'gameID': game._id}).fetch();
	} else if (typeof whichRoom == 'number') {//finding which players are in each room for map display purposes
		if (!game.isOnRadarMode && whichPlayer.room != whichRoom) {
			return null;
		}
		var players = Players.find({'gameID': game._id, 'room': whichRoom}).fetch();
	} else {
		return null;
	}
/*
	players.forEach(function(player){
		if (player._id === currentPlayer._id){
			player.isCurrent = true;
		}
	});
*/
	return players;
}

function getKnownPlayers() {
	var game = getCurrentGame();
	if (!game) {
		return null;
	}
	var currentPlayer = getCurrentPlayer();
	if (!currentPlayer) {
		return null;
	}

	var knownList = [];
	if (currentPlayer.role.id == 'witness') {
		knownList.push('murderer');
	} else if (currentPlayer.role.id == 'murderer') {
		knownList.push('accomplice');
	} else if (currentPlayer.role.id == 'accomplice') {
		knownList.push('murderer');
		knownList.push('accomplice');
	} else if (currentPlayer.role.id == 'friend') {
		knownList.push('witness');
	}
	var knownPlayers = [currentPlayer];
	var players = Players.find({'gameID': game._id}).fetch();
	players.forEach(function(player){
		if (player._id != currentPlayer._id && $.inArray(player.role.id, knownList) >= 0) {
			knownPlayers.push(player);
		}
	});

	return knownPlayers;
}

Template.game_menu.events({
	'click button.leavegame.ingame': function () {
		if (isGameOnline()) {
			var player = getCurrentPlayer();
			var game = getCurrentGame();
			if (player && player.state != 0 && game && game.state == "inProgress") {
				var choice = confirm(TAPi18n.__("ui.dialog.player leave game"));
				if (choice == false)
					return false;
			}
		}
		leaveGame();
	}
});

Template.map.helpers({
	players: function (roomNo) {
		return getPlayersInRoom(roomNo);
	},
	currentMap: function () {
		var game = getCurrentGame();
		if (!game)
			return null;
		return getRoom(game.map);
	},
	maps: function (whichRoom) {
		return getRoom(whichRoom);
	}
});

function getRoom(whichRoom) {
	/*return _.map(maps[whichRoom], function(value, index){
		return {value: value, index: index};
	});*/
	return maps[whichRoom].map(function(room, index) {
		room.label = "game.map."+whichRoom+".room."+room.name;
		room.index = index;
		return room;
	});
}

Template.action_pick.helpers({
	characters: function () {
		return characters;
	},
	roles: function () {
		return roles;
	},
	items: function () {
		return items;
	},
	miscards: function () {
		return miscards;
	}
});

Template.movement_pick.helpers({
	movements: function () {
		return movements;
	}
});

Template.action_pick.rendered = function() {
	if(!this._rendered) {
		this._rendered = true;
		$('#action button.after_move').hide();
	}
}

Template.movement_pick.rendered = function() {
	if(!this._rendered) {
		this._rendered = true;
		$('#movement button.after_move').hide();
	}
}

Template.action_pick.events({
	'click .card': function (event) {
		if (!$(event.target).hasClass("selected") && $('#action .card.selected').length >= NUM_ACTION_CARDS) {
			showErrorMessage(TAPi18n.__("ui.validation.action.only num action cards", NUM_ACTION_CARDS));
			return false;
		}

		if (isGameOnline() && $(event.target).hasClass("item") && checkActionIsWrong($(event.target).attr('id'))) {
			showErrorMessage(TAPi18n.__("ui.validation.action.not your item"));
			return false;
		}

		var cardArray = Session.get("actionCards");
		if (!cardArray)
			cardArray = [];

		var thisCard = {id: $(event.target).attr('id'), index: $(event.target).attr('data-index'), listname: $(event.target).attr('data-listname')};
		if ($(event.target).hasClass("selected")) {
			//var thisCardIndex = $.inArray(thisCard, cardArray);
			var thisCardIndex = -1;
			for (var i = 0; i < cardArray.length; i++) {
				if (cardArray[i].id == $(event.target).attr('id'))
					thisCardIndex = i;
			}
			if (thisCardIndex != -1)
				cardArray.splice(thisCardIndex, 1);
		} else {
			cardArray.push(thisCard);
		}

		Session.set("actionCards", cardArray);
		
		$(event.target).toggleClass("selected");
	},
	'click button': function () {//this must be before the specific buttons, otherwise messages may never appear (if they are cleared immediately)
		clearMessage();
	},
	'click button.reset': function () {
		deselectCards('action');
	},
	'click button.skip': function () {
		moveFromActionPhase();
	},
	'click button.submit': function () {
		if ($('#action .card.selected').length != NUM_ACTION_CARDS) {
			showErrorMessage(TAPi18n.__("ui.validation.action.exactly num action cards", NUM_ACTION_CARDS));
			return false;
		}
		if ($('#action .item.selected').length > 1) {
			showErrorMessage(TAPi18n.__("ui.validation.action.max 1 item card"));
			return false;
		} else if ($('#action .item.selected').length == 1) {
			if ($('#action .character.selected').length != 1) {
				showErrorMessage(TAPi18n.__("ui.validation.action.exactly 1 character card"));
				return false;
			} else if (isGameOnline()) {
				var actionCharacter = $('#action .character.selected').attr('data-index');
				var player = getCurrentPlayer();
				var game = getCurrentGame();
				var actionPlayer = null;
				if (player) {
					if (game)
						actionPlayer = Players.findOne({gameID: game._id, character: characters[actionCharacter]});
					if (actionPlayer) {
						if (player.character.id == actionPlayer.character.id) {
							showErrorMessage(TAPi18n.__("ui.validation.action.use item on self"));
							return false;
						} else if (player.room != actionPlayer.room) {
							showErrorMessage(TAPi18n.__("ui.validation.action.use item on gone"));
							return false;
						} else if (actionPlayer.state == 0) {
							showErrorMessage(TAPi18n.__("ui.validation.action.use item on dead"));
							return false;
						}
					} else {
						showErrorMessage(TAPi18n.__("ui.validation.action.use item on nonexistent"));
						return false;
					}
					if ($('#action .item.selected').attr('id') == 'shield') {
						var playersHere = getPlayersInRoom('same alive');
						if (playersHere && playersHere.length < 2) {
							console.log(playersHere.length);
							showErrorMessage(TAPi18n.__("ui.validation.action.min characters for shield"));
							return false;
						}
					}
				}
			}
		}

		shortlistCards('action');
		$('#action h5').hide();

		if (isGameOnline()) {
			changeToStateDuringMove('action');
			savePlayerCards('action');
		} else {
			changeToStateAfterMove('action');
		}
	},
	'click button.next': function () {
		progressFromActionPhase();
	}
});

Template.movement_pick.events({
	'click .card': function (event) {
		if (isGameOnline() && checkMovementIsWrong($(event.target).attr('id'))) {
			showErrorMessage(TAPi18n.__("ui.validation.movement.illegal"));
			return false;
		}

		$('#movement .card').removeClass("selected");
		$(event.target).addClass("selected");
	},
	'click button': function () {//this must be before the specific buttons, otherwise messages may never appear (if they are cleared immediately)
		clearMessage();
	},
	'click button.reset': function () {
		deselectCards('movement');
	},
	'click button.skip': function () {
		moveFromMovementPhase();
	},
	'click button.submit': function () {
		if ($('#movement .card.selected').length != 1) {
			showErrorMessage(TAPi18n.__("ui.validation.movement.exactly 1 card"));
			return false;
		}

		shortlistCards('movement');

		if (isGameOnline()) {
			changeToStateDuringMove('movement');
			savePlayerCards('movement');
		} else {
			changeToStateAfterMove('movement');
		}
	},
	'click button.next': function () {
		progressFromMovementPhase();
	}
});

function moveFromActionPhase() {
	$('#action').hide();
	$('#movement').show();
	deselectCards('action');
}

function moveFromMovementPhase() {
	$('#movement').hide();
	$('#action').show();
	deselectCards('movement');
}

function progressFromActionPhase() {
	moveFromActionPhase();
	putCardsBack('action');
	$('#action h5').show();
	changeToStateBeforeMove('action');
	if (isGameOnline() && getPlayerState() == 0) {
		skipPlayerMovementTurn();
	}
}

function progressFromMovementPhase() {
	moveFromMovementPhase();
	putCardsBack('movement');
	changeToStateBeforeMove('movement');
	if (isGameOnline()) {
		var playersHere = getPlayersInRoom('same alive');
		if (getPlayerState() == 0) {
			skipPlayerActionTurn(true);
		} else if (playersHere != null && playersHere.length == 0) {
			skipPlayerActionTurn(false);
		}
	}
}

function changeToStateBeforeMove(section) {
	$('#'+section+' button.after_move').hide();
	$('#'+section+' button.before_move').show();
	$('#'+section+' .card').removeClass("disabled");

	$('#'+section+' .instructions').html(TAPi18n.__("ui.instruction."+section+".before move"));
}

function changeToStateDuringMove(section) {
	$('#'+section+' button.after_move').hide();
	$('#'+section+' button.before_move').hide();
	$('#'+section+' .card').addClass("disabled");

	$('#'+section+' .instructions').html(TAPi18n.__("ui.instruction."+section+".during move"));
}

function changeToStateAfterMove(section) {
	$('#'+section+' button.before_move').hide();
	$('#'+section+' button.after_move').show();
	$('#'+section+' .card').addClass("disabled");

	$('#'+section+' .instructions').html(TAPi18n.__("ui.instruction."+section+".after move"));
}

function deselectCards(section) {
	$('#'+section+' .card').removeClass("selected");
	if (section=='action') {
		Session.set("actionCards", []);
	}
}

function shortlistCards(section) {
	$('#'+section+' .card').hide();
	if (section == 'action') {
		$('#my_display_room .card').each(function() {
			$(this).show();
		});
	} else {
		$('#'+section+' .card.selected').each(function() {
			//$(this).attr('id');
			$(this).show();
		});
	}
}

function putCardsBack(section) {
	$('#'+section+' .card').show();
}

function skipPlayerActionTurn(isDead) {
	var player = getCurrentPlayer();
	if (!player) {
		return null;
	}
	Players.update(player._id, {$set: {cards_action: null, has_chosen_action: true}});
	$('#action .card').hide();
	$('#action h5').hide();
	changeToStateDuringMove('action');
	//$('#action .instructions').html(TAPi18n.__("ui.instruction."+section+".during_move"));
	if (isDead)
		$('#action .instructions').html(TAPi18n.__("ui.instruction.action.dead move"));
	else
		$('#action .instructions').html(TAPi18n.__("ui.instruction.action.empty move"));
}

function skipPlayerMovementTurn() {
	var player = getCurrentPlayer();
	if (!player) {
		return null;
	}
	Players.update(player._id, {$set: {cards_movement: null, has_chosen_movement: true}});
	$('#movement > .card').hide();
	changeToStateDuringMove('movement');
	$('#movement .instructions').html(TAPi18n.__("ui.instruction.movement.dead move"));
}

function savePlayerCards(section) {
	var player = getCurrentPlayer();
	if (!player) {
		return null;
	}
	var cardArray = [];
	if (section=="movement") {
		$('#movement .card.selected').each(function() {
			cardArray.push($(this).attr('id'));
		});
		Players.update(player._id, {$set: {cards_movement: cardArray, has_chosen_movement: true}});
	} else if (section=="action") {
		/*
		$('#action .card.selected').each(function() {
			cardArray.push({id: $(this).attr('id'), index: $(this).attr('data-index'), listname: $(this).attr('data-listname')});
		});
		*/
		cardArray = Session.get("actionCards");
		Players.update(player._id, {$set: {cards_action: cardArray, has_chosen_action: true}});
	}
}

function resetPlayerCards(section) {
	var game = getCurrentGame();
	if (!game)
		return null;
	var players = Players.find({gameID: game._id}).fetch();
	players.forEach(function(player){
		//Players.update(player._id, {$set: {cards_movement: null, cards_action:null}});
		if (player.state == 0)
			return;
		if (section=="movement") {
			Players.update(player._id, {$set: {has_chosen_movement: false}});			
		} else if (section=="action") {
			Players.update(player._id, {$set: {has_chosen_action: false}});
		}
	});
}

function saveNewGameState(phase) {
	var game = getCurrentGame();
	if (!game || game.state == "over")
		return null;
	var turnNo = game.turn;
	if (phase=='movement') {
		turnNo += 1;

		var dyingPlayers = Players.find({gameID: game._id, state: {$lt: 0}}).fetch();
		dyingPlayers.forEach(function(player){
			Players.update(player._id, {$set: {state: player.state+1}});
		});

		if (turnNo > game.turnLimit) {
			createLog(TAPi18n.__("ui.update.escape", game.turnLimit));
			setWinners(['murderer','badteam','accomplice','bodyguard'], 'out of time');
		}
	}
	Games.update(game._id, {$set: {turn: turnNo, phase: phase}});
}

function countPlayersStillThinking(section) {
	var players = listPlayersStillThinking(section);
	if (!players)
		return null;
	return players.length;
}

function listPlayersStillThinking(section) {
	var game = getCurrentGame();
	if (!game)
		return null;
	if (section=="movement") {
		var players = Players.find({gameID: game._id, has_chosen_movement: false}).fetch();
	} else if (section=="action") {
		var players = Players.find({gameID: game._id, has_chosen_action: false}).fetch();
	}
	return players;
}

function resolveMovements() {
	var game = getCurrentGame();
	if (!game)
		return null;
	var players = Players.find({gameID: game._id}).fetch();
	var map = maps[game.map];
	players.forEach(function(player){
		if (!player.cards_movement)
			return;
		var dir = player.cards_movement[0];
		var newRoom = map[player.room][dir];
		if (newRoom != undefined)
			Players.update(player._id, {$set: {room: newRoom}});
	});
}

function resolveActions() {
	var game = getCurrentGame();
	if (!game)
		return null;
	var players = Players.find({gameID: game._id}, {sort: {"role.order": 1}}).fetch();
	var protectedCharacter = null;
	players.forEach(function(player){
		if ($.inArray(player.role.id, ['police', 'murderer', 'bodyguard']) < 0)
			return;
		var actionItem = null;
		var actionCharacter = null;
		if (!player.cards_action)
			return;
		player.cards_action.forEach(function(card){
			if (card['listname'] == 'items')
				actionItem = card['id'];
			else if (card['listname'] == 'characters')
				actionCharacter = card['index'];
		});
		if (!actionCharacter || !actionItem)
			return;
		var actionPlayer = Players.findOne({gameID: game._id, character: characters[actionCharacter]});
		if (!actionPlayer || (actionPlayer.room != player.room) || (actionPlayer._id==player._id))
			return;
		if (player.role.id == 'police') {
			if (actionItem == 'handcuffs') {
				createLog(TAPi18n.__("ui.update.arrested", {arrester: player, suspect: actionPlayer}));
				if (actionPlayer.role.id == 'murderer') {
					if (!game.needsEyewitness) {
						setWinners(['witness','police','goodteam','friend','bodyguard'], 'arrest correctly');
					} else {
						var eyewitnesses = Players.find({'gameID': game._id, state: 1, isEyewitness: 1, isGood: {$ne: -1}}).count();
						if (eyewitnesses > 0) {
							setWinners(['witness','police','goodteam','friend','bodyguard'], 'arrest with eyewitness');
						} else {
							createLog(TAPi18n.__("ui.update.no eyewitness"));
							setWinners(['murderer','badteam','accomplice','bodyguard'], 'arrest without eyewitness');
						}
					}
				} else {
					if (actionPlayer.role.id != 'psycho') {
						setPlayerIsWinner(actionPlayer, -1);
					} else {
						setPlayerIsWinner(actionPlayer, 1);
					}
					setWinners(['murderer','badteam','accomplice','bodyguard'], 'arrest wrongly');
				}
			}
		} else if (player.role.id == 'murderer') {
			if (actionItem == 'knife' || actionItem == 'poison') {
				var playersInThisRoom = getPlayersInRoomOf('same alive', player);
				playersInThisRoom.forEach(function(thisPlayerInThisRoom){
					Players.update(thisPlayerInThisRoom._id, {$set: {isEyewitness: 1}});
				});
			}
			if (actionPlayer.role.id == 'police') {
				createLog(TAPi18n.__("ui.update.arrested kill", {arrester: actionPlayer, suspect: player}));
				setWinners(['witness','police','goodteam','friend','bodyguard'], 'try kill police');
			} else if (actionPlayer.role.id == 'bodyguard') {
			} else if (actionItem == 'knife' && actionPlayer.state != 0 && actionPlayer.character.id != protectedCharacter) {
				if (actionPlayer.role.id == 'witness') {
					setRoleIsWinner('bodyguard', -1);
				}
				if (actionPlayer.role.id != 'martyr') {
					setPlayerIsWinner(actionPlayer, -1);
				} else {
					setPlayerIsWinner(actionPlayer, 1);
				}
				Players.update(actionPlayer._id, {$set: {state: 0}});
			} else if (actionItem == 'poison' && actionPlayer.state == 1 && actionPlayer.character.id != protectedCharacter) {
				if (actionPlayer.role.id == 'witness') {
					setRoleIsWinner('bodyguard', -1);
				}
				if (actionPlayer.role.id != 'martyr') {
					setPlayerIsWinner(actionPlayer, -1);
				} else {
					setPlayerIsWinner(actionPlayer, 1);
				}
				Players.update(actionPlayer._id, {$set: {state: POISON_VAR}});
			}
		} else if (player.role.id == 'bodyguard') {
			if (actionItem == 'shield' && actionPlayer.state != 0) {
				protectedCharacter = actionPlayer.character.id;
			}
		}
	});
}

function setWinners(winnerList, endReason) {
	var game = getCurrentGame();
	if (!game)
		return null;
	var players = Players.find({gameID: game._id}).fetch();
	var finalWinnerList = [];
	players.forEach(function(player){
		if (player.isWinner == 0) {
			if ($.inArray(player.role.id, winnerList) >= 0) {
				setPlayerIsWinner(player, 1);
				finalWinnerList.push(player.role.id);
			} else {
				setPlayerIsWinner(player, -1);
			}
		} else if (player.isWinner == 1) {
			finalWinnerList.push(player.role.id);
		}
	});
	Games.update(game._id, {$set: {state: 'over'}});
	generateNewResult(game, finalWinnerList, endReason);
}

function setRoleIsWinner(role, winState) {
	var game = getCurrentGame();
	if (!game)
		return null;
	var players = Players.find({gameID: game._id}).fetch();
	players.forEach(function(player){
		if (player.isWinner == 0 && player.role.id == role) {
			setPlayerIsWinner(player, winState);
		}
	});
}

function setPlayerIsWinner(player, winState) {
	Players.update(player._id, {$set: {isWinner: winState}});
}

function generateNewResult(game, winnerList, endReason){
	var numPlayers = Players.find({gameID: game._id}).count();
	var result = {
		started: game.createdAt,
		ended: new Date(),
		map: game.map,
		isOnRadarMode: game.isOnRadarMode,
		needsEyewitness: game.needsEyewitness,
		turnLimit: game.turnLimit,
		turn: game.turn,
		endReason: endReason,
		numPlayers: numPlayers,
		roleList: game.roleSet,
		winners: winnerList
	};

	Results.insert(result);
}

function checkActionIsWrong(item) {
	var game = getCurrentGame();
	if (!game)
		return null;
	var player = getCurrentPlayer();
	if (!player)
		return null;

	if (player.role.id == 'police') {
		if (item == 'handcuffs')
			return false;
	} else if (player.role.id == 'murderer') {
		if (item == 'knife')
			return false;
		else if (item == 'poison')
			return false;
	} else if (player.role.id == 'bodyguard') {
		if (item == 'shield')
			return false;
	}

	return true;
}

function checkMovementIsWrong(dir) {
	var game = getCurrentGame();
	if (!game)
		return null;
	var player = getCurrentPlayer();
	if (!player)
		return null;
/*
	var dir = null;
	$('#movement .card.selected').each(function() {
		dir = $(this).attr('id');
	});
*/
	if (dir == 'stay')
		return false;
	var newRoom = maps[game.map][player.room][dir];
	if (newRoom == undefined)
		return true;
	else
		return false;
}

Tracker.autorun(maintainIntegrity);
Tracker.autorun(checkIfPlayersAreDone);
Tracker.autorun(trackGamePhase);
Tracker.autorun(trackGameState);
Tracker.autorun(trackPlayerState);

function maintainIntegrity () {
	
	var gameID = Session.get("gameID");
	var playerID = Session.get("playerID");

	if (!gameID || !playerID){
		return;
	}

	var game = Games.findOne(gameID);
	var player = Players.findOne(playerID);

	if (!game || !player){
		Session.set("gameID", null);
		Session.set("playerID", null);
		Session.set("currentView", "startmenu");
		return;
	}
}

function checkIfPlayersAreDone () {
	if (isCreator()) {
		if (countPlayersStillThinking('movement') == 0) {
			Tracker.nonreactive(function(){
				resolveMovements();
				resetPlayerCards('movement');
				saveNewGameState('action');
			});
		}
		if (countPlayersStillThinking('action') == 0) {
			Tracker.nonreactive(function(){
				resolveActions();
				resetPlayerCards('action');
				saveNewGameState('movement');
			});
		}
	}
}

function getGameState () {
	var gameVar = Games.findOne(Session.get("gameID"), {fields: {'state': 1}});
	if (!gameVar)
		return null;
	else
		return gameVar.state;
}

function getGamePhase () {
	var gameVar = Games.findOne(Session.get("gameID"), {fields: {'phase': 1}});
	if (!gameVar)
		return null;
	else
		return gameVar.phase;
}

function getPlayerState () {
	var playerVar = Players.findOne(Session.get("playerID"), {fields: {'state': 1}});
	if (!playerVar)
		return null;
	else
		return playerVar.state;
}

function trackGamePhase () {
	var phase = getGamePhase();
	if (phase == 'action') {
		Tracker.nonreactive(progressFromMovementPhase);
	} else if (phase == 'movement') {
		Tracker.nonreactive(progressFromActionPhase);
	}
}

function trackGameState () {
	var state = getGameState();
	clearMessage();
	if (state == 'playerQuit') {
		Tracker.nonreactive(leaveGame);
		FlashMessages.sendError(TAPi18n.__("ui.update.player left"), {autoHide: false});
	}
}

function trackPlayerState () {
	var state = getPlayerState();
	if (state == 0) {
		Tracker.nonreactive(function(){
			FlashMessages.sendError(TAPi18n.__("ui.update.self dead"), {autoHide: false});
			var player = getCurrentPlayer();
			var game = getCurrentGame();
			if (player && game && game.isOnRadarMode)
				createLog(TAPi18n.__("ui.update.other dead", {kter: player.character.id, name: player.name}));
			//if (player && player.role.id == 'witness')
			//	setRoleIsWinner('bodyguard', -1);
		});
	} else if (state < 0 && state != POISON_VAR) {
		FlashMessages.sendError(TAPi18n.__("ui.update.self poison", {count: -state}));
	}
}

var defaultRoleList = ["Witness", "Police", "Murderer", "Harmless Psycho", "Witness' Secret Friend", "Accomplice", "Bodyguard", "Accomplice", "Martyr", "Accomplice", "Victim Sympathiser", "Accomplice", "Victim Sympathiser", "Accomplice", "Victim Sympathiser"];

Template.randomise.helpers({
	numPlayers: function () {
		return [15,14,13,12,11,10,9,8,7,6,5,4,3,2,1];
	},
	roleList: function () {
		return defaultRoleList.join('\n');
	},
	randomList: function () {
		var randomList = Session.get('randomList');
		randomList = randomList.map(function(it, index) {
			return {index: index+1, value: it};
		});
		return randomList;
	}
});

Template.randomise.events({
	'click button#goshuffle': function (event) {
		var roleList = formatRoleList($('#roleList').val());
		//var numPlayers = $('select#numPlayers').val();
		//var randomList = randomisePlayers(roleList, numPlayers);
		var randomList = randomisePlayers(roleList);
		//$('#roleList').val(randomList.join('\n'));
		Session.set("randomList", randomList);
		$('#randomForm').hide();
		$(event.target).hide();
	},
	'click button#backtomenu': function () {
		Session.set("randomList", []);
		Session.set("currentView", "startmenu");
	},
	'change select#numPlayers': function () {
		var numPlayers = $('select#numPlayers').val();
		var roleList = formatRoleList($('#roleList').val());
		if (numPlayers > roleList.length)
			roleList = defaultRoleList;
		roleList = roleList.slice(0, numPlayers);
		$('#roleList').val(roleList.join('\n'));
	},
	'click button.secret.tapToShow': function (event) {
		if ($('button.secret.tapToHide').length > 0)
			return false;
		var content = $(event.target).attr('data-value');
		var index = $(event.target).text();
		$(event.target).text(content);
		$(event.target).attr('data-value', index);
		$(event.target).removeClass('tapToShow');
		$(event.target).addClass('tapToHide');
	},
	'click button.secret.tapToHide': function (event) {
		var index = $(event.target).attr('data-value');
		var content = $(event.target).text();
		$(event.target).text(index);
		$(event.target).attr('data-value', content);
		$(event.target).removeClass('tapToHide');
		$(event.target).addClass('disabled');
	},
});

function formatRoleList(roleList) {
	var roleList = roleList.split('\n');
	roleList = roleList.map(function(it) {
		return it.trim();
	});
	roleList = roleList.filter(function(it) {
		return it!="";
	});
	return roleList;
}
/*
function randomisePlayers(roleList, numPlayers){
	roleList = roleList.slice(0, numPlayers);

	var default_role = roleList[roleList.length - 1];
	var shuffled_roles = shuffleArray(roleList);
	var role = null;
	var players = [];
	for (i = 0; i < numPlayers; i++) {
		role = shuffled_roles.pop();
		if (role === undefined){
			role = default_role;
		}
		players.push(role);
	}

	return players;
}
*/
function randomisePlayers(roleList){
	var numPlayers = roleList.length;
	var default_role = roleList[numPlayers - 1];
	var shuffled_roles = shuffleArray(roleList);
	var role = null;
	var players = [];
	for (i = 0; i < numPlayers; i++) {
		role = shuffled_roles.pop();
		if (role === undefined){
			role = default_role;
		}
		players.push(role);
	}
	return players;
}

Template.ruleBox.events({
	'click button#toggleIntro': function () {
		$('#ruleContent').hide();
		$('#introContent').toggle();
	},
	'click button#toggleRules': function () {
		$('#introContent').hide();
		$('#ruleContent').toggle();
	},
});

Template.footer.helpers({
	versionNo: function () {
		return VERSION_NUMBER;
	}
});
