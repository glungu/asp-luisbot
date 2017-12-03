var restify = require('restify');
var builder = require('botbuilder');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
// var bot = new builder.UniversalBot(connector, function (session) {
//     session.send("You said: %s", session.message.text);
// });

var bot = new builder.UniversalBot(connector, [
    function(session) {
        session.send("Welcome, how can I help?");
        if (session.dialogData.location == null) {
            session.dialogData.location = {};
        }
    }
]);

var luisUrlPrefix = "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/";
var luisKey = "6abe6f0082814c1d9edc2ab97ff0ad30";
var luisAppID = "9552a3d0-b485-498d-a6a3-7cc83dafcd7c";
var luisStaging = "true";
var luisURL = process.env.LUIS_APP_URL || luisUrlPrefix + luisAppID + "?"
        + "subscription-key=" + luisKey + "&"
        + "staging=" + luisStaging;
bot.recognizer(new builder.LuisRecognizer(luisURL));

// Send welcome when conversation with bot is started, by initiating the root dialog 
bot.on('conversationUpdate', function (message) { 
    if (message.membersAdded) { 
        message.membersAdded.forEach(function (identity) { 
            if (identity.id === message.address.bot.id) { 
                bot.beginDialog(message.address, '/'); 
            } 
        }); 
    } 
});

bot.dialog('ShowIntent', [
    function (session, args, next) {
        // Get info from LUIS.
        var intent = args.intent;
        var channel = builder.EntityRecognizer.findEntity(intent.entities, 'Notification.Channel');
        console.log("Response from LUIS: " + intent);    
        console.log("Response from LUIS, channel: " + channel);    
        
        var notificationChannel = channel ? channel.entity : null;
        var notificationIntent = intent ? (intent.intent + " (" + intent.score + ")")  : null;

        console.log("Notification Channel: " + notificationChannel);    
        console.log("Notification Intent: " + notificationIntent);    
        
        session.userData.notificationChannel = notificationChannel;
        session.userData.notificationIntent = notificationIntent;

        if (notificationChannel == null) {
            session.beginDialog("AskChannel");
        } else {
            next();
        } 
    },
    function (session, results, next) {
        console.log("### step 2");
        if (results.response != null) {
            session.userData.notificationChannel = results.response;
        } 
        next();
    },
    function (session, results) {
        console.log("### step 3");
        var msg = new builder.Message(session).addAttachment({
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
                type: "AdaptiveCard",
                body: [
                    {
                        "type": "TextBlock",
                        "text": "Response from LUIS",
                        "size": "large",
                        "weight": "bolder"
                    },
                    {
                        "type": "TextBlock",
                        "text": "Intent: " + session.userData.notificationIntent
                    },
                    {
                        "type": "TextBlock",
                        "text": "Channel: " + session.userData.notificationChannel
                    }
                ]
            }
        });
        session.send(msg);
        builder.Prompts.text(session, "Is it correct?");
    },
    function (session, results) {
        console.log("### step 4");
        if (results.response != null) {
            session.endDialog("Very well!");
        } else {
            session.endDialog("Need to train LUIS better... Bye!");
        }
    }

]).triggerAction({ 
    matches: "Notification.Start.ZeroBalance"
});

bot.dialog('AskChannel', [
    function (session, args, next) {
        builder.Prompts.text(session, "By means of what channel?");    
    },
    function (session, results) {
        console.log("### check channel result");
        session.endDialogWithResult(results);
    }
]);