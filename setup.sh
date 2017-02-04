#!/bin/bash
discordToken=
mongodbURI=
youtubeApiKey=
configsSet=true

if [ -z $discordToken ]; then
    configsSet=false
    echo "Missing Discord token!"
fi
if [ -z $mongodbURI ]; then
    configsSet=false
    echo "Missing MongoDB URI!"
fi
if [ -z $youtubeApiKey ]; then
    configsSet=false
    echo "Missing YouTube API key!"
fi

if $configsSet; then
    heroku buildpacks:set heroku/nodejs
    heroku buildpacks:add https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git
    heroku config:set DISCORD_TOKEN=$discordToken
    heroku config:set MONGODB_URI=$mongodbURI
    heroku config:set YOUTUBE_API_KEY=$youtubeApiKey
    git push heroku heroku:master
    heroku ps:scale worker=1
fi
