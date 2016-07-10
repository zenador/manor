characters = [
	{id: 'red'},
	{id: 'green'},
	{id: 'blue'},
	{id: 'yellow'},
	{id: 'black'},
	{id: 'white'},
	{id: 'grey'},
	{id: 'orange'},
	{id: 'purple'},
	{id: 'pink'},
	{id: 'brown'},
];
characters = characters.map(function(item, index) {
	item.name = "game.character."+item.id;
	item.index = index;
	item.listname = "characters";
	return item;
});
