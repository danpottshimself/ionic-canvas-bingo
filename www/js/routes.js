angular.module('app.routes', [])

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider



    .state('logIn', {
      url: '/logIn',
      templateUrl: 'templates/login.html',
      controller: 'loginCtrl'
    })


    .state('lobby', {
      url: '/lobby',
      templateUrl: 'templates/lobby.html',
      controller: 'lobbyCtrl'
    })


    .state('miniGame', {
      url: '/miniGame',
      templateUrl: 'templates/mini-game.html',
      controller: 'miniGameController'
    })


    .state('tickets', {
      url: '/ticketMaster',
      templateUrl: 'templates/ticketMaster.html',
      controller: 'ticketMasterCtrl'
    })


    ;

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/logIn');

});
