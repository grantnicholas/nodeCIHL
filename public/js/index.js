function init() {

  var serverBaseUrl = document.domain;

  /*
   On client init, try to connect to the socket.IO server.
   Note we don't specify a port since we set up our server
   to run on port 8080
   */
  var socket = io.connect(serverBaseUrl);

  //We'll save our session ID in a variable for later
  var sessionId = '';

  //Helper function to update the participants' list
  function updateParticipants(participants) {
    $('#participants').html('');
    for (var i = 0; i < participants.length; i++) {
      $('#participants').append('<span id="' + participants[i].id + '">' +
        participants[i].name + ' ' + (participants[i].id === sessionId ? '(You)' : '') + '<br /></span>');
    }
  }

  /*
   When the client successfully connects to the server, an
   event "connect" is emitted. Let's get the session ID and
   log it. Also, let the socket.IO server there's a new user
   with a session ID and a name. We'll emit the "newUser" event
   for that.
   */
  socket.on('connect', function () {
    sessionId = socket.io.engine.id;
    console.log('Connected ' + sessionId);
    socket.emit('newUser', {id: sessionId, name: $('#name').text()}); //was $('#name').val()
  });

  /*
   When the server emits the "newConnection" event, we'll reset
   the participants section and display the connected clients.
   Note we are assigning the sessionId as the span ID.
   */
  socket.on('newConnection', function (data) {
    updateParticipants(data.participants);
  });

  /*
   When the server emits the "userDisconnected" event, we'll
   remove the span element from the participants element
   */
  socket.on('userDisconnected', function(data) {
    $('#' + data.id).remove();
  });


  /*
   When receiving a new chat message with the "incomingMessage" event,
   we'll prepend it to the messages section
   */
  socket.on('incomingMessage', function (data) {
    var message = data.message;
    var name = data.name;
    $('#messages').prepend('<b>' + name + '</b><br />' + message + '<hr />');
  });

  /*
   Log an error if unable to connect to server
   */
  socket.on('error', function (reason) {
    console.log('Unable to connect to server', reason);
  });

  /*
   "sendMessage" will do a simple ajax POST call to our server with
   whatever message we have in our textarea
   */
  function sendMessage() {
    var outgoingMessage = $('#outgoingMessage').val();
    var name = $('#name').text(); //.val()
    $.ajax({
      url:  '/chat',
      type: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({message: outgoingMessage, name: name})
    });
  }

  /*
   If user presses Enter key on textarea, call sendMessage if there
   is something to share
   */
  function outgoingMessageKeyDown(event) {
    if (event.which == 13) {
      event.preventDefault();
      if ($('#outgoingMessage').val().trim().length <= 0) {
        return;
      }
      sendMessage();
      $('#outgoingMessage').val('');
    }
  }

  /*
   Helper function to disable/enable Send button
   */
  function outgoingMessageKeyUp() {
    var outgoingMessageValue = $('#outgoingMessage').val();
    $('#send').attr('disabled', (outgoingMessageValue.trim()).length > 0 ? false : true);
  }

  /*
   When a user updates his/her name, let the server know by
   emitting the "nameChange" event
   */
  function nameFocusOut() {
    var name = $('#name').text(); //.val()
    socket.emit('nameChange', {id: sessionId, name: name});
  }

/*NEW stuff I need to review ajax
  socket.on('validateData', function (data) {
    var username = data.username;
    var password = data.password;
    $('#messages').prepend('<b>' + name + '</b><br />' + message + '<hr />');
  });

  function validateData() {
    var outgoingMessage = $('#outgoingMessage').val();
    var name = $('#name').text(); //.val()
    $.ajax({
      url:  '/chat',
      type: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({message: outgoingMessage, name: name})
    });
  }

  function validateData(event) {
    $('#register').click(function(){
 	alert('hello world');
    });
  }
*/
  /* Elements setup */
  $('#outgoingMessage').on('keydown', outgoingMessageKeyDown);
  $('#outgoingMessage').on('keyup', outgoingMessageKeyUp);
  $('#name').on('focusout', nameFocusOut);
  $('#send').on('click', sendMessage);
  
  $('#chathelp').click(function(){
	alert("Chatroom commands: \n\nCreate a new game lobby: .create \nDestroy a game lobby[must be owner]: .destroy \nSign a game lobby: .sign \nOut a game lobby: .out \nList players in lobby: .lp \nCheck my stats: .me \n \nList top player stats: .top \nStart a game [when lobby has 10 players]: .start \nReport a game[min 6 reports]: .radiant or .dire");
  });

}

$(document).on('ready', init);
