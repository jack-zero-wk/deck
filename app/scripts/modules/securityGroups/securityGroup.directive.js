'use strict';

let angular = require('angular');

require('./securityGroup.html');

module.exports = angular.module('spinnaker.securityGroup.rollup', [])
  .directive('securityGroup', function ($rootScope, $timeout) {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: require('./securityGroup.html'),
      scope: {
        securityGroup: '=',
        displayOptions: '='
      },
      link: function (scope, el) {
        var base = el.parent().inheritedData('$uiView').state;

        scope.$state = $rootScope.$state;

        scope.loadDetails = function(e) {
          $timeout(function() {
            var securityGroup = scope.securityGroup;
            // anything handled by ui-sref or actual links should be ignored
            if (e.isDefaultPrevented() || (e.originalEvent && e.originalEvent.target.href)) {
              return;
            }
            var params = {
              region: securityGroup.region,
              accountId: securityGroup.accountName,
              name: securityGroup.name,
              vpcId: securityGroup.vpcId,
              provider: securityGroup.provider || 'aws',
            };
            // also stolen from uiSref directive
            scope.$state.go('.securityGroupDetails', params, {relative: base, inherit: true});
          });
        };

      }
    };
  }
).name;
