roles = [
	{
		id: 'witness',
		order: 4,
		isGood: 1
	},
	{
		id: 'police',
		order: 3,
		isGood: 1
	},
	{
		id: 'murderer',
		order: 2,
		isGood: -1
	},
	{
		id: 'psycho',
		order: 4,
		isGood: 0
	},
	{
		id: 'badteam',
		order: 4,
		isGood: -1
	},
	{
		id: 'goodteam',
		order: 4,
		isGood: 1
	},
	{
		id: 'accomplice',
		order: 4,
		isGood: -1
	},
	{
		id: 'bodyguard',
		order: 1,
		isGood: 0
	},
	{
		id: 'friend',
		order: 4,
		isGood: 1
	},
	{
		id: 'martyr',
		order: 4,
		isGood: 0
	},
];
var rolesDict = {};
roles = roles.map(function(item, index) {
	item.name = "game.role."+item.id+".name";
	item.tooltip = "game.role."+item.id+".desc";
	item.index = index;
	item.listname = "roles";
	rolesDict[item.id] = item;
	return item;
});
/*
roles.forEach(function(role){
	rolesDict[role.id] = role;
});
*/
rolesets = {};
rolesets['organised'] = [rolesDict['witness'], rolesDict['police'], rolesDict['murderer'], rolesDict['psycho'], rolesDict['friend'], rolesDict['accomplice'], rolesDict['bodyguard'], rolesDict['accomplice'], rolesDict['martyr'], rolesDict['accomplice'], rolesDict['goodteam'], rolesDict['accomplice'], rolesDict['goodteam'], rolesDict['accomplice'], rolesDict['goodteam']];
rolesets['disorganised'] = [rolesDict['witness'], rolesDict['police'], rolesDict['murderer'], rolesDict['psycho'], rolesDict['friend'], rolesDict['badteam'], rolesDict['bodyguard'], rolesDict['badteam'], rolesDict['martyr'], rolesDict['badteam'], rolesDict['goodteam'], rolesDict['badteam'], rolesDict['goodteam'], rolesDict['badteam'], rolesDict['goodteam']];
