angular.module('app.directives', [])

  .directive('cardDisplays', [function () {
    return {
      restrict: 'E',
      templateUrl: 'templates/partials/card-displays.html'
    }
  }])

  .directive('buttonDisplays', [function () {
    return {
      restrict: 'E',
      templateUrl: 'templates/partials/buttons.html'
    }
  }])

  .directive('aiCardDisplays', [function () {
    return {
      restrict: 'E',
      templateUrl: 'templates/partials/ai-card-displays.html'
    }
  }]);

