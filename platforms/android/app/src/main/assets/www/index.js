// //var socket = io();
var socket = io.connect('http://192.168.8.100:3000', {
    'reconnect': true,
    'reconnection delay': 5000,
    'max reconnection attempts': 5
});

var app = {
    initialize: function () {
        console.error = window.onerror = function () {
            if (JSON.stringify(arguments).indexOf('iosrtc') !== -1) {
                return;
            }

            if (JSON.stringify(arguments).indexOf('No Content-Security-Policy') !== -1) {
                return;
            }

            if (JSON.stringify(arguments).indexOf('<') !== -1) {
                return;
            }

            alert(JSON.stringify(arguments, null, ' '));
        };

        app.bindEvents();
    },

    bindEvents: function () {

        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },
    checkAndroidPermissions: function (callback) {
        if (device.platform !== 'Android') {
            callback();
            return;
        }

        var permissions = cordova.plugins.permissions;

        var arr = [
            permissions.CAMERA,
            permissions.RECORD_AUDIO,
            permissions.MODIFY_AUDIO_SETTINGS
        ];

        permissions.hasPermission(arr, function (status) {
            if (status.hasPermission) {
                callback();
                return;
            }

            permissions.requestPermissions(arr, function (status) {
                if (status.hasPermission) {
                    callback();
                    return;
                }
                alert('Please manually enable camera and microphone permissions.');
            }, function () {
                alert('Please manually enable camera and microphone permissions.');
            });
        }, function () {
            alert('Please manually enable camera and microphone permissions.');
        });
    },

    onDeviceReady: function () {
        this.receivedEvent('deviceready');
        // ......................................................
        // .......................UI Code........................
        // ......................................................

        document.getElementById('open-or-join-room').onclick = function () {
            disableInputButtons();
            app.checkAndroidPermissions(function () {
//                connection.openOrJoin(document.getElementById('room-id').value, function (isRoomExist, roomid) {
//                    //                     showRoomURL(connection.sessionid);
//                    document.querySelector('h1').innerHTML = 'Connected';
//                    console.log(connection.userid);
//                    console.log(roomid);

                    connection.checkPresence(document.getElementById('room-id').value, function (isRoomExists, roomid) {
                        if (isRoomExists) {
                            connection.join(roomid);
                            document.querySelector('h1').innerHTML = 'Connected';
//                            console.log(connection.userid);
                            console.log(roomid);
                        } else {
                            connection.open(roomid);
                            document.querySelector('h1').innerHTML = 'Connected';
//                            console.log(connection.userid);
                            console.log(roomid);
                        }
                    });
//                });
            });
        };

        document.getElementById('btn-leave-room').onclick = function () {
            this.disabled = true;
            if (connection.isInitiator) {
                // use this method if you did NOT set "autoCloseEntireSession===true"
                // for more info: https://github.com/muaz-khan/RTCMultiConnection#closeentiresession
                connection.closeEntireSession(function () {
                    console.log("You have been disconnected.");
                    var roomURLsDiv = document.getElementById('room-urls');
                    roomURLsDiv.style.display = 'none';
                    document.querySelector('h1').innerHTML = '';
                });
            } else {
                connection.leave();
            }
        };


        // ......................................................
        // ..................RTCMultiConnection Code.............
        // ......................................................

        var connection = new RTCMultiConnection();

        connection.onMediaError = function (error, constraints) {
            alert(JSON.stringify(error, null, ' '));
        };

        //          http://www.rtcmulticonnection.org/docs/socketURL/
        connection.socketURL = 'https://192.168.8.100:9001/';
        //         connection.socketURL = 'https://rtcmulticonnection.herokuapp.com:443/';

        connection.socketMessageEvent = 'audio-conference-demo';
        connection.session = {
            audio: true,
            video: false
        };
        connection.mediaConstraints = {
            audio: true,
            video: false
        };
        connection.sdpConstraints.mandatory = {
            OfferToReceiveAudio: true,
            OfferToReceiveVideo: false
        };
        connection.audiosContainer = document.getElementById('audios-container');
        connection.onstream = function (event) {
            var width = parseInt(connection.audiosContainer.clientWidth / 2) - 20;
            var mediaElement = getHTMLMediaElement(event.mediaElement, {
                title: event.userid,
                buttons: ['full-screen'],
                width: width,
                showOnMouseEnter: false
            });
            connection.audiosContainer.appendChild(mediaElement);
            setTimeout(function () {
                mediaElement.media.play();
            }, 5000);
            mediaElement.id = event.streamid;
        };
        connection.onstreamended = function (event) {
            var mediaElement = document.getElementById(event.streamid);
            if (mediaElement) {
                mediaElement.parentNode.removeChild(mediaElement);
            }
        };


        connection.onopen = function () {

            document.getElementById('btn-leave-room').disabled = false;
            document.querySelector('h3').innerHTML = 'You are connected with: ' + connection.getAllParticipants().join(', ');
        };
        connection.onclose = function () {
            if (connection.getAllParticipants().length) {
                document.querySelector('h3').innerHTML = 'You are still connected with: ' + connection.getAllParticipants().join(', ');
            } else {
                document.querySelector('h3').innerHTML = 'Seems session has been closed or all participants left.';
            }
        };

        connection.onEntireSessionClosed = function (event) {
            document.getElementById('btn-leave-room').disabled = true;
            document.getElementById('open-or-join-room').disabled = false;
            document.getElementById('room-id').disabled = false;
            connection.attachStreams.forEach(function (stream) {
                stream.stop();
            });
            // don't display alert for moderator
            if (connection.userid === event.userid) return;
            document.querySelector('h1').innerHTML = 'Entire session has been closed by the moderator: ' + event.userid;
        };
        connection.onUserIdAlreadyTaken = function (useridAlreadyTaken, yourNewUserId) {
            // seems room is already opened
            connection.join(useridAlreadyTaken);
        };

        function disableInputButtons() {
            document.getElementById('open-or-join-room').disabled = true;
            document.getElementById('room-id').disabled = true;
            document.getElementById('btn-leave-room').disabled = false;

        };
        // ......................................................
        // ......................Handling Room-ID................
        // ......................................................
        function showRoomURL(roomid) {
            var roomHashURL = '#' + roomid;
            var roomQueryStringURL = '?roomid=' + roomid;
            var html = '<h2>Unique URL for your room:</h2><br>';
            html += 'Hash URL: <a href="' + roomHashURL + '" target="_blank">' + roomHashURL + '</a>';
            html += '<br>';
            html += 'QueryString URL: <a href="' + roomQueryStringURL + '" target="_blank">' + roomQueryStringURL + '</a>';
            var roomURLsDiv = document.getElementById('room-urls');
            roomURLsDiv.innerHTML = html;
            roomURLsDiv.style.display = 'block';
        }
        (function () {
            var params = {},
                r = /([^&=]+)=?([^&]*)/g;

            function d(s) {
                return decodeURIComponent(s.replace(/\+/g, ' '));
            }
            var match, search = window.location.search;
            while (match = r.exec(search.substring(1)))
                params[d(match[1])] = d(match[2]);
            window.params = params;
        })();
        var roomid = '';
        if (localStorage.getItem(connection.socketMessageEvent)) {
            roomid = localStorage.getItem(connection.socketMessageEvent);
        } else {
            roomid = connection.token();
        }
        document.getElementById('room-id').value = roomid;
        document.getElementById('room-id').onkeyup = function () {
            localStorage.setItem(connection.socketMessageEvent, this.value);
        };
        var hashString = location.hash.replace('#', '');
        if (hashString.length && hashString.indexOf('comment-') == 0) {
            hashString = '';
        }
        var roomid = params.roomid;
        if (!roomid && hashString.length) {
            roomid = hashString;
        }
        if (roomid && roomid.length) {
            document.getElementById('room-id').value = roomid;
            localStorage.setItem(connection.socketMessageEvent, roomid);
            // auto-join-room
            (function reCheckRoomPresence() {
                connection.checkPresence(roomid, function (isRoomExists) {
                    if (isRoomExists) {
                        connection.join(roomid);
                        return;
                    }
                    setTimeout(reCheckRoomPresence, 5000);
                });
            })();
            disableInputButtons();
        };

    },
    receivedEvent: function (id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);

    }
};

app.initialize();


$(function () {
    var FADE_TIME = 150; // ms
    var TYPING_TIMER_LENGTH = 400; // ms
    var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

    // Initialize variables
    var $window = $(window);
    var $usernameInput = $('.usernameInput'); // Input for username
    var $messages = $('.messages'); // Messages area
    var $inputMessage = $('.inputMessage'); // Input message input box



    //  var $loginPage = $('.login.page'); // The login page
    var $chatPage = $('#page2'); // The chatroom page

    // Prompt for setting a username
    var username;
    var connected = false;
    var typing = false;
    var lastTypingTime;
    var $currentInput = $usernameInput.focus();



    function addParticipantsMessage(data) {
        var message = '';
        if (data.numUsers === 1) {
            message += "there's 1 user online";
        } else {
            message += "there are " + data.numUsers + " users online.";
        }
        log(message);
    }

    // Sets the client's username
    function setUsername() {
        username = cleanInput($usernameInput.val().trim());

        // If the username is valid
        if (username) {
            //      $loginPage.fadeOut();
            //      $chatPage.show();
            //      $loginPage.off('click');
            //      $currentInput = $inputMessage.focus();

            // Tell the server your username
            socket.emit('add user', username);
        }
    }

    // Sends a chat message
    function sendMessage() {
        var message = $inputMessage.val();
        // Prevent markup from being injected into the message
        message = cleanInput(message);
        // if there is a non-empty message and a socket connection
        if (message && connected) {
            $inputMessage.val('');
            addChatMessage({
                username: username,
                message: message
            });
            // tell server to execute 'new message' and send along one parameter
            socket.emit('new message', message);
        }
    }

    // Log a message
    function log(message, options) {
        var $el = $('<li>').addClass('log').text(message);
        addMessageElement($el, options);
    }

    // Adds the visual chat message to the message list
    function addChatMessage(data, options) {
        // Don't fade the message in if there is an 'X was typing'
        var $typingMessages = getTypingMessages(data);
        options = options || {};
        if ($typingMessages.length !== 0) {
            options.fade = false;
            $typingMessages.remove();
        }

        var $usernameDiv = $('<span class="username"/>')
            .text(data.username + ":")
            .css('color', getUsernameColor(data.username));
        var $messageBodyDiv = $('<span class="messageBody">')
            .text(data.message);
        var typingClass = data.typing ? 'typing' : '';
        var $messageDiv = $('<li class="message"/>')
            .data('username', data.username)
            .addClass(typingClass)
            .append($usernameDiv, $messageBodyDiv);

        addMessageElement($messageDiv, options);
    }




    // Adds the visual chat typing message
    function addChatTyping(data) {
        data.typing = true;
        data.message = 'is typing';
        addChatMessage(data);
    }

    // Removes the visual chat typing message
    function removeChatTyping(data) {
        getTypingMessages(data).fadeOut(function () {
            $(this).remove();
        });
    }

    // Adds a message element to the messages and scrolls to the bottom
    // el - The element to add as a message
    // options.fade - If the element should fade-in (default = true)
    // options.prepend - If the element should prepend
    //   all other messages (default = false)
    function addMessageElement(el, options) {
        var $el = $(el);

        // Setup default options
        if (!options) {
            options = {};
        }
        if (typeof options.fade === 'undefined') {
            options.fade = true;
        }
        if (typeof options.prepend === 'undefined') {
            options.prepend = false;
        }

        // Apply options
        if (options.fade) {
            $el.hide().fadeIn(FADE_TIME);
        }
        if (options.prepend) {
            $messages.prepend($el);
        } else {
            $messages.append($el);
        }
        $messages[0].scrollTop = $messages[0].scrollHeight;
    }

    // Prevents input from having injected markup
    function cleanInput(input) {
        return $('<div/>').text(input).html();
    }

    // Updates the typing event
    function updateTyping() {
        if (connected) {
            if (!typing) {
                typing = true;
                socket.emit('typing');
            }
            lastTypingTime = (new Date()).getTime();

            setTimeout(function () {
                var typingTimer = (new Date()).getTime();
                var timeDiff = typingTimer - lastTypingTime;
                if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                    socket.emit('stop typing');
                    typing = false;
                }
            }, TYPING_TIMER_LENGTH);
        }
    }

    // Gets the 'X is typing' messages of a user
    function getTypingMessages(data) {
        return $('.typing.message').filter(function (i) {
            return $(this).data('username') === data.username;
        });
    }

    // Gets the color of a username through our hash function
    function getUsernameColor(username) {
        // Compute hash code
        var hash = 7;
        for (var i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + (hash << 5) - hash;
        }
        // Calculate color
        var index = Math.abs(hash % COLORS.length);
        return COLORS[index];
    }

    // Keyboard events

    $window.keydown(function (event) {
        setUsername();
        // Auto-focus the current input when a key is typed
        if (!(event.ctrlKey || event.metaKey || event.altKey)) {
            $currentInput.focus();
        }
        // When the client hits ENTER on their keyboard
        if (event.which === 13) {
            if (username) {
                sendMessage();
                socket.emit('stop typing');
                typing = false;
            } else {
                setUsername();
            }
        }
    });


    // SEND MESSAGE
    $('.send-btn').click(sendMessage);


    $inputMessage.on('input', function () {
        updateTyping();
    });

    // Click events

    // Focus input when clicking anywhere on login page
    $chatPage.click(function () {
        $currentInput.focus();
        setUsername();
    });

    // Focus input when clicking on the message input's border
    $inputMessage.click(function () {
        $inputMessage.focus();
        setUsername();
    });

    // Socket events

    // Whenever the server emits 'login', log the login message
    socket.on('login', function (data) {
        connected = true;
        // Display the welcome message
        //    var message = "Welcome to Socket.IO Chat – ";
        //    log(message, {
        //      prepend: true
        //    });
        addParticipantsMessage(data);
    });

    // Whenever the server emits 'new message', update the chat body
    socket.on('new message', function (data) {
        addChatMessage(data);
    });

    // Whenever the server emits 'user joined', log it in the chat body
    socket.on('user joined', function (data) {
        log(data.username + ' joined');
        addParticipantsMessage(data);
    });

    // Whenever the server emits 'user left', log it in the chat body
    socket.on('user left', function (data) {
        log(data.username + ' left');
        addParticipantsMessage(data);
        removeChatTyping(data);
    });

    // Whenever the server emits 'typing', show the typing message
    socket.on('typing', function (data) {
        addChatTyping(data);
    });

    // Whenever the server emits 'stop typing', kill the typing message
    socket.on('stop typing', function (data) {
        removeChatTyping(data);
    });

    socket.on('disconnect', function () {
        log('you have been disconnected');
    });

    socket.on('reconnect', function () {
        log('you have been reconnected');
        if (username) {
            socket.emit('add user', username);
        }
    });

    socket.on('reconnect_error', function () {
        log('attempt to reconnect has failed');
    });

});
