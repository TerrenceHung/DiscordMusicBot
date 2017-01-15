# DiscordMusicBot
Music player for your Discord servers!

[Click here to add Music Bot to your server](https://discordapp.com/oauth2/authorize?&client_id=229835293744693249&scope=bot&permissions=0)

## Commands
    .play <query>
Give a YouTube video URL or a search query, and the bot will stream the audio in the voice channel you are currently in. If a song is currently playing then your request will be added to the queue.

    .queue
List all of the songs currently in the queue.

    .pause
Pause the current song.

    .resume
Resume playing the current song if it is paused.

    .stop
Clears the song queue and stops playing the current song.

    .skip
Skip the current song.

    .repeat
Set the current song to play on repeat. Repeat is disabled when `.stop` or `.skip` is issued.

    .stoprepeat
Stops playing the current song on repeat.

    .volume <0-100>
Sets the volume to a value in the range 0 to 100 inclusive. If no number is given, the current volume is shown.
