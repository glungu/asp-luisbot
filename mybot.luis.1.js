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

var luisAppUrl = process.env.LUIS_APP_URL || 
        'https://westus.api.cognitive.microsoft.com/luis/v2.0/' 
        + 'apps/b920a476-fdd4-4edc-b1be-23c8793bc45e?' 
        + 'subscription-key=6abe6f0082814c1d9edc2ab97ff0ad30';
bot.recognizer(new builder.LuisRecognizer(luisAppUrl));

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
        var locationName = builder.EntityRecognizer.findEntity(intent.entities, 'Location.Name');
        var locationTo = builder.EntityRecognizer.findEntity(intent.entities, 'Location.To');
        var locationFrom = builder.EntityRecognizer.findEntity(intent.entities, 'Location.From');
        console.log("Response from LUIS: " + intent);    
        console.log("Response from LUIS, location name: " + locationName);    
        console.log("Response from LUIS, location to: " + locationTo);    
        
        var loc = session.dialogData.location = {
            locationName: locationName ? locationName.entity : null,
            locationTo: locationTo ? locationTo.entity : null,
            locationFrom: locationFrom ? locationFrom.entity : null,
        };

        console.log("Location: " + loc);    
        
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
                        "text": "Location.Name: " + loc.locationName
                    },
                    {
                        "type": "TextBlock",
                        "text": "Location.To: " + loc.locationTo
                    },
                    {
                        "type": "TextBlock",
                        "text": "Location.From: " + loc.locationFrom
                    }
                ]
            }
        });
        session.send(msg);
        builder.Prompts.text(session, "Is it correct?");    
    },
    function (session, results) {
        console.log("### got location, check confirm");
        if (results.response == "yes") {
            session.endDialog("Very well!");
        } else {
            session.endDialog("Need to train LUIS better... Bye!");
        }
    }
]).triggerAction({ 
    matches: "Places.GetRoute",
    confirmPrompt: "Have some location info. Show?" 
});