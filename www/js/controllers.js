angular.module('app.controllers', [])
  .filter('SpaceFilter', [
    function () {

      return function(ticketNumber){
        if (ticketNumber.ticketNumber === '00') {
          return 'blankSpace';
        }

        if (ticketNumber.matched === true) {
          return 'matched';
        }
        else {
          return 'noMatch';
        }
      };
    }])

  .controller('loginCtrl', ['$scope', 'UserLogIn',
      function ($scope, userLogIn) {
        $scope.userLogIn = userLogIn;

      }])

  .controller('lobbyCtrl', ['$scope', 'UserLogIn','GameApiModel','MiniGameEnter',
    function ($scope, userLogIn, gameApiModel, miniGameEnter) {
      $scope.userLogIn = userLogIn;
      $scope.gameApi = gameApiModel;
      $scope.miniGameEnter = miniGameEnter;
    }])

  .controller('ticketMasterCtrl', ['$scope', 'UserLogIn','GameTimer','BingoCall', 'CheckWinners','TicketCreation', 'GameApiModel',
    function ($scope, userLogIn, gameTime, bingoCall, checkWinners, ticketMaker, gameApiModel) {
      $scope.userLogIn = userLogIn;
      $scope.gameTimer = gameTime;
      $scope.callingMethod = bingoCall;
      $scope.checkWinners = checkWinners;
      $scope.ticketCreation = ticketMaker;
      $scope.gameApi = gameApiModel;
    }])



  .controller('miniGameController', ['$scope','GameFunctions',
    function ($scope, gameFunctions) {
      $scope.gameFunctions = gameFunctions;

    }]);
