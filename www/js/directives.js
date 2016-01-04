angular.module('app.directives', [])

  .directive('cardDisplays', [function () {
    return {
      restrict: 'E',
      templateUrl: 'templates/card-displays.html'
    }
  }])

  .directive('buttonDisplays', [function () {
    return {
      restrict: 'E',
      templateUrl: 'templates/buttons.html'
    }
  }])

  .directive('aiCardDisplays', [function () {
    return {
      restrict: 'E',
      templateUrl: 'templates/ai-card-displays.html'
    }
  }]);

