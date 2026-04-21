const BASE_URL = 'https://queuemate-api.onrender.com';

const GAME_CONFIG = {
  valorant: { label:'Valorant', color:'#e05260', badgeClass:'badge-valorant', accentClass:'qm-accent-valorant', teamSize:'5v5', image:'assets/game-valorant.jpg', ranks:['Iron','Bronze','Silver','Gold','Platinum','Diamond','Ascendant','Immortal','Radiant'], teammates:['Duo','3 Players','Full Team'] },
  pubgm:    { label:'PUBG Mobile', color:'#5bb85b', badgeClass:'badge-pubgm', accentClass:'qm-accent-pubgm', teamSize:'4-player squad', image:'assets/game-pubgm.jpg', ranks:['Bronze','Silver','Gold','Platinum','Diamond','Crown','Ace','Ace Master','Ace Dominator','Conqueror'], teammates:['Duo','2 Players','Squad'] },
  ff:       { label:'Free Fire', color:'#f07a2a', badgeClass:'badge-ff', accentClass:'qm-accent-ff', teamSize:'4-player squad', image:'assets/game-ff.jpg', ranks:['Bronze','Silver','Gold','Platinum','Diamond','Heroic','Master','Grandmaster'], teammates:['Duo','2 Players','Squad'] },
  mlbb:     { label:'Mobile Legends', color:'#9c6dff', badgeClass:'badge-mlbb', accentClass:'qm-accent-mlbb', teamSize:'5v5', image:'assets/game-mlbb.jpg', ranks:['Warrior','Elite','Master','Grandmaster','Epic','Legend','Mythic','Mythical Honor','Mythical Glory','Mythical Immortal'], teammates:['Duo','3 Players','Full Team'] },
};

const GAMES = Object.keys(GAME_CONFIG);
const CATEGORIES = ['news','result','recruitment'];
