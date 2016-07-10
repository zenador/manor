items = [
	{id: 'handcuffs'},
	{id: 'knife'},
	{id: 'poison'},
	{id: 'shield'},
];
items = items.map(function(item, index) {
	item.name = "game.item."+item.id+".name";
	item.cardtip = "game.item."+item.id+".desc";
	item.index = index;
	item.listname = "items";
	return item;
});
