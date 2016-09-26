var fs = require('fs');
var Discord = require('discord.js');
var bot = new Discord.Client();
var token = null;

try {
    token = fs.readFileSync('token', 'utf8');
} catch (err) {
    console.log('Could not open token file');
    process.exit();
}

bot.on('ready', () => {
    console.log('Bot ready');
});

bot.on('message', msg => {
    let prefix = '.';

    // if not a bot command or message was sent from bot then do nothing
    if (!(msg.content.startsWith(prefix)) || msg.author.bot) {
        return;
    }
});

bot.login(token);