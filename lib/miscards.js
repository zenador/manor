miscards = [
	{id: 'is'},
	{id: 'isnot'},
	{id: 'question'},
	{id: 'know'},
	{id: 'sure'},
	{id: 'infer'},
	{id: 'believe'},
	{id: 'think'},
	{id: 'guess'},
	{id: 'hope'},
	{id: 'said'},
	{id: 'extra1'},
	{id: 'extra2'},
	{id: 'extra3'},
];
miscards = miscards.map(function(item, index) {
	item.name = "game.card."+item.id;
	item.index = index;
	item.listname = "miscards";
	return item;
});
