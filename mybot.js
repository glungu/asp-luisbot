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
        var msg = new builder.Message(session);
        msg.attachmentLayout(builder.AttachmentLayout.carousel)
        msg.attachments([
            new builder.HeroCard(session)
                .title("Classic White T-Shirt")
                .subtitle("100% Soft and Luxurious Cotton")
                .text("Price is $25 and carried in sizes (S, M, L, and XL)")
                .images([builder.CardImage.create(session, 'http://petersapparel.parseapp.com/img/whiteshirt.png')])
                .buttons([
                    builder.CardAction.imBack(session, "buy classic white t-shirt", "Buy")
                ]),
            new builder.HeroCard(session)
                .title("Classic Gray T-Shirt")
                .subtitle("100% Soft and Luxurious Cotton")
                .text("Price is $25 and carried in sizes (S, M, L, and XL)")
                .images([builder.CardImage.create(session, 'http://petersapparel.parseapp.com/img/grayshirt.png')])
                .buttons([
                    builder.CardAction.imBack(session, "buy classic gray t-shirt", "Buy")
                ])
        ]);
        session.send(msg).endDialog();
    }
    // function (session, results) {
    //     session.endDialog(`Hello ${results.response}!`);
    // }
]);

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

bot.dialog("buyDialog", [
    function(session) {
        builder.Prompts.text(session, 'Are you really buying?');
    },
    function(session, results) {
        if (results.response == "yes") {
            session.endDialog("Thank you!");
        } else {
            session.endDialog("Too bad, come back again!");
        }
    }
]).triggerAction({ matches: /(buy|add)\s.*shirt/i });;