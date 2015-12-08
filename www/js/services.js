angular.module('app.services', [])

.factory('BlankFactory', [function(){

}])

.service('BlankService', [function(){

}])

.service('UserLogIn', ['$state', 'Proxy','TokenService',
  function ($state, proxy, tokenService) {
    var me  = this;

    me.logIn = function () {
      proxy.logIn(me.username, me.password).then(function (response) {
        me.balance = response.balance;
        tokenService.setToken(response.token);
        lobbyStateChange();
      });
    };

    me.logOut = function () {
      proxy.logOut(tokenService.getToken()).then(function (){
        tokenService.resetToken();
        logInStateChange();
      });
    };

    var lobbyStateChange = function (){
        return $state.go('lobby');
      },
      logInStateChange = function () {
        return $state.go('logIn');
      };

  }])

  .service('TicketCreation',
  function () {
    var me = this,
      BingoNumber = function (theNumber) {
        this.ticketNumber = theNumber;
        this.matched = false;
      };
    me.ticketStrip = [];
    me.restructuredTicket = {numbers: []};
    me.squares = [];

    me.sortTicket = function (cardNumber) {
      me.ticket = [];
      var k;
      for (k = 0; k < cardNumber.length; k += 2) {
        me.restructuredTicket.numbers.push(new BingoNumber(parseInt(cardNumber[k] + cardNumber[k + 1])));
      }
      var i,
        j;
      for (i = 0; i < 3; i++) {
        var line = [];

        for (j = 0; j < 5; j++) {
          line.push(me.restructuredTicket.numbers[j + (i * 5)]);
        }
        me.ticket.push(line);
      }
      me.ticketStrip.push(me.ticket);
    };

    me.createSquares = function () {
      return new Array(9);
    };

    me.isASquare = function (lineNumber, index) {
      var i;
      for (i = 0; i < me.ticket[lineNumber].length; i++) {
        var minRange = (index * 10),
          maxRange = (index * 10) + 10;
        if (me.ticket[lineNumber][i].ticketNumber >= minRange && me.ticket[lineNumber][i].ticketNumber <= maxRange) {
          return me.ticket[lineNumber][i];
        }
      }
      return {ticketNumber: '00'};
    };

    me.ifNumbersMatch = function (calledNumber) {
      var i,
        j;
      for (i = 0; i < 3; i++) {
        for (j = 0; j < 5; j++) {
          if (me.ticket[i][j].ticketNumber === calledNumber) {
            me.ticket[i][j].matched = true;
          }
        }
      }
    };
  })

.service('Proxy', ['$http', '$q', 'ObjectConverter',
    function ($http, $q, objectConverter) {
      var me = this;
      me.callApi = function (endUrl, data, token,requestType) {
        var deferred = $q.defer();
        request = {
          url: 'http://domubuntu-nu8d4jga.cloudapp.net:30069' + endUrl,
          data: data,
          headers: {
            'x-token': token,
            'content-type': 'application/json'
          },
          method: requestType
        };

        $http(request)
          .then(function (response) {
            deferred.resolve(objectConverter.responseConverter(response.data, endUrl));
          })
          .catch(function (response) {
            deferred.reject(response.data);
          });
        return deferred.promise;
      };

      me.logIn = function (username, password) {
        var data = {
          "username": username,
          "password": password
        };
        return me.callApi('/users/login', data, {}, 'POST');
      };

      me.logOut = function (token) {
        return me.callApi('/users/logout', {}, token, 'POST');
      };
    }])


    .service('TokenService', function () {
      var token = null;

      return {
        isAuthenticated: function () {
          return token !== null;
        },
        getToken: function () {
          return token;
        },
        setToken: function (tokenFromApi) {
          token = tokenFromApi;
        },
        resetToken: function () {
          this.setToken(null);
        }
      };
    })
  .service('ObjectConverter',
  function () {
    var me = this;
    me.responseConverter = function (response, endUrl) {
      if (endUrl == '/users/login') {
        return logInDataConverter(response);
      }
      else if (endUrl == '/game/next') {
        return nextGameDataConverter(response);
      }
      else if (endUrl == '/game/getcall') {
        return getCallDataConverter(response);
      }
      else if (endUrl == '/game/buyticket') {
        return buyTicketDataConverter(response);
      }
    };

    var logInDataConverter = function (response) {
        var logInDetails = {
          username: response.payload.user.username,
          balance: response.payload.user.balance,
          token: response.payload.user.token
        };
        return logInDetails;
      },

      nextGameDataConverter = function (response) {
        var nextGameDetails = {
          message: response.message,
          start: response.payload.start
        };
        return nextGameDetails;
      },

      getCallDataConverter = function (response) {
        var getCallDetails = {
          message: response.message,
          call: response.payload.call,
          winnerInfo: null
        };
        if (response.message === 'Line' || response.message === 'Winner') {
          getCallDetails.winnerInfo = response.payload.winnerInfo;
        }
        return getCallDetails;
      },

      buyTicketDataConverter = function (response) {
        var buyTicketDetails = {
          message: response.message,
          card: response.payload.card
        };
        return buyTicketDetails;
      };
  })
  .service('CheckWinners', ['$state','$ionicPopup', '$timeout', 'UserLogIn','TicketCreation',
    function ($state, $ionicPopup, $timeout, userLogIn, ticketCreation) {
      var me  = this,
        stateChanger = function (){
          $state.go('lobby');
        };

      me.checkForWinner = function (response) {
        if (response.message === "Line") {
          me.lineWinner(response);
        }
        if (response.message === 'Winner') {
          me.houseWinner(response);
        }
      };

      me.lineWinner= function(response){
        var lineMessage = $ionicPopup.alert({
          title: 'You have won the Line prize!',
            template:'Well Done! You have won the line prize of £' + response.winnerInfo.lineprize
        });
        userLogIn.balance += response.winnerInfo.lineprize;
      };

      me.houseWinner= function(response){
        var houseMessage = $ionicPopup.alert({
          title: 'You have won the House prize!',
          template:'Well Done! You have won the line prize of £' + response.winnerInfo.houseprize
        });
        userLogIn.balance += response.winnerInfo.houseprize;
        $timeout (clearPreviousGame, 6000);
        $timeout (stateChanger, 9000);
      };

      var clearPreviousGame = function(){
        ticketCreation.ticketStrip = [];
        ticketCreation.restructuredTicket = {numbers: []};
        ticketCreation.squares = [];
        ticketCreation.ticket = [];
        me.lineMessage = null;
        me.houseMessage = null;
      };
    }])
  .service('GameApiModel',
  ['$state', 'GameApiProxy', 'UserLogIn', 'GameTimer', 'TokenService','TicketCreation',
    function ($state, gameApiProxy, userLogIn, gameTimer, tokenService,ticketCreation) {
      var me = this,
        stateChanger = function () {
          $state.go('tickets');
        };

      me.handlePromise = function (promise) {
        promise.then(function (response) {
          if (response.message === "TicketBought") {
            ticketCreation.sortTicket(response.card);
          }
          if (response.message === "NextGame") {
            gameTimer.timeTillGame(response.start);
          }
          return response;
        })
          .catch(function (response) {
            console.log(response);
          });
      };

      me.getNextGame = function () {
        var promise = gameApiProxy.nextGame(tokenService.getToken);
        me.handlePromise(promise);
        stateChanger();
      };
      me.buyTicket = function () {
        var promise = gameApiProxy.buyTicket(tokenService.getToken);
        me.handlePromise(promise);
      };
    }])
  .service('GameApiProxy', [ '$http', '$q', 'Proxy','UserLogIn',
    function ($http, $q, proxy, userLogIn) {
      var me = this;

      me.nextGame = function (token) {
        return proxy.callApi('/game/next', {}, token, 'GET');
      };

      me.buyTicket = function (token) {
        var data = {
          'gameId' : 1,
          'userId': userLogIn.username,
          'balance':userLogIn.balance
        };
        return proxy.callApi('/game/buyticket', data, token, 'POST');
      };
    }])
  .service('BingoCall',
  ['$timeout', 'UserLogIn', 'CheckWinners', 'BingoCallProxy', 'TicketCreation', 'TokenService',
    function ($timeout, userLogIn, checkForWinners, bingoCallProxy, ticketCreation, tokenService) {
      var me = this,
        noWinnerFound = true,
        callNumber = 0;
      me.calledNumbers = [];

      me.bingoCall = function () {
        callNumber += 1;
        if (callNumber === 90) {
          callNumber = 0;
          me.calledNumbers = [];
        }
        bingoCallProxy.bingoCall(callNumber, tokenService.getToken())
          .then(function (response) {
            ticketCreation.ifNumbersMatch(response.call);
            calledBingoBalls(response.call);
            checkForWinners.checkForWinner(response);
            apiPolling();
          });
      };

      var calledBingoBalls = function (lastCalledNumber) {
        if (me.calledNumbers.length >= 5) {
          me.calledNumbers.shift();
        }
        me.calledNumbers.push(lastCalledNumber);
      };

      var apiPolling = function () {
        if (checkForWinners.houseWinner) {
          $timeout.cancel(me.bingoCall);
        }
        if (noWinnerFound) {
          $timeout(me.bingoCall, 2000);
        }
      };
    }])
  .service('BingoCallProxy', ['Proxy','UserLogIn',
    function (proxy, userLogIn) {
      var me  = this;
      me.calledNumbers = [];

      me.bingoCall = function (callNumber, token) {
        var data = {
          gameId: 1,
          userId: userLogIn.username,
          balance: userLogIn.balance,
          callnumber: callNumber
        };
        return proxy.callApi('/game/getcall', data, token,  'POST');
      };

    }])

  .service('GameTimer', ['$state', '$interval','BingoCall',
    function ($state, $interval, bingoCall) {
      var me = this,
        timer;
      me.hideMe = false;
      me.timeTillGame = function (time) {
        me.hideMe =false;
        var realTime = new Date(),
          gameTime = new Date(time),
          timeDifference = Math.abs(gameTime.getTime() - realTime.getTime());
        me.timeBeforeStart = (timeDifference / 1000).toFixed(0);
        timer = $interval(me.updateTime, 1000, me.timeBeforeStart);
      };

      me.updateTime = function () {
        me.timeBeforeStart -= 1;
        if (me.timeBeforeStart === 0) {
          me.hideMe = true;
          me.stop();
          bingoCall.bingoCall();
        }
      };

      me.stop = function (){
        $interval.cancel(timer);
      };
    }])

  .service('GameFunctions',
  function () {
    var me  = this;
    var cw = 10,
      d,
      food,
      score,
      snakeArray;

    me.init = function (){
      var canvas = document.getElementById('canvas'),
      ctx = canvas.getContext('2d'),
       w = canvas.width,
       h = canvas.height;

      var createSnake = function ()
      {
        var length = 5;
        snakeArray = [];
        for(var i = length-1; i>=0; i--)
        {
          snakeArray.push({x: i, y:0});
        }
      };

      var createFood = function()
      {
        food = {
          x: Math.round(Math.random()*(w-cw)/cw),
          y: Math.round(Math.random()*(h-cw)/cw)
        };
      };

    var paint = function ()
    {

      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "black";
      ctx.strokeRect(0, 0, w, h);

      var nx = snakeArray[0].x;
      var ny = snakeArray[0].y;

      if(d == "right") nx++;
      else if(d == "left") nx--;
      else if(d == "up") ny--;
      else if(d == "down") ny++;

      if(nx == -1 || nx == w/cw || ny == -1 || ny == h/cw || checkForCollision(nx, ny, snakeArray))
      {
        start();
        return;
      }
      if(nx == food.x && ny == food.y)
      {
        var tail = {x: nx, y: ny};
        score++;
        createFood();
      }
      else
      {
        var tail = snakeArray.pop();
        tail.x = nx; tail.y = ny;
      }
      snakeArray.unshift(tail);

      for(var i = 0; i < snakeArray.length; i++)
      {
        var c = snakeArray[i];
        fillCells(c.x, c.y);
      }

      fillCells(food.x, food.y);
      var scoreText = "Score: " + score;
      ctx.fillText(scoreText, 5, h-5);
    };

    var fillCells = function (x, y)
    {
      ctx.fillStyle = "blue";
      ctx.fillRect(x*cw, y*cw, cw, cw);
      ctx.strokeStyle = "white";
      ctx.strokeRect(x*cw, y*cw, cw, cw);
    };

    var checkForCollision = function (x, y, array)
    {
      for(var i = 0; i < array.length; i++)
      {
        if(array[i].x == x && array[i].y == y)
          return true;
      }
      return false;
    };

      var start = function ()
      {
        d = "right";
        createSnake();
        createFood();
        paint();

        score = 0;

        if(typeof game_loop != "undefined") clearInterval(game_loop);
        game_loop = setInterval(paint, 60);
      };
      start();

    $(document).keydown(function(e){
      var key = e.which;

      if(key == "37" && d != "right") d = "left";
      else if(key == "38" && d != "down") d = "up";
      else if(key == "39" && d != "left") d = "right";
      else if(key == "40" && d != "up") d = "down";
    });

      me.turnRight = function (){
        d = "right";
      };
      me.turnLeft = function (){
        d = "left";
      };
      me.turnUp = function (){
        d = "up";
      };
      me.turnDown = function (){
        d = "down";
      };
      //var doKeyDown = function (e) {
      //  var key = e.which;
      //  if(key == "37" || key == "65" && d != "right") d = "left";
      //  else if(key == "38" || key == "87" && d != "down") d = "up";
      //  else if(key == "39" || key == "68" && d != "left") d = "right";
      //  else if(key == "40" || key == "83" && d != "up") d = "down";
      //};
      //
      //window.addEventListener( "keypress", doKeyDown, false );
    };

  })

  .service('MiniGameEnter', ['$state',
    function ($state) {
      var me  = this;

      me.playGame = function(){
        $state.go('miniGame');
      };

    }])
.service('BingoCallProxy', ['Proxy','UserLogIn',
    function (proxy, userLogIn) {
      var me  = this;
      me.calledNumbers = [];

      me.bingoCall = function (callNumber, token) {
        var data = {
          gameId: 1,
          userId: userLogIn.username,
          balance: userLogIn.balance,
          callnumber: callNumber
        };
        return proxy.callApi('/game/getcall', data, token,  'POST');
      };

    }])

  .service('GameAudio',
    function () {
      var me = this,
        cheers = document.getElementsByClassName("cheerSound"),
        clappingSound =  document.getElementsByClassName("clappingSound");

      me.playCheer = function(){
        cheers.play();
      };
      me.playClap = function (){
        clappingSound.play();
      };
    });



