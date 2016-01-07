angular.module('app.services', [])

  .factory('BlankFactory', [function () {

  }])

  .service('BlankService', [function () {

  }])

  .service('UserLogIn', ['$state', 'Proxy', 'TokenService',
    function ($state, proxy, tokenService) {
      var me = this;

      me.logIn = function () {
        proxy.logIn(me.username, me.password).then(function (response) {
          me.balance = response.balance;
          tokenService.setToken(response.token);
          lobbyStateChange();
        });
      };

      me.logOut = function () {
        proxy.logOut(tokenService.getToken()).then(function () {
          tokenService.resetToken();
          logInStateChange();
        });
      };

      var lobbyStateChange = function () {
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
      me.callApi = function (endUrl, data, token, requestType) {
        var deferred = $q.defer();
        request = {
          url: 'http://eutaveg-01.tombola.emea:30069' + endUrl,
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
  .service('CheckWinners', ['$state', '$ionicPopup', '$timeout', 'UserLogIn', 'TicketCreation',
    function ($state, $ionicPopup, $timeout, userLogIn, ticketCreation) {
      var me = this,
        stateChanger = function () {
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

      me.lineWinner = function (response) {
        var lineMessage = $ionicPopup.alert({
          title: 'You have won the Line prize!',
          template: 'Well Done! You have won the line prize of £' + response.winnerInfo.lineprize
        });
        userLogIn.balance += response.winnerInfo.lineprize;
      };

      me.houseWinner = function (response) {
        var houseMessage = $ionicPopup.alert({
          title: 'You have won the House prize!',
          template: 'Well Done! You have won the line prize of £' + response.winnerInfo.houseprize
        });
        userLogIn.balance += response.winnerInfo.houseprize;
        $timeout(clearPreviousGame, 6000);
        $timeout(stateChanger, 9000);
      };

      var clearPreviousGame = function () {
        ticketCreation.ticketStrip = [];
        ticketCreation.restructuredTicket = {numbers: []};
        ticketCreation.squares = [];
        ticketCreation.ticket = [];
        me.lineMessage = null;
        me.houseMessage = null;
      };
    }])
  .service('GameApiModel',
  ['$state', 'GameApiProxy', 'UserLogIn', 'GameTimer', 'TokenService', 'TicketCreation',
    function ($state, gameApiProxy, userLogIn, gameTimer, tokenService, ticketCreation) {
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
  .service('GameApiProxy', ['$http', '$q', 'Proxy', 'UserLogIn',
    function ($http, $q, proxy, userLogIn) {
      var me = this;

      me.nextGame = function (token) {
        return proxy.callApi('/game/next', {}, token, 'GET');
      };

      me.buyTicket = function (token) {
        var data = {
          'gameId': 1,
          'userId': userLogIn.username,
          'balance': userLogIn.balance
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
  .service('BingoCallProxy', ['Proxy', 'UserLogIn',
    function (proxy, userLogIn) {
      var me = this;
      me.calledNumbers = [];

      me.bingoCall = function (callNumber, token) {
        var data = {
          gameId: 1,
          userId: userLogIn.username,
          balance: userLogIn.balance,
          callnumber: callNumber
        };
        return proxy.callApi('/game/getcall', data, token, 'POST');
      };

    }])

  .service('GameTimer', ['$state', '$interval', 'BingoCall',
    function ($state, $interval, bingoCall) {
      var me = this,
        timer;
      me.hideMe = false;
      me.timeTillGame = function (time) {
        me.hideMe = false;
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

      me.stop = function () {
        $interval.cancel(timer);
      };
    }])

  .service('GameFunctions',
  function () {
    var me = this;
    var cw = 10,
      d,
      food,
      score,
      snakeArray;

    me.init = function () {
      var canvas = document.getElementById('canvas'),
        ctx = canvas.getContext('2d'),
        w = canvas.width,
        h = canvas.height;

      var createSnake = function () {
        var length = 5;
        snakeArray = [];
        for (var i = length - 1; i >= 0; i--) {
          snakeArray.push({x: i, y: 0});
        }
      };

      var createFood = function () {
        food = {
          x: Math.round(Math.random() * (w - cw) / cw),
          y: Math.round(Math.random() * (h - cw) / cw)
        };
      };

      var paint = function () {

        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "black";
        ctx.strokeRect(0, 0, w, h);

        var nx = snakeArray[0].x;
        var ny = snakeArray[0].y;

        if (d == "right") nx++;
        else if (d == "left") nx--;
        else if (d == "up") ny--;
        else if (d == "down") ny++;

        if (nx == -1 || nx == w / cw || ny == -1 || ny == h / cw || checkForCollision(nx, ny, snakeArray)) {
          start();
          return;
        }
        if (nx == food.x && ny == food.y) {
          var tail = {x: nx, y: ny};
          score++;
          createFood();
        }
        else {
          var tail = snakeArray.pop();
          tail.x = nx;
          tail.y = ny;
        }
        snakeArray.unshift(tail);

        for (var i = 0; i < snakeArray.length; i++) {
          var c = snakeArray[i];
          fillCells(c.x, c.y);
        }

        fillCells(food.x, food.y);
        var scoreText = "Score: " + score;
        ctx.fillText(scoreText, 5, h - 5);
      };

      var fillCells = function (x, y) {
        ctx.fillStyle = "blue";
        ctx.fillRect(x * cw, y * cw, cw, cw);
        ctx.strokeStyle = "white";
        ctx.strokeRect(x * cw, y * cw, cw, cw);
      };

      var checkForCollision = function (x, y, array) {
        for (var i = 0; i < array.length; i++) {
          if (array[i].x == x && array[i].y == y)
            return true;
        }
        return false;
      };

      var start = function () {
        d = "right";
        createSnake();
        createFood();
        paint();

        score = 0;

        if (typeof game_loop != "undefined") clearInterval(game_loop);
        game_loop = setInterval(paint, 60);
      };
      start();

      $(document).keydown(function (e) {
        var key = e.which;

        if (key == "37" && d != "right") d = "left";
        else if (key == "38" && d != "down") d = "up";
        else if (key == "39" && d != "left") d = "right";
        else if (key == "40" && d != "up") d = "down";
      });

      me.turnRight = function () {
        d = "right";
      };
      me.turnLeft = function () {
        d = "left";
      };
      me.turnUp = function () {
        d = "up";
      };
      me.turnDown = function () {
        d = "down";
      };
    };

  })

  .service('MiniGameEnter', ['$state',
    function ($state) {
      var me = this;

      me.playGame = function () {
        $state.go('miniGame');
      };
      me.playMatch = function () {
        $state.go('pairsGame');
      };
      me.playSnap = function () {
        $state.go('homePage');
      };
      me.playBlackJack = function () {
        $state.go('blackJack');
      };

    }])
  .service('BingoCallProxy', ['Proxy', 'UserLogIn',
    function (proxy, userLogIn) {
      var me = this;
      me.calledNumbers = [];

      me.bingoCall = function (callNumber, token) {
        var data = {
          gameId: 1,
          userId: userLogIn.username,
          balance: userLogIn.balance,
          callnumber: callNumber
        };
        return proxy.callApi('/game/getcall', data, token, 'POST');
      };

    }])

  .service('GameAudio',
  function () {
    var me = this,
      cheers = document.getElementsByClassName("cheerSound"),
      clappingSound = document.getElementsByClassName("clappingSound");

    me.playCheer = function () {
      cheers.play();
    };
    me.playClap = function () {
      clappingSound.play();
    };
  })

  .service('StateChanger',
  function ($state) {
    var me = this;
    me.playerScore = 0;
    me.aiScore = 0;
    me.goToLobby = function () {
      $state.go('gameLobby');
    };
    me.goToHome = function () {
      $state.go('homePage');
    };
  })


  .service('SortCards',
  function ($state) {
    var me = this,
      suits = ["Clubs", "Diamonds", "Hearts", "Spades"],
      cardNumbers = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King", "Ace"];
    me.cards = [];
    me.winner = false;
    me.winnerName = '';

    var deck = function () {
        var suit,
          rank;
        for (suit in suits) {
          for (rank in cardNumbers) {
            me.cards.push({
              suit: suits[suit],
              value: cardNumbers[rank],
              image: suits[suit] + cardNumbers[rank]
            });
          }
        }
        shuffle(me.cards);
      },

      shuffle = function (cards) {
        var counter = cards.length,
          temp,
          index;

        while (counter > 0) {
          index = Math.floor(Math.random() * counter);
          counter--;

          temp = cards[counter];
          cards[counter] = cards[index];
          cards[index] = temp;
        }
        return cards;
      },

      goToHome = function () {
        $state.go('homePage');
      };

    me.init = function () {
      deck();
    };

    me.stateChanger = function () {
      goToHome();
    };
  })

  .service('DisplayCards', ['$timeout', '$interval', '$ionicPopup', 'SortCards', 'StateChanger',
    function ($timeout, $interval, $ionicPopup, sortCards, stateChanger) {
      var me = this,
        aiWinner = function () {
          var aiMessage = $ionicPopup.alert({
            title: 'You lose this time!',
            template: 'AI has won the game. Better luck next time!'
          });
          sortCards.winnerName = 'AI';
          sortCards.cards.image = null;
          $timeout(stateChanger.goToHome, 2000);
          $interval.cancel(me.dealCards);
          sortCards.cards = [];
          sortCards.chosenCard = null;
          sortCards.previousCard = null;
          stateChanger.aiScore += 1;
        };
      me.chosenCard = null;

      me.showCard = function () {
        me.hideMe = false;
        var i = 0;
        me.dealCards = $interval(function () {
          me.chosenCard = sortCards.cards[i];
          me.previousCard = sortCards.cards[i - 1];
          i++;
          if (me.chosenCard.value === me.previousCard.value) {
            $timeout(function () {
              if (me.winner !== true) {
                aiWinner();
              }
            }, 1000);
          }
        }, 3000, sortCards.cards.length);
        me.aiMessage = '';
      };
    }])

  .service('CheckForWins', ['$timeout', '$interval', '$ionicPopup', 'SortCards', 'WinConditions', 'DisplayCards', 'StateChanger',
    function ($timeout, $interval, $ionicPopup, sortCards, winConditions, displayCards, stateChanger) {
      var me = this;

      me.checkSnap = function () {
        if (displayCards.chosenCard.value === displayCards.previousCard.value) {
          var snapMessage = $ionicPopup.alert({
            title: 'Well done, you are fast',
            template: 'SNAP! We have a winner!'
          });
          sortCards.winnerName = 'Human';
          sortCards.winner = true;
          stateChanger.playerScore += 1;
          winConditions.clearData();
        }
        else {
          winConditions.isButtonDisabled = true;
          winConditions.loseCondition();
        }
      };
    }])

  .service('WinConditions', ['$timeout', '$interval', '$ionicPopup', 'SortCards', 'StateChanger', 'DisplayCards',
    function ($timeout, $interval, $ionicPopup, sortCards, stateChanger, displayCards) {
      var me = this;
      me.loseMessage = '';
      me.isButtonDisabled = false;
      me.clearData = function () {
        $interval.cancel(displayCards.dealCards);
        sortCards.cards = [];
        sortCards.cards.image = '';
        sortCards.chosenCard = null;
        sortCards.chosenCard.image = null;
        sortCards.previousCard = null;
        $timeout(me.winCondition, 2000);
      };
      me.winCondition = function () {
        stateChanger.goToHome();
        me.snapMessage = '';
      };

      me.loseCondition = function () {
        var loseMessage = $ionicPopup.alert({
          title: 'Bad timing. Not a match.',
          template: 'YOU THOUGHT WRONG! You cant call snap now for 5 seconds.'
        });
        $timeout(function () {
          me.loseMessage = '';
          me.isButtonDisabled = false;
        }, 5000);
      };
    }])

  .service('BlackJackGamePlay', ['$ionicPopup', '$timeout',
    function ($ionicPopup, $timeout) {
      var me = this,
        i,
        j,
        total = 0,
        suits = ["Clubs", "Diamonds", "Hearts", "Spades"],
        cardNumbers = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King", "Ace"];
      me.cards = [];
      me.balance = 1000;
      me.pot = 0;
      me.playerHand = [];
      me.AiHand = [];
      me.isStickButtonShowing = true;
      me.hideButtons = false;
      me.returnFrom10 = false;
      me.returnFrom100 = false;

      me.init = function () {
        deck();
      };

      var deck = function () {
          var suit,
            rank;
          for (suit in suits) {
            for (rank in cardNumbers) {
              me.cards.push({
                suit: suits[suit],
                value: cardNumbers[rank],
                image: suits[suit] + cardNumbers[rank]
              });
            }
          }
          shuffle(me.cards);
          me.playerHand.push(me.cards[0], me.cards[1]);
          me.AiHand.push(me.cards[2], me.cards[3]);
          console.log(me.AiHand);
          console.log(me.playerHand);
          calculatePontoon();
        },

        shuffle = function (cards) {
          var counter = cards.length,
            temp,
            index;

          while (counter > 0) {
            index = Math.floor(Math.random() * counter);
            counter--;

            temp = cards[counter];
            cards[counter] = cards[index];
            cards[index] = temp;
          }
          return cards;
        };

      var calculatePontoon = function () {
        total = 0;
        for (i = 0; i < me.playerHand.length; i++) {
          if (me.playerHand[i].value === 'Jack' || me.playerHand[i].value === 'Queen' || me.playerHand[i].value === 'King') {
            me.playerHand[i].value = 10;
          }
        }

        for (j = 0; j < me.playerHand.length; j++) {
          if (me.playerHand[j].value === 'Ace' && total < 10) {
            me.playerHand[j].value = 1;
          }
          if (me.playerHand[j].value === 'Ace' && total === 10) {
            me.playerHand[j].value = 11;
          }
          if (me.playerHand[j].value === 'Ace' && total > 10) {
            me.playerHand[j].value = 1;
          }
          total += parseInt(me.playerHand[j].value);
          checkWins();
        }

        if (total >= 16) {
          me.isStickButtonShowing = false;
        }
        if (total > 21) {
          loseConditions();
        }
        console.log(total);
      };

      var checkWins = function () {
        if (total === 21) {
          var winMessage = $ionicPopup.alert({
            title: 'Pontoon! BlackJack!',
            template: 'You Win!'
          });
          if (me.reduceBalance10) {
            me.balance += me.pot + me.pot * 3;
          }
          if (me.reduceBalance100) {
            me.balance += me.pot + me.pot * 3;
          }
          $timeout(clearData, 5000);
        }
      };

      var loseConditions = function () {
        var loseMessage = $ionicPopup.alert({
          title: 'You are Bust!',
          template: 'You are over 21! Unlucky!'
        });
        $timeout(clearData, 5000);
      };

      var clearData = function () {
        me.cards = [];
        me.pot = 0;
        total = 0;
        me.aiTotal = 0;
        me.playerHand = [];
        me.AiHand = [];
        me.playerHand.image = null;
        me.isStickButtonShowing = true;
        me.hideButtons = false;
      };
      me.addCard = function () {
        me.playerHand.push(me.cards[Math.floor(Math.random() * me.cards.length)]);
        console.log(me.playerHand);
        calculatePontoon();
      };

      me.stickSelected = function () {
        var k;
        me.aiTotal = 0;
        me.hideButtons = true;
        for (k = 0; k < me.AiHand.length; k++) {
          if (me.AiHand[k].value === 'Jack' || me.AiHand[k].value === 'Queen' || me.AiHand[k].value === 'King') {
            me.AiHand[k].value = 10;
          }
          if (me.AiHand[k].value === 'Ace' && me.AiHand < 10) {
            me.AiHand[k].value = 1;
          }
          if (me.AiHand[k].value === 'Ace' && me.AiHand === 10) {
            me.AiHand[k].value = 11;
          }
          if (me.AiHand[k].value === 'Ace' && total > 10) {
            me.AiHand[k].value = 1;
          }
          me.aiTotal += parseInt(me.AiHand[k].value);
        }
        aiAddCards();
        aiBust();

        if (total > me.aiTotal && me.aiTotal != 21) {
          var victory = $ionicPopup.alert({
            title: 'Pontoon! BlackJack!',
            template: 'You Win!'
          });
          if (me.returnFrom10 === true) {
            me.balance += me.pot + me.pot * 3;
          }
          if (me.returnFrom100 === true) {
            me.balance += me.pot + me.pot * 3;
          }
          $timeout(clearData, 5000);
        }
        else {
          var lose = $ionicPopup.alert({
            title: 'You lose',
            template: 'The AIs hand was better than yours'
          });
          $timeout(clearData, 5000);
        }
      };

      var aiAddCards = function () {
        if (me.aiTotal < 16) {
          me.AiHand.push(me.cards[i])
        }
      };

      var aiBust = function () {
        if (me.aiTotal > 21) {
          var aiLost = $ionicPopup.alert({
            title: 'You Win',
            template: 'The AI is bust'
          });
          $timeout(clearData, 5000);
        }
      };

      me.helpButton = function () {
        var helpButton = $ionicPopup.alert({
          title: 'Get 21 to win',
          template: 'Getting anything above, you lose. Get an ace and a picture card, you win.'
        });
      };
    }])

  .service('BetMoney', ['$ionicPopup', 'BlackJackGamePlay',
    function ($ionicPopup, blackJackGamePlay) {
      var me = this,
        checkForEmptyBalance = function () {
          if (blackJackGamePlay.balance <= 0) {
            blackJackGamePlay.balance = 0;
            var emptyBalance = $ionicPopup.alert({
              title: 'Balance Empty',
              template: 'You cannot bet any more because your balance is empty.'
            });
          }
        };
      me.reduceBalance10 = function () {
        blackJackGamePlay.balance = blackJackGamePlay.balance - 10;
        blackJackGamePlay.pot += 10;
        blackJackGamePlay.returnFrom10 = true;
        checkForEmptyBalance();
      };
      me.reduceBalance100 = function () {
        blackJackGamePlay.balance = blackJackGamePlay.balance - 100;
        blackJackGamePlay.pot += 100;
        blackJackGamePlay.returnFrom100 = true;
        checkForEmptyBalance();
      };
    }])

  .service('CreateGrid', ['$ionicPopup', 'CountDown',
    function ($ionicPopup, countDown) {
      var me = this,
        type,
        icon,
        iconTypes = ["example1", "example2", "example3", "example4", "example5", "example6", "example7", "example8", "example9"],
        totalIcons = [1, 2];
      me.selected1 = null;
      me.selected2 = null;
      me.icons = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      me.grid = [];
      me.init = function () {
        countDown.uiHidden = false;
        for (type in iconTypes) {
          for (icon in totalIcons) {
            me.grid.push({
              typeOfIcon: iconTypes[type],
              value: totalIcons[icon],
              defaultImage: 'frontCard',
              image: iconTypes[type] + totalIcons[icon],
              flipped: false,
              matched: false
            });
          }
        }
        shuffle(me.grid);
      };

      var shuffle = function (grid) {
        console.log(grid);
        var counter = grid.length,
          temp,
          index;

        while (counter > 0) {
          index = Math.floor(Math.random() * counter);
          counter--;

          temp = grid[counter];
          grid[counter] = grid[index];
          grid[index] = temp;
        }
        return grid;
      };
    }])

  .service('CountDown', ['$interval', '$ionicPopup',
    function ($interval, $ionicPopup) {
      var me = this,
        timer;
      me.timeLimit = 60;

      me.uiInit = function () {
        timer = $interval(updateTime, 1000, 100);
        me.uiHidden = true;
      };

      var updateTime = function () {
        me.timeLimit -= 1;
        if (me.timeLimit <= 10) {
          me.isCritical = true;
        }
        if (me.timeLimit === 0) {
          $interval.cancel(timer);
          var iconWinner = $ionicPopup.alert({
            title: 'You Lose',
            template: 'You ran out of time! Try again.'
          });
        }
      };

      me.cancelTimer = function () {
        $interval.cancel(timer);
      };
    }])

  .service('IconFlip', ['$timeout', 'CreateGrid','CheckForWins',
    function ($timeout, createGrid, checkForWins) {
      var me = this;

      var checkFlip = function () {
        if (createGrid.selected1.image === createGrid.selected2.image) {
          createGrid.selected2.flipped = false;
          createGrid.selected2 = null;
        }
        else {
          $timeout(function () {
            createGrid.selected1.flipped = false;
            createGrid.selected2.flipped = false;
            checkForEmpties();
          }, 1000);
        }
      };

      var checkForEmpties = function () {
        if (createGrid.selected1 !== null && createGrid.selected2 !== null) {
          checkForWins.checkWins();
        }
      };

      me.flipIcons = function (objects) {
        if (createGrid.selected1 !== null && createGrid.selected2 !== null) {
          return;
        }
        objects.flipped = true;

        if (createGrid.selected1 === null) {
          createGrid.selected1 = objects;
        }
        else {
          createGrid.selected2 = objects;
          checkFlip();
        }
      };
    }])

  .service('CheckForWins', ['$interval', '$timeout', '$ionicPopup','CreateGrid','CountDown',
    function ($interval, $timeout, $ionicPopup, createGrid, countDown) {
      var me = this,
        score,
        matchedTotal = 0;
      me.highScore = 10;

      var winConditions = function (){
        if (matchedTotal === 18) {
          score = Math.floor(1200 / (100 - countDown.timeLimit));
          countDown.cancelTimer();
          checkHighScore();

          var iconWinner = $ionicPopup.alert({
            title: 'You Win',
            template: 'Your score was ' + score + ". Well Done!"
          });
          me.clearData()
        }
      };

      var checkHighScore = function () {
        if (score > me.highScore) {
          me.highScore = score;
          var highScore = $ionicPopup.alert({
            title: 'High Score',
            template: 'New high score! Your score was ' + score
          });
        }
      };

      me.checkWins = function () {
        if (createGrid.selected1.typeOfIcon === createGrid.selected2.typeOfIcon) {
          createGrid.selected1.matched = true;
          createGrid.selected2.matched = true;
          countDown.timeLimit += 5;
          matchedTotal += 2;
          createGrid.selected1 = null;
          createGrid.selected2 = null;
        }
        createGrid.selected1 = null;
        createGrid.selected2 = null;
        winConditions();
      };

      me.clearData = function () {
        $timeout(function () {
          createGrid.grid = [];
          createGrid.selected1 = null;
          createGrid.selected2 = null;
          matchedTotal = 0;
          countDown.timeLimit = 60;
          countDown.uiHidden = false;
        }, 3000);
      };

    }]);


